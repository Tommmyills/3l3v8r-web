import { Language } from "../state/voiceAssistStore";

// Google Translate language codes (same as our Language type)
const GOOGLE_LANG_CODES: Record<Language, string> = {
  en: "en",
  es: "es",
  de: "de",
  fr: "fr",
  pt: "pt",
  ja: "ja",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  ko: "ko",
  ar: "ar",
  hi: "hi",
  ru: "ru",
  it: "it",
  nl: "nl",
  pl: "pl",
  tr: "tr",
  vi: "vi",
  th: "th",
  id: "id",
  ms: "ms",
  sv: "sv",
  da: "da",
  no: "no",
  fi: "fi",
  el: "el",
  he: "he",
  cs: "cs",
  ro: "ro",
  hu: "hu",
  uk: "uk",
  bn: "bn",
  ta: "ta",
  te: "te",
  mr: "mr",
  gu: "gu",
  kn: "kn",
  ml: "ml",
  pa: "pa",
  ur: "ur",
  fa: "fa",
  sw: "sw",
  tl: "tl",
  af: "af",
  ca: "ca",
  hr: "hr",
  sk: "sk",
  sl: "sl",
  bg: "bg",
  sr: "sr",
  lt: "lt",
  lv: "lv",
  et: "et",
};

// Maximum characters per request (Google has ~5000 char limit for the free API)
const MAX_CHARS_PER_REQUEST = 4500;

/**
 * Make a single translation request to Google Translate
 */
