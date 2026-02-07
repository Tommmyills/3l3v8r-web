import { useState } from 'react'
import { X, Trash2, Sparkles, Save } from 'lucide-react'
import { useAppStore, type AudioMode, type SessionNote } from '../state/appStore'

const MODE_COLORS: Record<AudioMode, string> = {
  FOCUS: '#FF7A00',
  STUDY: '#00E3FF',
  CHILL: '#8B5CF6',
  FLOW: '#14B8A6',
  DEEP: '#EF4444',
}

interface NotesModalProps {
  onClose: () => void
}

export function NotesModal({ onClose }: NotesModalProps) {
  const audioMode = useAppStore((s) => s.audioMode)
  const sessionNotes = useAppStore((s) => s.sessionNotes)
  const addSessionNote = useAppStore((s) => s.addSessionNote)
  const deleteSessionNote = useAppStore((s) => s.deleteSessionNote)
  const clearAllNotes = useAppStore((s) => s.clearAllNotes)

  const accentColor = MODE_COLORS[audioMode]

  const [newNote, setNewNote] = useState('')
  const [isExpanding, setIsExpanding] = useState(false)
  const [showNewNote, setShowNewNote] = useState(false)

  const handleSaveNote = () => {
    if (!newNote.trim()) return

    const note: SessionNote = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      rawInput: newNote.trim(),
      expandedNote: newNote.trim(), // In production, this would be AI-expanded
    }

    addSessionNote(note)
    setNewNote('')
    setShowNewNote(false)
  }

  const handleExpandWithAI = async () => {
    if (!newNote.trim()) return
    setIsExpanding(true)

    // Simulate AI expansion (in production, call OpenAI API)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const note: SessionNote = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      rawInput: newNote.trim(),
      expandedNote: `• ${newNote.trim()}\n• Key insight from this note\n• Related concept to explore`,
    }

    addSessionNote(note)
    setNewNote('')
    setShowNewNote(false)
    setIsExpanding(false)
  }

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80">
      <div className="w-full h-[85vh] sm:h-[80vh] sm:max-w-lg bg-te-bg border border-te-border rounded-t-xl sm:rounded-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-te-border">
          <h2 className="text-sm font-medium tracking-te-wide">SESSION NOTES</h2>
          <div className="flex items-center gap-2">
            {sessionNotes.length > 0 && (
              <button
                onClick={clearAllNotes}
                className="px-2 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-te-text-secondary hover:text-te-text transition-colors btn-press"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {sessionNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <p className="text-sm text-te-text-secondary">No notes yet.</p>
              <p className="text-xs text-te-text-tertiary">
                Capture insights while watching tutorials.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessionNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 bg-te-panel border border-te-border rounded"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs text-te-text-tertiary">
                      {formatDate(note.timestamp)}
                    </span>
                    <button
                      onClick={() => deleteSessionNote(note.id)}
                      className="p-1 text-te-text-tertiary hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-sm text-te-text whitespace-pre-wrap">
                    {note.expandedNote}
                  </p>
                  {note.videoTitle && (
                    <p className="mt-2 text-xs text-te-text-tertiary">
                      📺 {note.videoTitle}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Note Section */}
        <div className="p-4 border-t border-te-border">
          {showNewNote ? (
            <div className="space-y-3">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Type your note..."
                className="w-full h-24 px-3 py-2 bg-te-panel border border-te-border rounded text-sm text-te-text placeholder-te-text-tertiary resize-none focus:outline-none focus:border-te-text-secondary"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewNote(false)}
                  className="flex-1 py-2 text-sm border border-te-border rounded hover:border-te-text-secondary transition-colors btn-press"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  className="flex items-center justify-center gap-1.5 flex-1 py-2 text-sm border border-te-border rounded hover:border-te-text-secondary transition-colors btn-press"
                >
                  <Save size={14} />
                  Save
                </button>
                <button
                  onClick={handleExpandWithAI}
                  disabled={isExpanding}
                  className="flex items-center justify-center gap-1.5 flex-1 py-2 text-sm font-medium rounded btn-press"
                  style={{ backgroundColor: accentColor, color: '#0E0E0E' }}
                >
                  <Sparkles size={14} />
                  {isExpanding ? 'Expanding...' : 'AI Expand'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewNote(true)}
              className="w-full py-3 text-sm font-medium rounded btn-press"
              style={{ backgroundColor: accentColor, color: '#0E0E0E' }}
            >
              + New Note
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
