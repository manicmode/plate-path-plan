/**
 * SoundManager - Central audio playback utility for app sound effects
 * Handles loading, caching, and playing sound files with fallbacks
 */

interface AudioCache {
  [key: string]: HTMLAudioElement;
}

interface SoundConfig {
  url: string;
  volume?: number;
  preload?: boolean;
}

class SoundManager {
  private audioCache: AudioCache = {};
  private isEnabled: boolean = true;
  private isLoading: boolean = false;
  private hasUserInteracted: boolean = false;
  private isMobileSafari: boolean = false;
  private isAudioSupported: boolean = false;
  
  // Sound file configuration
  private sounds: Record<string, SoundConfig> = {
    ai_thought: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/ai_thought.wav',
      volume: 0.6,
      preload: true
    },
    body_scan_camera: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/body_scan_camera.wav',
      volume: 0.8,
      preload: true
    },
    challenge_win: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/challenge_win.wav',
      volume: 0.9,
      preload: true
    },
    food_log_confirm: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/food_log_confirm.wav',
      volume: 0.7,
      preload: true
    },
    friend_added: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/friend_added.wav',
      volume: 0.8,
      preload: true
    },
    goal_hit: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/goal_hit.wav',
      volume: 0.9,
      preload: true
    },
    health_scan_capture: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/health_scan_capture.wav',
      volume: 0.7,
      preload: true
    },
    progress_update: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/progress_update.wav',
      volume: 0.6,
      preload: true
    },
    reminder_chime: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/reminder_chime.wav',
      volume: 0.5,
      preload: true
    }
  };

  constructor() {
    this.initializePlatformChecks();
    this.loadUserPreferences();
    this.setupUserInteractionListener();
    // Don't preload sounds immediately - wait for user interaction
  }

  /**
   * Initialize platform and browser checks
   */
  private initializePlatformChecks(): void {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      this.isAudioSupported = false;
      return;
    }

    this.isAudioSupported = true;
    
    // Detect mobile Safari
    const userAgent = navigator.userAgent;
    this.isMobileSafari = /iPad|iPhone|iPod/.test(userAgent) && /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    
    console.log('SoundManager: Platform checks completed', {
      isAudioSupported: this.isAudioSupported,
      isMobileSafari: this.isMobileSafari
    });
  }

  /**
   * Set up listener for first user interaction
   */
  private setupUserInteractionListener(): void {
    if (!this.isAudioSupported) return;

    const handleUserInteraction = () => {
      this.hasUserInteracted = true;
      console.log('SoundManager: User interaction detected, enabling audio');
      
      // Now it's safe to preload sounds
      this.preloadSounds();
      
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });
  }

  /**
   * Load user sound preferences from localStorage
   */
  private loadUserPreferences(): void {
    try {
      const soundEnabled = localStorage.getItem('sound_enabled');
      this.isEnabled = soundEnabled !== 'false'; // Default to enabled
    } catch (error) {
      console.warn('SoundManager: Failed to load preferences from localStorage:', error);
      this.isEnabled = true;
    }
  }

  /**
   * Set sound enabled/disabled and save preference
   */
  setSoundEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    try {
      localStorage.setItem('sound_enabled', enabled.toString());
    } catch (error) {
      console.warn('SoundManager: Failed to save preferences to localStorage:', error);
    }
  }

  /**
   * Check if sounds are enabled and supported
   */
  isSoundEnabled(): boolean {
    return this.isEnabled && this.isAudioSupported;
  }

  /**
   * Preload frequently used sounds (only after user interaction)
   */
  private async preloadSounds(): Promise<void> {
    if (!this.isEnabled || !this.isAudioSupported || !this.hasUserInteracted) {
      console.log('SoundManager: Skipping preload - conditions not met', {
        isEnabled: this.isEnabled,
        isAudioSupported: this.isAudioSupported,
        hasUserInteracted: this.hasUserInteracted
      });
      return;
    }

    const preloadPromises = Object.entries(this.sounds)
      .filter(([_, config]) => config.preload)
      .map(([key, config]) => this.loadSound(key, config));

    try {
      await Promise.allSettled(preloadPromises);
      console.log('SoundManager: Sound preloading completed');
    } catch (error) {
      console.warn('SoundManager: Some sounds failed to preload:', error);
    }
  }

  /**
   * Load a single sound file into cache
   */
  private async loadSound(key: string, config: SoundConfig): Promise<HTMLAudioElement> {
    if (!this.isAudioSupported) {
      throw new Error('Audio not supported on this platform');
    }

    if (this.audioCache[key]) {
      return this.audioCache[key];
    }

    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio();
        audio.volume = config.volume || 0.7;
        audio.preload = 'auto';
        
        audio.addEventListener('canplaythrough', () => {
          this.audioCache[key] = audio;
          resolve(audio);
        });

        audio.addEventListener('error', (e) => {
          console.warn(`SoundManager: Failed to load sound: ${key}`, e);
          reject(e);
        });

        audio.src = config.url;
      } catch (error) {
        console.warn(`SoundManager: Error creating audio element for ${key}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Play a sound by key
   */
  async play(soundKey: string): Promise<void> {
    // Early returns for various blocking conditions
    if (!this.isEnabled || !this.isAudioSupported) {
      console.log(`SoundManager: Sound playback blocked - enabled: ${this.isEnabled}, supported: ${this.isAudioSupported}`);
      return;
    }

    // Block on mobile Safari until user has interacted
    if (this.isMobileSafari && !this.hasUserInteracted) {
      console.log('SoundManager: Blocking sound on mobile Safari until user interaction');
      return;
    }

    // Check for reduced motion preference
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion) {
          console.log('SoundManager: Respecting reduced motion preference');
          return;
        }
      }
    } catch (error) {
      console.warn('SoundManager: Failed to check motion preferences:', error);
    }

    try {
      const config = this.sounds[soundKey];
      if (!config) {
        console.warn(`SoundManager: Sound not found: ${soundKey}`);
        return;
      }

      let audio = this.audioCache[soundKey];
      
      // Load sound if not cached
      if (!audio) {
        try {
          audio = await this.loadSound(soundKey, config);
        } catch (loadError) {
          console.warn(`SoundManager: Failed to load sound ${soundKey}:`, loadError);
          return;
        }
      }

      // Reset audio to beginning and play
      audio.currentTime = 0;
      
      // Use a promise to handle potential autoplay restrictions
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        console.log(`SoundManager: Successfully played sound: ${soundKey}`);
      }
    } catch (error) {
      // Silently handle autoplay restrictions and other errors
      console.log(`SoundManager: Sound play blocked or failed: ${soundKey}`, error);
    }
  }

  /**
   * Play multiple sounds in sequence with delay
   */
  async playSequence(soundKeys: string[], delay: number = 100): Promise<void> {
    if (!this.isEnabled || !this.isAudioSupported) return;

    for (let i = 0; i < soundKeys.length; i++) {
      try {
        await this.play(soundKeys[i]);
        if (i < soundKeys.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.warn(`SoundManager: Failed to play sound ${soundKeys[i]} in sequence:`, error);
      }
    }
  }

  /**
   * Stop all currently playing sounds
   */
  stopAll(): void {
    try {
      Object.values(this.audioCache).forEach(audio => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (error) {
          console.warn('SoundManager: Failed to stop audio:', error);
        }
      });
    } catch (error) {
      console.warn('SoundManager: Failed to stop all sounds:', error);
    }
  }

  /**
   * Set volume for all sounds
   */
  setVolume(volume: number): void {
    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      Object.values(this.audioCache).forEach(audio => {
        try {
          audio.volume = clampedVolume;
        } catch (error) {
          console.warn('SoundManager: Failed to set volume for audio:', error);
        }
      });
    } catch (error) {
      console.warn('SoundManager: Failed to set volume:', error);
    }
  }

  /**
   * Clear audio cache (useful for memory management)
   */
  clearCache(): void {
    try {
      this.stopAll();
      this.audioCache = {};
      console.log('SoundManager: Audio cache cleared');
    } catch (error) {
      console.warn('SoundManager: Failed to clear cache:', error);
    }
  }
}

// Create singleton instance
export const soundManager = new SoundManager();

// Convenience functions for common sound triggers
export const playAIThought = () => soundManager.play('ai_thought');
export const playBodyScanCapture = () => soundManager.play('body_scan_camera');
export const playChallengeWin = () => soundManager.play('challenge_win');
export const playFoodLogConfirm = () => soundManager.play('food_log_confirm');
export const playFriendAdded = () => soundManager.play('friend_added');
export const playGoalHit = () => soundManager.play('goal_hit');
export const playHealthScanCapture = () => soundManager.play('health_scan_capture');
export const playProgressUpdate = () => soundManager.play('progress_update');
export const playReminderChime = () => soundManager.play('reminder_chime');