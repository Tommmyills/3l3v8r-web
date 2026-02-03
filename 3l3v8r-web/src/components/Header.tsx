import { Settings, FileText, Heart } from 'lucide-react'
import { useAppStore, type AudioMode } from '../state/appStore'

const MODE_COLORS: Record<AudioMode, string> = {
  FOCUS: '#FF7A00',
  STUDY: '#00E3FF',
  CHILL: '#8B5CF6',
  FLOW: '#14B8A6',
  DEEP: '#EF4444',
}

interface HeaderProps {
  onOpenNotes: () => void
  onOpenSettings: () => void
}

export function Header({ onOpenNotes, onOpenSettings }: HeaderProps) {
  const audioMode = useAppStore((s) => s.audioMode)
  const sessionNotes = useAppStore((s) => s.sessionNotes)
  const accentColor = MODE_COLORS[audioMode]

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-te-border">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div
          className="text-xl font-bold tracking-te-wider"
          style={{ color: accentColor }}
        >
          3L3V8R
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Favorites */}
        <button className="p-2 text-te-text-secondary hover:text-te-text transition-colors btn-press">
          <Heart size={20} />
        </button>

        {/* Notes */}
        <button
          onClick={onOpenNotes}
          className="relative p-2 text-te-text-secondary hover:text-te-text transition-colors btn-press"
        >
          <FileText size={20} />
          {sessionNotes.length > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full text-te-bg"
              style={{ backgroundColor: accentColor }}
            >
              {sessionNotes.length > 9 ? '9+' : sessionNotes.length}
            </span>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-2 text-te-text-secondary hover:text-te-text transition-colors btn-press"
        >
          <Settings size={20} />
        </button>
      </div>
    </header>
  )
}
