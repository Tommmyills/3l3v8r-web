import { useAppStore, type AudioMode } from '../state/appStore'

const MODE_COLORS: Record<AudioMode, string> = {
  FOCUS: '#FF7A00',
  STUDY: '#00E3FF',
  CHILL: '#8B5CF6',
  FLOW: '#14B8A6',
  DEEP: '#EF4444',
}

export function MixerPanel() {
  const audioMode = useAppStore((s) => s.audioMode)
  const mainVideo = useAppStore((s) => s.mainVideo)
  const musicVideo = useAppStore((s) => s.musicVideo)
  const autoDuckEnabled = useAppStore((s) => s.autoDuckEnabled)
  const isSpeechDetected = useAppStore((s) => s.isSpeechDetected)
  const setAutoDuckEnabled = useAppStore((s) => s.setAutoDuckEnabled)
  const setMainVideoVolume = useAppStore((s) => s.setMainVideoVolume)
  const setMusicVideoVolume = useAppStore((s) => s.setMusicVideoVolume)

  const accentColor = MODE_COLORS[audioMode]

  return (
    <section className="mb-6 p-4 bg-te-panel border border-te-border rounded">
      <h2 className="text-xs tracking-te-wider text-te-text-secondary mb-4">
        MIXER CONTROLS
      </h2>

      {/* Gain A */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-te-text-secondary tracking-te-wide">
            GAIN A:
            {isSpeechDetected && (
              <span
                className="inline-block w-2 h-2 ml-2 rounded-full"
                style={{ backgroundColor: '#22c55e' }}
              />
            )}
          </span>
          <span className="text-xs text-te-text-secondary">{mainVideo.volume}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={mainVideo.volume}
          onChange={(e) => setMainVideoVolume(parseInt(e.target.value, 10))}
          className="w-full h-2"
          style={{ '--accent-color': accentColor } as React.CSSProperties}
        />
      </div>

      {/* Gain B */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-te-text-secondary tracking-te-wide">
            GAIN B:
            {autoDuckEnabled && isSpeechDetected && (
              <span className="ml-2 text-orange-500">[DUCK]</span>
            )}
          </span>
          <span className="text-xs text-te-text-secondary">{musicVideo.volume}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={musicVideo.volume}
          onChange={(e) => setMusicVideoVolume(parseInt(e.target.value, 10))}
          className="w-full h-2"
          style={{ '--accent-color': accentColor } as React.CSSProperties}
        />
      </div>

      {/* Auto-Duck Toggle */}
      <button
        onClick={() => setAutoDuckEnabled(!autoDuckEnabled)}
        className={`w-full py-2 text-xs tracking-te-wider font-medium rounded border transition-colors btn-press ${
          autoDuckEnabled
            ? 'border-transparent'
            : 'border-te-border text-te-text-secondary'
        }`}
        style={{
          backgroundColor: autoDuckEnabled ? accentColor : 'transparent',
          color: autoDuckEnabled ? '#0E0E0E' : undefined,
          borderColor: autoDuckEnabled ? accentColor : undefined,
        }}
      >
        SMARTMIX AUTO-DUCK {autoDuckEnabled ? 'ON' : 'OFF'}
        {autoDuckEnabled && isSpeechDetected && (
          <span
            className="inline-block w-2 h-2 ml-2 rounded-full"
            style={{ backgroundColor: '#f97316' }}
          />
        )}
      </button>
    </section>
  )
}
