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
    if (!track) {
      setSupportsTorch(false);
      return false;
    }

    try {
      const caps = track.getCapabilities?.();
      const supported = !!(caps && 'torch' in caps);
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
    
    if (!track) {
      return { ok: false, reason: 'no_track' };
    }

    const caps = track.getCapabilities?.();
    if (!caps || !('torch' in caps)) {
      return { ok: false, reason: 'no_torch' };
    }

    try {
      await track.applyConstraints({ 
        advanced: [{ torch: on } as any] 
      });
      
      stateRef.current = on;
      setTorchOn(on);
      
      console.log('[torch] torch applied:', { on, trackId: track.id });
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

  // Handle track changes
  useEffect(() => {
    const track = trackRef.current;
    
    if (track !== lastTrackRef.current) {
      lastTrackRef.current = track;
      
      if (track) {
        console.log('[torch] track changed, checking support:', track.id);
        checkTorchSupport(track);
        
        // Auto-reapply torch state after track is ready
        const reapplyTorch = () => {
          setTimeout(() => {
            ensureTorchState();
          }, 100);
        };
        
        if (track.readyState === 'live') {
          reapplyTorch();
        } else {
          // Wait for track to be ready
          const checkReady = () => {
            if (track.readyState === 'live') {
              reapplyTorch();
            } else {
              setTimeout(checkReady, 50);
            }
          };
          checkReady();
        }
      } else {
        setSupportsTorch(false);
        setTorchOn(false);
      }
    }
  }, [trackRef.current, ensureTorchState, checkTorchSupport]);

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