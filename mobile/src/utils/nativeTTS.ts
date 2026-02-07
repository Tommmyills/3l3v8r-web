import * as Speech from "expo-speech";
import { Language, VoiceStyle } from "../state/voiceAssistStore";

// Voice mapping: Map our VoiceStyle to platform-specific voice characteristics
const VOICE_MAPPING: Record<
  VoiceStyle,
  {
    iosPreference: string[]; // Preferred iOS voice identifiers
    androidPreference: { pitch: number; rate: number };
  }
> = {
  "neutral-female": {
    iosPreference: [
      "com.apple.voice.compact.en-US.Samantha",
      "com.apple.ttsbundle.Samantha-compact",
      "Samantha",
    ],
    androidPreference: { pitch: 1.0, rate: 1.0 },
  },
  "neutral-male": {
    iosPreference: [
      "com.apple.voice.compact.en-US.Fred",
      "com.apple.ttsbundle.Fred-compact",
      "Fred",
    ],
    androidPreference: { pitch: 0.8, rate: 1.0 },
  },
  calm: {
    iosPreference: [
      "com.apple.voice.compact.en-US.Nicky",
      "com.apple.ttsbundle.Nicky-compact",
      "Nicky",
    ],
    androidPreference: { pitch: 0.9, rate: 0.85 },
  },
  energetic: {
    iosPreference: [
      "com.apple.voice.compact.en-US.Samantha",
      "com.apple.ttsbundle.Samantha-compact",
      "Samantha",
    ],
    androidPreference: { pitch: 1.2, rate: 1.15 },
  },
  deep: {
    iosPreference: [
      "com.apple.voice.compact.en-US.Aaron",
      "com.apple.ttsbundle.Aaron-compact",
      "Aaron",
    ],
    androidPreference: { pitch: 0.7, rate: 0.95 },
  },
};

// Language code mapping for TTS
const LANGUAGE_CODE_MAP: Record<Language, string> = {
  en: "en-US",
  es: "es-ES",
  de: "de-DE",
  fr: "fr-FR",
  pt: "pt-BR",
  ja: "ja-JP",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  ko: "ko-KR",
  ar: "ar-SA",
  hi: "hi-IN",
  ru: "ru-RU",
  it: "it-IT",
  nl: "nl-NL",
  pl: "pl-PL",
  tr: "tr-TR",
  vi: "vi-VN",
  th: "th-TH",
  id: "id-ID",
  ms: "ms-MY",
  sv: "sv-SE",
  da: "da-DK",
  no: "nb-NO",
  fi: "fi-FI",
  el: "el-GR",
  he: "he-IL",
  cs: "cs-CZ",
  ro: "ro-RO",
  hu: "hu-HU",
  uk: "uk-UA",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  pa: "pa-IN",
  ur: "ur-PK",
  fa: "fa-IR",
  sw: "sw-KE",
  tl: "fil-PH",
  af: "af-ZA",
  ca: "ca-ES",
  hr: "hr-HR",
  sk: "sk-SK",
  sl: "sl-SI",
  bg: "bg-BG",
  sr: "sr-RS",
  lt: "lt-LT",
  lv: "lv-LV",
  et: "et-EE",
};

export interface TTSOptions {
  text: string;
  voiceStyle: VoiceStyle;
  language: Language;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Speak text using native TTS engine
 */
export const speak = async (options: TTSOptions): Promise<void> => {
  const { text, voiceStyle, language, onStart, onDone, onError } = options;

  // Stop any ongoing speech
  await stop();

  try {
    // Get language code
    const languageCode = LANGUAGE_CODE_MAP[language] || "en-US";

    // Get available voices
    const availableVoices = await Speech.getAvailableVoicesAsync();

    // Find the best matching voice
    let selectedVoice: string | undefined;

    // Try to find iOS-specific voices first
    const iosPreferences = VOICE_MAPPING[voiceStyle].iosPreference;
    for (const voiceId of iosPreferences) {
      const found = availableVoices.find(
        (v) =>
          v.identifier === voiceId ||
          v.name === voiceId ||
          v.identifier.includes(voiceId)
      );
      if (found) {
        selectedVoice = found.identifier;
        break;
      }
    }

    // If no specific voice found, try to find any voice matching the language
    if (!selectedVoice) {
      const languageMatch = availableVoices.find((v) =>
        v.language.startsWith(language)
      );
      if (languageMatch) {
        selectedVoice = languageMatch.identifier;
      }
    }

    // Get Android-specific settings
    const androidSettings = VOICE_MAPPING[voiceStyle].androidPreference;

    // Speak options
    const speakOptions: Speech.SpeechOptions = {
      language: languageCode,
      pitch: androidSettings.pitch,
      rate: androidSettings.rate,
      voice: selectedVoice,
      onStart: () => {
        console.log("TTS started");
        onStart?.();
      },
      onDone: () => {
        console.log("TTS completed");
        onDone?.();
      },
      onStopped: () => {
        console.log("TTS stopped");
        onDone?.();
      },
      onError: (error) => {
        console.error("TTS error:", error);
        onError?.(error);
      },
    };

    // Start speaking
    await Speech.speak(text, speakOptions);
  } catch (error) {
    console.error("TTS speak error:", error);
    const errorObj = error instanceof Error ? error : new Error("Unknown TTS error");
    onError?.(errorObj);
  }
};

/**
 * Stop any ongoing speech
 */
export const stop = async (): Promise<void> => {
  try {
    await Speech.stop();
  } catch (error) {
    console.error("TTS stop error:", error);
  }
};

/**
 * Pause ongoing speech (iOS only)
 */
export const pause = async (): Promise<void> => {
  try {
    await Speech.pause();
  } catch (error) {
    console.error("TTS pause error:", error);
  }
};

/**
 * Resume paused speech (iOS only)
 */
export const resume = async (): Promise<void> => {
  try {
    await Speech.resume();
  } catch (error) {
    console.error("TTS resume error:", error);
  }
};

/**
 * Check if speech is currently active
 */
export const isSpeaking = async (): Promise<boolean> => {
  try {
    return await Speech.isSpeakingAsync();
  } catch (error) {
    console.error("TTS isSpeaking error:", error);
    return false;
  }
};

/**
 * Get all available voices on the device
 */
export const getAvailableVoices = async (): Promise<Speech.Voice[]> => {
  try {
    return await Speech.getAvailableVoicesAsync();
  } catch (error) {
    console.error("TTS getAvailableVoices error:", error);
    return [];
  }
};

/**
 * Get the best voice for a given style and language
 */
export const getBestVoice = async (
  voiceStyle: VoiceStyle,
  language: Language
): Promise<Speech.Voice | null> => {
  try {
    const availableVoices = await getAvailableVoices();
    const iosPreferences = VOICE_MAPPING[voiceStyle].iosPreference;

    // Try iOS-specific voices
    for (const voiceId of iosPreferences) {
      const found = availableVoices.find(
        (v) =>
          v.identifier === voiceId ||
          v.name === voiceId ||
          v.identifier.includes(voiceId)
      );
      if (found) return found;
    }

    // Fallback to language match
    const languageMatch = availableVoices.find((v) =>
      v.language.startsWith(language)
    );
    return languageMatch || null;
  } catch (error) {
    console.error("TTS getBestVoice error:", error);
    return null;
  }
};
