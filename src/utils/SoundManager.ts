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
  private audioContext: AudioContext | null = null;
  private hasUserInteracted: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private lastSoundPlayed: { soundKey: string; timestamp: number; success: boolean } | null = null;
  private interactionAttempts: number = 0;
  private audioContextCreationAttempts: number = 0;
  private lastError: { soundKey: string; error: string; timestamp: number } | null = null;
  
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
   * Setup enhanced user interaction listeners for mobile compatibility
   * Phase 1: Enhanced User Interaction Detection
   */
  private setupUserInteractionListener(): void {
    const handleFirstInteraction = (event: Event) => {
      console.log(`🔊 [SoundManager] User interaction detected via ${event.type}, initializing audio system`);
      this.hasUserInteracted = true;
      this.initializeAudioSystem();
      
      // Remove all listeners after first interaction
      this.removeInteractionListeners();
    };

    // Store listeners for cleanup
    this.interactionHandler = handleFirstInteraction;

    // Enhanced interaction detection - capture ANY user interaction
    const events = ['click', 'touchstart', 'touchend', 'keydown', 'mousedown', 'pointerdown'];
    events.forEach(eventType => {
      document.addEventListener(eventType, handleFirstInteraction, { passive: true, once: true });
    });

    // Add specific app interaction listeners for better detection
    this.setupAppSpecificListeners(handleFirstInteraction);

    console.log('🔊 [SoundManager] Enhanced interaction listeners established');
  }

  private interactionHandler: ((event: Event) => void) | null = null;

  /**
   * Setup app-specific interaction listeners for immediate activation
   */
  private setupAppSpecificListeners(handler: (event: Event) => void): void {
    // Listen for React Router navigation changes
    window.addEventListener('popstate', handler, { passive: true, once: true });
    
    // Listen for any button clicks in the app
    const buttonClickHandler = (e: Event) => {
      if ((e.target as Element)?.tagName === 'BUTTON' || (e.target as Element)?.closest('button')) {
        console.log('🔊 [SoundManager] Button interaction detected');
        handler(e);
      }
    };
    document.addEventListener('click', buttonClickHandler, { passive: true, once: true });
  }

  /**
   * Remove all interaction listeners
   */
  private removeInteractionListeners(): void {
    if (this.interactionHandler) {
      const events = ['click', 'touchstart', 'touchend', 'keydown', 'mousedown', 'pointerdown'];
      events.forEach(eventType => {
        document.removeEventListener(eventType, this.interactionHandler!);
      });
      window.removeEventListener('popstate', this.interactionHandler!);
      this.interactionHandler = null;
    }
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
   * Phase 2: Proactive Sound System Initialization
   */
  private async performInitialization(): Promise<void> {
    console.log('🔊 [SoundManager] Starting comprehensive audio initialization...');
    
    try {
      // Phase 2: Eager AudioContext Creation
      if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
        console.log('🔊 [SoundManager] Creating AudioContext...');
        this.audioContext = new (AudioContext || (window as any).webkitAudioContext)();
        
        console.log(`🔊 [SoundManager] AudioContext state: ${this.audioContext.state}`);
        
        // Resume AudioContext if it's suspended (common on mobile)
        if (this.audioContext.state === 'suspended') {
          console.log('🔊 [SoundManager] Resuming suspended AudioContext...');
          await this.audioContext.resume();
          console.log(`🔊 [SoundManager] AudioContext resumed, new state: ${this.audioContext.state}`);
        }
      } else {
        console.warn('🔊 [SoundManager] AudioContext not supported in this browser');
      }

      // Phase 2: Preload Verification - ensure all sounds load successfully
      console.log('🔊 [SoundManager] Starting sound preloading with verification...');
      const preloadResults = await this.preloadSoundsWithVerification();
      
      const successCount = preloadResults.filter(r => r.status === 'fulfilled').length;
      const totalCount = preloadResults.length;
      
      console.log(`🔊 [SoundManager] Audio initialization complete: ${successCount}/${totalCount} sounds loaded`);
      
      if (successCount < totalCount) {
        console.warn('🔊 [SoundManager] Some sounds failed to load, but system is functional');
      }
      
    } catch (error) {
      console.error('🔊 [SoundManager] Audio system initialization failed:', error);
      throw error; // Re-throw to be handled by caller
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
   * Preload frequently used sounds with verification
   * Phase 2: Enhanced preloading with detailed success/failure tracking
   */
  private async preloadSoundsWithVerification(): Promise<PromiseSettledResult<HTMLAudioElement>[]> {
    if (!this.isEnabled) {
      console.log('🔊 [SoundManager] Sound disabled, skipping preload');
      return [];
    }

    console.log('🔊 [SoundManager] Starting verified sound preloading...');
    
    const preloadPromises = Object.entries(this.sounds)
      .filter(([_, config]) => config.preload)
      .map(async ([key, config]) => {
        try {
          console.log(`🔊 [SoundManager] Loading sound: ${key}`);
          const audio = await this.loadSound(key, config);
          console.log(`✅ [SoundManager] Successfully loaded: ${key}`);
          return audio;
        } catch (error) {
          console.error(`❌ [SoundManager] Failed to load sound: ${key}`, error);
          throw error;
        }
      });

    const results = await Promise.allSettled(preloadPromises);
    
    // Log detailed results
    results.forEach((result, index) => {
      const [key] = Object.entries(this.sounds).filter(([_, config]) => config.preload)[index];
      if (result.status === 'fulfilled') {
        console.log(`🔊 [SoundManager] ✅ ${key}: loaded successfully`);
      } else {
        console.error(`🔊 [SoundManager] ❌ ${key}: ${result.reason}`);
      }
    });

    return results;
  }

  /**
   * Legacy preload method (kept for compatibility)
   */
  private async preloadSounds(): Promise<void> {
    const results = await this.preloadSoundsWithVerification();
    const failedCount = results.filter(r => r.status === 'rejected').length;
    
    if (failedCount > 0) {
      console.warn(`🔊 [SoundManager] ${failedCount} sounds failed to preload`);
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
   * BULLETPROOF SOUND PLAYBACK with comprehensive diagnostics
   */
  async play(soundKey: string): Promise<void> {
    const startTime = Date.now();
    console.log(`🔊 [SoundManager] ====== SOUND PLAYBACK REQUEST: "${soundKey}" ======`);
    console.log(`🔊 [SoundManager] Timestamp: ${new Date().toISOString()}`);
    console.log(`🔊 [SoundManager] System State - enabled: ${this.isEnabled}, userInteracted: ${this.hasUserInteracted}, audioContextState: ${this.audioContext?.state || 'null'}`);
    
    // STAGE 1: User preference check
    if (!this.isEnabled) {
      console.log(`🔊 [SoundManager] ❌ ABORT: Sound disabled by user preference`);
      this.lastSoundPlayed = { soundKey, timestamp: startTime, success: false };
      return;
    }

    // STAGE 2: Reduced motion check
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      console.log(`🔊 [SoundManager] ❌ ABORT: Reduced motion preference detected`);
      this.lastSoundPlayed = { soundKey, timestamp: startTime, success: false };
      return;
    }

    // STAGE 3: Critical user interaction check
    if (!this.hasUserInteracted) {
      console.error(`🔊 [SoundManager] 🚫 CRITICAL FAILURE: No user interaction detected for "${soundKey}"`);
      console.log(`🔊 [SoundManager] Interaction attempts so far: ${this.interactionAttempts}`);
      console.log(`🔊 [SoundManager] 💡 SOLUTION: User must click, tap, or interact with the page first`);
      
      // Try to force activate if we're in a context where user just interacted
      console.log(`🔊 [SoundManager] 🔄 Attempting emergency user interaction activation...`);
      this.emergencyUserInteractionActivation();
      
      if (!this.hasUserInteracted) {
        this.lastSoundPlayed = { soundKey, timestamp: startTime, success: false };
        return;
      }
    }

    try {
      // STAGE 4: Audio system initialization
      console.log(`🔊 [SoundManager] 🔧 Ensuring audio system initialization...`);
      await this.bulletproofInitialization();

      // STAGE 5: Sound configuration validation
      console.log(`🔊 [SoundManager] 📋 Validating sound configuration for "${soundKey}"...`);
      const config = this.sounds[soundKey];
      if (!config) {
        console.error(`🔊 [SoundManager] ❌ FATAL: Sound configuration missing for "${soundKey}"`);
        console.log('🔊 [SoundManager] Available sounds:', Object.keys(this.sounds));
        this.lastSoundPlayed = { soundKey, timestamp: startTime, success: false };
        return;
      }

      // STAGE 6: Audio loading and caching
      let audio = this.audioCache[soundKey];
      if (!audio) {
        console.log(`🔊 [SoundManager] 📥 Loading sound "${soundKey}" from: ${config.url}`);
        try {
          audio = await this.bulletproofSoundLoading(soundKey, config);
          console.log(`🔊 [SoundManager] ✅ Sound "${soundKey}" loaded and cached successfully`);
        } catch (loadError) {
          console.error(`🔊 [SoundManager] ❌ LOAD FAILED for "${soundKey}":`, loadError);
          this.lastSoundPlayed = { soundKey, timestamp: startTime, success: false };
          throw loadError;
        }
      } else {
        console.log(`🔊 [SoundManager] 📦 Using cached audio for "${soundKey}"`);
      }

      // STAGE 7: AudioContext bulletproofing
      await this.bulletproofAudioContextManagement();

      // STAGE 8: Final playback attempt
      console.log(`🔊 [SoundManager] 🎵 ATTEMPTING PLAYBACK of "${soundKey}"...`);
      audio.currentTime = 0;
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        const duration = Date.now() - startTime;
        console.log(`🔊 [SoundManager] 🎉 SUCCESS! "${soundKey}" played successfully in ${duration}ms`);
        this.lastSoundPlayed = { soundKey, timestamp: startTime, success: true };
      } else {
        console.warn(`🔊 [SoundManager] ⚠️ Play method didn't return promise for "${soundKey}"`);
        this.lastSoundPlayed = { soundKey, timestamp: startTime, success: false };
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`🔊 [SoundManager] 💥 PLAYBACK FAILED for "${soundKey}" after ${duration}ms:`, error);
      
      this.lastSoundPlayed = { soundKey, timestamp: startTime, success: false };
      this.lastError = { soundKey, error: error.message, timestamp: startTime };

      // Detailed error analysis
      if (error.name === 'NotAllowedError') {
        console.error(`🔊 [SoundManager] 🚫 BROWSER BLOCKED "${soundKey}" - autoplay policy violation`);
        console.log('🔊 [SoundManager] 💡 This indicates insufficient user interaction or browser restriction');
      } else if (error.name === 'AbortError') {
        console.error(`🔊 [SoundManager] ⏹️ PLAYBACK ABORTED for "${soundKey}"`);
      } else if (error.name === 'NotSupportedError') {
        console.error(`🔊 [SoundManager] 🚫 AUDIO FORMAT NOT SUPPORTED for "${soundKey}"`);
      } else {
        console.error(`🔊 [SoundManager] 🔥 UNKNOWN ERROR playing "${soundKey}":`, error.message);
      }

      // Trigger visual fallback
      this.triggerVisualFallback(soundKey);
      throw error;
    }
  }

  /**
   * Emergency user interaction activation for edge cases
   */
  private emergencyUserInteractionActivation(): void {
    console.log('🔊 [SoundManager] 🚨 EMERGENCY USER INTERACTION ACTIVATION');
    this.hasUserInteracted = true;
    this.interactionAttempts++;
    console.log(`🔊 [SoundManager] ✅ Emergency activation complete, attempt #${this.interactionAttempts}`);
  }

  /**
   * Bulletproof audio system initialization
   */
  private async bulletproofInitialization(): Promise<void> {
    if (!this.initializationPromise) {
      console.log('🔊 [SoundManager] 🔧 Starting fresh audio initialization...');
      this.initializationPromise = this.performInitialization();
    } else {
      console.log('🔊 [SoundManager] ⏳ Waiting for existing initialization...');
    }
    await this.initializationPromise;
  }

  /**
   * Bulletproof sound loading with retries
   */
  private async bulletproofSoundLoading(key: string, config: SoundConfig): Promise<HTMLAudioElement> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔊 [SoundManager] 📥 Load attempt ${attempt}/${maxRetries} for "${key}"`);
        const audio = await this.loadSound(key, config);
        console.log(`🔊 [SoundManager] ✅ Load successful for "${key}" on attempt ${attempt}`);
        return audio;
      } catch (error) {
        lastError = error as Error;
        console.warn(`🔊 [SoundManager] ❌ Load attempt ${attempt} failed for "${key}":`, error);
        
        if (attempt < maxRetries) {
          const delay = attempt * 1000; // Progressive delay
          console.log(`🔊 [SoundManager] ⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`🔊 [SoundManager] 💥 All load attempts failed for "${key}"`);
    throw lastError || new Error(`Failed to load sound after ${maxRetries} attempts`);
  }

  /**
   * Bulletproof AudioContext management
   */
  private async bulletproofAudioContextManagement(): Promise<void> {
    if (!this.audioContext) {
      console.log('🔊 [SoundManager] 🎧 AudioContext not created, creating now...');
      await this.createAudioContext();
    }

    if (this.audioContext) {
      console.log(`🔊 [SoundManager] 🎧 AudioContext state before resume: ${this.audioContext.state}`);
      
      if (this.audioContext.state === 'suspended') {
        console.log('🔊 [SoundManager] 🔄 AudioContext suspended, attempting resume...');
        try {
          await this.audioContext.resume();
          console.log(`🔊 [SoundManager] ✅ AudioContext resumed, new state: ${this.audioContext.state}`);
          
          // Double-check the state
          if (this.audioContext.state === 'suspended') {
            console.error('🔊 [SoundManager] ❌ AudioContext still suspended after resume attempt');
            throw new Error('AudioContext failed to resume');
          }
        } catch (resumeError) {
          console.error('🔊 [SoundManager] ❌ AudioContext resume failed:', resumeError);
          throw resumeError;
        }
      } else {
        console.log(`🔊 [SoundManager] ✅ AudioContext state is ready: ${this.audioContext.state}`);
      }
    }
  }

  /**
   * Create AudioContext with enhanced error handling
   */
  private async createAudioContext(): Promise<void> {
    this.audioContextCreationAttempts++;
    console.log(`🔊 [SoundManager] 🎧 Creating AudioContext (attempt #${this.audioContextCreationAttempts})`);
    
    try {
      if (typeof AudioContext !== 'undefined') {
        this.audioContext = new AudioContext();
      } else if (typeof (window as any).webkitAudioContext !== 'undefined') {
        this.audioContext = new (window as any).webkitAudioContext();
      } else {
        throw new Error('AudioContext not supported in this browser');
      }
      
      console.log(`🔊 [SoundManager] ✅ AudioContext created with state: ${this.audioContext.state}`);
    } catch (error) {
      console.error('🔊 [SoundManager] ❌ AudioContext creation failed:', error);
      throw error;
    }
  }

  /**
   * Visual fallback when sound fails
   */
  private triggerVisualFallback(soundKey: string): void {
    console.log(`🔊 [SoundManager] 💫 Triggering visual fallback for "${soundKey}"`);
    
    // Create a temporary visual notification
    const notification = document.createElement('div');
    notification.textContent = '✅ Action Complete!';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    
    // Add CSS animation
    if (!document.querySelector('#sound-fallback-styles')) {
      const style = document.createElement('style');
      style.id = 'sound-fallback-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 2000);
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
   * Get comprehensive status with bulletproof diagnostics
   */
  getStatus(): { 
    enabled: boolean; 
    hasUserInteracted: boolean; 
    audioContextState?: string; 
    cachedSounds: number;
    initializationStatus: string;
    lastError?: { soundKey: string; error: string; timestamp: number };
    lastSoundPlayed?: { soundKey: string; timestamp: number; success: boolean };
    soundUrls: Record<string, string>;
    interactionAttempts: number;
    audioContextCreationAttempts: number;
    systemHealth: 'critical' | 'warning' | 'good' | 'excellent';
  } {
    let systemHealth: 'critical' | 'warning' | 'good' | 'excellent' = 'critical';
    
    if (this.isEnabled && this.hasUserInteracted) {
      if (this.audioContext?.state === 'running' && Object.keys(this.audioCache).length > 0) {
        systemHealth = 'excellent';
      } else if (this.audioContext?.state === 'running') {
        systemHealth = 'good';
      } else {
        systemHealth = 'warning';
      }
    }

    return {
      enabled: this.isEnabled,
      hasUserInteracted: this.hasUserInteracted,
      audioContextState: this.audioContext?.state,
      cachedSounds: Object.keys(this.audioCache).length,
      initializationStatus: this.initializationPromise ? 'initialized' : 'pending',
      lastError: this.lastError,
      lastSoundPlayed: this.lastSoundPlayed,
      soundUrls: Object.fromEntries(Object.entries(this.sounds).map(([key, config]) => [key, config.url])),
      interactionAttempts: this.interactionAttempts,
      audioContextCreationAttempts: this.audioContextCreationAttempts,
      systemHealth
    };
  }

  /**
   * Force initialization with enhanced logging (useful for testing and login integration)
   * Phase 2: Proactive initialization support
   */
  async forceInitialize(): Promise<void> {
    console.log('🔊 [SoundManager] 🚀 FORCE INITIALIZATION requested');
    console.log('🔊 [SoundManager] Setting hasUserInteracted = true');
    
    this.hasUserInteracted = true;
    
    try {
      await this.initializeAudioSystem();
      console.log('🔊 [SoundManager] ✅ Force initialization completed successfully');
    } catch (error) {
      console.error('🔊 [SoundManager] ❌ Force initialization failed:', error);
      throw error;
    }
  }

  /**
   * Manual user interaction trigger for immediate activation
   * Phase 1: Enhanced user interaction detection
   */
  activateOnUserInteraction(): void {
    console.log('🔊 [SoundManager] 🎯 Manual user interaction activation');
    
    if (!this.hasUserInteracted) {
      this.hasUserInteracted = true;
      this.initializeAudioSystem();
      this.removeInteractionListeners();
      console.log('🔊 [SoundManager] ✅ Audio system activated via manual trigger');
    } else {
      console.log('🔊 [SoundManager] ℹ️ Audio system already activated');
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