import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface FavoriteVideo {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  savedAt: number;
  lastWatched?: number;
  hasTranscript?: boolean;
}

interface FavoritesState {
  favorites: FavoriteVideo[];
  recentlyWatched: FavoriteVideo[];

  // Actions
  addFavorite: (video: Omit<FavoriteVideo, "id" | "savedAt">) => void;
  removeFavorite: (videoId: string) => void;
  isFavorite: (videoId: string) => boolean;
  updateLastWatched: (videoId: string) => void;
  addToRecentlyWatched: (video: Omit<FavoriteVideo, "id" | "savedAt">) => void;
  clearRecentlyWatched: () => void;
  clearAllFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      recentlyWatched: [],

      addFavorite: (video) => {
        const existing = get().favorites.find((f) => f.videoId === video.videoId);
        if (existing) return;

        const newFavorite: FavoriteVideo = {
          ...video,
          id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          savedAt: Date.now(),
        };

        set({
          favorites: [newFavorite, ...get().favorites].slice(0, 50), // Max 50 favorites
        });
      },

      removeFavorite: (videoId) => {
        set({
          favorites: get().favorites.filter((f) => f.videoId !== videoId),
        });
      },

      isFavorite: (videoId) => {
        return get().favorites.some((f) => f.videoId === videoId);
      },

      updateLastWatched: (videoId) => {
        const favorites = get().favorites.map((f) =>
          f.videoId === videoId ? { ...f, lastWatched: Date.now() } : f
        );
        set({ favorites });
      },

      addToRecentlyWatched: (video) => {
        const existing = get().recentlyWatched.filter(
          (r) => r.videoId !== video.videoId
        );

        const newRecent: FavoriteVideo = {
          ...video,
          id: `recent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          savedAt: Date.now(),
        };

        set({
          recentlyWatched: [newRecent, ...existing].slice(0, 20), // Max 20 recent
        });
      },

      clearRecentlyWatched: () => {
        set({ recentlyWatched: [] });
      },

      clearAllFavorites: () => {
        set({ favorites: [], recentlyWatched: [] });
      },
    }),
    {
      name: "favorites-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
