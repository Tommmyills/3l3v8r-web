/**
 * YouTube Transcript Fetcher
 * Uses multiple fallback methods for bulletproof transcript extraction
 * Method 0: Cache (instant)
 * Method 1: YouTube Transcript API proxy (most reliable in 2025)
 * Method 2: Direct Innertube API
 * Method 3: youtube-caption-extractor (legacy fallback)
 * Method 4: youtube-transcript package (legacy fallback)
 * Caches transcripts locally for instant loading on repeat visits
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Lazy-loaded modules - prevents crash on app startup
let getSubtitles: typeof import("youtube-caption-extractor").getSubtitles | null = null;
let YoutubeTranscript: typeof import("youtube-transcript").YoutubeTranscript | null = null;

// Cache configuration
const CACHE_PREFIX = "transcript_";
const CACHE_EXPIRY_DAYS = 7;
const FETCH_TIMEOUT = 20000; // 20 seconds max per method

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
  source?: "captions" | "whisper" | "innertube" | "api"; // Track how we got the transcript
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
 * METHOD 1: Use public transcript API services
 * These services act as proxies and can bypass YouTube's restrictions
 */
async function tryTranscriptAPI(videoId: string): Promise<TranscriptResult | null> {
  // Try multiple public APIs - ordered by reliability
  const apis = [
    {
      name: "tactiq.io",
      url: `https://tactiq-apps-prod.tactiq.io/transcript?videoId=${videoId}&langCode=en`,
      parser: parseTactiqResponse,
    },
    {
      name: "youtubetranscript.com",
      url: `https://youtubetranscript.com/?server_vid2=${videoId}`,
      parser: parseYoutubeTranscriptCom,
    },
    {
      name: "kome.ai",
      url: `https://kome.ai/api/transcript?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      parser: parseKomeAI,
    },
  ];

  for (const api of apis) {
    try {
      console.log(`  Trying ${api.name}...`);
      const response = await fetch(api.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          "Accept": "application/json, text/html, */*",
          "Origin": "https://tactiq.io",
          "Referer": "https://tactiq.io/",
        },
      });

      if (!response.ok) {
        console.log(`  ${api.name} returned ${response.status}`);
        continue;
      }

      const data = await response.text();
      console.log(`  ${api.name} response length: ${data.length}`);

      // Skip if response is too short (likely an error message)
      if (data.length < 500) {
        console.log(`  ${api.name} response too short, likely an error. Content: ${data.slice(0, 200)}`);
        continue;
      }

      const result = api.parser(data, videoId);
      // Require at least 5 segments to be considered valid (not just an error message parsed incorrectly)
      if (result && result.segments.length >= 5) {
        console.log(`  ${api.name} success: ${result.segments.length} segments`);
        return result;
      } else if (result) {
        console.log(`  ${api.name} only found ${result.segments.length} segments, likely invalid`);
      }
    } catch (e: any) {
      console.log(`  ${api.name} error:`, e?.message || e);
    }
  }

  return null;
}

/**
 * Parse response from tactiq.io API
 */
function parseTactiqResponse(data: string, videoId: string): TranscriptResult | null {
  try {
    const json = JSON.parse(data);

    // Check for error response
    if (json.error || json.message) {
      console.log("  Tactiq error:", json.error || json.message);
      return null;
    }

    // Tactiq returns captions array
    if (json.captions && Array.isArray(json.captions)) {
      const segments: TranscriptSegment[] = json.captions.map((item: any) => ({
        text: item.text || "",
        start: (item.start || item.startMs || 0) / 1000,
        duration: (item.duration || item.durationMs || 2000) / 1000,
      })).filter((s: TranscriptSegment) => s.text.length > 0);

      if (segments.length > 0) {
        return {
          segments,
          fullText: segments.map(s => s.text).join(" "),
          language: json.languageCode || "en",
          videoId,
          source: "api",
        };
      }
    }

    // Alternative format
    if (json.transcript && typeof json.transcript === "string") {
      // Single string transcript - split by sentences
      const text = json.transcript;
      const segments: TranscriptSegment[] = [{
        text: text,
        start: 0,
        duration: 0,
      }];

      return {
        segments,
        fullText: text,
        language: "en",
        videoId,
        source: "api",
      };
    }
  } catch (e) {
    console.log("  Error parsing tactiq response:", e);
  }
  return null;
}

/**
 * Parse response from youtubetranscript.com
 */
function parseYoutubeTranscriptCom(html: string, videoId: string): TranscriptResult | null {
  try {
    // The response is HTML with transcript data
    // Look for transcript text in various formats
    const segments: TranscriptSegment[] = [];

    // Try to find XML-style transcript data
    const xmlMatch = html.match(/<transcript[^>]*>([\s\S]*?)<\/transcript>/i);
    if (xmlMatch) {
      const xmlSegments = parseXMLCaptions(xmlMatch[1]);
      if (xmlSegments.length > 0) {
        return {
          segments: xmlSegments,
          fullText: xmlSegments.map(s => s.text).join(" "),
          language: "en",
          videoId,
          source: "api",
        };
      }
    }

    // Try to find JSON data
    const jsonMatch = html.match(/\[[\s\S]*?"text"[\s\S]*?\]/);
    if (jsonMatch) {
      try {
        const items = JSON.parse(jsonMatch[0]);
        for (const item of items) {
          if (item.text) {
            segments.push({
              text: item.text,
              start: item.start || item.offset || 0,
              duration: item.duration || item.dur || 2,
            });
          }
        }
      } catch (e) {
        // Not valid JSON
      }
    }

    // Try parsing text content directly
    const textMatches = html.matchAll(/<text[^>]*start="([^"]+)"[^>]*dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/gi);
    for (const match of textMatches) {
      segments.push({
        start: parseFloat(match[1]),
        duration: parseFloat(match[2]),
        text: decodeHTMLEntities(match[3]),
      });
    }

    if (segments.length > 0) {
      return {
        segments,
        fullText: segments.map(s => s.text).join(" "),
        language: "en",
        videoId,
        source: "api",
      };
    }
  } catch (e) {
    console.log("  Error parsing youtubetranscript.com:", e);
  }
  return null;
}

/**
 * Parse response from kome.ai
 */
function parseKomeAI(data: string, videoId: string): TranscriptResult | null {
  try {
    const json = JSON.parse(data);
    if (json.transcript && Array.isArray(json.transcript)) {
      const segments: TranscriptSegment[] = json.transcript.map((item: any) => ({
        text: item.text || item.content || "",
        start: item.start || item.offset || 0,
        duration: item.duration || 2,
      })).filter((s: TranscriptSegment) => s.text.length > 0);

      if (segments.length > 0) {
        return {
          segments,
          fullText: segments.map(s => s.text).join(" "),
          language: json.language || "en",
          videoId,
          source: "api",
        };
      }
    }
  } catch (e) {
    console.log("  Error parsing kome.ai:", e);
  }
  return null;
}

/**
 * Decode HTML entities in text
 */
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/\n/g, " ")
    .trim();
}

/**
 * METHOD 2: Direct Innertube API (most reliable as of 2025)
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
    // Try XML format first (more reliable), then JSON
    // Remove any existing fmt parameter and request XML
    let url = baseUrl;

    console.log("  Fetching caption track (XML format)...");
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/xml, application/xml, */*",
      },
    });

    if (!response.ok) {
      console.log("  Caption track fetch failed:", response.status);
      return null;
    }

    const text = await response.text();
    console.log("  Response length:", text.length, "chars, starts with:", text.slice(0, 100));

    // Try XML format first (YouTube's default)
    if (text.includes("<transcript>") || text.includes("<text ") || text.includes("<?xml")) {
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
    }

    // Try JSON format
    if (text.startsWith("{") || text.includes('"events"')) {
      try {
        const json = JSON.parse(text);
        console.log("  JSON keys:", Object.keys(json).join(", "));
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
        console.log("  JSON parse failed:", e);
      }
    }

    // Try alternative XML parsing for different formats
    const altSegments = parseXMLCaptionsAlt(text);
    if (altSegments.length > 0) {
      console.log("  Parsed", altSegments.length, "segments from alt XML");
      return {
        segments: altSegments,
        fullText: altSegments.map((s: TranscriptSegment) => s.text).join(" "),
        language,
        videoId,
        source: "innertube",
      };
    }

    console.log("  Could not parse caption track response. Sample:", text.slice(0, 300));
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
    const text = decodeHTMLEntities(match[3]);

    if (text.length > 0) {
      segments.push({ text, start, duration });
    }
  }

  return segments;
}

/**
 * Alternative XML parsing for different caption formats
 */
function parseXMLCaptionsAlt(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];

  // Try matching with single quotes or different attribute order
  const patterns = [
    /<text[^>]*start=['"]([^'"]+)['"][^>]*dur=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/text>/gi,
    /<p[^>]*t=['"]([^'"]+)['"][^>]*d=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/p>/gi,
    /<s[^>]*t=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/s>/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(xml)) !== null) {
      const start = parseFloat(match[1]) / (match[1].includes(".") ? 1 : 1000); // Handle ms vs seconds
      const duration = match[2] ? parseFloat(match[2]) / (match[2].includes(".") ? 1 : 1000) : 2;
      const text = decodeHTMLEntities((match[3] || match[2]).replace(/<[^>]+>/g, "")); // Remove any inner tags

      if (text.length > 0) {
        segments.push({ text, start, duration });
      }
    }

    if (segments.length > 0) break;
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

    // METHOD 1: Try transcript API services (most reliable - bypasses YouTube blocks)
    try {
      console.log("⏳ METHOD 1: Trying transcript API services...");
      const result = await Promise.race([
        tryTranscriptAPI(videoId),
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

    // METHOD 2: Try Innertube API
    try {
      console.log("⏳ METHOD 2: Trying Innertube API...");
      const result = await Promise.race([
        tryInnertubeAPI(videoId),
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

    // METHOD 3: Try youtube-caption-extractor (legacy fallback)
    try {
      console.log("⏳ METHOD 3: Trying youtube-caption-extractor...");
      const result = await Promise.race([
        tryYoutubeCaptionExtractor(videoId, languageCode),
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

    // METHOD 4: Try youtube-transcript package (legacy fallback)
    try {
      console.log("⏳ METHOD 4: Trying youtube-transcript package...");
      const result = await Promise.race([
        tryYoutubeTranscriptPackage(videoId),
        timeout(FETCH_TIMEOUT, "Method 4 timeout")
      ]);

      if (result) {
        console.log("✅ METHOD 4: Success -", result.segments.length, "segments");
        await cacheTranscript(videoId, result);
        return result;
      } else {
        console.log("❌ METHOD 4 returned null/empty");
      }
    } catch (error: any) {
      console.log("❌ METHOD 4 failed:", error?.message || "Unknown error");
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
 * METHOD 3: youtube-caption-extractor (legacy)
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
 * METHOD 4: youtube-transcript package (legacy)
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
 * Clear cached transcript for a specific video
 * Useful when a bad/incomplete transcript was cached
 */
export async function clearTranscriptCacheForVideo(videoId: string): Promise<boolean> {
  try {
    const cacheKey = `${CACHE_PREFIX}${videoId}`;
    await AsyncStorage.removeItem(cacheKey);
    console.log(`🗑️ Cleared cached transcript for ${videoId}`);
    return true;
  } catch (error) {
    console.error("Error clearing transcript cache for video:", error);
    return false;
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