async function translateChunk(
  text: string,
  sourceCode: string,
  targetCode: string
): Promise<string> {
  // Use the free Google Translate web API
  const encodedText = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${targetCode}&dt=t&q=${encodedText}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Google Translate API error: ${response.status}`);
  }

  const data = await response.json();

  // The response format is an array where data[0] contains translation segments
  // Each segment is [translatedText, originalText, ...]
  let translatedText = "";
  if (data && data[0]) {
    for (const segment of data[0]) {
      if (segment && segment[0]) {
        translatedText += segment[0];
      }
    }
  }

  return translatedText;
}

/**
 * Translate text using Google Translate (free web API)
 * Handles large texts by chunking
 */
export async function translateText(
  text: string,
  sourceLang: Language,
  targetLang: Language
): Promise<string> {
  console.log("[GoogleTranslate] ======== TRANSLATE CALLED ========");
  console.log("[GoogleTranslate] Source:", sourceLang, "-> Target:", targetLang);
  console.log("[GoogleTranslate] Text length:", text.length);

  // If source and target are the same, no translation needed
  if (sourceLang === targetLang) {
    console.log("[GoogleTranslate] Source and target are the same, skipping translation");
    return text;
  }

  // If target is English and source is English, no translation needed
  if (targetLang === "en" && sourceLang === "en") {
    console.log("[GoogleTranslate] Target is English, skipping translation");
    return text;
  }

  try {
    const targetCode = GOOGLE_LANG_CODES[targetLang];
    const sourceCode = GOOGLE_LANG_CODES[sourceLang];

    console.log("[GoogleTranslate] Calling Google Translate...");

    // If text is small enough, translate in one call
    if (text.length <= MAX_CHARS_PER_REQUEST) {
      const result = await translateChunk(text, sourceCode, targetCode);
      if (!result) {
        console.warn("[GoogleTranslate] No translation returned, using original");
        return text;
      }
      console.log("[GoogleTranslate] Translation complete, length:", result.length);
      return result;
    }

    // For larger texts, split by sentences and translate in batches
    console.log("[GoogleTranslate] Text too large, splitting into chunks...");

    // Split by sentence boundaries
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      if ((currentChunk + " " + sentence).length > MAX_CHARS_PER_REQUEST && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk = currentChunk ? currentChunk + " " + sentence : sentence;
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    console.log("[GoogleTranslate] Split into", chunks.length, "chunks");

    // Translate each chunk
    const translatedChunks: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log("[GoogleTranslate] Translating chunk", i + 1, "of", chunks.length);
      const translated = await translateChunk(chunks[i], sourceCode, targetCode);
      translatedChunks.push(translated || chunks[i]);

      // Small delay to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const result = translatedChunks.join(" ");
    console.log("[GoogleTranslate] Translation complete, total length:", result.length);
    return result;

  } catch (error: any) {
    console.error("[GoogleTranslate] Translation error:", error);
    // Fallback to original text if translation fails
    return text;
  }
}

/**
 * Translate multiple segments using Google Translate
 * Batches segments together for efficiency while respecting size limits
 */
export async function translateFullTranscript(
  segments: string[],
  targetLang: Language,
  sourceLang: Language = "en"
): Promise<string[]> {
  console.log("[GoogleTranslate] ======== TRANSLATE FULL TRANSCRIPT ========");
  console.log("[GoogleTranslate] Number of segments:", segments.length);
  console.log("[GoogleTranslate] Source:", sourceLang, "-> Target:", targetLang);

  // If no translation needed
  if (sourceLang === targetLang) {
    console.log("[GoogleTranslate] Source and target are the same, skipping");
    return segments;
  }

  if (targetLang === "en" && sourceLang === "en") {
    console.log("[GoogleTranslate] Target is English, skipping");
    return segments;
  }

  try {
    const targetCode = GOOGLE_LANG_CODES[targetLang];
    const sourceCode = GOOGLE_LANG_CODES[sourceLang];
    const DELIMITER = " ||| ";

    // Group segments into batches that fit within the character limit
    const batches: { segments: string[]; indices: number[] }[] = [];
    let currentBatch: string[] = [];
    let currentIndices: number[] = [];
    let currentLength = 0;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentWithDelimiter = segment + DELIMITER;

      if (currentLength + segmentWithDelimiter.length > MAX_CHARS_PER_REQUEST && currentBatch.length > 0) {
        batches.push({ segments: currentBatch, indices: currentIndices });
        currentBatch = [segment];
        currentIndices = [i];
        currentLength = segmentWithDelimiter.length;
      } else {
        currentBatch.push(segment);
        currentIndices.push(i);
        currentLength += segmentWithDelimiter.length;
      }
    }

    if (currentBatch.length > 0) {
      batches.push({ segments: currentBatch, indices: currentIndices });
    }

    console.log("[GoogleTranslate] Split into", batches.length, "batches");

    // Translate each batch
    const translatedSegments: string[] = [...segments]; // Start with originals as fallback

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      console.log("[GoogleTranslate] Translating batch", batchIdx + 1, "of", batches.length, "(", batch.segments.length, "segments)");

      const batchText = batch.segments.join(DELIMITER);

      try {
        const translatedBatchText = await translateChunk(batchText, sourceCode, targetCode);

        if (translatedBatchText) {
          const translatedParts = translatedBatchText.split(DELIMITER);

          // Map translated parts back to their original indices
          for (let i = 0; i < Math.min(translatedParts.length, batch.indices.length); i++) {
            translatedSegments[batch.indices[i]] = translatedParts[i].trim();
          }
        }
      } catch (batchError) {
        console.error("[GoogleTranslate] Batch", batchIdx + 1, "failed:", batchError);
        // Keep original segments for this batch
      }

      // Small delay between batches to avoid rate limiting
      if (batchIdx < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }

    console.log("[GoogleTranslate] Translation complete");
    return translatedSegments;

  } catch (error: any) {
    console.error("[GoogleTranslate] Translation error:", error);
    // Fallback to original segments if translation fails
    return segments;
  }
}

/**
 * Translate text in chunks to handle longer content
 */
export async function translateTextInChunks(
  text: string,
  sourceLang: Language,
  targetLang: Language,
  chunkSize: number = MAX_CHARS_PER_REQUEST
): Promise<string> {
  // translateText already handles chunking internally
  return translateText(text, sourceLang, targetLang);
}
