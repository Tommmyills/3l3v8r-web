import { useState, useRef, useCallback } from 'react'
import YouTube, { YouTubePlayer, YouTubeEvent } from 'react-youtube'
import {
  Search,
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import { useAppStore, type AudioMode } from '../state/appStore'

const MODE_COLORS: Record<AudioMode, string> = {
  FOCUS: '#FF7A00',
  STUDY: '#00E3FF',
  CHILL: '#8B5CF6',
  FLOW: '#14B8A6',
  DEEP: '#EF4444',
}

interface ChannelAProps {
  onOpenTranscript: () => void
}

export function ChannelA({ onOpenTranscript }: ChannelAProps) {
  const audioMode = useAppStore((s) => s.audioMode)
  const mainVideo = useAppStore((s) => s.mainVideo)
  const setMainVideoUrl = useAppStore((s) => s.setMainVideoUrl)
  const setMainVideoVolume = useAppStore((s) => s.setMainVideoVolume)
  const setMainVideoPlaying = useAppStore((s) => s.setMainVideoPlaying)
  const setMainVideoMuted = useAppStore((s) => s.setMainVideoMuted)
  const clearMainVideo = useAppStore((s) => s.clearMainVideo)

  const accentColor = MODE_COLORS[audioMode]
  const playerRef = useRef<YouTubePlayer | null>(null)

  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [showMore, setShowMore] = useState(false)

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const handleLoadUrl = () => {
    const videoId = extractVideoId(urlInput.trim())
    if (videoId) {
      setMainVideoUrl(urlInput.trim(), videoId)
      setShowUrlInput(false)
      setUrlInput('')
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      // Using YouTube search via a simple API
      const results = await searchYouTube(searchQuery)
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
    }
    setIsSearching(false)
  }

  const handleSelectResult = (result: SearchResult) => {
    setMainVideoUrl(`https://youtube.com/watch?v=${result.videoId}`, result.videoId)
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const onPlayerReady = (event: YouTubeEvent) => {
    playerRef.current = event.target
    event.target.setVolume(mainVideo.volume)
  }

  const onPlayerStateChange = (event: YouTubeEvent) => {
    // 1 = playing, 2 = paused
    setMainVideoPlaying(event.data === 1)
  }

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return
    if (mainVideo.isPlaying) {
      playerRef.current.pauseVideo()
    } else {
      playerRef.current.playVideo()
    }
  }, [mainVideo.isPlaying])

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return
    if (mainVideo.isMuted) {
      playerRef.current.unMute()
      setMainVideoMuted(false)
    } else {
      playerRef.current.mute()
      setMainVideoMuted(true)
    }
  }, [mainVideo.isMuted, setMainVideoMuted])

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseInt(e.target.value, 10)
      setMainVideoVolume(vol)
      if (playerRef.current) {
        playerRef.current.setVolume(vol)
      }
    },
    [setMainVideoVolume]
  )

  return (
    <section className="mb-6">
      {/* Channel Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs tracking-te-wider text-te-text-secondary">
          A: YOUTUBE TUTORIAL CHANNEL
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-1.5 text-te-text-secondary hover:text-te-text transition-colors btn-press"
          >
            <Search size={16} />
          </button>
        </div>
      </div>

      {/* Search Panel */}
      {showSearch && (
        <div className="mb-4 p-3 bg-te-panel border border-te-border rounded">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search YouTube..."
              className="flex-1 px-3 py-2 bg-te-bg border border-te-border rounded text-sm text-te-text placeholder-te-text-tertiary focus:outline-none focus:border-te-text-secondary"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-4 py-2 text-sm font-medium rounded btn-press"
              style={{ backgroundColor: accentColor, color: '#0E0E0E' }}
            >
              {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchResults.map((result) => (
                <button
                  key={result.videoId}
                  onClick={() => handleSelectResult(result)}
                  className="w-full flex items-start gap-3 p-2 bg-te-bg hover:bg-te-border rounded transition-colors text-left"
                >
                  <img
                    src={result.thumbnail}
                    alt={result.title}
                    className="w-24 h-14 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-te-text line-clamp-2">{result.title}</p>
                    <p className="text-xs text-te-text-tertiary mt-1">{result.channelTitle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Video Player */}
      <div className="relative bg-te-panel border border-te-border rounded overflow-hidden crt-grain">
        {mainVideo.videoId ? (
          <>
            <div className="youtube-container">
              <YouTube
                videoId={mainVideo.videoId}
                opts={{
                  playerVars: {
                    autoplay: 1,
                    controls: 1,
                    modestbranding: 1,
                    rel: 0,
                  },
                }}
                onReady={onPlayerReady}
                onStateChange={onPlayerStateChange}
              />
            </div>

            {/* Controls */}
            <div className="p-3 border-t border-te-border">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="p-2 rounded btn-press"
                  style={{ backgroundColor: accentColor, color: '#0E0E0E' }}
                >
                  {mainVideo.isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>

                <button
                  onClick={toggleMute}
                  className="p-2 text-te-text-secondary hover:text-te-text transition-colors btn-press"
                >
                  {mainVideo.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={mainVideo.volume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-1"
                  style={{ '--accent-color': accentColor } as React.CSSProperties}
                />

                <span className="text-xs text-te-text-secondary w-8 text-right">
                  {mainVideo.volume}
                </span>

                <button
                  onClick={clearMainVideo}
                  className="p-2 text-te-text-tertiary hover:text-red-500 transition-colors btn-press"
                >
                  <X size={16} />
                </button>
              </div>

              {/* More Controls */}
              <button
                onClick={() => setShowMore(!showMore)}
                className="w-full flex items-center justify-center gap-1 mt-2 py-1 text-xs text-te-text-secondary hover:text-te-text transition-colors"
              >
                {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showMore ? 'Less' : 'More'}
              </button>

              {showMore && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={onOpenTranscript}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-te-border rounded hover:border-te-text-secondary transition-colors btn-press"
                  >
                    <FileText size={12} />
                    Transcript + AI
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={() => setShowUrlInput(true)}
            className="w-full aspect-video flex flex-col items-center justify-center gap-3 text-te-text-secondary hover:text-te-text transition-colors"
          >
            <Play size={48} strokeWidth={1} />
            <span className="text-sm tracking-te-wide">LOAD VIDEO</span>
          </button>
        )}
      </div>

      {/* URL Input Modal */}
      {showUrlInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-md mx-4 p-4 bg-te-panel border border-te-border rounded">
            <h3 className="text-sm font-medium tracking-te-wide mb-4">PASTE YOUTUBE URL</h3>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl()}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-3 py-2 mb-4 bg-te-bg border border-te-border rounded text-sm text-te-text placeholder-te-text-tertiary focus:outline-none focus:border-te-text-secondary"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowUrlInput(false)}
                className="flex-1 py-2 text-sm border border-te-border rounded hover:border-te-text-secondary transition-colors btn-press"
              >
                Cancel
              </button>
              <button
                onClick={handleLoadUrl}
                className="flex-1 py-2 text-sm font-medium rounded btn-press"
                style={{ backgroundColor: accentColor, color: '#0E0E0E' }}
              >
                Load
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// Types
interface SearchResult {
  videoId: string
  title: string
  thumbnail: string
  channelTitle: string
}

// Simple YouTube search function (you can replace with actual API)
async function searchYouTube(query: string): Promise<SearchResult[]> {
  // For demo, return empty. In production, you'd call YouTube Data API
  // or use a proxy service
  console.log('Searching for:', query)

  // Placeholder - in real implementation, call YouTube API
  return []
}
