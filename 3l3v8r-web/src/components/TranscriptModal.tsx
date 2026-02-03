import { useState, useEffect } from 'react'
import { X, Search, Copy, Loader2, ChevronDown } from 'lucide-react'
import { useAppStore, type AudioMode } from '../state/appStore'
import { fetchTranscript, type TranscriptSegment } from '../api/transcript'

const MODE_COLORS: Record<AudioMode, string> = {
  FOCUS: '#FF7A00',
  STUDY: '#00E3FF',
  CHILL: '#8B5CF6',
  FLOW: '#14B8A6',
  DEEP: '#EF4444',
}

interface TranscriptModalProps {
  onClose: () => void
}

export function TranscriptModal({ onClose }: TranscriptModalProps) {
  const audioMode = useAppStore((s) => s.audioMode)
  const mainVideo = useAppStore((s) => s.mainVideo)
  const accentColor = MODE_COLORS[audioMode]

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'qa'>('transcript')

  useEffect(() => {
    if (mainVideo.videoId) {
      loadTranscript()
    }
  }, [mainVideo.videoId])

  const loadTranscript = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchTranscript(mainVideo.videoId)
      if (result.segments.length === 0) {
        setError('No transcript available for this video. The video may not have captions enabled.')
      } else {
        setTranscript(result.segments)
      }
    } catch (err) {
      setError('Failed to load transcript. Please try again.')
      console.error('Transcript error:', err)
    }
    setIsLoading(false)
  }

  const filteredTranscript = searchQuery
    ? transcript.filter((seg) =>
        seg.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : transcript

  const copyTranscript = () => {
    const text = transcript.map((seg) => seg.text).join(' ')
    navigator.clipboard.writeText(text)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80">
      <div className="w-full h-[85vh] sm:h-[80vh] sm:max-w-2xl bg-te-bg border border-te-border rounded-t-xl sm:rounded-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-te-border">
          <h2 className="text-sm font-medium tracking-te-wide">VIDEO TRANSCRIPT + AI</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-te-text-secondary hover:text-te-text transition-colors btn-press"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-te-border">
          {(['transcript', 'summary', 'qa'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs tracking-te-wide font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2'
                  : 'text-te-text-secondary hover:text-te-text'
              }`}
              style={{
                borderColor: activeTab === tab ? accentColor : 'transparent',
                color: activeTab === tab ? accentColor : undefined,
              }}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 size={32} className="animate-spin" style={{ color: accentColor }} />
              <p className="text-sm text-te-text-secondary">Loading transcript...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center">
              <p className="text-sm text-te-text-secondary">{error}</p>
              <button
                onClick={loadTranscript}
                className="px-4 py-2 text-sm font-medium rounded btn-press"
                style={{ backgroundColor: accentColor, color: '#0E0E0E' }}
              >
                Retry
              </button>
            </div>
          ) : activeTab === 'transcript' ? (
            <div className="flex flex-col h-full">
              {/* Search */}
              <div className="p-3 border-b border-te-border">
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-te-panel border border-te-border rounded">
                    <Search size={14} className="text-te-text-tertiary" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search transcript..."
                      className="flex-1 bg-transparent text-sm text-te-text placeholder-te-text-tertiary focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={copyTranscript}
                    className="p-2 text-te-text-secondary hover:text-te-text transition-colors btn-press"
                    title="Copy transcript"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              {/* Transcript List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredTranscript.map((segment, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-2 rounded hover:bg-te-panel transition-colors cursor-pointer"
                  >
                    <span
                      className="text-xs font-mono shrink-0"
                      style={{ color: accentColor }}
                    >
                      {formatTime(segment.start)}
                    </span>
                    <p className="text-sm text-te-text">{segment.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'summary' ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
              <ChevronDown size={32} className="text-te-text-tertiary" />
              <p className="text-sm text-te-text-secondary text-center">
                AI Summary feature coming soon.
                <br />
                This will generate a summary of the video content.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
              <ChevronDown size={32} className="text-te-text-tertiary" />
              <p className="text-sm text-te-text-secondary text-center">
                Q&A feature coming soon.
                <br />
                Ask questions about the video content.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
