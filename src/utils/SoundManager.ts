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
    this.loadUserPreferences();
    this.preloadSounds();
  }

  /**
   * Load user sound preferences from localStorage
   */
  private loadUserPreferences(): void {
    const soundEnabled = localStorage.getItem('sound_enabled');
    this.isEnabled = soundEnabled !== 'false'; // Default to enabled
  }

  /**
   * Set sound enabled/disabled and save preference
   */
  setSoundEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem('sound_enabled', enabled.toString());
  }

  /**
   * Check if sounds are enabled
   */
  isSoundEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Preload frequently used sounds
   */
  private async preloadSounds(): Promise<void> {
    if (!this.isEnabled) return;

    const preloadPromises = Object.entries(this.sounds)
      .filter(([_, config]) => config.preload)
      .map(([key, config]) => this.loadSound(key, config));

    try {
      await Promise.allSettled(preloadPromises);
      console.log('Sound preloading completed');
    } catch (error) {
      console.warn('Some sounds failed to preload:', error);
    }
  }

  /**
   * Load a single sound file into cache
   */
  private async loadSound(key: string, config: SoundConfig): Promise<HTMLAudioElement> {
    if (this.audioCache[key]) {
      return this.audioCache[key];
    }

    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.volume = config.volume || 0.7;
      audio.preload = 'auto';
      
      audio.addEventListener('canplaythrough', () => {
        this.audioCache[key] = audio;
        resolve(audio);
      });

      audio.addEventListener('error', (e) => {
        console.warn(`Failed to load sound: ${key}`, e);
        reject(e);
      });

      audio.src = config.url;
    });
  }

  /**
   * Play a sound by key
   */
  async play(soundKey: string): Promise<void> {
    if (!this.isEnabled) return;

    // Check for reduced motion preference
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    try {
      const config = this.sounds[soundKey];
      if (!config) {
        console.warn(`Sound not found: ${soundKey}`);
        return;
      }

      let audio = this.audioCache[soundKey];
      
      // Load sound if not cached
      if (!audio) {
        audio = await this.loadSound(soundKey, config);
      }

      // Reset audio to beginning and play
      audio.currentTime = 0;
      
      // Use a promise to handle potential autoplay restrictions
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (error) {
      // Silently handle autoplay restrictions and other errors
      console.log(`Sound play blocked or failed: ${soundKey}`, error);
    }
  }

  /**
   * Play multiple sounds in sequence with delay
   */
  async playSequence(soundKeys: string[], delay: number = 100): Promise<void> {
    if (!this.isEnabled) return;

    for (let i = 0; i < soundKeys.length; i++) {
      await this.play(soundKeys[i]);
      if (i < soundKeys.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Stop all currently playing sounds
   */
  stopAll(): void {
    Object.values(this.audioCache).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  /**
   * Set volume for all sounds
   */
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    Object.values(this.audioCache).forEach(audio => {
      audio.volume = clampedVolume;
    });
  }

  /**
   * Clear audio cache (useful for memory management)
   */
  clearCache(): void {
    this.stopAll();
    this.audioCache = {};
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