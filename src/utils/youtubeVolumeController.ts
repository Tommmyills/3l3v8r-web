/**
 * YouTube Volume Controller
 * Ensures YouTube player volume stays synchronized with mixer gain
 */

export class YouTubeVolumeController {
  private targetVolume: number = 70;
  private isActive: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private webViewRef: any = null;
  private lastAppliedVolume: number = -1;

  /**
   * Set the WebView reference
   */
  setWebViewRef(ref: any): void {
    this.webViewRef = ref;
    console.log('[YouTubeVolumeController] WebView ref set:', !!ref);

    // Apply volume immediately when ref is set
    if (ref) {
      this.applyVolume();
    }
  }

  /**
   * Start volume control
   */
  start(): void {
    if (this.isActive) return;
    this.isActive = true;
    console.log('[YouTubeVolumeController] Started');

    // Update volume every 100ms
    this.updateInterval = setInterval(() => {
      this.applyVolume();
    }, 100);
  }

  /**
   * Stop volume control
   */
  stop(): void {
    this.isActive = false;
    console.log('[YouTubeVolumeController] Stopped');

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Set target volume (0-100)
   */
  setVolume(volume: number): void {
    const newVolume = Math.max(0, Math.min(100, Math.round(volume)));

    if (newVolume !== this.targetVolume) {
      console.log('[YouTubeVolumeController] Target volume changed:', this.targetVolume, '→', newVolume);
      this.targetVolume = newVolume;
      // Apply immediately
      this.applyVolume();
    }
  }

  /**
   * Apply volume to YouTube player
   */
  private applyVolume(): void {
    if (!this.webViewRef) {
      console.log('[YouTubeVolumeController] No WebView ref available');
      return;
    }

    // Only apply if volume has changed
    if (this.lastAppliedVolume === this.targetVolume) {
      return;
    }

    this.lastAppliedVolume = this.targetVolume;
    console.log('[YouTubeVolumeController] Applying volume:', this.targetVolume);

    try {
      this.webViewRef.injectJavaScript(`
        (function() {
          try {
            if (window.player && typeof window.player.setVolume === 'function') {
              window.player.setVolume(${this.targetVolume});
              console.log('[YouTube] Volume set to ${this.targetVolume}');

              // Verify the volume was set
              setTimeout(function() {
                if (window.player && typeof window.player.getVolume === 'function') {
                  var actualVolume = window.player.getVolume();
                  console.log('[YouTube] Verified volume:', actualVolume);
                }
              }, 50);
            } else {
              console.log('[YouTube] Player not ready, window.player:', typeof window.player);
            }
          } catch (e) {
            console.error('[YouTube] Volume control error:', e.message);
          }
        })();
        true;
      `);
    } catch (error) {
      console.error('[YouTubeVolumeController] Failed to inject volume control:', error);
    }
  }

  /**
   * Force immediate volume update (use when player state changes)
   */
  forceUpdate(): void {
    console.log('[YouTubeVolumeController] Force update');
    this.lastAppliedVolume = -1; // Reset to force update
    this.applyVolume();

    // Apply multiple times to ensure it sticks
    setTimeout(() => {
      this.lastAppliedVolume = -1;
      this.applyVolume();
    }, 50);

    setTimeout(() => {
      this.lastAppliedVolume = -1;
      this.applyVolume();
    }, 150);

    setTimeout(() => {
      this.lastAppliedVolume = -1;
      this.applyVolume();
    }, 300);
  }

  /**
   * Get current target volume
   */
  getVolume(): number {
    return this.targetVolume;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    console.log('[YouTubeVolumeController] Destroyed');
    this.stop();
    this.webViewRef = null;
  }
}

// Create singleton
export const youtubeVolumeController = new YouTubeVolumeController();
