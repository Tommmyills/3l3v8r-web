import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type VoiceAssistStatus = "idle" | "listening" | "processing" | "speaking";

export type VoiceStyle =
  | "neutral-female"
  | "neutral-male"
  | "calm"
  | "energetic"
  | "deep";

export type Language = "en" | "es" | "de" | "fr" | "pt" | "ja" | "zh-CN";

interface VoiceAssistState {
  // Voice Assist Settings
  voiceAssistEnabled: boolean;
  voiceAssistSourceLang: Language;
  voiceAssistTargetLang: Language;
  voiceAssistVoiceStyle: VoiceStyle;
  voiceAssistStatus: VoiceAssistStatus;

  // Actions
  setVoiceAssistEnabled: (enabled: boolean) => void;
  setVoiceAssistSourceLang: (lang: Language) => void;
  setVoiceAssistTargetLang: (lang: Language) => void;
  setVoiceAssistVoiceStyle: (style: VoiceStyle) => void;
  setVoiceAssistStatus: (status: VoiceAssistStatus) => void;
}

export const useVoiceAssistStore = create<VoiceAssistState>()(
  persist(
    (set) => ({
      // Initial State
      voiceAssistEnabled: false,
      voiceAssistSourceLang: "en",
      voiceAssistTargetLang: "en",
      voiceAssistVoiceStyle: "neutral-female",
      voiceAssistStatus: "idle",

      // Actions
      setVoiceAssistEnabled: (enabled) => {
        console.log("[VoiceAssistStore] setVoiceAssistEnabled called with:", enabled);
        set({ voiceAssistEnabled: enabled });
      },
      setVoiceAssistSourceLang: (lang) => {
        console.log("[VoiceAssistStore] setVoiceAssistSourceLang called with:", lang);
        set({ voiceAssistSourceLang: lang });
      },
      setVoiceAssistTargetLang: (lang) => {
        console.log("[VoiceAssistStore] ===== setVoiceAssistTargetLang called with:", lang, "=====");
        set({ voiceAssistTargetLang: lang });
        // Verify it was set
        console.log("[VoiceAssistStore] After set, current state targetLang:", lang);
      },
      setVoiceAssistVoiceStyle: (style) => {
        console.log("[VoiceAssistStore] setVoiceAssistVoiceStyle called with:", style);
        set({ voiceAssistVoiceStyle: style });
      },
      setVoiceAssistStatus: (status) => set({ voiceAssistStatus: status }),
    }),
    {
      name: "voice-assist-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        voiceAssistEnabled: state.voiceAssistEnabled,
        voiceAssistSourceLang: state.voiceAssistSourceLang,
        voiceAssistTargetLang: state.voiceAssistTargetLang,
        voiceAssistVoiceStyle: state.voiceAssistVoiceStyle,
        // Don't persist status - it should always start as idle
      }),
    }
  )
);
