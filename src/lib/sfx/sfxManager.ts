let _instance: SfxManager | null = null;

export type SfxKey = 'welcome' | 'shutter' | 'scan_success' | 'scan_error';

class SfxManager {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private pendingKey: SfxKey | null = null;

  private ensureCtx() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        this.ctx = Ctx ? new Ctx() : null;
      } catch { this.ctx = null; }
    }
    return this.ctx;
  }

  async unlock() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    try {
      if (ctx.state !== 'running') await ctx.resume();
      this.unlocked = ctx.state === 'running';
    } catch { /* ignore */ }
  }

  private playTone(freqA: number, freqB: number, dur = 0.22, startGain = 0.0001, peak = 0.28) {
    const ctx = this.ensureCtx();
    if (!ctx || ctx.state !== 'running') return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle'; // more audible on iOS
      osc.frequency.setValueAtTime(freqA, now);
      if (freqB !== freqA) osc.frequency.linearRampToValueAtTime(freqB, now + Math.min(0.12, dur));

      gain.gain.setValueAtTime(startGain, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    } catch { /* ignore */ }
  }

  play(key: SfxKey): void {
    try { navigator.vibrate?.(key === 'scan_success' ? 30 : key === 'shutter' ? 20 : 10); } catch {}
    const ctx = this.ensureCtx();
    if (!ctx) return;

    if (!this.unlocked || ctx.state !== 'running') {
      this.pendingKey = key;
      ctx.resume()
        .then(() => { this.unlocked = ctx.state === 'running'; if (this.unlocked && this.pendingKey) { const k = this.pendingKey; this.pendingKey = null; this.play(k); } })
        .catch(() => {});
      return;
    }
    
    console.log('[SFX][PLAY]', {
      key,
      hasCtx: !!ctx,
      ctxState: ctx?.state,
      unlocked: this.unlocked
    });
    
    // console.debug?.('[sfx] play', key);
    switch (key) {
      case 'welcome':      this.playTone(523.25, 659.25); break;
      case 'shutter':      this.playTone(440,   392, 0.12); break;
      case 'scan_success': this.playTone(740,   880); break;
      case 'scan_error':   this.playTone(300,   260); break;
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