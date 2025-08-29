import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type TorchState = {
  supported: boolean;
  ready: boolean;
  on: boolean;
  toggle: (next?: boolean) => Promise<void>;
  attach: (track: MediaStreamTrack | null) => void;
};

export function useTorch(): TorchState {
  const enabled = import.meta.env.VITE_SCANNER_TORCH_FIX === 'true';
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [supported, setSupported] = useState(false);
  const [ready, setReady] = useState(false);
  const [on, setOn] = useState(false);

  const probe = useCallback(async (t: MediaStreamTrack | null) => {
    if (!enabled || !t) { setSupported(false); setReady(!!t); return; }
    try {
      const caps: any = t.getCapabilities?.() || {};
      // Safari sometimes exposes torch via ImageCapture caps:
      let torchCap = !!caps.torch;
      if (!torchCap && 'ImageCapture' in window) {
        try {
          // @ts-ignore
          const ic = new (window as any).ImageCapture(t);
          const pc = await ic.getPhotoCapabilities?.();
          torchCap = Array.isArray(pc?.fillLightMode) && pc.fillLightMode.includes('torch');
        } catch {}
      }
      setSupported(Boolean(torchCap));
      setReady(t.readyState === 'live');
    } catch {
      setSupported(false);
      setReady(t?.readyState === 'live');
    }
  }, [enabled]);

  const applyTorch = useCallback(async (next: boolean) => {
    const t = trackRef.current;
    if (!enabled || !t) return;
    try {
      // applyConstraints via advanced torch; wrap in rAF to avoid OverconstrainedError flakiness
      await new Promise(requestAnimationFrame);
      await t.applyConstraints({ advanced: [{ torch: next }] as any });
      setOn(next);
      console.info('[TORCH] set', next);
    } catch (e) {
      console.info('[TORCH][ERR]', (e as Error).message);
    }
  }, [enabled]);

  const toggle = useCallback(async (next?: boolean) => {
    const dest = typeof next === 'boolean' ? next : !on;
    await applyTorch(dest);
  }, [on, applyTorch]);

  const attach = useCallback(async (track: MediaStreamTrack | null) => {
    trackRef.current = track;
    await probe(track);
    // re-apply state when page visibility changes (iOS may drop constraints)
    const handler = () => { if (document.visibilityState === 'visible' && on) applyTorch(true); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [probe, applyTorch, on]);

  // keep "ready" in sync with track state
  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    const onEnded = () => setReady(false);
    const onUnmute = () => setReady(true);
    t.addEventListener('ended', onEnded);
    t.addEventListener('unmute', onUnmute);
    return () => {
      t.removeEventListener('ended', onEnded);
      t.removeEventListener('unmute', onUnmute);
    };
  }, [trackRef.current]);

  return useMemo(() => ({ supported, ready, on, toggle, attach }), [supported, ready, on, toggle, attach]);
}
