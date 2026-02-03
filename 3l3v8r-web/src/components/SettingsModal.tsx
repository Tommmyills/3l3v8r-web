import { X, ExternalLink } from 'lucide-react'
import { useAppStore, type AudioMode } from '../state/appStore'

const MODE_COLORS: Record<AudioMode, string> = {
  FOCUS: '#FF7A00',
  STUDY: '#00E3FF',
  CHILL: '#8B5CF6',
  FLOW: '#14B8A6',
  DEEP: '#EF4444',
}

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const audioMode = useAppStore((s) => s.audioMode)
  const visualizerEnabled = useAppStore((s) => s.visualizerEnabled)
  const setVisualizerEnabled = useAppStore((s) => s.setVisualizerEnabled)

  const accentColor = MODE_COLORS[audioMode]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80">
      <div className="w-full sm:max-w-md bg-te-bg border border-te-border rounded-t-xl sm:rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-te-border">
          <h2 className="text-sm font-medium tracking-te-wide">SETTINGS</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-te-text-secondary hover:text-te-text transition-colors btn-press"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Visual Settings */}
          <div>
            <h3 className="text-xs text-te-text-secondary tracking-te-wide mb-3">
              VISUAL SETTINGS
            </h3>
            <div className="flex items-center justify-between p-3 bg-te-panel border border-te-border rounded">
              <span className="text-sm">Audio Visualizer</span>
              <button
                onClick={() => setVisualizerEnabled(!visualizerEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  visualizerEnabled ? '' : 'bg-te-border'
                }`}
                style={{
                  backgroundColor: visualizerEnabled ? accentColor : undefined,
                }}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    visualizerEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* App Info */}
          <div>
            <h3 className="text-xs text-te-text-secondary tracking-te-wide mb-3">
              APP INFO
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-te-panel border border-te-border rounded">
                <span className="text-sm">Version</span>
                <span className="text-sm text-te-text-secondary">1.0.0 Web</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-xs text-te-text-secondary tracking-te-wide mb-3">
              SUPPORT
            </h3>
            <div className="space-y-2">
              <a
                href="#"
                className="flex items-center justify-between p-3 bg-te-panel border border-te-border rounded hover:border-te-text-secondary transition-colors"
              >
                <span className="text-sm">Privacy Policy</span>
                <ExternalLink size={14} className="text-te-text-tertiary" />
              </a>
              <a
                href="#"
                className="flex items-center justify-between p-3 bg-te-panel border border-te-border rounded hover:border-te-text-secondary transition-colors"
              >
                <span className="text-sm">Terms of Use</span>
                <ExternalLink size={14} className="text-te-text-tertiary" />
              </a>
              <a
                href="#"
                className="flex items-center justify-between p-3 bg-te-panel border border-te-border rounded hover:border-te-text-secondary transition-colors"
              >
                <span className="text-sm">Contact Support</span>
                <ExternalLink size={14} className="text-te-text-tertiary" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-te-border">
          <p className="text-center text-[10px] text-te-text-tertiary tracking-te-wider">
            TE-001 FIRMWARE Rev. 3L3V8R 2025-ALPHA
          </p>
        </div>
      </div>
    </div>
  )
}
