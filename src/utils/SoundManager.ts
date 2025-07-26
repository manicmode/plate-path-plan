/**
 * COMPREHENSIVE SOUND MANAGER - 5-Phase Recovery Implementation
 * Enhanced for bulletproof audio across all platforms
 */

interface AudioCache {
  [key: string]: HTMLAudioElement;
}

interface SoundConfig {
  url: string;
  volume?: number;
  preload?: boolean;
  fallbackUrl?: string;
}

interface StateChangeLog {
  timestamp: number;
  state: string;
  action: string;
  details?: string;
}

class SoundManager {
  private audioCache: AudioCache = {};
  private isEnabled: boolean = true;
  private audioContext: AudioContext | null = null;
  private hasUserInteracted: boolean = false;
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private initializationTimeout: NodeJS.Timeout | null = null;
  private volume: number = 0.7;
  
  // Enhanced tracking
  private lastError: string = '';
  private lastSoundPlayed: number = 0;
  private stateChangeLog: StateChangeLog[] = [];
  private interactionAttempts: number = 0;
  private audioContextCreationAttempts: number = 0;
  private initializationStartTime: number = 0;
  private soundLoadingStatus: Record<string, 'pending' | 'loading' | 'loaded' | 'failed'> = {};
  
  // Sound configuration with fallbacks
  private sounds: Record<string, SoundConfig> = {
    ai_thought: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/ai_thought.wav',
      fallbackUrl: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1e2+diMFl2+z9qsAAB=',
      volume: 0.6,
      preload: true
    },
    body_scan_camera: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/body_scan_camera.wav',
      fallbackUrl: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1e2+diMFl2+z9qsAAB=',
      volume: 0.8,
      preload: true
    },
    challenge_win: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/challenge_win.wav',
      fallbackUrl: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1e2+diMFl2+z9qsAAB=',
      volume: 0.9,
      preload: true
    },
    food_log_confirm: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/food_log_confirm.wav',
      fallbackUrl: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1e2+diMFl2+z9qsAAB=',
      volume: 0.7,
      preload: true
    },
    friend_added: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/friend_added.wav',
      fallbackUrl: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1e2+diMFl2+z9qsAAB=',
      volume: 0.8,
      preload: true
    },
    goal_hit: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/goal_hit.wav',
      fallbackUrl: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1e2+diMFl2+z9qsAAB=',
      volume: 0.9,
      preload: true
    },
    health_scan_capture: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/health_scan_capture.wav',
      fallbackUrl: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1e2+diMFl2+z9qsAAB=',
      volume: 0.7,
      preload: true
    },
    progress_update: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/progress_update.wav',
      fallbackUrl: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1e2+diMFl2+z9qsAAB=',
      volume: 0.6,
      preload: true
    },
    reminder_chime: {
      url: 'https://raw.githubusercontent.com/manicmode/nutricoach-sounds/main/reminder_chime.wav',
      fallbackUrl: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1e2+diMFl2+z9qsAAB=',
      volume: 0.5,
      preload: true
    }
  };

  constructor() {
    this.loadUserPreferences();
    this.setupUserInteractionListeners();
    this.logStateChange('constructor', 'SoundManager initialized');
    
    // Initialize all sound loading status
    Object.keys(this.sounds).forEach(key => {
      this.soundLoadingStatus[key] = 'pending';
    });
  }

  // ============= PHASE 1: AGGRESSIVE AUDIOCONTEXT RESUME =============
  
  private setupUserInteractionListeners(): void {
    const interactionHandler = (event: Event) => {
      this.logStateChange('user_interaction', `Detected: ${event.type}`, `Target: ${event.target?.constructor.name}`);
      this.activateAudioSystemOnInteraction();
    };

    // Comprehensive interaction detection - covers all mobile scenarios
    const events = [
      'click', 'touchstart', 'touchend', 'touchmove', 'pointerdown', 'pointerup',
      'keydown', 'mousedown', 'scroll', 'focus', 'visibilitychange'
    ];
    
    events.forEach(eventType => {
      document.addEventListener(eventType, interactionHandler, { 
        passive: true, 
        once: true,
        capture: true 
      });
    });

    // iOS Safari PWA specific workarounds
    if (this.isIOSSafari()) {
      this.setupIOSSpecificListeners(interactionHandler);
    }

    console.log('🔊 [SoundManager] 📱 Enhanced interaction listeners established for all platforms');
  }

  private isIOSSafari(): boolean {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  }

  private setupIOSSpecificListeners(handler: (event: Event) => void): void {
    // iOS Safari requires specific interaction patterns
    window.addEventListener('pageshow', handler, { once: true });
    window.addEventListener('focus', handler, { once: true });
    document.addEventListener('gesturestart', handler, { once: true });
    
    // PWA specific
    if ((window.navigator as any).standalone) {
      console.log('🔊 [SoundManager] 📱 PWA detected, adding iOS PWA specific listeners');
      document.addEventListener('touchstart', handler, { once: true, passive: false });
    }
  }

  private async activateAudioSystemOnInteraction(): Promise<void> {
    if (this.hasUserInteracted) {
      console.log('🔊 [SoundManager] ✅ Audio already activated, skipping');
      return;
    }

    this.hasUserInteracted = true;
    this.interactionAttempts++;
    this.logStateChange('activation', 'User interaction detected', `Attempt #${this.interactionAttempts}`);

    try {
      // Immediate aggressive AudioContext creation and resume
      await this.createAndResumeAudioContext();
      
      // Start initialization with timeout protection
      this.initializeWithTimeout();
      
      console.log('🔊 [SoundManager] ✅ Audio system activated successfully');
    } catch (error) {
      this.logStateChange('activation_error', 'Failed to activate audio system', error.message);
      console.error('🔊 [SoundManager] ❌ Audio activation failed:', error);
    }
  }

  private async createAndResumeAudioContext(): Promise<void> {
    this.audioContextCreationAttempts++;
    
    try {
      // Create AudioContext
      if (!this.audioContext) {
        if (typeof AudioContext !== 'undefined') {
          this.audioContext = new AudioContext();
        } else if (typeof (window as any).webkitAudioContext !== 'undefined') {
          this.audioContext = new (window as any).webkitAudioContext();
        } else {
          throw new Error('AudioContext not supported');
        }
        
        this.logStateChange('audiocontext_created', `Created with state: ${this.audioContext.state}`);
      }

      // Aggressive resume with multiple attempts
      if (this.audioContext.state === 'suspended') {
        this.logStateChange('audiocontext_resuming', 'Attempting resume');
        
        await this.audioContext.resume();
        
        // Verify resume with fallback attempts
        let resumeAttempts = 0;
        while (this.audioContext.state === 'suspended' && resumeAttempts < 3) {
          resumeAttempts++;
          this.logStateChange('audiocontext_retry', `Resume attempt #${resumeAttempts}`);
          await new Promise(resolve => setTimeout(resolve, 100));
          await this.audioContext.resume();
        }
        
        if (this.audioContext.state === 'suspended') {
          throw new Error('AudioContext failed to resume after multiple attempts');
        }
        
        this.logStateChange('audiocontext_resumed', `Successfully resumed, state: ${this.audioContext.state}`);
      }
    } catch (error) {
      this.logStateChange('audiocontext_error', 'AudioContext creation/resume failed', error.message);
      throw error;
    }
  }

  // ============= PHASE 2: BULLETPROOF SOUND LOADING =============

  private initializeWithTimeout(): void {
    if (this.isInitializing) return;
    
    this.isInitializing = true;
    this.initializationStartTime = Date.now();
    
    // Set timeout to prevent hanging
    this.initializationTimeout = setTimeout(() => {
      this.logStateChange('initialization_timeout', 'Initialization timed out after 10 seconds');
      this.resetInitialization();
    }, 10000);

    this.initializationPromise = this.performBulletproofInitialization();
  }

  private async performBulletproofInitialization(): Promise<void> {
    try {
      this.logStateChange('initialization_start', 'Starting bulletproof initialization');
      
      // Load sounds with enhanced error handling
      await this.loadAllSoundsWithFallbacks();
      
      this.isInitialized = true;
      this.clearInitializationTimeout();
      
      const duration = Date.now() - this.initializationStartTime;
      this.logStateChange('initialization_complete', `Completed in ${duration}ms`);
      
    } catch (error) {
      this.logStateChange('initialization_error', 'Initialization failed', error.message);
      this.resetInitialization();
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  private async loadAllSoundsWithFallbacks(): Promise<void> {
    const loadPromises = Object.entries(this.sounds).map(async ([key, config]) => {
      try {
        this.soundLoadingStatus[key] = 'loading';
        await this.loadSoundWithFallback(key, config);
        this.soundLoadingStatus[key] = 'loaded';
        this.logStateChange('sound_loaded', `Successfully loaded: ${key}`);
      } catch (error) {
        this.soundLoadingStatus[key] = 'failed';
        this.logStateChange('sound_failed', `Failed to load: ${key}`, error.message);
        // Don't throw - allow other sounds to continue loading
      }
    });

    await Promise.allSettled(loadPromises);
    
    const loadedCount = Object.values(this.soundLoadingStatus).filter(status => status === 'loaded').length;
    const totalCount = Object.keys(this.sounds).length;
    
    console.log(`🔊 [SoundManager] 📊 Sound loading complete: ${loadedCount}/${totalCount} loaded`);
  }

  private async loadSoundWithFallback(key: string, config: SoundConfig): Promise<HTMLAudioElement> {
    // Try primary URL first
    try {
      return await this.loadSingleSound(key, config.url, config.volume || 0.7);
    } catch (primaryError) {
      console.warn(`🔊 [SoundManager] Primary URL failed for ${key}, trying fallback`);
      
      // Try fallback URL
      if (config.fallbackUrl) {
        try {
          return await this.loadSingleSound(key, config.fallbackUrl, config.volume || 0.7);
        } catch (fallbackError) {
          console.error(`🔊 [SoundManager] Both primary and fallback failed for ${key}`);
        }
      }
      
      // Create silent fallback to prevent crashes
      return this.createSilentFallback(key);
    }
  }

  private async loadSingleSound(key: string, url: string, volume: number): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.volume = volume;
      audio.preload = 'auto';
      
      let timeoutId: NodeJS.Timeout;
      
      const cleanup = () => {
        clearTimeout(timeoutId);
        audio.removeEventListener('canplaythrough', onLoad);
        audio.removeEventListener('error', onError);
      };

      const onLoad = () => {
        cleanup();
        this.audioCache[key] = audio;
        resolve(audio);
      };

      const onError = (e: any) => {
        cleanup();
        reject(new Error(`Failed to load ${url}: ${e.message || 'Unknown error'}`));
      };

      // Set timeout for loading
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Loading timeout for ${url}`));
      }, 5000);

      audio.addEventListener('canplaythrough', onLoad);
      audio.addEventListener('error', onError);
      audio.src = url;
    });
  }

  private createSilentFallback(key: string): HTMLAudioElement {
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1e2+diMFl2+z9qsAAB=';
    audio.volume = 0;
    this.audioCache[key] = audio;
    return audio;
  }

  // ============= PHASE 3: BULLETPROOF PLAYBACK =============

  async play(soundKey: string): Promise<void> {
    const playbackStart = Date.now();
    console.log(`🔊 [SoundManager] ▶️ PLAY REQUEST: "${soundKey}"`);
    
    try {
      // Pre-flight checks
      if (!this.isEnabled) {
        console.log(`🔊 [SoundManager] 🔇 Sound disabled, skipping "${soundKey}"`);
        this.showVisualFeedback(soundKey);
        return;
      }

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        console.log(`🔊 [SoundManager] ♿ Reduced motion preference, skipping "${soundKey}"`);
        this.showVisualFeedback(soundKey);
        return;
      }

      // Ensure audio system is ready
      await this.ensureAudioSystemReady();

      // Get or load the sound
      let audio = this.audioCache[soundKey];
      if (!audio) {
        console.log(`🔊 [SoundManager] 📥 Loading "${soundKey}" on-demand`);
        const config = this.sounds[soundKey];
        if (!config) {
          throw new Error(`Sound configuration not found: ${soundKey}`);
        }
        audio = await this.loadSoundWithFallback(soundKey, config);
      }

      // Final AudioContext check
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Play the sound
      audio.currentTime = 0;
      await audio.play();
      
      this.lastSoundPlayed = Date.now();
      const duration = Date.now() - playbackStart;
      console.log(`🔊 [SoundManager] ✅ "${soundKey}" played successfully in ${duration}ms`);
      
    } catch (error) {
      const duration = Date.now() - playbackStart;
      this.lastError = `${soundKey}: ${error.message}`;
      console.error(`🔊 [SoundManager] ❌ "${soundKey}" failed after ${duration}ms:`, error);
      
      // Show visual feedback as fallback
      this.showVisualFeedback(soundKey);
    }
  }

  private async ensureAudioSystemReady(): Promise<void> {
    // Force user interaction if not detected
    if (!this.hasUserInteracted) {
      console.log('🔊 [SoundManager] 🚨 No user interaction, forcing activation');
      this.hasUserInteracted = true;
      await this.createAndResumeAudioContext();
    }

    // Wait for initialization if in progress
    if (this.isInitializing && this.initializationPromise) {
      console.log('🔊 [SoundManager] ⏳ Waiting for initialization to complete');
      await this.initializationPromise;
    }

    // Initialize if not started
    if (!this.isInitialized && !this.isInitializing) {
      console.log('🔊 [SoundManager] 🔧 Starting initialization');
      this.initializeWithTimeout();
      await this.initializationPromise;
    }
  }

  // ============= PHASE 4: VISUAL FEEDBACK & DEBUGGING =============

  private showVisualFeedback(soundKey: string): void {
    // Create visual notification when sound fails
    const notification = document.createElement('div');
    notification.textContent = '✅ Action Complete!';
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      animation: slideInFade 2s ease-out forwards;
      pointer-events: none;
    `;

    // Add styles if not exists
    if (!document.querySelector('#sound-feedback-styles')) {
      const style = document.createElement('style');
      style.id = 'sound-feedback-styles';
      style.textContent = `
        @keyframes slideInFade {
          0% { transform: translateX(100%); opacity: 0; }
          15% { transform: translateX(0); opacity: 1; }
          85% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2100);
  }

  // ============= UTILITIES & STATUS =============

  private logStateChange(action: string, state: string, details?: string): void {
    const logEntry: StateChangeLog = {
      timestamp: Date.now(),
      action,
      state,
      details
    };
    
    this.stateChangeLog.push(logEntry);
    
    // Keep only last 50 entries
    if (this.stateChangeLog.length > 50) {
      this.stateChangeLog = this.stateChangeLog.slice(-50);
    }
    
    console.log(`🔊 [SoundManager] 📝 ${action}: ${state}${details ? ` (${details})` : ''}`);
  }

  private clearInitializationTimeout(): void {
    if (this.initializationTimeout) {
      clearTimeout(this.initializationTimeout);
      this.initializationTimeout = null;
    }
  }

  private resetInitialization(): void {
    this.isInitializing = false;
    this.isInitialized = false;
    this.initializationPromise = null;
    this.clearInitializationTimeout();
  }

  // ============= PUBLIC API =============

  setSoundEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem('sound_enabled', enabled.toString());
    this.logStateChange('preference_change', `Sound ${enabled ? 'enabled' : 'disabled'}`);
  }

  isSoundEnabled(): boolean {
    return this.isEnabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    Object.values(this.audioCache).forEach(audio => {
      audio.volume = this.volume;
    });
  }

  async forceInitialize(): Promise<void> {
    console.log('🔊 [SoundManager] 🚀 FORCE INITIALIZATION');
    this.hasUserInteracted = true;
    await this.createAndResumeAudioContext();
    this.initializeWithTimeout();
    await this.initializationPromise;
  }

  getStatus() {
    const loadedSounds = Object.values(this.soundLoadingStatus).filter(s => s === 'loaded').length;
    const totalSounds = Object.keys(this.sounds).length;
    
    let systemHealth: 'critical' | 'warning' | 'good' | 'excellent' = 'critical';
    
    if (this.isEnabled && this.hasUserInteracted && this.audioContext?.state === 'running') {
      if (loadedSounds === totalSounds) {
        systemHealth = 'excellent';
      } else if (loadedSounds > totalSounds / 2) {
        systemHealth = 'good';
      } else {
        systemHealth = 'warning';
      }
    }

    return {
      enabled: this.isEnabled,
      hasUserInteracted: this.hasUserInteracted,
      audioContextState: this.audioContext?.state || 'not-created',
      cachedSounds: Object.keys(this.audioCache).length,
      totalSounds,
      loadedSounds,
      soundLoadingStatus: { ...this.soundLoadingStatus },
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
      lastError: this.lastError,
      lastSoundPlayed: this.lastSoundPlayed,
      interactionAttempts: this.interactionAttempts,
      audioContextCreationAttempts: this.audioContextCreationAttempts,
      systemHealth,
      stateChangeLog: [...this.stateChangeLog],
      initializationTime: this.initializationStartTime ? Date.now() - this.initializationStartTime : 0
    };
  }

  getHealthScore(): number {
    const status = this.getStatus();
    let score = 0;
    
    if (status.enabled) score += 20;
    if (status.hasUserInteracted) score += 20;
    if (status.audioContextState === 'running') score += 30;
    if (status.isInitialized) score += 15;
    score += (status.loadedSounds / status.totalSounds) * 15;
    
    return Math.round(score);
  }

  private loadUserPreferences(): void {
    const soundEnabled = localStorage.getItem('sound_enabled');
    this.isEnabled = soundEnabled !== 'false';
  }

  activateOnUserInteraction(): void {
    console.log('🔊 [SoundManager] 🎯 Manual activation triggered');
    this.activateAudioSystemOnInteraction();
  }

  // Convenience methods
  playAIThought = () => this.play('ai_thought');
  playBodyScanCapture = () => this.play('body_scan_camera');
  playChallengeWin = () => this.play('challenge_win');
  playFoodLogConfirm = () => this.play('food_log_confirm');
  playFriendAdded = () => this.play('friend_added');
  playGoalHit = () => this.play('goal_hit');
  playHealthScanCapture = () => this.play('health_scan_capture');
  playProgressUpdate = () => this.play('progress_update');
  playReminderChime = () => this.play('reminder_chime');
}

// Export singleton
export const soundManager = new SoundManager();

// Export convenience functions
export const playAIThought = () => soundManager.play('ai_thought');
export const playBodyScanCapture = () => soundManager.play('body_scan_camera');
export const playChallengeWin = () => soundManager.play('challenge_win');
export const playFoodLogConfirm = () => soundManager.play('food_log_confirm');
export const playFriendAdded = () => soundManager.play('friend_added');
export const playGoalHit = () => soundManager.play('goal_hit');
export const playHealthScanCapture = () => soundManager.play('health_scan_capture');
export const playProgressUpdate = () => soundManager.play('progress_update');
export const playReminderChime = () => soundManager.play('reminder_chime');
