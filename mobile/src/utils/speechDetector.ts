/**
 * Speech Detection Service for Auto-Duck
 * Monitors audio activity on Channel A to trigger ducking
 */

export interface SpeechDetectionConfig {
  enabled: boolean;
  threshold: number; // -60 to 0 dB
  minDuration: number; // ms - minimum speech duration to trigger duck
  silenceDelay: number; // ms - delay before releasing duck after silence
}

export class SpeechDetector {
  private enabled: boolean = true;
  private threshold: number = -40; // dB
  private minDuration: number = 200; // ms
  private silenceDelay: number = 500; // ms

  private speechStartTime: number = 0;
  private lastSpeechTime: number = 0;
  private isSpeechActive: boolean = false;

  private checkInterval: NodeJS.Timeout | null = null;
  private onSpeechChange: ((isActive: boolean) => void) | null = null;

  constructor(config?: Partial<SpeechDetectionConfig>) {
    if (config) {
      this.updateConfig(config);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SpeechDetectionConfig>): void {
    if (config.enabled !== undefined) {
      this.enabled = config.enabled;
    }
    if (config.threshold !== undefined) {
      this.threshold = this.clamp(config.threshold, -60, 0);
    }
    if (config.minDuration !== undefined) {
      this.minDuration = Math.max(50, config.minDuration);
    }
    if (config.silenceDelay !== undefined) {
      this.silenceDelay = Math.max(100, config.silenceDelay);
    }
  }

  /**
   * Set callback for speech activity changes
   */
  setOnSpeechChange(callback: (isActive: boolean) => void): void {
    this.onSpeechChange = callback;
  }

  /**
   * Start monitoring for speech
   */
  start(checkIntervalMs: number = 100): void {
    if (this.checkInterval) {
      this.stop();
    }

    this.checkInterval = setInterval(() => {
      this.checkSpeechState();
    }, checkIntervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Process audio level from Channel A
   */
  processAudioLevel(rmsDb: number, hasAudio: boolean): void {
    if (!this.enabled || !hasAudio) {
      this.markSilence();
      return;
    }

    const now = Date.now();

    if (rmsDb > this.threshold) {
      // Audio above threshold
      if (!this.isSpeechActive) {
        // Potential speech start
        if (this.speechStartTime === 0) {
          this.speechStartTime = now;
        } else if (now - this.speechStartTime >= this.minDuration) {
          // Speech duration met - activate
          this.activateSpeech();
        }
      }
      this.lastSpeechTime = now;
    } else {
      // Audio below threshold
      if (this.isSpeechActive) {
        // Check if silence delay has passed
        if (now - this.lastSpeechTime >= this.silenceDelay) {
          this.deactivateSpeech();
        }
      } else {
        // Reset speech start if it didn't meet min duration
        this.speechStartTime = 0;
      }
    }
  }

  /**
   * Mark silence (no audio at all)
   */
  private markSilence(): void {
    if (this.isSpeechActive) {
      const now = Date.now();
      if (now - this.lastSpeechTime >= this.silenceDelay) {
        this.deactivateSpeech();
      }
    } else {
      this.speechStartTime = 0;
    }
  }

  /**
   * Activate speech detection
   */
  private activateSpeech(): void {
    if (!this.isSpeechActive) {
      this.isSpeechActive = true;
      if (this.onSpeechChange) {
        this.onSpeechChange(true);
      }
    }
  }

  /**
   * Deactivate speech detection
   */
  private deactivateSpeech(): void {
    if (this.isSpeechActive) {
      this.isSpeechActive = false;
      this.speechStartTime = 0;
      if (this.onSpeechChange) {
        this.onSpeechChange(false);
      }
    }
  }

  /**
   * Check current speech state
   */
  private checkSpeechState(): void {
    if (this.isSpeechActive) {
      const now = Date.now();
      if (now - this.lastSpeechTime >= this.silenceDelay) {
        this.deactivateSpeech();
      }
    }
  }

  /**
   * Get current speech active state
   */
  getIsSpeechActive(): boolean {
    return this.isSpeechActive;
  }

  /**
   * Clamp value between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stop();
    this.onSpeechChange = null;
  }
}

// Create singleton instance
export const speechDetector = new SpeechDetector({
  enabled: true,
  threshold: -40,
  minDuration: 200,
  silenceDelay: 500,
});
