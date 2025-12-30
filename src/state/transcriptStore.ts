import { create } from "zustand";
import { TranscriptResult } from "../api/youtube-transcript";
import { Language } from "./voiceAssistStore";

interface TranscriptCache {
  videoId: string;
  transcript: TranscriptResult | null;
  translatedTranscript: TranscriptResult | null;
  selectedTranslateLang: Language | null;
  activeTab: "transcript" | "summary" | "chapters" | "concepts" | "qa" | "notes";
}

interface TranscriptStore {
  // Cached transcript data per video
  cache: Record<string, TranscriptCache>;

  // Actions
  cacheTranscript: (videoId: string, data: Partial<TranscriptCache>) => void;
  getCache: (videoId: string) => TranscriptCache | null;
  clearCache: (videoId: string) => void;
  clearAllCache: () => void;
}

export const useTranscriptStore = create<TranscriptStore>((set, get) => ({
  cache: {},

  cacheTranscript: (videoId, data) => {
    const currentCache = get().cache[videoId] || {
      videoId,
      transcript: null,
      translatedTranscript: null,
      selectedTranslateLang: null,
      activeTab: "transcript" as const,
    };

    set({
      cache: {
        ...get().cache,
        [videoId]: {
          ...currentCache,
          ...data,
        },
      },
    });
  },

  getCache: (videoId) => {
    return get().cache[videoId] || null;
  },

  clearCache: (videoId) => {
    const newCache = { ...get().cache };
    delete newCache[videoId];
    set({ cache: newCache });
  },

  clearAllCache: () => {
    set({ cache: {} });
  },
}));
