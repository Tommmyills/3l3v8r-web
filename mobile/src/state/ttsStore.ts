import { create } from "zustand";
import * as NativeTTS from "../utils/nativeTTS";
import { translateText } from "../utils/translator";
import { Language, VoiceStyle } from "./voiceAssistStore";

export type TTSStatus = "idle" | "listening" | "processing" | "speaking";

interface TTSState {
  // Current text being processed
  currentTextChunk: string;

  // Status for animation purposes
  status: TTSStatus;

  // Internal cycling state
  isCycling: boolean;
  cycleInterval: NodeJS.Timeout | null;

  // TTS settings (from Voice Assist)
  language: Language;
  voiceStyle: VoiceStyle;

  // Actions
  setCurrentTextChunk: (text: string, language?: Language, voiceStyle?: VoiceStyle) => void;
  setStatus: (status: TTSStatus) => void;
  setLanguage: (language: Language) => void;
  setVoiceStyle: (voiceStyle: VoiceStyle) => void;
  startStatusCycle: (shouldSpeak?: boolean, overrideLang?: Language, overrideVoice?: VoiceStyle) => void;
  stopStatusCycle: () => void;
  reset: () => void;
}

// Status cycle sequence: listening → processing → speaking → idle
const STATUS_SEQUENCE: TTSStatus[] = ["listening", "processing", "speaking", "idle"];
const CYCLE_INTERVAL = 1000; // 1 second per status

export const useTTSStore = create<TTSState>((set, get) => ({
  currentTextChunk: "",
  status: "idle",
  isCycling: false,
  cycleInterval: null,
  language: "en",
  voiceStyle: "neutral-female",

  setCurrentTextChunk: (text, language, voiceStyle) => {
    console.log("[TTS Store] ======== setCurrentTextChunk CALLED ========");
    console.log("[TTS Store] Text length:", text?.length || 0);
    console.log("[TTS Store] Language param:", language);
    console.log("[TTS Store] VoiceStyle param:", voiceStyle);
    console.log("[TTS Store] Current store language BEFORE update:", get().language);

    // Determine final values - use passed params or fall back to current store values
    const finalLanguage = language || get().language;
    const finalVoiceStyle = voiceStyle || get().voiceStyle;

    console.log("[TTS Store] Final language to use:", finalLanguage);
    console.log("[TTS Store] Final voiceStyle to use:", finalVoiceStyle);

    // Update state with all values at once
    set({
      currentTextChunk: text,
      language: finalLanguage,
      voiceStyle: finalVoiceStyle,
    });

    console.log("[TTS Store] State updated. New language in store:", finalLanguage);

    // If text is provided and we're not already cycling, start the cycle
    // IMPORTANT: Pass the language directly to avoid race condition
    if (text && text.trim().length > 0 && !get().isCycling) {
      console.log("[TTS Store] Starting cycle with language:", finalLanguage);
      get().startStatusCycle(true, finalLanguage, finalVoiceStyle);
    }
  },

  setStatus: (status) => set({ status }),

  setLanguage: (language) => {
    console.log("[TTS Store] setLanguage called with:", language);
    set({ language });
  },

  setVoiceStyle: (voiceStyle) => set({ voiceStyle }),

  startStatusCycle: (shouldSpeak = false, overrideLang?: Language, overrideVoice?: VoiceStyle) => {
    const state = get();

    console.log("[TTS Store] ======== startStatusCycle CALLED ========");
    console.log("[TTS Store] shouldSpeak:", shouldSpeak);
    console.log("[TTS Store] overrideLang:", overrideLang);
    console.log("[TTS Store] overrideVoice:", overrideVoice);
    console.log("[TTS Store] store language:", state.language);

    // Don't start if already cycling
    if (state.isCycling) {
      console.log("[TTS Store] Already cycling, skipping");
      return;
    }

    // Clear any existing interval
    if (state.cycleInterval) {
      clearInterval(state.cycleInterval);
    }

    // Use override values if provided, otherwise use store values
    const speakLanguage = overrideLang || state.language;
    const speakVoiceStyle = overrideVoice || state.voiceStyle;

    console.log("[TTS Store] Will speak in language:", speakLanguage);
    console.log("[TTS Store] Will use voice style:", speakVoiceStyle);

    let currentIndex = 0;

    // Start the cycle
    set({
      isCycling: true,
      status: STATUS_SEQUENCE[0] // Start with "listening"
    });

    const interval = setInterval(() => {
      currentIndex++;

      if (currentIndex >= STATUS_SEQUENCE.length) {
        // Cycle complete, stop
        clearInterval(interval);
        set({
          isCycling: false,
          cycleInterval: null,
          status: "idle"
        });
      } else {
        const nextStatus = STATUS_SEQUENCE[currentIndex];
        set({ status: nextStatus });

        // If we've reached "speaking" status and shouldSpeak is true, trigger native TTS
        if (nextStatus === "speaking" && shouldSpeak) {
          const { currentTextChunk } = get();

          console.log("[TTS] ======== SPEAKING PHASE ========");
          console.log("[TTS] Text to speak (first 50 chars):", currentTextChunk.substring(0, 50) + "...");
          console.log("[TTS] Target language:", speakLanguage);
          console.log("[TTS] Voice style:", speakVoiceStyle);

          if (currentTextChunk.trim()) {
            // Translate the text if target language is not English
            (async () => {
              try {
                console.log("[TTS] Source language: en, Target language:", speakLanguage);

                // Assume source is English, translate to target language
                const textToSpeak = await translateText(
                  currentTextChunk,
                  "en", // Source language (assuming English)
                  speakLanguage // Target language - use the captured value!
                );

                console.log("[TTS] Translated text (first 50 chars):", textToSpeak.substring(0, 50) + "...");
                console.log("[TTS] Translation complete, now speaking in", speakLanguage);

                NativeTTS.speak({
                  text: textToSpeak,
                  voiceStyle: speakVoiceStyle,
                  language: speakLanguage,
                  onStart: () => {
                    console.log("[TTS] Native TTS started in language:", speakLanguage);
                  },
                  onDone: () => {
                    console.log("[TTS] Native TTS completed");
                  },
                  onError: (error) => {
                    console.error("[TTS] Native TTS error:", error);
                  },
                });
              } catch (error) {
                console.error("[TTS] Translation error:", error);
                // Fallback to speaking original text in target language
                NativeTTS.speak({
                  text: currentTextChunk,
                  voiceStyle: speakVoiceStyle,
                  language: speakLanguage,
                  onStart: () => console.log("[TTS] Native TTS started (fallback)"),
                  onDone: () => console.log("[TTS] Native TTS completed (fallback)"),
                  onError: (error) => console.error("[TTS] Native TTS error:", error),
                });
              }
            })();
          }
        }
      }
    }, CYCLE_INTERVAL);

    set({ cycleInterval: interval });
  },

  stopStatusCycle: () => {
    const state = get();

    // Stop native TTS if speaking
    NativeTTS.stop();

    if (state.cycleInterval) {
      clearInterval(state.cycleInterval);
    }

    set({
      isCycling: false,
      cycleInterval: null,
      status: "idle"
    });
  },

  reset: () => {
    const state = get();

    // Stop native TTS if speaking
    NativeTTS.stop();

    if (state.cycleInterval) {
      clearInterval(state.cycleInterval);
    }

    set({
      currentTextChunk: "",
      status: "idle",
      isCycling: false,
      cycleInterval: null,
    });
  },
}));
