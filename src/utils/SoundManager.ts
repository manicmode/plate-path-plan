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

interface MobileAudioDiagnostics {
  isMobile: boolean;
  platform: string;
  userAgent: string;
  browser: string;
  isPWA: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isIOSSafari: boolean;
}

// Mobile environment detection utilities
const getMobileEnvironment = (): MobileAudioDiagnostics => {
  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(userAgent);
  const isMobile = isIOS || isAndroid || /Mobile|Tablet/.test(userAgent);
  
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
    isIOSSafari
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
    
    // Log mobile debugging initialization
    console.log('🔍 Mobile Sound Debugging Enabled');
    console.log('📱 Mobile Environment:', {
      isMobile: this.mobileEnv.isMobile,
      platform: this.mobileEnv.platform,
      browser: this.mobileEnv.browser,
      isIOS: this.mobileEnv.isIOS,
      isAndroid: this.mobileEnv.isAndroid,
      isIOSSafari: this.mobileEnv.isIOSSafari,
      isPWA: this.mobileEnv.isPWA,
      userAgent: this.mobileEnv.userAgent.substring(0, 100) + '...' // Truncate for readability
    });
    
    if (this.mobileEnv.isIOSSafari) {
      console.log('🚫 iOS Safari detected - autoplay restrictions likely active');
    }
    
    this.loadUserPreferences();
    this.setupUserInteractionListener();
    // Don't preload immediately - wait for user interaction
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
    const handleFirstInteraction = (event: Event) => {
      const eventType = event.type;
      const timestamp = new Date().toISOString();
      
      console.log(`🤚 User interaction detected: ${eventType} at ${timestamp}`);
      console.log(`📱 Device: ${this.mobileEnv.browser} on ${this.mobileEnv.platform} (${this.mobileEnv.isMobile ? 'Mobile' : 'Desktop'})`);
      
      this.hasUserInteracted = true;
      console.log('✅ hasUserInteracted set to true - audio unlock triggered');
      
      this.initializeAudioSystem().then(() => {
        console.log('🔓 Audio system unlocked via user interaction');
        
        // Check if audio context is active after interaction
        if (this.audioContext) {
          if (this.audioContext.state === 'running') {
            console.log('✅ AudioContext is running after user interaction');
          } else {
            console.log(`⚠️ AudioContext state after interaction: ${this.audioContext.state}`);
          }
        }
      }).catch((error) => {
        console.warn('❌ Audio system initialization failed after user interaction:', error);
      });
      
      // Remove listeners after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    console.log('🎯 Setting up user interaction listeners for audio unlock');
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
      console.log('🔄 Starting audio system initialization...');
      
      // Initialize AudioContext for better mobile support
      if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
        this.audioContext = new (AudioContext || (window as any).webkitAudioContext)();
        console.log(`🔊 AudioContext created - initial state: ${this.audioContext.state}`);
        
        // Add state change listener for monitoring
        this.audioContext.onstatechange = () => {
          const timestamp = new Date().toISOString();
          console.log(`🔄 AudioContext state changed to: ${this.audioContext?.state} at ${timestamp}`);
          console.log(`📱 Device: ${this.mobileEnv.browser} on ${this.mobileEnv.platform}`);
          
          if (this.audioContext?.state === 'suspended' && this.mobileEnv.isMobile) {
            console.log('⚠️ AudioContext suspended on mobile - autoplay policy or tab switch detected');
          }
        };
        
        // Resume AudioContext if it's suspended (common on mobile)
        if (this.audioContext.state === 'suspended') {
          const timestamp = new Date().toISOString();
          console.log(`🔄 Resuming AudioContext at ${timestamp} - current state: ${this.audioContext.state}`);
          console.log(`📱 Mobile context: ${this.mobileEnv.isMobile ? 'Mobile' : 'Desktop'} ${this.mobileEnv.browser}`);
          
          await this.audioContext.resume();
          
          console.log(`✅ AudioContext resumed - final state: ${this.audioContext.state}`);
          
          if (this.audioContext.state === 'suspended' || this.audioContext.state === 'closed') {
            console.log('❌ AudioContext failed to resume - mobile audio policy block likely');
            if (this.mobileEnv.isIOSSafari) {
              console.log('🚫 iOS Safari autoplay restriction confirmed');
            }
          }
        } else {
          console.log(`✅ AudioContext already in state: ${this.audioContext.state}`);
        }
      } else {
        console.warn('❌ AudioContext not available in this browser');
      }

      // Preload sounds after initialization
      await this.preloadSounds();
      console.log('🔊 Audio system initialization complete');
    } catch (error) {
      console.warn('❌ Audio system initialization failed:', error);
      console.log(`📱 Failed on: ${this.mobileEnv.browser} ${this.mobileEnv.platform} (${this.mobileEnv.isMobile ? 'Mobile' : 'Desktop'})`);
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
      console.log(`♻️ Sound already cached: ${key}`);
      return this.audioCache[key];
    }

    console.log(`🎵 Loading sound: ${key} from ${config.url}`);
    console.log(`📱 Loading on: ${this.mobileEnv.browser} ${this.mobileEnv.platform} (${this.mobileEnv.isMobile ? 'Mobile' : 'Desktop'})`);

    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.volume = config.volume || 0.7;
      audio.preload = 'auto';
      
      // Set up timeout for loading
      const loadTimeout = setTimeout(() => {
        console.log(`⚠️ Timeout loading ${key} after 10 seconds on ${this.mobileEnv.browser}`);
        reject(new Error(`Timeout loading ${key}`));
      }, 10000);
      
      audio.addEventListener('canplaythrough', () => {
        clearTimeout(loadTimeout);
        console.log(`✅ Loaded: ${key} on ${this.mobileEnv.browser} ${this.mobileEnv.platform}`);
        
        if (this.mobileEnv.isMobile) {
          console.log(`📱 Mobile sound ready: ${key} - canplaythrough fired successfully`);
        }
        
        this.audioCache[key] = audio;
        resolve(audio);
      });

      audio.addEventListener('error', (e) => {
        clearTimeout(loadTimeout);
        console.log(`❌ Failed to load: ${key} on ${this.mobileEnv.browser} ${this.mobileEnv.platform}`);
        console.warn(`Error details:`, e);
        
        if (this.mobileEnv.isMobile) {
          console.log(`📱 Mobile audio load error for ${key}:`, e);
        }
        
        reject(e);
      });

      audio.addEventListener('loadstart', () => {
        console.log(`🔄 Started loading: ${key}`);
      });

      audio.addEventListener('loadeddata', () => {
        console.log(`📥 Data loaded for: ${key}`);
      });

      audio.src = config.url;
    });
  }

  /**
   * Play a sound by key
   */
  async play(soundKey: string): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`🔊 SoundManager.play("${soundKey}") at ${timestamp}`);
    console.log(`📱 Device: ${this.mobileEnv.browser} on ${this.mobileEnv.platform} (${this.mobileEnv.isMobile ? 'Mobile' : 'Desktop'})`);
    console.log(`🎯 Status: enabled=${this.isEnabled}, hasUserInteracted=${this.hasUserInteracted}, AudioContext=${this.audioContext?.state || 'none'}`);
    
    if (!this.isEnabled) {
      console.log('🔊 SoundManager: Sound disabled by user preference');
      return;
    }

    // Check for reduced motion preference
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      console.log('🔊 SoundManager: Reduced motion preference detected, skipping sound');
      return;
    }

    // Wait for user interaction on mobile
    if (!this.hasUserInteracted) {
      console.log(`🔊 Waiting for user interaction before playing: ${soundKey} on ${this.mobileEnv.browser}`);
      if (this.mobileEnv.isMobile) {
        console.log('📱 Mobile device requires user interaction for audio playback');
      }
      return;
    }

    // Log first sound play attempt for debugging
    console.log(`🎵 First sound play attempt for session - ${soundKey}`);
    console.log(`📊 Audio Status: hasUserInteracted=${this.hasUserInteracted}, AudioContext=${this.audioContext?.state || 'none'}`);
    console.log(`📱 Device Info: ${this.mobileEnv.browser} ${this.mobileEnv.platform} (PWA: ${this.mobileEnv.isPWA})`);

    // Ensure audio system is initialized
    if (!this.initializationPromise) {
      await this.initializeAudioSystem();
    } else {
      await this.initializationPromise;
    }

    try {
      const config = this.sounds[soundKey];
      if (!config) {
        console.warn(`❌ Sound configuration not found: ${soundKey}`);
        return;
      }

      let audio = this.audioCache[soundKey];
      
      // Load sound if not cached
      if (!audio) {
        console.log(`🔄 Sound not cached, loading: ${soundKey}`);
        audio = await this.loadSound(soundKey, config);
      }

      // Reset audio to beginning
      audio.currentTime = 0;
      
      // Always attempt to resume AudioContext right before playing (critical for iOS)
      if (this.audioContext) {
        try {
          console.log(`🔄 Attempting AudioContext resume before playing ${soundKey} - current state: ${this.audioContext.state}`);
          await this.audioContext.resume();
          console.log(`✅ AudioContext resume successful - final state: ${this.audioContext.state}`);
        } catch (resumeError: any) {
          console.log(`❌ AudioContext resume failed before playing ${soundKey}:`, resumeError);
          console.log(`📱 Resume failed on: ${this.mobileEnv.browser} ${this.mobileEnv.platform}`);
          // Continue with play attempt even if resume fails
        }
        
        // Log final state after resume attempt
        if (this.audioContext.state === 'suspended' || this.audioContext.state === 'closed') {
          console.log(`⚠️ AudioContext still not running after resume attempt - state: ${this.audioContext.state}`);
          if (this.mobileEnv.isIOSSafari) {
            console.log('🚫 iOS Safari likely blocking AudioContext resume');
          }
        }
      } else {
        console.log(`⚠️ No AudioContext available for ${soundKey}`);
      }
      
      // Log play attempt with full context
      console.log(`▶️ Attempting to play: ${soundKey} on ${this.mobileEnv.browser} ${this.mobileEnv.platform}`);
      console.log(`🎵 AudioContext state: ${this.audioContext?.state || 'none'}`);
      
      // Use a promise to handle potential autoplay restrictions with comprehensive monitoring
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        try {
          await playPromise;
          console.log(`▶️ Played sound: ${soundKey} on ${this.mobileEnv.browser} ${this.mobileEnv.platform}`);
          console.log(`✅ Play promise resolved successfully - AudioContext: ${this.audioContext?.state || 'none'}`);
          
          if (this.mobileEnv.isMobile) {
            console.log(`📱 Mobile sound playback successful: ${soundKey}`);
          }
        } catch (playError: any) {
          console.log(`❌ Play failed: ${soundKey} on ${this.mobileEnv.browser} ${this.mobileEnv.platform}`);
          console.log(`❌ Play promise rejected:`, playError);
          
          if (playError.name === 'NotAllowedError') {
            console.log(`🚫 NotAllowedError: Browser autoplay policy blocked ${soundKey}`);
            if (this.mobileEnv.isIOSSafari) {
              console.log('🚫 iOS Safari autoplay restriction confirmed');
            } else if (this.mobileEnv.isMobile) {
              console.log('📱 Mobile browser autoplay policy active');
            }
          } else if (playError.name === 'AbortError') {
            console.log(`⏹️ AbortError: Sound playback interrupted for ${soundKey}`);
          } else {
            console.log(`❓ Unknown play error for ${soundKey}:`, playError.name, playError.message);
          }
          
          // Log fallback attempt info
          console.log(`❌ Mobile sound failed for ${soundKey} - reason: ${playError.name}`);
          throw playError;
        }
      } else {
        console.log(`⚠️ Play promise is undefined for ${soundKey} - older browser behavior`);
      }
    } catch (error: any) {
      // Handle autoplay restrictions and other errors gracefully
      console.log(`❌ Sound system error for ${soundKey}:`, error);
      console.log(`📱 Error on: ${this.mobileEnv.browser} ${this.mobileEnv.platform} (${this.mobileEnv.isMobile ? 'Mobile' : 'Desktop'})`);
      
      if (error.name === 'NotAllowedError') {
        console.log(`🚫 Browser policy blocked sound: ${soundKey}`);
        if (this.mobileEnv.isMobile) {
          console.log('📱 Mobile autoplay restriction detected');
        }
      } else {
        console.warn(`❌ Unexpected sound error: ${soundKey}`, error);
      }
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
   * Get audio system status for debugging (enhanced with mobile diagnostics)
   */
  getStatus(): { 
    enabled: boolean; 
    hasUserInteracted: boolean; 
    audioContextState?: string; 
    cachedSounds: number;
    mobileEnvironment: MobileAudioDiagnostics;
    loadedSounds: string[];
  } {
    return {
      enabled: this.isEnabled,
      hasUserInteracted: this.hasUserInteracted,
      audioContextState: this.audioContext?.state,
      cachedSounds: Object.keys(this.audioCache).length,
      mobileEnvironment: this.mobileEnv,
      loadedSounds: Object.keys(this.audioCache)
    };
  }

  /**
   * Get comprehensive mobile audio diagnostics for debugging
   */
  getMobileAudioDiagnostics(): {
    environment: MobileAudioDiagnostics;
    audioSystem: {
      contextState: string | undefined;
      hasUserInteracted: boolean;
      isEnabled: boolean;
      cachedSounds: number;
      loadedSounds: string[];
    };
    potentialIssues: string[];
  } {
    const potentialIssues: string[] = [];
    
    if (this.mobileEnv.isMobile && !this.hasUserInteracted) {
      potentialIssues.push('Mobile device requires user interaction for audio');
    }
    
    if (this.mobileEnv.isIOSSafari) {
      potentialIssues.push('iOS Safari has strict autoplay restrictions');
    }
    
    if (this.audioContext?.state === 'suspended') {
      potentialIssues.push('AudioContext is suspended - likely due to mobile policy');
    }
    
    if (this.audioContext?.state === 'closed') {
      potentialIssues.push('AudioContext is closed - audio system non-functional');
    }
    
    if (!this.isEnabled) {
      potentialIssues.push('Sound system disabled by user preference');
    }
    
    if (Object.keys(this.audioCache).length === 0 && this.hasUserInteracted) {
      potentialIssues.push('No sounds loaded despite user interaction');
    }
    
    return {
      environment: this.mobileEnv,
      audioSystem: {
        contextState: this.audioContext?.state,
        hasUserInteracted: this.hasUserInteracted,
        isEnabled: this.isEnabled,
        cachedSounds: Object.keys(this.audioCache).length,
        loadedSounds: Object.keys(this.audioCache)
      },
      potentialIssues
    };
  }

  /**
   * Force initialization (useful for testing)
   */
  async forceInitialize(): Promise<void> {
    console.log('🔧 Force initializing audio system for testing...');
    this.hasUserInteracted = true;
    await this.initializeAudioSystem();
    
    const diagnostics = this.getMobileAudioDiagnostics();
    console.log('📊 Force initialization complete - diagnostics:', diagnostics);
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