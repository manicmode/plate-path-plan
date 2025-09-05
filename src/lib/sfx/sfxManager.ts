let _instance: SfxManager | null = null;

export type SfxKey = 'welcome' | 'shutter' | 'scan_success' | 'scan_error';

class SfxManager {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private pendingKey: SfxKey | null = null;
  private masterGain: GainNode | null = null;

  private ensureCtx() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        this.ctx = Ctx ? new Ctx() : null;
        if (this.ctx && !this.masterGain) {
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.value = 0.8;
          this.masterGain.connect(this.ctx.destination);
        }
      } catch { this.ctx = null; }
    }
    return this.ctx;
  }

  async unlock(): Promise<void> {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    
    if (ctx.state !== 'running') {
      await ctx.resume();
      // After resume, state should be 'running' if successful
      this.unlocked = (ctx.state as string) === 'running';
    } else {
      this.unlocked = true;
    }
  }

  private playTone(freq: number, duration: number) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain || !this.unlocked) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.connect(env);
    env.connect(this.masterGain);
    const now = ctx.currentTime;
    const d = Math.max(duration, 0.30);
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.45, now + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, now + d);
    osc.start(now);
    osc.stop(now + d);
  }

  async play(key: SfxKey): Promise<boolean> {
    try { navigator.vibrate?.(key === 'scan_success' ? 30 : key === 'shutter' ? 20 : 10); } catch {}
    
    const { FEATURE_SFX_DEBUG } = await import('@/lib/sound/debug');
    
    const ctx = this.ensureCtx();
    if (!ctx) return false;
    
    if (FEATURE_SFX_DEBUG) {
      console.log('[SFX][PLAY_ATTEMPT]', { key, unlocked: this.unlocked, state: ctx.state });
    }
    
    // If not unlocked or context suspended, await unlock in the same gesture
    if (!this.unlocked || ctx.state !== 'running') {
      try {
        await this.unlock();
        // After unlock, check if we're now ready (re-get context state)
        const currentCtx = this.ensureCtx();
        if (!this.unlocked || !currentCtx || currentCtx.state !== 'running') {
          if (FEATURE_SFX_DEBUG) {
            console.log('[SFX][BLOCKED]', { reason: 'unlock-failed', key, state: currentCtx?.state });
          }
          return false;
        }
      } catch (error) {
        if (FEATURE_SFX_DEBUG) {
          console.log('[SFX][BLOCKED]', { reason: 'unlock-error', key, error: (error as Error)?.message });
        }
        return false;
      }
    }
    
    // Now attempt to play
    try {
      this._playNow(key);
      if (FEATURE_SFX_DEBUG) {
        console.log('[SFX][PLAY_RESULT]', { key, ok: true });
      }
      return true;
    } catch (error) {
      if (FEATURE_SFX_DEBUG) {
        console.log('[SFX][PLAY_RESULT]', { key, ok: false, error: (error as Error)?.message });
      }
      return false;
    }
  }

  private _playNow(key: SfxKey): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain || !this.unlocked) return;
    
    // Play tones
    switch (key) {
      case 'scan_success': this.playTone(800, 0.15); break;
      case 'shutter': this.playTone(600, 0.12); break;
      case 'scan_error': this.playTone(300, 0.20); break;
      case 'welcome': this.playTone(500, 0.18); break;
    }
  }

  debugDump() {
    const ctx = this.ctx as any;
    return {
      hasCtx: !!this.ctx,
      state: this.ctx?.state,
      unlocked: this.unlocked,
      baseLatency: ctx?.baseLatency,
      ts: new Date().toISOString(),
    };
  }
}

export function SFX() {
  if (!_instance) _instance = new SfxManager();
  return _instance;
}