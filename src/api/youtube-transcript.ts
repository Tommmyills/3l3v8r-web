/**
 * YouTube Transcript Fetcher
 * Uses multiple fallback methods for bulletproof transcript extraction
 * Method 0: Cache (instant)
 * Method 1: youtube-caption-extractor (fast)
 * Method 2: youtube-transcript package (reliable fallback)
 * Caches transcripts locally for instant loading on repeat visits
 *
 * NOTE: Uses dynamic imports to prevent crashes on app startup
 * The youtube packages use Node.js APIs that can crash on some iOS versions
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
  source?: "captions" | "whisper"; // Track how we got the transcript
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
 * Fetches transcript for a YouTube video using multiple fallback methods
 * This ensures maximum reliability - tries 3 different methods until one succeeds
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

    // METHOD 1: Try youtube-caption-extractor (fast, works on most videos)
    try {
      console.log("⏳ METHOD 1: Trying youtube-caption-extractor...");
      const result = await Promise.race([
        tryYoutubeCaptionExtractor(videoId, languageCode),
        timeout(FETCH_TIMEOUT, "Method 1 timeout")
      ]);

      if (result) {
        console.log("✅ METHOD 1: Success -", result.segments.length, "segments");
        await cacheTranscript(videoId, result);
        return result;
      }
    } catch (error: any) {
      console.log("❌ METHOD 1 failed:", error?.message || "Unknown error");
    }

    // METHOD 2: Try youtube-transcript package (reliable fallback)
    try {
      console.log("⏳ METHOD 2: Trying youtube-transcript package...");
      const result = await Promise.race([
        tryYoutubeTranscriptPackage(videoId),
        timeout(FETCH_TIMEOUT, "Method 2 timeout")
      ]);

      if (result) {
        console.log("✅ METHOD 2: Success -", result.segments.length, "segments");
        await cacheTranscript(videoId, result);
        return result;
      }
    } catch (error: any) {
      console.log("❌ METHOD 2 failed:", error?.message || "Unknown error");
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
 * METHOD 1: youtube-caption-extractor
 */
async function tryYoutubeCaptionExtractor(
  videoId: string,
  languageCode: string
): Promise<TranscriptResult | null> {
  // Lazy load the module on first use
  if (!getSubtitles) {
    try {
      const module = await import("youtube-caption-extractor");
      getSubtitles = module.getSubtitles;
    } catch (e) {
      console.log("Failed to load youtube-caption-extractor:", e);
      return null;
    }
  }

  const captions = await getSubtitles({
    videoID: videoId,
    lang: languageCode
  });

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
 * METHOD 2: youtube-transcript package
 */
async function tryYoutubeTranscriptPackage(
  videoId: string
): Promise<TranscriptResult | null> {
  // Lazy load the module on first use
  if (!YoutubeTranscript) {
    try {
      const module = await import("youtube-transcript");
      YoutubeTranscript = module.YoutubeTranscript;
    } catch (e) {
      console.log("Failed to load youtube-transcript:", e);
      return null;
    }
  }

  const transcript = await YoutubeTranscript.fetchTranscript(videoId);

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
