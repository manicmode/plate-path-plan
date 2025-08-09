/**
 * SoundManager - Central audio playback utility for app sound effects
 * Handles loading, caching, and playing sound files with ambient/non-interrupting playback
 */

import { Capacitor } from '@capacitor/core';
import { NativeAudio } from '@capacitor-community/native-audio';
import AudioConfig from '@/plugins/AudioConfig';

interface AudioCache {
  [key: string]: HTMLAudioElement;
}

interface SoundConfig {
  url: string;
  volume?: number;
  preload?: boolean;
}

interface MobileAudioDiagnostics {
  isMobile: boolean;
  platform: string;
  userAgent: string;
  browser: string;
  isPWA: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isIOSSafari: boolean;
  isNative: boolean;
}

// Mobile environment detection utilities
const getMobileEnvironment = (): MobileAudioDiagnostics => {
  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(userAgent);
  const isMobile = isIOS || isAndroid || /Mobile|Tablet/.test(userAgent);
  const isNative = Capacitor.isNativePlatform();
  
  let browser = 'Unknown';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Edge')) {
    browser = 'Edge';
  }
  
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                (window.navigator as any).standalone === true;
  
  const isIOSSafari = isIOS && browser === 'Safari';
  
  return {
    isMobile,
    platform,
    userAgent,
    browser,
    isPWA,
    isIOS,
    isAndroid,
    isIOSSafari,
    isNative
  };
};

class SoundManager {
  private audioCache: AudioCache = {};
  private isEnabled: boolean = true;
  private isLoading: boolean = false;
  private audioContext: AudioContext | null = null;
  private hasUserInteracted: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private mobileEnv: MobileAudioDiagnostics;
  
  // Sound file configuration
  private sounds: Record<string, SoundConfig> = {
    ai_thought: {
      url: '/sounds/ai_thought.wav',
      volume: 0.6,
      preload: true
    },
    body_scan_camera: {
      url: '/sounds/body_scan_camera.wav',
      volume: 0.8,
      preload: true
    },
    challenge_win: {
      url: '/sounds/challenge_win.wav',
      volume: 0.9,
      preload: true
    },
    food_log_confirm: {
      url: '/sounds/food_log_confirm.wav',
      volume: 0.7,
      preload: true
    },
    startup_chime: {
      url: 'https://uzoiiijqtahohfafqirm.supabase.co/storage/v1/object/public/sounds/startup_chime.mp3',
      volume: 0.5,
      preload: true
    },
    friend_added: {
      url: '/sounds/friend_added.wav',
      volume: 0.8,
      preload: true
    },
    goal_hit: {
      url: '/sounds/goal_hit.wav',
      volume: 0.9,
      preload: true
    },
    health_scan_capture: {
      url: '/sounds/health_scan_capture.wav',
      volume: 0.7,
      preload: true
    },
    progress_update: {
      url: '/sounds/progress_update.wav',
      volume: 0.6,
      preload: true
    },
    reminder_chime: {
      url: '/sounds/reminder_chime.wav',
      volume: 0.5,
      preload: true
    }
  };

  constructor() {
    // Initialize mobile environment detection
    this.mobileEnv = getMobileEnvironment();
    
    this.loadUserPreferences();
    this.setupUserInteractionListener();
    this.initializeNativeAudio();
    // Don't preload immediately - wait for user interaction
  }

  /**
   * Initialize native audio settings for ambient playback
   */
  private async initializeNativeAudio(): Promise<void> {
    if (this.mobileEnv.isNative) {
      try {
        // Configure native audio for ambient/non-interrupting playback
        
        await AudioConfig.configureAmbientAudio();
        
      } catch (error) {
        console.warn('❌ Native audio configuration failed:', error);
      }
    }
  }

  /**
   * Load user sound preferences from localStorage
   */
  private loadUserPreferences(): void {
    const soundEnabled = localStorage.getItem('sound_enabled');
    this.isEnabled = soundEnabled !== 'false'; // Default to enabled
  }

