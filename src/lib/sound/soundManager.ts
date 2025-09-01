// soundManager.ts - Lightweight sound system for capture/scan interactions
class SoundManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private unlocked = false;

  constructor() {
    this.initializeSounds();
  }

  private async initializeSounds() {
    // Create synthetic sounds to avoid external dependencies
    try {
      await this.createSyntheticSounds();
    } catch (error) {
      console.warn('[SOUND] Failed to initialize sounds:', error);
    }
  }

  private async createSyntheticSounds() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Create shutter sound (quick click)
    const shutterBuffer = this.audioContext.createBuffer(1, 4410, 44100); // 0.1s
    const shutterData = shutterBuffer.getChannelData(0);
    for (let i = 0; i < shutterData.length; i++) {
      shutterData[i] = Math.sin(2 * Math.PI * 800 * i / 44100) * Math.exp(-i / 2205) * 0.3;
    }
    this.sounds.set('shutter', shutterBuffer);

    // Create beep sound (success tone)
    const beepBuffer = this.audioContext.createBuffer(1, 8820, 44100); // 0.2s
    const beepData = beepBuffer.getChannelData(0);
    for (let i = 0; i < beepData.length; i++) {
      const t = i / 44100;
      beepData[i] = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 3) * 0.2;
    }
    this.sounds.set('beep', beepBuffer);

    console.log('[SOUND] Synthetic sounds created');
  }

  async ensureUnlocked(): Promise<void> {
    if (this.unlocked || !this.audioContext) return;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      this.unlocked = true;
      console.log('[SOUND] Audio context unlocked');
    } catch (error) {
      console.warn('[SOUND] Failed to unlock audio:', error);
    }
  }

  async play(soundKey: string): Promise<void> {
    if (!this.audioContext || !this.unlocked) {
      console.warn('[SOUND] Audio not ready for:', soundKey);
      return;
    }

    const buffer = this.sounds.get(soundKey);
    if (!buffer) {
      console.warn('[SOUND] Sound not found:', soundKey);
      return;
    }

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start();
      console.log(`[SOUND] played ${soundKey}`);
    } catch (error) {
      console.warn(`[SOUND] Failed to play ${soundKey}:`, error);
    }
  }
}

// Export singleton instance
export const Sound = new SoundManager();