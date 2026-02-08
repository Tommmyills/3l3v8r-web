import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SessionNote } from "./appStore";

export interface SavedMix {
  id: string;
  name: string;
  timestamp: number;
  mainVideoUrl: string;
  mainVideoId: string;
  musicSource: "local" | "bandcamp" | "mixcloud" | "apple-music" | "soundcloud" | "spotify" | null;
  channelAGain: number;
  channelBGain: number;
  audioMode: string;
}

export interface UserProfile {
  name: string;
  avatar: string; // Avatar ID (avatar1-5)
  savedMixes: SavedMix[];
  allNotes: SessionNote[]; // All notes ever saved
  dailyStreak: number;
  lastActiveDate: string; // ISO date string
  totalSessions: number;
  createdAt: number;
}

interface ProfileState {
  profile: UserProfile | null;
  isProfileSetup: boolean;

  // Actions
  createProfile: (name: string, avatar: string) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  saveMix: (mix: SavedMix) => void;
  deleteMix: (id: string) => void;
  saveNotesToProfile: (notes: SessionNote[]) => void;
  updateStreak: () => void;
  resetProfile: () => void;
}

const getDefaultProfile = (): UserProfile => ({
  name: "",
  avatar: "avatar1",
  savedMixes: [],
  allNotes: [],
  dailyStreak: 0,
  lastActiveDate: new Date().toISOString().split("T")[0],
  totalSessions: 0,
  createdAt: Date.now(),
});

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      isProfileSetup: false,

      createProfile: (name, avatar) => {
        const newProfile = {
          ...getDefaultProfile(),
          name,
          avatar,
        };
        set({ profile: newProfile, isProfileSetup: true });
      },

      updateProfile: (updates) => {
        const currentProfile = get().profile;
        if (!currentProfile) return;

        set({
          profile: {
            ...currentProfile,
            ...updates,
          },
        });
      },

      saveMix: (mix) => {
        const currentProfile = get().profile;
        if (!currentProfile) return;

        set({
          profile: {
            ...currentProfile,
            savedMixes: [mix, ...currentProfile.savedMixes].slice(0, 20), // Keep max 20 mixes
          },
        });
      },

      deleteMix: (id) => {
        const currentProfile = get().profile;
        if (!currentProfile) return;

        set({
          profile: {
            ...currentProfile,
            savedMixes: currentProfile.savedMixes.filter(mix => mix.id !== id),
          },
        });
      },

      saveNotesToProfile: (notes) => {
        const currentProfile = get().profile;
        if (!currentProfile) return;

        // Merge with existing notes, avoid duplicates by ID
        const existingIds = new Set(currentProfile.allNotes.map(n => n.id));
        const newNotes = notes.filter(n => !existingIds.has(n.id));

        set({
          profile: {
            ...currentProfile,
            allNotes: [...newNotes, ...currentProfile.allNotes].slice(0, 200), // Keep max 200 notes
          },
        });
      },

      updateStreak: () => {
        const currentProfile = get().profile;
        if (!currentProfile) return;

        const today = new Date().toISOString().split("T")[0];
        const lastActive = currentProfile.lastActiveDate;

        // Calculate date difference
        const lastDate = new Date(lastActive);
        const todayDate = new Date(today);
        const diffTime = todayDate.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let newStreak = currentProfile.dailyStreak;

        if (diffDays === 0) {
          // Same day, no change
          newStreak = currentProfile.dailyStreak;
        } else if (diffDays === 1) {
          // Next day, increment streak
          newStreak = currentProfile.dailyStreak + 1;
        } else {
          // Missed a day or more, reset streak
          newStreak = 1;
        }

        set({
          profile: {
            ...currentProfile,
            dailyStreak: newStreak,
            lastActiveDate: today,
            totalSessions: currentProfile.totalSessions + 1,
          },
        });
      },

      resetProfile: () => {
        set({ profile: null, isProfileSetup: false });
      },
    }),
    {
      name: "UserProfile",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
