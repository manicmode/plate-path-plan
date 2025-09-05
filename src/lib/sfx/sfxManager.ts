let _instance: SfxManager | null = null;

export type SfxKey = 'welcome' | 'shutter' | 'scan_success' | 'scan_error';

class SfxManager {
  private ctx: AudioContext | null = null;
  private unlocked = false;

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

  private playTone(freqA: number, freqB: number, dur = 0.18, startGain = 0.0001, peak = 0.09) {
    const ctx = this.ensureCtx();
    if (!ctx || ctx.state !== 'running') return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqA, now);
      if (freqB !== freqA) osc.frequency.exponentialRampToValueAtTime(freqB, now + Math.min(0.12, dur));

      gain.gain.setValueAtTime(startGain, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    } catch { /* ignore */ }
  }

  play(key: SfxKey) {
    try { navigator.vibrate?.(key === 'scan_success' ? 30 : key === 'shutter' ? 20 : 10); } catch {}
    if (!this.ensureCtx() || !this.unlocked) return; // silent if locked
    // console.debug?.('[sfx] play', key);
    switch (key) {
      case 'welcome':      this.playTone(523.25, 659.25, 0.22); break; // C5->E5
      case 'shutter':      this.playTone(440, 392,   0.10);      break; // A4->G4 blip
      case 'scan_success': this.playTone(740, 880,   0.18);      break; // F5->A5
      case 'scan_error':   this.playTone(300, 260,   0.22);      break; // down beep
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