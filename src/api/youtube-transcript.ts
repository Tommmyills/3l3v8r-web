/**
 * YouTube Transcript Fetcher
 * Uses multiple fallback methods for bulletproof transcript extraction
 * Method 0: Cache (instant)
 * Method 1: Direct Innertube API (most reliable in 2025)
 * Method 2: youtube-caption-extractor (legacy fallback)
 * Method 3: youtube-transcript package (legacy fallback)
 * Caches transcripts locally for instant loading on repeat visits
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Lazy-loaded modules - prevents crash on app startup
let getSubtitles: typeof import("youtube-caption-extractor").getSubtitles | null = null;
let YoutubeTranscript: typeof import("youtube-transcript").YoutubeTranscript | null = null;

// Cache configuration
const CACHE_PREFIX = "transcript_";
const CACHE_EXPIRY_DAYS = 7;
const FETCH_TIMEOUT = 15000; // 15 seconds max per method

export interface TranscriptSegment {
  text: string;
  start: number; // timestamp in seconds
  duration: number; // duration in seconds
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
  fullText: string;
  language: string;
  videoId: string;
  source?: "captions" | "whisper" | "innertube"; // Track how we got the transcript
  cachedAt?: number; // Timestamp when cached
}

interface CachedTranscript {
  data: TranscriptResult;
  timestamp: number;
}

/**
 * Get cached transcript from AsyncStorage
 */
async function getCachedTranscript(videoId: string): Promise<TranscriptResult | null> {
  try {
    const cacheKey = `${CACHE_PREFIX}${videoId}`;
    const cached = await AsyncStorage.getItem(cacheKey);

    if (cached) {
      const { data, timestamp }: CachedTranscript = JSON.parse(cached);

      // Check if cache is still valid (within 7 days)
      const now = Date.now();
      const ageInDays = (now - timestamp) / (1000 * 60 * 60 * 24);

      if (ageInDays < CACHE_EXPIRY_DAYS) {
        console.log("✅ Using cached transcript for", videoId, `(${ageInDays.toFixed(1)} days old)`);
        return data;
      } else {
        console.log("🗑️ Cache expired for", videoId, "- fetching fresh");
        await AsyncStorage.removeItem(cacheKey);
      }
    }
  } catch (error) {
    console.log("Cache read error:", error);
  }
  return null;
}

/**
 * Cache transcript to AsyncStorage
 */
