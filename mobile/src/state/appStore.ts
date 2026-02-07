import { create } from "zustand";

interface VideoState {
  url: string;
  videoId: string;
  volume: number; // 0-100
  isPlaying: boolean;
  isMuted: boolean;
}

export type AudioMode = "FOCUS" | "STUDY" | "CHILL" | "FLOW" | "DEEP";

export interface SessionNote {
  id: string;
  timestamp: number;
  rawInput: string;
  expandedNote: string;
  videoTitle?: string;
  videoTimestamp?: string;
}

interface AppState {
  // Main Video Player
  mainVideo: VideoState;

  // Music Player
  musicVideo: VideoState;

  // Audio Mode
  audioMode: AudioMode;

  // Session Notes
  sessionNotes: SessionNote[];

  // Visualizer Settings
  visualizerEnabled: boolean;

  // Mode Actions
  setAudioMode: (mode: AudioMode) => void;

  // Actions for Main Video
  setMainVideoUrl: (url: string, videoId: string) => void;
  setMainVideoVolume: (volume: number) => void;
  setMainVideoPlaying: (playing: boolean) => void;
  setMainVideoMuted: (muted: boolean) => void;
  clearMainVideo: () => void;

  // Actions for Music Video
  setMusicVideoUrl: (url: string, videoId: string) => void;
  setMusicVideoVolume: (volume: number) => void;
  setMusicVideoPlaying: (playing: boolean) => void;
  setMusicVideoMuted: (muted: boolean) => void;
  clearMusicVideo: () => void;

  // Actions for Session Notes
  addSessionNote: (note: SessionNote) => void;
  deleteSessionNote: (id: string) => void;
  clearAllNotes: () => void;

  // Actions for Visualizer
  setVisualizerEnabled: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mainVideo: {
    url: "",
    videoId: "",
    volume: 70,
    isPlaying: false,
    isMuted: false,
  },
  musicVideo: {
    url: "",
    videoId: "",
    volume: 70,
    isPlaying: false,
    isMuted: false,
  },
  audioMode: "FOCUS",
  sessionNotes: [],
  visualizerEnabled: true,

  // Mode Actions
  setAudioMode: (audioMode) => set({ audioMode }),

  // Main Video Actions
  setMainVideoUrl: (url, videoId) => set((state) => ({
    mainVideo: { ...state.mainVideo, url, videoId, isPlaying: true }
  })),
  setMainVideoVolume: (volume) => set((state) => ({
    mainVideo: { ...state.mainVideo, volume: Math.max(0, Math.min(100, volume)) }
  })),
  setMainVideoPlaying: (isPlaying) => set((state) => ({
    mainVideo: { ...state.mainVideo, isPlaying }
  })),
  setMainVideoMuted: (isMuted) => set((state) => ({
    mainVideo: { ...state.mainVideo, isMuted }
  })),
  clearMainVideo: () => set((state) => ({
    mainVideo: { ...state.mainVideo, url: "", videoId: "", isPlaying: false }
  })),

  // Music Video Actions
  setMusicVideoUrl: (url, videoId) => set((state) => ({
    musicVideo: { ...state.musicVideo, url, videoId, isPlaying: true }
  })),
  setMusicVideoVolume: (volume) => set((state) => ({
    musicVideo: { ...state.musicVideo, volume: Math.max(0, Math.min(100, volume)) }
  })),
  setMusicVideoPlaying: (isPlaying) => set((state) => ({
    musicVideo: { ...state.musicVideo, isPlaying }
  })),
  setMusicVideoMuted: (isMuted) => set((state) => ({
    musicVideo: { ...state.musicVideo, isMuted }
  })),
  clearMusicVideo: () => set((state) => ({
    musicVideo: { ...state.musicVideo, url: "", videoId: "", isPlaying: false }
  })),

  // Session Notes Actions
  addSessionNote: (note) => set((state) => ({
    sessionNotes: [note, ...state.sessionNotes]
  })),
  deleteSessionNote: (id) => set((state) => ({
    sessionNotes: state.sessionNotes.filter(note => note.id !== id)
  })),
  clearAllNotes: () => set({ sessionNotes: [] }),

  // Visualizer Actions
  setVisualizerEnabled: (enabled) => set({ visualizerEnabled: enabled }),
}));
