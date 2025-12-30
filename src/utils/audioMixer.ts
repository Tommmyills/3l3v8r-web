/**
 * External Audio Mixer with Gain Control and Auto-Duck
 * Provides smooth mixing independent of platform-specific volume controls
 */

export interface MixerState {
  channelAGain: number; // 0.0 to 1.0
  channelBGain: number; // 0.0 to 1.0
  autoDuckEnabled: boolean;
  autoDuckAmount: number; // 0.0 to 1.0 (how much to reduce Channel B)
  autoDuckThreshold: number; // -60 to 0 dB
  autoDuckAttack: number; // ms
  autoDuckRelease: number; // ms
}

export interface AudioAnalysis {
  rms: number; // Root Mean Square for volume detection
  peak: number; // Peak level
  isSpeechLikely: boolean; // Speech detection heuristic
}

export class AudioMixer {
  private channelAGain: number = 0.7; // 70% default
  private channelBGain: number = 0.7; // 70% default
  private channelBCurrentGain: number = 0.7; // Current gain after duck
  private autoDuckEnabled: boolean = true;
  private autoDuckAmount: number = 0.6; // Duck to 60% of original
  private autoDuckThreshold: number = -40; // dB
  private autoDuckAttack: number = 150; // ms
  private autoDuckRelease: number = 800; // ms

  private isDucking: boolean = false;
  private duckingAnimationFrame: number | null = null;
  private lastDuckTime: number = 0;

  // Smoothing for gain changes
  private readonly GAIN_SMOOTH_TIME = 50; // ms

  constructor(initialState?: Partial<MixerState>) {
    if (initialState) {
      this.updateState(initialState);
    }
  }

  /**
   * Update mixer state
   */
  updateState(state: Partial<MixerState>): void {
    if (state.channelAGain !== undefined) {
      this.channelAGain = this.clamp(state.channelAGain, 0, 1);
    }
    if (state.channelBGain !== undefined) {
      this.channelBGain = this.clamp(state.channelBGain, 0, 1);
      // If not ducking, update current gain immediately
      if (!this.isDucking) {
        this.channelBCurrentGain = this.channelBGain;
      }
    }
    if (state.autoDuckEnabled !== undefined) {
      this.autoDuckEnabled = state.autoDuckEnabled;
      // If disabled, restore Channel B
      if (!state.autoDuckEnabled && this.isDucking) {
        this.releaseDuck();
      }
    }
    if (state.autoDuckAmount !== undefined) {
      this.autoDuckAmount = this.clamp(state.autoDuckAmount, 0, 1);
    }
    if (state.autoDuckThreshold !== undefined) {
      this.autoDuckThreshold = this.clamp(state.autoDuckThreshold, -60, 0);
    }
    if (state.autoDuckAttack !== undefined) {
      this.autoDuckAttack = Math.max(10, state.autoDuckAttack);
    }
    if (state.autoDuckRelease !== undefined) {
      this.autoDuckRelease = Math.max(10, state.autoDuckRelease);
    }
  }

  /**
   * Get current gain for Channel A (YouTube)
   */
  getChannelAGain(): number {
    return this.channelAGain;
  }

  /**
   * Get current gain for Channel B (Music) - accounts for ducking
   */
  getChannelBGain(): number {
    return this.channelBCurrentGain;
  }

  /**
   * Analyze audio for speech detection
   * Uses simple heuristics based on RMS and peak levels
   */
  analyzeAudio(samples: number[]): AudioAnalysis {
    if (samples.length === 0) {
      return { rms: 0, peak: 0, isSpeechLikely: false };
    }

    // Calculate RMS (Root Mean Square)
    let sumSquares = 0;
    let peak = 0;

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      sumSquares += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
    }

    const rms = Math.sqrt(sumSquares / samples.length);

    // Convert to dB
    const rmsDb = 20 * Math.log10(Math.max(rms, 0.00001));

    // Simple speech detection heuristic:
    // Speech typically has consistent energy above threshold
    const isSpeechLikely = rmsDb > this.autoDuckThreshold && peak > 0.1;

