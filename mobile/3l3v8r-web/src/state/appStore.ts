import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AudioMode = 'FOCUS' | 'STUDY' | 'CHILL' | 'FLOW' | 'DEEP'

export type MusicSource = 'local' | 'bandcamp' | 'mixcloud' | 'apple-music' | 'soundcloud' | 'spotify'

export interface SessionNote {
  id: string
  timestamp: number
  rawInput: string
  expandedNote: string
  videoTitle?: string
  videoTimestamp?: string
}

interface VideoState {
  url: string
  videoId: string
  volume: number
  isPlaying: boolean
  isMuted: boolean
}

interface AppState {
  // Main Video Player
  mainVideo: VideoState

  // Music Player
  musicVideo: VideoState
  musicSource: MusicSource

  // Audio Mode
  audioMode: AudioMode

  // Session Notes
  sessionNotes: SessionNote[]

  // Auto-duck
  autoDuckEnabled: boolean
  isSpeechDetected: boolean

  // Visualizer
  visualizerEnabled: boolean

  // Actions
  setAudioMode: (mode: AudioMode) => void

  // Main Video Actions
  setMainVideoUrl: (url: string, videoId: string) => void
  setMainVideoVolume: (volume: number) => void
  setMainVideoPlaying: (playing: boolean) => void
  setMainVideoMuted: (muted: boolean) => void
  clearMainVideo: () => void

  // Music Actions
  setMusicSource: (source: MusicSource) => void
  setMusicVideoUrl: (url: string, videoId: string) => void
  setMusicVideoVolume: (volume: number) => void
  setMusicVideoPlaying: (playing: boolean) => void
  setMusicVideoMuted: (muted: boolean) => void
  clearMusicVideo: () => void

  // Auto-duck Actions
  setAutoDuckEnabled: (enabled: boolean) => void
  setSpeechDetected: (detected: boolean) => void

  // Notes Actions
  addSessionNote: (note: SessionNote) => void
  deleteSessionNote: (id: string) => void
  clearAllNotes: () => void

  // Visualizer Actions
  setVisualizerEnabled: (enabled: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      mainVideo: {
        url: '',
        videoId: '',
        volume: 70,
        isPlaying: false,
        isMuted: false,
      },
      musicVideo: {
        url: '',
        videoId: '',
        volume: 70,
        isPlaying: false,
        isMuted: false,
      },
      musicSource: 'local',
      audioMode: 'FOCUS',
      sessionNotes: [],
      autoDuckEnabled: true,
      isSpeechDetected: false,
      visualizerEnabled: true,

      setAudioMode: (audioMode) => set({ audioMode }),

      // Main Video Actions
      setMainVideoUrl: (url, videoId) =>
        set((state) => ({
          mainVideo: { ...state.mainVideo, url, videoId, isPlaying: true },
        })),
      setMainVideoVolume: (volume) =>
        set((state) => ({
          mainVideo: {
            ...state.mainVideo,
            volume: Math.max(0, Math.min(100, volume)),
          },
        })),
      setMainVideoPlaying: (isPlaying) =>
        set((state) => ({
          mainVideo: { ...state.mainVideo, isPlaying },
        })),
      setMainVideoMuted: (isMuted) =>
        set((state) => ({
          mainVideo: { ...state.mainVideo, isMuted },
        })),
      clearMainVideo: () =>
        set((state) => ({
          mainVideo: {
            ...state.mainVideo,
            url: '',
            videoId: '',
            isPlaying: false,
          },
        })),

      // Music Actions
      setMusicSource: (musicSource) => set({ musicSource }),
      setMusicVideoUrl: (url, videoId) =>
        set((state) => ({
          musicVideo: { ...state.musicVideo, url, videoId, isPlaying: true },
        })),
      setMusicVideoVolume: (volume) =>
        set((state) => ({
          musicVideo: {
            ...state.musicVideo,
            volume: Math.max(0, Math.min(100, volume)),
          },
        })),
      setMusicVideoPlaying: (isPlaying) =>
        set((state) => ({
          musicVideo: { ...state.musicVideo, isPlaying },
        })),
      setMusicVideoMuted: (isMuted) =>
        set((state) => ({
          musicVideo: { ...state.musicVideo, isMuted },
        })),
      clearMusicVideo: () =>
        set((state) => ({
          musicVideo: {
            ...state.musicVideo,
            url: '',
            videoId: '',
            isPlaying: false,
          },
        })),

      // Auto-duck Actions
      setAutoDuckEnabled: (autoDuckEnabled) => set({ autoDuckEnabled }),
      setSpeechDetected: (isSpeechDetected) => set({ isSpeechDetected }),

      // Notes Actions
      addSessionNote: (note) =>
        set((state) => ({
          sessionNotes: [note, ...state.sessionNotes],
        })),
      deleteSessionNote: (id) =>
        set((state) => ({
          sessionNotes: state.sessionNotes.filter((note) => note.id !== id),
        })),
      clearAllNotes: () => set({ sessionNotes: [] }),

      // Visualizer Actions
      setVisualizerEnabled: (visualizerEnabled) => set({ visualizerEnabled }),
    }),
    {
      name: '3l3v8r-storage',
      partialize: (state) => ({
        audioMode: state.audioMode,
        sessionNotes: state.sessionNotes,
        autoDuckEnabled: state.autoDuckEnabled,
        visualizerEnabled: state.visualizerEnabled,
      }),
    }
  )
)
