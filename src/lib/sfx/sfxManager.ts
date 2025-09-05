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

  unlock() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state !== 'running') {
      ctx.resume().then(() => {
        this.unlocked = (ctx.state === 'running');
      }).catch(() => {});
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

  play(key: SfxKey): void {
    try { navigator.vibrate?.(key === 'scan_success' ? 30 : key === 'shutter' ? 20 : 10); } catch {}
    const ctx = this.ensureCtx();
    if (!ctx) return;
    // Ensure unlock at call site; if still locked, prime and bail (next gesture will succeed)
    if (!this.unlocked) { this.unlock(); console.log('[SFX][FINAL]', { key, ctxState: ctx.state, unlocked: this.unlocked, hasMaster: !!this.masterGain }); return; }
    console.log('[SFX][FINAL]', { key, ctxState: ctx.state, unlocked: this.unlocked, hasMaster: !!this.masterGain });
    // tones
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