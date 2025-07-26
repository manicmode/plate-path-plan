/**
 * WEB AUDIO API SOUND MANAGER - Complete Architecture Fix
 * Bulletproof sound system using Web Audio API for cross-platform compatibility
 */

interface AudioBufferCache {
  [key: string]: AudioBuffer;
}

interface SoundConfig {
  url: string;
  volume?: number;
  preload?: boolean;
  fallbackUrl?: string;
}

interface LoadingStatus {
  [key: string]: 'pending' | 'loading' | 'loaded' | 'failed' | 'using_fallback';
}

interface StateChangeLog {
  timestamp: number;
  state: string;
  action: string;
  details?: string;
}

class SoundManager {
  private audioContext: AudioContext | null = null;
  private audioBuffers: AudioBufferCache = {};
  private isEnabled: boolean = true;
  private hasUserInteracted: boolean = false;
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private volume: number = 0.7;
  
  // Enhanced tracking
  private lastError: string = '';
  private stateChangeLog: StateChangeLog[] = [];
  private loadingStatus: LoadingStatus = {};
  private initializationStartTime: number = 0;
  private audioContextCreationAttempts: number = 0;
  
  // Sound configuration with local audio files (GitHub repo doesn't exist)
  private sounds: Record<string, SoundConfig> = {
    ai_thought: {
      url: '/sounds/ai_thought.wav',
      fallbackUrl: '/sounds/ai_thought.wav',
      volume: 0.6,
      preload: true
    },
    body_scan_camera: {
      url: '/sounds/camera_shutter.wav',
      fallbackUrl: '/sounds/camera_shutter.wav',
      volume: 0.8,
      preload: true
    },
    challenge_win: {
      url: '/sounds/celebration.wav',
      fallbackUrl: '/sounds/celebration.wav',
      volume: 0.9,
      preload: true
    },
    food_log_confirm: {
      url: '/sounds/confirm.wav',
      fallbackUrl: '/sounds/confirm.wav',
      volume: 0.7,
      preload: true
    },
    friend_added: {
      url: '/sounds/notification.wav',
      fallbackUrl: '/sounds/notification.wav',
      volume: 0.8,
      preload: true
    },
    goal_hit: {
      url: '/sounds/success.wav',
      fallbackUrl: '/sounds/success.wav',
      volume: 0.9,
      preload: true
    },
    health_scan_capture: {
      url: '/sounds/scan_beep.wav',
      fallbackUrl: '/sounds/scan_beep.wav',
      volume: 0.7,
      preload: true
    },
    progress_update: {
      url: '/sounds/progress.wav',
      fallbackUrl: '/sounds/progress.wav',
      volume: 0.6,
      preload: true
    },
    reminder_chime: {
      url: '/sounds/chime.wav',
      fallbackUrl: '/sounds/chime.wav',
      volume: 0.5,
      preload: true
    }
  };

  constructor() {
    this.loadUserPreferences();
    this.setupUserInteractionListeners();
    this.logStateChange('constructor', 'SoundManager initialized with Web Audio API');
    
    // Initialize loading status
    Object.keys(this.sounds).forEach(key => {
      this.loadingStatus[key] = 'pending';
    });
  }

  // ============= PHASE 1: AGGRESSIVE AUDIOCONTEXT MANAGEMENT =============
  
  private setupUserInteractionListeners(): void {
    const interactionHandler = async (event: Event) => {
      if (this.hasUserInteracted) {
        // Only resume AudioContext if it's suspended and we're about to play a sound
        // Don't resume on every click to avoid false audio triggers
        return;
      }
      
      this.logStateChange('user_interaction', `Detected: ${event.type}`);
      await this.activateAudioSystemOnInteraction();
    };

    // Comprehensive interaction detection
    const events = [
      'click', 'touchstart', 'touchend', 'keydown', 'mousedown', 
      'pointerdown', 'scroll', 'focus', 'visibilitychange'
    ];
    
    events.forEach(eventType => {
      document.addEventListener(eventType, interactionHandler, { 
        passive: true, 
        once: false, // Changed to false for mobile compatibility checking
        capture: true 
      });
    });

    // iOS Safari & PWA specific workarounds
    if (this.isIOSSafari()) {
      this.setupIOSSpecificListeners(interactionHandler);
    }

    console.log('🔊 [SoundManager] 📱 Web Audio API interaction listeners established');
  }

  private isIOSSafari(): boolean {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  }

  private setupIOSSpecificListeners(handler: (event: Event) => void): void {
    window.addEventListener('pageshow', handler, { once: true });
    window.addEventListener('focus', handler, { once: true });
    
    // PWA specific handling
    if ((window.navigator as any).standalone) {
      console.log('🔊 [SoundManager] 📱 PWA detected, adding iOS-specific listeners');
      document.addEventListener('touchstart', handler, { once: true, passive: false });
    }
  }

