import { useEffect, useRef } from 'react';

type Sfx = { playSuccess: () => void; unlock: () => Promise<void> };

export function useScanSfx(): Sfx {
  const ctxRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  function ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      try {
        // Safari needs webkitAudioContext
        const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        ctxRef.current = Ctx ? new Ctx() : null;
      } catch {
        ctxRef.current = null;
      }
    }
    return ctxRef.current;
  }

  async function unlock() {
    if (unlockedRef.current) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    try {
      // Resume on first gesture to satisfy autoplay policies
      if (ctx.state !== 'running') {
        await ctx.resume();
      }
      unlockedRef.current = ctx.state === 'running';
    } catch {
      // ignore
    }
  }

  function playSuccess() {
    // Haptic (best-effort)
    try { navigator.vibrate?.(30); } catch {}

    const ctx = ensureCtx();
    if (!ctx || ctx.state !== 'running') return; // do nothing if locked

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Soft envelope + quick up-chirp for a pleasant "scan" sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(740, now);             // F5-ish
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // ignore—sound is optional
    }
  }

  // Optional global one-time unlock via first pointer gesture
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let handled = false;
    const onFirstPointer = async () => {
      if (handled) return;
      handled = true;
      await unlock();
      window.removeEventListener('pointerdown', onFirstPointer, true);
    };
    window.addEventListener('pointerdown', onFirstPointer, true);
    return () => window.removeEventListener('pointerdown', onFirstPointer, true);
  }, []);

  return { playSuccess, unlock };
}