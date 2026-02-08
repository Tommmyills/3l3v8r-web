import { useState, useRef } from 'react'
import { Music, Play, Pause, Volume2, VolumeX, X } from 'lucide-react'
import { useAppStore, type AudioMode, type MusicSource } from '../state/appStore'

const MODE_COLORS: Record<AudioMode, string> = {
  FOCUS: '#FF7A00',
  STUDY: '#00E3FF',
  CHILL: '#8B5CF6',
  FLOW: '#14B8A6',
  DEEP: '#EF4444',
}

const SOURCE_CONFIG: Record<MusicSource, { label: string; color: string; url: string }> = {
  local: { label: 'LOCAL MP3', color: '#FF7A00', url: '' },
  bandcamp: { label: 'BANDCAMP', color: '#1DA0C3', url: 'https://bandcamp.com' },
  mixcloud: { label: 'MIXCLOUD', color: '#FF7F00', url: 'https://mixcloud.com' },
  soundcloud: { label: 'SOUNDCLOUD', color: '#FF5500', url: 'https://soundcloud.com' },
  spotify: { label: 'SPOTIFY', color: '#1DB954', url: 'https://open.spotify.com' },
  'apple-music': { label: 'APPLE MUSIC', color: '#FC3C44', url: 'https://music.apple.com' },
}

export function ChannelB() {
  const audioMode = useAppStore((s) => s.audioMode)
  const musicSource = useAppStore((s) => s.musicSource)
  const musicVideo = useAppStore((s) => s.musicVideo)
  const setMusicSource = useAppStore((s) => s.setMusicSource)
  const setMusicVideoVolume = useAppStore((s) => s.setMusicVideoVolume)
  const setMusicVideoMuted = useAppStore((s) => s.setMusicVideoMuted)
  const setMusicVideoPlaying = useAppStore((s) => s.setMusicVideoPlaying)
  const clearMusicVideo = useAppStore((s) => s.clearMusicVideo)
  const autoDuckEnabled = useAppStore((s) => s.autoDuckEnabled)
  const isSpeechDetected = useAppStore((s) => s.isSpeechDetected)

  const accentColor = MODE_COLORS[audioMode]

  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAudioFile(file)
      const url = URL.createObjectURL(file)
      setAudioUrl(url)

      const audio = new Audio(url)
      audio.volume = musicVideo.volume / 100
      audioRef.current = audio

      audio.play()
      setMusicVideoPlaying(true)
    }
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (musicVideo.isPlaying) {
      audioRef.current.pause()
      setMusicVideoPlaying(false)
    } else {
      audioRef.current.play()
      setMusicVideoPlaying(true)
    }
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    audioRef.current.muted = !musicVideo.isMuted
    setMusicVideoMuted(!musicVideo.isMuted)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseInt(e.target.value, 10)
    setMusicVideoVolume(vol)
    if (audioRef.current) {
      const effectiveVolume = autoDuckEnabled && isSpeechDetected ? vol * 0.6 : vol
      audioRef.current.volume = effectiveVolume / 100
    }
  }

  const handleClear = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioFile(null)
    setAudioUrl(null)
    audioRef.current = null
    clearMusicVideo()
    setMusicSource('local')
  }

  const sources: MusicSource[] = ['local', 'bandcamp', 'soundcloud', 'mixcloud', 'spotify', 'apple-music']

  return (
    <section className="mb-6">
      {/* Channel Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs tracking-te-wider text-te-text-secondary">
          B: BEAT / MUSIC CHANNEL
          {autoDuckEnabled && isSpeechDetected && (
            <span className="ml-2 text-orange-500">[DUCK]</span>
          )}
        </h2>
        {musicSource !== 'local' && (
          <button
            onClick={handleClear}
            className="p-1 text-te-text-tertiary hover:text-red-500 transition-colors btn-press"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Source Selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar pb-2">
        {sources.map((source) => {
          const isActive = musicSource === source
          const config = SOURCE_CONFIG[source]
          const color = source === 'local' ? accentColor : config.color

          return (
            <button
              key={source}
              onClick={() => setMusicSource(source)}
              className={`px-3 py-1.5 text-xs tracking-te-wide whitespace-nowrap rounded border transition-all btn-press ${
                isActive
                  ? 'border-transparent'
                  : 'border-te-border text-te-text-secondary hover:text-te-text'
              }`}
              style={{
                backgroundColor: isActive ? color : 'transparent',
                color: isActive ? '#0E0E0E' : color,
                borderColor: isActive ? color : undefined,
                boxShadow: isActive ? `0 0 12px ${color}40` : 'none',
              }}
            >
              {config.label}
            </button>
          )
        })}
      </div>

      {/* Player Panel */}
      <div className="bg-te-panel border border-te-border rounded overflow-hidden">
        {musicSource === 'local' ? (
          <div className="p-4">
            {audioFile ? (
              <div className="space-y-3">
                {/* File Info */}
                <div className="flex items-center gap-3">
                  <Music size={20} style={{ color: accentColor }} />
                  <span className="flex-1 text-sm truncate">{audioFile.name}</span>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="p-2 rounded btn-press"
                    style={{ backgroundColor: accentColor, color: '#0E0E0E' }}
                  >
                    {musicVideo.isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>

                  <button
                    onClick={toggleMute}
                    className="p-2 text-te-text-secondary hover:text-te-text transition-colors btn-press"
                  >
                    {musicVideo.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={musicVideo.volume}
                    onChange={handleVolumeChange}
                    className="flex-1 h-1"
                    style={{ '--accent-color': accentColor } as React.CSSProperties}
                  />

                  <span className="text-xs text-te-text-secondary w-8 text-right">
                    {musicVideo.volume}
                  </span>

                  <button
                    onClick={handleClear}
                    className="p-2 text-te-text-tertiary hover:text-red-500 transition-colors btn-press"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center py-8 cursor-pointer text-te-text-secondary hover:text-te-text transition-colors">
                <Music size={32} strokeWidth={1} />
                <span className="mt-2 text-sm tracking-te-wide">SELECT MP3</span>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>
        ) : (
          /* Streaming Service Embed */
          <div className="relative" style={{ height: '300px' }}>
            <iframe
              src={SOURCE_CONFIG[musicSource].url}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; fullscreen"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
              title={SOURCE_CONFIG[musicSource].label}
            />
          </div>
        )}
      </div>
    </section>
  )
}
