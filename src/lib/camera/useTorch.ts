import { useEffect, useRef, useState, useCallback } from 'react';

type TorchState = 'off' | 'on';
type TorchSupport = 'unknown' | 'yes' | 'no';

// Telemetry helper - throttle identical messages per 2s
const telemetryThrottle = new Map<string, number>();
function trace(event: string, data?: any) {
  // Use the new trace guard system
  if (typeof window !== 'undefined' && window.__trace_disable) return;
  
  const key = event + JSON.stringify(data || {});
  const now = Date.now();
  const last = telemetryThrottle.get(key) || 0;
  if (now - last > 2000) { // 2s throttle
    telemetryThrottle.set(key, now);
    console.log(`[${event}]`, data || '');
  }
}

export function useTorch(getActiveVideoTrack: () => MediaStreamTrack | null) {
  const [support, setSupport] = useState<TorchSupport>('unknown');
  const [state, setState] = useState<TorchState>('off');
  const pending = useRef<AbortController | null>(null);
  const lastTrack = useRef<MediaStreamTrack | null>(null);

  const probe = useCallback(() => {
    const track = getActiveVideoTrack();
    lastTrack.current = track;
    if (!track) { 
      setSupport('unknown'); 
      return; 
    }
    
    try {
      const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities;
      const has = !!(caps as any).torch;
      const settings = track.getSettings?.() || {};
      setSupport(has ? 'yes' : 'no');
      trace('CAM:TORCH:PROBE', { 
        has, 
        facingMode: settings.facingMode,
        trackId: track.id?.substring(0, 8) + '...' // No PII
      });
    } catch (error) {
      trace('CAM:TORCH:PROBE:ERROR', { 
        has: false, 
        error: String(error).substring(0, 50) 
      });
      setSupport('no');
    }
  }, [getActiveVideoTrack]);

  const applyTorch = useCallback(async (on: boolean) => {
    const track = getActiveVideoTrack();
    if (!track) return;
    if (support !== 'yes') return;

    // cancel any pending application
    pending.current?.abort();
    const ac = new AbortController();
    pending.current = ac;

    try {
      // iOS/Chromium: advanced torch constraint
      // NOTE: must call on the *current* track
      await (track as any).applyConstraints?.({ advanced: [{ torch: on }] });
      if (ac.signal.aborted) return;
      setState(on ? 'on' : 'off');
      trace('CAM:TORCH:APPLIED', { on });
    } catch (e) {
      trace('CAM:TORCH:ERROR', { message: String(e).substring(0, 100) });
      // If it fails, mark as unsupported for this track to avoid UI spam
      setSupport('no');
      setState('off');
    }
  }, [getActiveVideoTrack, support]);

  // Re-probe only when track identity changes (not on every render)
  useEffect(() => {
    const t = getActiveVideoTrack();
    if (t !== lastTrack.current) {
      trace('CAM:TORCH:PROBE', { 
        oldTrackId: lastTrack.current?.id?.substring(0, 8),
        newTrackId: t?.id?.substring(0, 8)
      });
      
      // Stop previous track if it exists during camera switch
      if (lastTrack.current && lastTrack.current !== t) {
        try { lastTrack.current.stop(); } catch {}
      }
      
      probe();
      // turn torch off when swapping cameras to avoid dangling torch
      setState('off');
    }
  }, [probe]); // Only depend on probe function, not the track itself

  // Teardown - stop track on unmount
  useEffect(() => {
    return () => {
      pending.current?.abort();
      if (lastTrack.current) {
        try { lastTrack.current.stop(); } catch {}
      }
    };
  }, []);

  return {
    support,            // 'yes' | 'no' | 'unknown'
    isOn: state === 'on',
    enable: () => applyTorch(true),
    disable: () => applyTorch(false),
    toggle: () => applyTorch(state !== 'on'),
    reprobe: probe,
    // Legacy compatibility
    supportsTorch: support === 'yes',
    torchOn: state === 'on',
    setTorch: async (on: boolean) => {
      try {
        await applyTorch(on);
        return { ok: true, reason: undefined };
      } catch (error) {
        return { 
          ok: false, 
          reason: 'apply_failed' as const,
          error: String(error)
        };
      }
    },
    ensureTorchState: () => {
      // Legacy compatibility - just reprobe
      probe();
    }
  };
}