  /**
   * Setup user interaction listener for mobile compatibility
   */
  private setupUserInteractionListener(): void {
    const handleFirstInteraction = async (event: Event) => {
      
      
      // CRITICAL: Create AudioContext inside trusted user gesture event (iOS Safari requirement)
      if (!this.audioContext) {
        try {
          if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
            // Configure AudioContext for non-interrupting, interactive audio
            // latencyHint: 'interactive' ensures low latency for UI sounds without interrupting background audio
            this.audioContext = new (AudioContext || (window as any).webkitAudioContext)({
              latencyHint: 'interactive',
              sampleRate: 44100  // Standard sample rate for compatibility
            });
            
            // Add state change listener for monitoring
            this.audioContext.onstatechange = () => {
              if (this.audioContext?.state === 'suspended' && this.mobileEnv.isMobile) {
                
              }
            };
            
            
          } else {
            console.warn('❌ AudioContext not available in this browser');
          }
        } catch (creationError: any) {
          console.warn('❌ AudioContext creation failed:', creationError);
        }
      }
      
      // CRITICAL: Resume AudioContext immediately after creation in trusted user event context
      if (this.audioContext) {
        try {
          await this.audioContext.resume();
        } catch (resumeError: any) {
          console.warn('❌ AudioContext resume failed on user interaction:', resumeError);
        }
      }
      
      this.hasUserInteracted = true;
      this.initializeAudioSystem().catch((error) => {
        console.warn('❌ Audio system initialization failed after user interaction:', error);
      });
      
      // Remove listeners after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction, { passive: true });
    document.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    document.addEventListener('keydown', handleFirstInteraction, { passive: true });
  }