    return { rms, peak, isSpeechLikely };
  }

  /**
   * Process Channel A activity and trigger auto-duck
   */
  processChannelA(isSpeechActive: boolean): void {
    if (!this.autoDuckEnabled) {
      return;
    }

    if (isSpeechActive && !this.isDucking) {
      // Speech detected - start ducking
      this.startDuck();
    } else if (!isSpeechActive && this.isDucking) {
      // Speech stopped - release duck
      const timeSinceLastDuck = Date.now() - this.lastDuckTime;
      // Only release if speech has been quiet for a bit
      if (timeSinceLastDuck > 500) {
        this.releaseDuck();
      }
    }
  }

  /**
   * Start ducking Channel B
   */
  private startDuck(): void {
    this.isDucking = true;
    this.lastDuckTime = Date.now();

    // Animate gain reduction
    this.animateGain(
      this.channelBCurrentGain,
      this.channelBGain * this.autoDuckAmount,
      this.autoDuckAttack
    );
  }

  /**
   * Release duck on Channel B
   */
  private releaseDuck(): void {
    this.isDucking = false;

    // Animate gain restoration
    this.animateGain(
      this.channelBCurrentGain,
      this.channelBGain,
      this.autoDuckRelease
    );
  }

  /**
   * Smooth gain animation
   */
  private animateGain(startGain: number, endGain: number, duration: number): void {
    if (this.duckingAnimationFrame !== null) {
      cancelAnimationFrame(this.duckingAnimationFrame);
    }

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth curve (ease-in-out)
      const easedProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      this.channelBCurrentGain = startGain + (endGain - startGain) * easedProgress;

      if (progress < 1) {
        this.duckingAnimationFrame = requestAnimationFrame(animate);
      } else {
        this.duckingAnimationFrame = null;
      }
    };

    animate();
  }

  /**
   * Apply gain with soft clipping to prevent distortion
   */
  applyGain(value: number, gain: number): number {
    const amplified = value * gain;

    // Soft clipping using tanh for smooth saturation
    if (Math.abs(amplified) > 0.9) {
      return Math.tanh(amplified);
    }

    return amplified;
  }

  /**
   * Master limiter to prevent clipping
   */
  limitOutput(channelAValue: number, channelBValue: number): number {
    const mixed = channelAValue + channelBValue;

    // Hard limit at ±1.0
    if (mixed > 1.0) return 1.0;
    if (mixed < -1.0) return -1.0;

    // Soft limiting starts at 0.9
    if (Math.abs(mixed) > 0.9) {
      return Math.tanh(mixed * 1.2) * 0.9;
    }

    return mixed;
  }

  /**
   * Convert gain (0-1) to percentage (0-100)
   */
  gainToPercent(gain: number): number {
    return Math.round(gain * 100);
  }

  /**
   * Convert percentage (0-100) to gain (0-1)
   */
  percentToGain(percent: number): number {
    return this.clamp(percent / 100, 0, 1);
  }

  /**
   * Convert gain to dB
   */
  gainToDb(gain: number): number {
    if (gain <= 0) return -Infinity;
    return 20 * Math.log10(gain);
  }

  /**
   * Clamp value between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Get current mixer state
   */
  getState(): MixerState {
    return {
      channelAGain: this.channelAGain,
      channelBGain: this.channelBGain,
      autoDuckEnabled: this.autoDuckEnabled,
      autoDuckAmount: this.autoDuckAmount,
      autoDuckThreshold: this.autoDuckThreshold,
      autoDuckAttack: this.autoDuckAttack,
      autoDuckRelease: this.autoDuckRelease,
    };
  }

  /**
   * Check if currently ducking
   */
  getIsDucking(): boolean {
    return this.isDucking;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.duckingAnimationFrame !== null) {
      cancelAnimationFrame(this.duckingAnimationFrame);
      this.duckingAnimationFrame = null;
    }
  }
}

// Create singleton instance
export const audioMixer = new AudioMixer({
  channelAGain: 0.7,
  channelBGain: 0.7,
  autoDuckEnabled: true,
  autoDuckAmount: 0.6,
  autoDuckThreshold: -40,
  autoDuckAttack: 150,
  autoDuckRelease: 800,
});
