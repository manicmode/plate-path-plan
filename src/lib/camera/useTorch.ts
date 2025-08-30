import { useRef, useState, useCallback, useEffect } from 'react';

interface TorchResult {
  ok: boolean;
  reason?: 'no_torch' | 'apply_failed' | 'no_track';
  error?: string;
}

export function useTorch(trackRef: React.MutableRefObject<MediaStreamTrack | null>) {
  const [torchOn, setTorchOn] = useState(false);
  const [supportsTorch, setSupportsTorch] = useState(false);
  const stateRef = useRef(false);
  const lastTrackRef = useRef<MediaStreamTrack | null>(null);

  // Check torch capabilities when track changes
  const checkTorchSupport = useCallback((track: MediaStreamTrack | null) => {
    console.log('[torch] checking torch support for track:', track ? track.id : 'null');
    
    if (!track) {
      console.log('[torch] no track, setting support to false');
      setSupportsTorch(false);
      return false;
    }

    try {
      const caps = track.getCapabilities?.();
      console.log('[torch] track capabilities:', caps);
      const supported = !!(caps && 'torch' in caps);
      console.log('[torch] torch supported:', supported);
      setSupportsTorch(supported);
      return supported;
    } catch (error) {
      console.warn('[torch] getCapabilities failed:', error);
      setSupportsTorch(false);
      return false;
    }
  }, []);

  // Apply torch state to track
  const setTorch = useCallback(async (on: boolean): Promise<TorchResult> => {
    const track = trackRef.current;
    
    console.log('[torch] setTorch called:', { on, hasTrack: !!track, trackId: track?.id });
    
    if (!track) {
      console.warn('[torch] no track available');
      return { ok: false, reason: 'no_track' };
    }

    const caps = track.getCapabilities?.();
    console.log('[torch] track capabilities:', caps ? Object.keys(caps) : 'none');
    
    if (!caps || !('torch' in caps)) {
      console.warn('[torch] torch not supported in capabilities');
      return { ok: false, reason: 'no_torch' };
    }

    try {
      console.log('[torch] applying constraints:', { torch: on });
      await track.applyConstraints({ 
        advanced: [{ torch: on } as any] 
      });
      
      stateRef.current = on;
      setTorchOn(on);
      
      console.log('[torch] torch applied successfully:', { on, trackId: track.id });
      return { ok: true };
    } catch (error) {
      console.warn('[torch] applyConstraints failed:', error);
      return { 
        ok: false, 
        reason: 'apply_failed', 
        error: String(error) 
      };
    }
  }, []);

  // Ensure torch state matches desired state (for auto-reapply)
  const ensureTorchState = useCallback(async () => {
    const track = trackRef.current;
    if (!track || !checkTorchSupport(track)) {
      return;
    }

    // If we have a desired state stored, reapply it
    if (stateRef.current !== torchOn) {
      console.log('[torch] reapplying torch state:', stateRef.current);
      await setTorch(stateRef.current);
    }
  }, [torchOn, setTorch, checkTorchSupport]);

  // Handle track changes - fixed dependency issue
  useEffect(() => {
    const track = trackRef.current;
    
    if (track !== lastTrackRef.current) {
      lastTrackRef.current = track;
      console.log('[torch] track changed, new track:', track ? track.id : 'null');
      
      if (track) {
        // Check support immediately
        const supported = checkTorchSupport(track);
        console.log('[torch] support check result:', supported);
        
        // Auto-reapply torch state after track is ready
        const reapplyTorch = () => {
          console.log('[torch] attempting to reapply torch state, current:', stateRef.current);
          setTimeout(() => {
            if (stateRef.current && supported) {
              console.log('[torch] reapplying torch ON');
              setTorch(true);
            }
          }, 100);
        };
        
        if (track.readyState === 'live') {
          console.log('[torch] track already live, reapplying immediately');
          reapplyTorch();
        } else {
          console.log('[torch] waiting for track to be ready, current state:', track.readyState);
          // Wait for track to be ready
          const checkReady = () => {
            if (track.readyState === 'live') {
              console.log('[torch] track is now live, reapplying');
              reapplyTorch();
            } else {
              console.log('[torch] track still not ready:', track.readyState);
              setTimeout(checkReady, 50);
            }
          };
          checkReady();
        }
      } else {
        console.log('[torch] no track, disabling torch support');
        setSupportsTorch(false);
        setTorchOn(false);
        stateRef.current = false;
      }
    }
  }, [trackRef.current]);

  // Handle visibility changes (app comes back from background)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && trackRef.current) {
        console.log('[torch] visibility restored, ensuring torch state');
        setTimeout(() => {
          ensureTorchState();
        }, 200);
      }
    };

    const handlePageShow = () => {
      if (trackRef.current) {
        console.log('[torch] page shown, ensuring torch state');
        setTimeout(() => {
          ensureTorchState();
        }, 200);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [ensureTorchState]);

  // Reset torch when component unmounts or stream stops
  useEffect(() => {
    return () => {
      if (stateRef.current) {
        console.log('[torch] cleanup: turning off torch');
        stateRef.current = false;
        setTorchOn(false);
      }
    };
  }, []);

  return {
    supportsTorch,
    torchOn,
    setTorch,
    ensureTorchState
  };
}