  /**
   * Initialize audio system after user interaction
   */
  private async initializeAudioSystem(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  /**
   * Perform actual audio initialization
   */
  private async performInitialization(): Promise<void> {
    try {
      
      
      // AudioContext is now created in user interaction handler only
      // Skip AudioContext creation here to comply with iOS Safari PWA requirements
      if (!this.audioContext) {
        
      } else {
        
      }

      // Preload sounds after initialization
      await this.preloadSounds();
      
    } catch (error) {
      console.warn('❌ Audio system initialization failed:', error);
      
    }
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

    if (this.mobileEnv.isNative) {
      // Preload sounds using NativeAudio for ambient playback
      const preloadPromises = Object.entries(this.sounds)
        .filter(([_, config]) => config.preload)
        .map(([key, config]) => this.preloadNativeSound(key, config));

      try {
        await Promise.allSettled(preloadPromises);
        
      } catch (error) {
        console.warn('Some native sounds failed to preload:', error);
      }
    } else {
      // Web-based preloading with ambient audio settings
      const preloadPromises = Object.entries(this.sounds)
        .filter(([_, config]) => config.preload)
        .map(([key, config]) => this.loadSound(key, config));

      try {
        await Promise.allSettled(preloadPromises);
        
      } catch (error) {
        console.warn('Some web sounds failed to preload:', error);
      }
    }
  }

  /**
   * Preload native sounds for ambient playback
   */
  private async preloadNativeSound(key: string, config: SoundConfig): Promise<void> {
    try {
      await NativeAudio.preload({
        assetId: key,
        assetPath: config.url,
        audioChannelNum: 1,
        isUrl: false,
        volume: config.volume || 0.7
      });
      
    } catch (error) {
      console.warn(`Failed to preload native sound: ${key}`, error);
    }
  }

  /**
   * Load a single sound file into cache with ambient audio settings
   */
  private async loadSound(key: string, config: SoundConfig): Promise<HTMLAudioElement> {
    if (this.audioCache[key]) {
      return this.audioCache[key];
    }

    

    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.volume = config.volume || 0.7;
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      
      
      
      // Configure for ambient/non-interrupting playback
      // This prevents the audio from requesting audio focus on mobile web
      (audio as any).mozAudioChannelType = 'content'; // Firefox
      (audio as any).webkitAudioContext = false; // Safari
      
      // Set audio attributes for ambient playback
      if ('setAttribute' in audio) {
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
      }

      // Enhanced error handling with detailed logging
      audio.onerror = (e) => {
        console.error(`❌ Audio error for "${key}":`, e);
        console.error('❌ Audio element error details:', {
          error: e,
          audioSrc: audio.src,
          audioReadyState: audio.readyState,
          audioNetworkState: audio.networkState
        });
        reject(e);
      };

      audio.oncanplaythrough = () => {
        
        this.audioCache[key] = audio;
        resolve(audio);
      };

      audio.onplay = () => {
        
      };
      
      audio.addEventListener('canplaythrough', () => {
        
        if (!this.audioCache[key]) {
          this.audioCache[key] = audio;
          resolve(audio);
        }
      });

      audio.addEventListener('error', (e) => {
        console.error(`❌ Failed to load sound "${key}" from URL: ${config.url}`, e);
        reject(e);
      });

      audio.src = config.url;
      
    });
  }

  /**
   * Play a sound by key with ambient/non-interrupting audio settings
   */
  async play(soundKey: string, opts?: { playbackRate?: number }): Promise<void> {
    
    
    if (!this.isEnabled) {
      
      return;
    }

    // Check for reduced motion preference
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      
      return;
    }

    // Wait for user interaction on mobile
    if (!this.hasUserInteracted) {
      
      return;
    }

    const config = this.sounds[soundKey];
    if (!config) {
      console.warn(`Sound not found: ${soundKey}`);
      return;
    }

    try {
      if (this.mobileEnv.isNative) {
        // Use NativeAudio for ambient/non-interrupting playback on native platforms
        await this.playNativeSound(soundKey, config);
      } else {
        // Use web audio with ambient settings
        await this.playWebSound(soundKey, config, opts);
      }
    } catch (error: any) {
      // Handle autoplay restrictions and other errors gracefully
      if (error.name === 'NotAllowedError') {
        
      } else {
        console.warn(`🔊 Sound play failed: ${soundKey}`, error);
      }
    }
  }

  /**
   * Play sound using NativeAudio for ambient playback (doesn't interrupt background audio)
   */
  private async playNativeSound(soundKey: string, config: SoundConfig): Promise<void> {
    try {
      // NativeAudio automatically handles ambient playback on native platforms
      await NativeAudio.play({
        assetId: soundKey,
        // Note: NativeAudio plugin handles audio session configuration for ambient playback
        // This ensures it doesn't interrupt music from other apps
      });
      
    } catch (error) {
      console.warn(`❌ Native sound play failed: ${soundKey}`, error);
      // Fallback to web audio if native fails
      await this.playWebSound(soundKey, config);
    }
  }

  /**
   * Play sound using web audio with ambient settings (doesn't interrupt background audio)
   */
  private async playWebSound(soundKey: string, config: SoundConfig, opts?: { playbackRate?: number }): Promise<void> {
    
    
    // Ensure audio system is initialized
    if (!this.initializationPromise) {
      await this.initializeAudioSystem();
    } else {
      await this.initializationPromise;
    }

    let audio = this.audioCache[soundKey];
    
    // Load sound if not cached
    if (!audio) {
      
      audio = await this.loadSound(soundKey, config);
    } else {
      
    }

    // Reset audio to beginning
    audio.currentTime = 0;
    // Apply playback rate if provided
    if (opts?.playbackRate && (audio as any).playbackRate !== undefined) {
      try {
        (audio as any).playbackRate = opts.playbackRate;
      } catch {
        // ignore if unsupported
      }
    }
    
    
    
    
    // Configure audio for ambient playback (critical for not interrupting background audio)
    if (this.mobileEnv.isMobile) {
      // For mobile web, configure audio element for ambient playback
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      
      // Set audio category to ambient to prevent interrupting background audio
      if ('webkitAudioContext' in window) {
        (audio as any).webkitAudioContext = 'ambient';
      }
    }
    
    // Resume AudioContext if needed (but don't force it to prevent audio interruption)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (resumeError: any) {
        console.warn('❌ AudioContext resume failed before playing:', resumeError);
        // Continue with play attempt even if resume fails
      }
    }
    
    // Use a promise to handle potential autoplay restrictions with enhanced error handling
    // audio.play() invoked
    
    try {
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        await playPromise.catch((playError: any) => {
          console.error(`❌ Failed to play sound "${soundKey}":`, playError);
          console.error(`❌ Audio element state:`, {
            src: audio.src,
            volume: audio.volume,
            readyState: audio.readyState,
            networkState: audio.networkState,
            paused: audio.paused,
            currentTime: audio.currentTime,
            duration: audio.duration
          });
          
          // Check for common mobile autoplay restrictions
          if (playError.name === 'NotAllowedError') {
            console.warn(`⚠️ Autoplay blocked for "${soundKey}" - user interaction required`);
          }
          throw playError;
        });
        
        // Sound played successfully
      } else {
        console.warn(`⚠️ play() returned undefined for "${soundKey}"`);
      }
    } catch (error: any) {
      console.error(`❌ Unexpected error playing "${soundKey}":`, error);
      throw error;
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

  /**
   * Get audio system status for debugging
   */
  getStatus(): { 
    enabled: boolean; 
    hasUserInteracted: boolean; 
    audioContextState?: string; 
    cachedSounds: number;
  } {
    return {
      enabled: this.isEnabled,
      hasUserInteracted: this.hasUserInteracted,
      audioContextState: this.audioContext?.state,
      cachedSounds: Object.keys(this.audioCache).length
    };
  }

  /**
   * Force initialization (useful for testing)
   */
  async forceInitialize(): Promise<void> {
    this.hasUserInteracted = true;
    await this.initializeAudioSystem();
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
export const playStartupChime = () => soundManager.play('startup_chime');