async function cacheTranscript(videoId: string, transcript: TranscriptResult): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIX}${videoId}`;
    const cached: CachedTranscript = {
      data: { ...transcript, cachedAt: Date.now() },
      timestamp: Date.now(),
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(cached));
    console.log("💾 Cached transcript for", videoId);
  } catch (error) {
    console.log("Cache write error:", error);
  }
}

/**
 * METHOD 1: Direct Innertube API (most reliable as of 2025)
 * This uses YouTube's internal API that powers the web player
 */
async function tryInnertubeAPI(videoId: string): Promise<TranscriptResult | null> {
  try {
    console.log("  Fetching video page to get caption tracks...");

    // First, get the video page to extract caption track info
    const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!videoPageResponse.ok) {
      console.log("  Failed to fetch video page:", videoPageResponse.status);
      return null;
    }

    const html = await videoPageResponse.text();

    // Extract captions data from the page
    const captionsMatch = html.match(/"captions":\s*(\{[^}]+?"playerCaptionsTracklistRenderer"[^}]+?\})/);
    if (!captionsMatch) {
      // Try alternative pattern
      const altMatch = html.match(/\"captionTracks\":\s*(\[[^\]]+\])/);
      if (!altMatch) {
        console.log("  No captions data found in page");
        return null;
      }

      try {
        const captionTracks = JSON.parse(altMatch[1]);
        if (!captionTracks || captionTracks.length === 0) {
          console.log("  No caption tracks available");
          return null;
        }

        // Find English track or first available
        const track = captionTracks.find((t: any) => t.languageCode === "en" || t.languageCode?.startsWith("en"))
          || captionTracks[0];

        if (!track?.baseUrl) {
          console.log("  No valid caption track URL");
          return null;
        }

        return await fetchCaptionTrack(track.baseUrl, videoId, track.languageCode || "en");
      } catch (e) {
        console.log("  Error parsing caption tracks:", e);
        return null;
      }
    }

    // Parse the captions JSON
    try {
      // Extract just the captionTracks array
      const tracksMatch = html.match(/\"captionTracks\":\s*(\[[^\]]*\])/);
      if (!tracksMatch) {
        console.log("  Could not extract caption tracks array");
        return null;
      }

      const captionTracks = JSON.parse(tracksMatch[1]);
      if (!captionTracks || captionTracks.length === 0) {
        console.log("  Empty caption tracks");
        return null;
      }

      // Find English track or first available
      const track = captionTracks.find((t: any) => t.languageCode === "en" || t.languageCode?.startsWith("en"))
        || captionTracks[0];

      if (!track?.baseUrl) {
        console.log("  No baseUrl in caption track");
        return null;
      }

      return await fetchCaptionTrack(track.baseUrl, videoId, track.languageCode || "en");
    } catch (e) {
      console.log("  Error parsing captions JSON:", e);
      return null;
    }
  } catch (error: any) {
    console.log("  Innertube API error:", error?.message || error);
    return null;
  }
}

/**
 * Fetch and parse a caption track from YouTube's timedtext API
 */
async function fetchCaptionTrack(baseUrl: string, videoId: string, language: string): Promise<TranscriptResult | null> {
  try {
    // Add format parameter for better parsing
    const url = baseUrl.includes("fmt=") ? baseUrl : `${baseUrl}&fmt=json3`;

    console.log("  Fetching caption track...");
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      console.log("  Caption track fetch failed:", response.status);
      return null;
    }

    const text = await response.text();

    // Try JSON format first
    if (text.startsWith("{")) {
      try {
        const json = JSON.parse(text);
        if (json.events) {
          const segments: TranscriptSegment[] = json.events
            .filter((e: any) => e.segs && e.segs.length > 0)
            .map((e: any) => ({
              text: e.segs.map((s: any) => s.utf8).join("").trim(),
              start: (e.tStartMs || 0) / 1000,
              duration: (e.dDurationMs || 0) / 1000,
            }))
            .filter((s: TranscriptSegment) => s.text.length > 0);

          if (segments.length > 0) {
            console.log("  Parsed", segments.length, "segments from JSON");
            return {
              segments,
              fullText: segments.map(s => s.text).join(" "),
              language,
              videoId,
              source: "innertube",
            };
          }
        }
      } catch (e) {
        console.log("  JSON parse failed, trying XML...");
      }
    }

    // Try XML format
    const xmlSegments = parseXMLCaptions(text);
    if (xmlSegments.length > 0) {
      console.log("  Parsed", xmlSegments.length, "segments from XML");
      return {
        segments: xmlSegments,
        fullText: xmlSegments.map(s => s.text).join(" "),
        language,
        videoId,
        source: "innertube",
      };
    }

    console.log("  Could not parse caption track response");
    return null;
  } catch (error: any) {
    console.log("  Error fetching caption track:", error?.message || error);
    return null;
  }
}

/**
 * Parse XML format captions (fallback format)
 */
function parseXMLCaptions(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];

  // Match <text> elements with start and dur attributes
  const regex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    // Decode HTML entities
    const text = match[3]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\n/g, " ")
      .trim();

    if (text.length > 0) {
      segments.push({ text, start, duration });
    }
  }

  return segments;
}

/**
 * Fetches transcript for a YouTube video using multiple fallback methods
 * This ensures maximum reliability - tries multiple methods until one succeeds
 * Automatically caches transcripts for 7 days for instant loading
 */
export async function fetchYoutubeTranscript(
  videoId: string,
  languageCode: string = "en"
): Promise<TranscriptResult> {
  console.log("📝 Fetching transcript for:", videoId, "lang:", languageCode);

  try {
    // METHOD 0: Check cache first (fastest - instant)
    const cached = await getCachedTranscript(videoId);
    if (cached) {
      console.log("✅ METHOD 0: Loaded from cache (instant)");
      return cached;
    }

    // METHOD 1: Try Innertube API (most reliable in 2025)
    try {
      console.log("⏳ METHOD 1: Trying Innertube API...");
      const result = await Promise.race([
        tryInnertubeAPI(videoId),
        timeout(FETCH_TIMEOUT, "Method 1 timeout")
      ]);

      if (result) {
        console.log("✅ METHOD 1: Success -", result.segments.length, "segments");
        await cacheTranscript(videoId, result);
        return result;
      } else {
        console.log("❌ METHOD 1 returned null/empty");
      }
    } catch (error: any) {
      console.log("❌ METHOD 1 failed:", error?.message || "Unknown error");
    }

    // METHOD 2: Try youtube-caption-extractor (legacy fallback)
    try {
      console.log("⏳ METHOD 2: Trying youtube-caption-extractor...");
      const result = await Promise.race([
        tryYoutubeCaptionExtractor(videoId, languageCode),
        timeout(FETCH_TIMEOUT, "Method 2 timeout")
      ]);

      if (result) {
        console.log("✅ METHOD 2: Success -", result.segments.length, "segments");
        await cacheTranscript(videoId, result);
        return result;
      } else {
        console.log("❌ METHOD 2 returned null/empty");
      }
    } catch (error: any) {
      console.log("❌ METHOD 2 failed:", error?.message || "Unknown error");
    }

    // METHOD 3: Try youtube-transcript package (legacy fallback)
    try {
      console.log("⏳ METHOD 3: Trying youtube-transcript package...");
      const result = await Promise.race([
        tryYoutubeTranscriptPackage(videoId),
        timeout(FETCH_TIMEOUT, "Method 3 timeout")
      ]);

      if (result) {
        console.log("✅ METHOD 3: Success -", result.segments.length, "segments");
        await cacheTranscript(videoId, result);
        return result;
      } else {
        console.log("❌ METHOD 3 returned null/empty");
      }
    } catch (error: any) {
      console.log("❌ METHOD 3 failed:", error?.message || "Unknown error");
    }

    // All methods failed - this is an expected case for videos without captions
    console.log("⚠️ No transcript available for this video (captions may be disabled or unavailable)");
    return {
      segments: [],
      fullText: "",
      language: languageCode,
      videoId,
      source: "captions",
    };

  } catch (error) {
    // Log without using console.error to avoid noisy stack traces for expected failures
    console.log("⚠️ Transcript fetch issue:", error instanceof Error ? error.message : "Unknown error");
    return {
      segments: [],
      fullText: "",
      language: languageCode,
      videoId,
      source: "captions",
    };
  }
}

/**
 * Timeout helper for Promise.race
 */
function timeout(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(message)), ms)
  );
}

/**
 * METHOD 2: youtube-caption-extractor (legacy)
 */
async function tryYoutubeCaptionExtractor(
  videoId: string,
  languageCode: string
): Promise<TranscriptResult | null> {
  // Lazy load the module on first use
  if (!getSubtitles) {
    try {
      console.log("  Loading youtube-caption-extractor module...");
      const module = await import("youtube-caption-extractor");
      getSubtitles = module.getSubtitles;
      console.log("  Module loaded successfully");
    } catch (e: any) {
      console.log("  Failed to load youtube-caption-extractor:", e?.message || e);
      return null;
    }
  }

  console.log("  Calling getSubtitles for videoID:", videoId, "lang:", languageCode);
  const captions = await getSubtitles({
    videoID: videoId,
    lang: languageCode
  });
  console.log("  getSubtitles returned:", captions ? captions.length + " captions" : "null/undefined");

  if (!captions || captions.length === 0) {
    return null;
  }

  const segments: TranscriptSegment[] = captions.map((caption) => ({
    text: caption.text,
    start: parseFloat(caption.start),
    duration: parseFloat(caption.dur),
  }));

  const fullText = segments.map((seg) => seg.text).join(" ");

  return {
    segments,
    fullText,
    language: languageCode,
    videoId,
    source: "captions",
  };
}

/**
 * METHOD 3: youtube-transcript package (legacy)
 */
async function tryYoutubeTranscriptPackage(
  videoId: string
): Promise<TranscriptResult | null> {
  // Lazy load the module on first use
  if (!YoutubeTranscript) {
    try {
      console.log("  Loading youtube-transcript module...");
      const module = await import("youtube-transcript");
      YoutubeTranscript = module.YoutubeTranscript;
      console.log("  Module loaded successfully");
    } catch (e: any) {
      console.log("  Failed to load youtube-transcript:", e?.message || e);
      return null;
    }
  }

  console.log("  Calling YoutubeTranscript.fetchTranscript for:", videoId);
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  console.log("  fetchTranscript returned:", transcript ? transcript.length + " items" : "null/undefined");

  if (!transcript || transcript.length === 0) {
    return null;
  }

  // Convert from youtube-transcript format (milliseconds) to our format (seconds)
  const segments: TranscriptSegment[] = transcript.map((item: any) => ({
    text: item.text,
    start: item.offset / 1000,
    duration: item.duration / 1000,
  }));

  const fullText = segments.map((seg) => seg.text).join(" ");

  return {
    segments,
    fullText,
    language: "en",
    videoId,
    source: "captions",
  };
}

/**
 * Format timestamp in seconds to readable time (MM:SS or HH:MM:SS)
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Clear all cached transcripts from AsyncStorage
 * Useful for freeing up space or when cache becomes corrupted
 */
export async function clearTranscriptCache(): Promise<number> {
  try {
    console.log("🗑️ Clearing transcript cache...");
    const allKeys = await AsyncStorage.getAllKeys();
    const transcriptKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));

    if (transcriptKeys.length > 0) {
      await AsyncStorage.multiRemove(transcriptKeys);
      console.log(`✅ Cleared ${transcriptKeys.length} cached transcripts`);
      return transcriptKeys.length;
    }

    console.log("No cached transcripts to clear");
    return 0;
  } catch (error) {
    console.error("Error clearing transcript cache:", error);
    return 0;
  }
}

/**
 * Search for text within transcript segments
 * Returns segments that contain the search query
 */
export function searchTranscript(
  segments: TranscriptSegment[],
  query: string
): TranscriptSegment[] {
  const lowerQuery = query.toLowerCase();
  return segments.filter((segment) =>
    segment.text.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get transcript text for a specific time range
 */
export function getTranscriptRange(
  segments: TranscriptSegment[],
  startTime: number,
  endTime: number
): string {
  return segments
    .filter((seg) => seg.start >= startTime && seg.start <= endTime)
    .map((seg) => seg.text)
    .join(" ");
}
