import { useState } from 'react'
import { useAppStore, type AudioMode } from './state/appStore'
import { MixerPanel } from './components/MixerPanel'
import { ChannelA } from './components/ChannelA'
import { ChannelB } from './components/ChannelB'
import { Header } from './components/Header'
import { TranscriptModal } from './components/TranscriptModal'
import { NotesModal } from './components/NotesModal'
import { SettingsModal } from './components/SettingsModal'

const MODE_COLORS: Record<AudioMode, string> = {
  FOCUS: '#FF7A00',
  STUDY: '#00E3FF',
  CHILL: '#8B5CF6',
  FLOW: '#14B8A6',
  DEEP: '#EF4444',
}

function App() {
  const audioMode = useAppStore((s) => s.audioMode)
  const accentColor = MODE_COLORS[audioMode]

  const [showTranscript, setShowTranscript] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div
      className="min-h-screen bg-te-bg text-te-text font-mono"
      style={{ '--accent-color': accentColor } as React.CSSProperties}
    >
      {/* Animated border glow */}
      <div
        className="fixed inset-0 pointer-events-none animate-pulse-glow"
        style={{
          boxShadow: `inset 0 0 60px ${accentColor}20`,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col h-screen max-w-4xl mx-auto">
        <Header
          onOpenNotes={() => setShowNotes(true)}
          onOpenSettings={() => setShowSettings(true)}
        />

        <main className="flex-1 overflow-y-auto px-4 pb-6 hide-scrollbar">
          {/* Mode selector */}
          <ModeSelector />

          {/* Channel A - YouTube */}
          <ChannelA onOpenTranscript={() => setShowTranscript(true)} />

          {/* Mixer Controls */}
          <MixerPanel />

          {/* Channel B - Music */}
          <ChannelB />

          {/* Footer */}
          <Footer />
        </main>
      </div>

      {/* Modals */}
      {showTranscript && (
        <TranscriptModal onClose={() => setShowTranscript(false)} />
      )}
      {showNotes && <NotesModal onClose={() => setShowNotes(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}

function ModeSelector() {
  const audioMode = useAppStore((s) => s.audioMode)
  const setAudioMode = useAppStore((s) => s.setAudioMode)

  const modes: AudioMode[] = ['FOCUS', 'STUDY', 'CHILL', 'FLOW', 'DEEP']

  return (
    <div className="flex justify-center gap-2 py-4">
      {modes.map((mode) => {
        const isActive = audioMode === mode
        const color = MODE_COLORS[mode]

        return (
          <button
            key={mode}
            onClick={() => setAudioMode(mode)}
            className={`px-3 py-1.5 text-xs tracking-te-wide font-medium rounded transition-all btn-press ${
              isActive
                ? 'text-te-bg'
                : 'text-te-text-secondary hover:text-te-text border border-te-border'
            }`}
            style={{
              backgroundColor: isActive ? color : 'transparent',
              borderColor: isActive ? color : undefined,
            }}
          >
            {mode}
          </button>
        )
      })}
    </div>
  )
}

function Footer() {
  return (
    <div className="mt-6 py-3 border-t border-te-border">
      <p className="text-center text-[10px] text-te-text-tertiary tracking-te-wider">
        TE-001 FIRMWARE Rev. 3L3V8R 2025-ALPHA ENGINE
      </p>
    </div>
  )
}

export default App