  private async activateAudioSystemOnInteraction(): Promise<void> {
    if (this.hasUserInteracted) return;

    this.hasUserInteracted = true;
    this.logStateChange('activation', 'User interaction detected, activating Web Audio API');

    try {
      await this.createAndResumeAudioContext();
      this.initializeWithTimeout();
      console.log('🔊 [SoundManager] ✅ Web Audio API system activated');
    } catch (error) {
      this.logStateChange('activation_error', 'Failed to activate audio system', error.message);
      console.error('🔊 [SoundManager] ❌ Audio activation failed:', error);
    }
  }

  private async createAndResumeAudioContext(): Promise<void> {
    this.audioContextCreationAttempts++;
    
    try {
      if (!this.audioContext) {
        const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextConstructor) {
          throw new Error('Web Audio API not supported');
        }
        
        this.audioContext = new AudioContextConstructor();
        this.logStateChange('audiocontext_created', `Created with state: ${this.audioContext.state}`);
      }

      // Aggressive resume with multiple attempts
      if (this.audioContext.state === 'suspended') {
        this.logStateChange('audiocontext_resuming', 'Attempting resume');
        
        await this.audioContext.resume();
        
        // Verify resume with retry logic
        let resumeAttempts = 0;
        while (this.audioContext.state === 'suspended' && resumeAttempts < 3) {
          resumeAttempts++;
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

  // ============= PHASE 2: WEB AUDIO API BUFFER LOADING =============

  private initializeWithTimeout(): void {
    if (this.isInitializing) return;
    
    this.isInitializing = true;
    this.initializationStartTime = Date.now();
    
    // Timeout protection
    const timeoutId = setTimeout(() => {
      this.logStateChange('initialization_timeout', 'Initialization timed out after 8 seconds');
      this.resetInitialization();
    }, 8000);

    this.initializationPromise = this.performBufferLoading().finally(() => {
      clearTimeout(timeoutId);
      this.isInitializing = false;
    });
  }

  private async performBufferLoading(): Promise<void> {
    try {
      this.logStateChange('initialization_start', 'Starting Web Audio API buffer loading');
      
      await this.loadAllAudioBuffers();
      
      this.isInitialized = true;
      const duration = Date.now() - this.initializationStartTime;
      this.logStateChange('initialization_complete', `Completed in ${duration}ms`);
      
    } catch (error) {
      this.logStateChange('initialization_error', 'Buffer loading failed', error.message);
      this.resetInitialization();
      throw error;
    }
  }

  private async loadAllAudioBuffers(): Promise<void> {
    const loadPromises = Object.entries(this.sounds).map(async ([key, config]) => {
      try {
        this.loadingStatus[key] = 'loading';
        await this.loadAudioBuffer(key, config);
        this.loadingStatus[key] = 'loaded';
        this.logStateChange('buffer_loaded', `Successfully loaded: ${key}`);
      } catch (error) {
        this.loadingStatus[key] = 'failed';
        this.logStateChange('buffer_failed', `Failed to load: ${key}`, error.message);
      }
    });

    await Promise.allSettled(loadPromises);
    
    const loadedCount = Object.values(this.loadingStatus).filter(status => status === 'loaded').length;
    const totalCount = Object.keys(this.sounds).length;
    
    console.log(`🔊 [SoundManager] 📊 Buffer loading complete: ${loadedCount}/${totalCount} loaded`);
  }

  private async loadAudioBuffer(key: string, config: SoundConfig): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    // Try primary URL first with detailed logging
    console.log(`🔊 [SoundManager] Loading audio: ${key} from ${config.url}`);
    try {
      const buffer = await this.fetchAndDecodeAudio(config.url);
      this.audioBuffers[key] = buffer;
      this.loadingStatus[key] = 'loaded';
      this.logStateChange('buffer_loaded', `✅ ${key} loaded from: ${config.url}`);
      console.log(`🔊 [SoundManager] ✅ Successfully loaded: ${key}`);
      return;
    } catch (primaryError) {
      console.warn(`🔊 [SoundManager] ❌ Primary URL failed for ${key}: ${primaryError.message}`);
      
      // Try fallback URL (even if same as primary, for robustness)
      if (config.fallbackUrl) {
        try {
          console.log(`🔊 [SoundManager] Trying fallback: ${key} from ${config.fallbackUrl}`);
          const buffer = await this.fetchAndDecodeAudio(config.fallbackUrl);
          this.audioBuffers[key] = buffer;
          this.loadingStatus[key] = 'using_fallback';
          this.logStateChange('buffer_fallback', `⚠️ ${key} loaded from fallback: ${config.fallbackUrl}`);
          console.log(`🔊 [SoundManager] ⚠️ Fallback success: ${key}`);
          return;
        } catch (fallbackError) {
          console.error(`🔊 [SoundManager] ❌ Fallback also failed for ${key}: ${fallbackError.message}`);
        }
      }
      
      // Create programmatic fallback only as last resort
      console.warn(`🔊 [SoundManager] 🚨 Using programmatic beep for ${key} - all real files failed`);
      this.audioBuffers[key] = this.createClickSoundBuffer();
      this.loadingStatus[key] = 'using_fallback';
      this.logStateChange('buffer_synthetic', `🔊 ${key} using synthetic beep (real files failed)`);
    }
  }

  private async fetchAndDecodeAudio(url: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    const response = await fetch(url, { 
      mode: 'cors',
      cache: 'force-cache'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  private createClickSoundBuffer(): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    // Create a short click sound programmatically
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.1; // 100ms
    const frameCount = sampleRate * duration;
    
    const buffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate a click sound
    for (let i = 0; i < frameCount; i++) {
      const envelope = Math.exp(-i / (frameCount * 0.1));
      data[i] = Math.sin(2 * Math.PI * 800 * i / sampleRate) * envelope * 0.3;
    }
    
    return buffer;
  }

  // ============= PHASE 3: WEB AUDIO API PLAYBACK =============

  async play(soundKey: string): Promise<void> {
    const playbackStart = Date.now();
    console.log(`🔊 [SoundManager] ▶️ WEB AUDIO PLAY: "${soundKey}"`);
    
    try {
      // Pre-flight checks
      if (!this.isEnabled) {
        console.log(`🔊 [SoundManager] 🔇 Sound disabled, showing visual feedback for "${soundKey}"`);
        this.showVisualFeedback(soundKey);
        return;
      }

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        console.log(`🔊 [SoundManager] ♿ Reduced motion preference, visual feedback for "${soundKey}"`);
        this.showVisualFeedback(soundKey);
        return;
      }

      // Ensure audio system is ready
      await this.ensureAudioSystemReady();

      // Get or load the audio buffer
      let buffer = this.audioBuffers[soundKey];
      if (!buffer) {
        console.log(`🔊 [SoundManager] 📥 Loading "${soundKey}" buffer on-demand`);
        const config = this.sounds[soundKey];
        if (!config) {
          throw new Error(`Sound configuration not found: ${soundKey}`);
        }
        await this.loadAudioBuffer(soundKey, config);
        buffer = this.audioBuffers[soundKey];
      }

      if (!buffer) {
        throw new Error(`Failed to load audio buffer: ${soundKey}`);
      }

      // Final AudioContext check with mobile-specific rewiring
      if (this.audioContext?.state === 'suspended') {
        console.log('🔊 [SoundManager] 📱 AudioContext suspended before playback, resuming');
        const beforeState = this.audioContext.state;
        await this.audioContext.resume();
        const afterState = this.audioContext.state;
        this.logStateChange('pre_playback_resume', `AudioContext: ${beforeState} → ${afterState}`);
        
        // Log successful resume for mobile debugging
        this.logStateChange('mobile_rewire', `AudioContext resumed: ${afterState}`);
      }

      // Play using Web Audio API
      await this.playAudioBuffer(buffer, soundKey);
      
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

  private async playAudioBuffer(buffer: AudioBuffer, soundKey: string): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    return new Promise((resolve, reject) => {
      try {
        const source = this.audioContext!.createBufferSource();
        const gainNode = this.audioContext!.createGain();
        
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);
        
        // Apply volume
        const config = this.sounds[soundKey];
        const soundVolume = (config?.volume || 0.7) * this.volume;
        gainNode.gain.setValueAtTime(soundVolume, this.audioContext!.currentTime);
        
        source.onended = () => {
          clearTimeout(timeoutId);
          resolve();
        };
        
        // Handle errors by setting up a timeout
        const timeoutId = setTimeout(() => {
          reject(new Error('Playback timeout'));
        }, 5000);
        
        source.start(0);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private async ensureAudioSystemReady(): Promise<void> {
    // Force user interaction if not detected
    if (!this.hasUserInteracted) {
      console.log('🔊 [SoundManager] 🚨 No user interaction, forcing activation');
      await this.activateAudioSystemOnInteraction();
    }

    // Wait for initialization if in progress
    if (this.isInitializing && this.initializationPromise) {
      console.log('🔊 [SoundManager] ⏳ Waiting for buffer loading to complete');
      await this.initializationPromise;
    }

    // Initialize if not started
    if (!this.isInitialized && !this.isInitializing) {
      console.log('🔊 [SoundManager] 🔧 Starting buffer loading');
      this.initializeWithTimeout();
      await this.initializationPromise;
    }
  }

  // ============= PHASE 4: VISUAL FEEDBACK & UTILITIES =============

  private showVisualFeedback(soundKey: string): void {
    const notification = document.createElement('div');
    notification.textContent = '✅ Action Complete!';
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-foreground)));
      color: hsl(var(--primary-foreground));
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px hsl(var(--primary) / 0.3);
      animation: slideInFade 2s ease-out forwards;
      pointer-events: none;
    `;

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
    setTimeout(() => notification.remove(), 2000);
  }

  // ============= PUBLIC API =============

  setSoundEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem('soundEnabled', enabled.toString());
    this.logStateChange('settings', `Sound ${enabled ? 'enabled' : 'disabled'}`);
  }

  isSoundEnabled(): boolean {
    return this.isEnabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('soundVolume', this.volume.toString());
    this.logStateChange('settings', `Volume set to ${Math.round(this.volume * 100)}%`);
  }

  async forceInitialize(): Promise<void> {
    this.resetInitialization();
    
    // Clear existing buffers to force reload
    this.audioBuffers = {};
    Object.keys(this.sounds).forEach(key => {
      this.loadingStatus[key] = 'pending';
    });
    
    await this.createAndResumeAudioContext();
    this.initializeWithTimeout();
    await this.initializationPromise;
    
    console.log('🔊 [SoundManager] Force initialization complete - all sounds reloaded');
  }

  getStatus() {
    const loadedSounds = Object.values(this.loadingStatus).filter(status => status === 'loaded').length;
    const totalSounds = Object.keys(this.sounds).length;
    
    return {
      isEnabled: this.isEnabled,
      hasUserInteracted: this.hasUserInteracted,
      audioContextState: this.audioContext?.state || 'none',
      loadedSounds,
      totalSounds,
      soundLoadingStatus: this.loadingStatus,
      soundConfigs: this.sounds,
      lastError: this.lastError,
      systemHealth: this.calculateSystemHealth(),
      stateChangeLog: this.stateChangeLog.slice(-10),
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing
    };
  }

  getHealthScore(): number {
    if (!this.hasUserInteracted) return 0;
    if (this.audioContext?.state !== 'running') return 20;
    
    const loadedSounds = Object.values(this.loadingStatus).filter(status => status === 'loaded').length;
    const totalSounds = Object.keys(this.sounds).length;
    const loadingScore = (loadedSounds / totalSounds) * 80;
    
    return Math.round(20 + loadingScore);
  }

  isAudioContextReady(): boolean {
    return this.audioContext?.state === 'running';
  }

  isSoundCached(soundKey: string): boolean {
    return this.loadingStatus[soundKey] === 'loaded' && !!this.audioBuffers[soundKey];
  }

  // ============= PRIVATE UTILITIES =============

  private calculateSystemHealth(): 'excellent' | 'good' | 'warning' | 'critical' {
    const score = this.getHealthScore();
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 40) return 'warning';
    return 'critical';
  }

  private logStateChange(action: string, state: string, details?: string): void {
    const entry: StateChangeLog = {
      timestamp: Date.now(),
      action,
      state,
      details
    };
    
    this.stateChangeLog.push(entry);
    if (this.stateChangeLog.length > 50) {
      this.stateChangeLog = this.stateChangeLog.slice(-25);
    }
  }

  private resetInitialization(): void {
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = null;
  }

  private loadUserPreferences(): void {
    const soundEnabled = localStorage.getItem('soundEnabled');
    if (soundEnabled !== null) {
      this.isEnabled = soundEnabled === 'true';
    }
    
    const soundVolume = localStorage.getItem('soundVolume');
    if (soundVolume !== null) {
      this.volume = parseFloat(soundVolume);
    }
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

// Convenience functions for specific sounds
export const playAIThought = () => soundManager.play('ai_thought');
export const playBodyScanCapture = () => soundManager.play('body_scan_camera');
export const playChallengeWin = () => soundManager.play('challenge_win');
export const playFoodLogConfirm = () => soundManager.play('food_log_confirm');
export const playFriendAdded = () => soundManager.play('friend_added');
export const playGoalHit = () => soundManager.play('goal_hit');
export const playHealthScanCapture = () => soundManager.play('health_scan_capture');
export const playProgressUpdate = () => soundManager.play('progress_update');
export const playReminderChime = () => soundManager.play('reminder_chime');