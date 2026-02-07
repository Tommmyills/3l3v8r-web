import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LessonBreakdown } from "../api/transcript-ai";

export interface SavedLessonBreakdown {
  id: string;
  videoId: string;
  videoTitle?: string;
  lessonBreakdown: LessonBreakdown;
  timestamp: number;
}

interface LessonBreakdownStore {
  savedLessonBreakdowns: SavedLessonBreakdown[];

  // Actions
  saveLessonBreakdown: (videoId: string, videoTitle: string | undefined, lessonBreakdown: LessonBreakdown) => void;
  getLessonBreakdownForVideo: (videoId: string) => SavedLessonBreakdown | null;
  deleteLessonBreakdown: (id: string) => void;
  clearOldLessonBreakdowns: () => void;
}

export const useLessonBreakdownStore = create<LessonBreakdownStore>()(
  persist(
    (set, get) => ({
      savedLessonBreakdowns: [],

      saveLessonBreakdown: (videoId, videoTitle, lessonBreakdown) => {
        const newBreakdown: SavedLessonBreakdown = {
          id: `${videoId}_${Date.now()}`,
          videoId,
          videoTitle,
          lessonBreakdown,
          timestamp: Date.now(),
        };

        set((state) => {
          // Add new breakdown
          const updated = [newBreakdown, ...state.savedLessonBreakdowns];

          // Keep only the last 5
          const trimmed = updated.slice(0, 5);

          return { savedLessonBreakdowns: trimmed };
        });
      },

      getLessonBreakdownForVideo: (videoId) => {
        const breakdown = get().savedLessonBreakdowns.find((s) => s.videoId === videoId);
        return breakdown || null;
      },

      deleteLessonBreakdown: (id) => {
        set((state) => ({
          savedLessonBreakdowns: state.savedLessonBreakdowns.filter((s) => s.id !== id),
        }));
      },

      clearOldLessonBreakdowns: () => {
        set({ savedLessonBreakdowns: [] });
      },
    }),
    {
      name: "lesson-breakdown-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Legacy export for backward compatibility
export const useActionStepsStore = useLessonBreakdownStore;
