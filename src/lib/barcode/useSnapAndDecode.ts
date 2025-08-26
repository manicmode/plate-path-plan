import { useState, useRef } from 'react';
import { freezeFrameAndDecode, unfreezeVideo, chooseBarcode, toggleTorch, isTorchSupported } from '@/lib/scan/freezeDecode';

export type DecodeOutcome = {
  ok: boolean;
  raw?: string;
  format?: string;
  checksumOk?: boolean;
  attempts: number;
  ms: number;
  reason?: string;
};

export function useSnapAndDecode() {
  const [torchEnabled, setTorchEnabled] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const inFlightRef = useRef(false);

  // Method to set the stream reference from outside
  const updateStreamRef = (stream: MediaStream | null) => {
    streamRef.current = stream;
  };

  const ensurePreviewPlaying = (video: HTMLVideoElement) => {
    const track = video.srcObject && (video.srcObject as MediaStream).getVideoTracks?.()?.[0];
    if (!track || track.readyState === 'ended') {
      // Stream ended, restart camera
      console.log('[SNAP] restarting camera stream');
      restartCamera(video).catch(() => {});
      return;
    }
    if (video.paused) {
      video.play().catch(() => {});
    }
  };

  const restartCamera = async (video: HTMLVideoElement) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      video.srcObject = stream;
      streamRef.current = stream;
      await video.play();
    } catch (error) {
      console.error('Failed to restart camera:', error);
    }
  };

  const snapAndDecode = async (opts: {
    videoEl: HTMLVideoElement;
    budgetMs?: number;
    roi?: { wPct: number; hPct: number };
    logPrefix?: string;
  }): Promise<DecodeOutcome> => {
    const {
      videoEl,
      budgetMs = 900,
      roi = { wPct: 0.7, hPct: 0.35 },
      logPrefix = '[SNAP]'
    } = opts;

    // Single-flight guard
    if (inFlightRef.current) {
      console.log(`${logPrefix} decode_cancelled: busy`);
      return { ok: false, reason: 'busy', attempts: 0, ms: 0 };
    }
    
    inFlightRef.current = true;
    const startTime = performance.now();
    let attempts = 0;

    try {
      console.log(`${logPrefix} analyze_start`);
      
      // Optional: Add toast for PWA testing when console isn't available
      if (window.location.search.includes('debug=toast')) {
        const { toast } = await import('sonner');
        toast.info(`${logPrefix} analyze_start`);
      }
      
      // Ensure video is ready before processing
      if (!videoEl.videoWidth || !videoEl.videoHeight) {
        await new Promise<void>((resolve) => {
          const handler = () => {
            videoEl.removeEventListener('loadedmetadata', handler);
            resolve();
          };
          videoEl.addEventListener('loadedmetadata', handler, { once: true });
        });
      }

      // Log ROI info
      const vw = videoEl.videoWidth;
      const vh = videoEl.videoHeight;
      const roiW = Math.round(vw * roi.wPct);
      const roiH = Math.round(vh * roi.hPct);
      const dpr = window.devicePixelRatio || 1;
      console.log(`${logPrefix} roi`, { vw, vh, roiW, roiH, dpr });
      
      // Get the current stream for torch support
      streamRef.current = videoEl.srcObject as MediaStream;
      
      // Quick pass - single attempt
      attempts++;
      const result = await freezeFrameAndDecode(videoEl, {
        roi: { widthPct: roi.wPct, heightPct: roi.hPct },
        budgetMs,
        logPrefix
      });

      const ms = Math.round(performance.now() - startTime);
      console.log(`${logPrefix} barcode_ms: ${ms}`);

      if (result.raw) {
        const chosenBarcode = chooseBarcode(result.result);
        console.log(`${logPrefix} barcode_result:`, {
          raw: chosenBarcode,
          type: result.result?.format || null,
          checksumOk: result.result?.checkDigitValid || null,
          reason: 'decoded'
        });
        
        // Optional: Add toast for PWA testing
        if (window.location.search.includes('debug=toast')) {
          const { toast } = await import('sonner');
          toast.success(`${logPrefix} barcode found: ${chosenBarcode}`);
        }

        return {
          ok: true,
          raw: chosenBarcode,
          format: result.result?.format,
          checksumOk: result.result?.checkDigitValid,
          attempts,
          ms,
          reason: 'decoded'
        };
      } else {
        console.log(`${logPrefix} barcode_result:`, {
          raw: null,
          type: null,
          checksumOk: null,
          reason: 'not_found'
        });

        return {
          ok: false,
          attempts,
          ms,
          reason: 'not_found'
        };
      }
    } catch (error) {
      const ms = Math.round(performance.now() - startTime);
      console.error(`${logPrefix} decode error:`, error);
      console.log(`${logPrefix} barcode_result:`, {
        raw: null,
        type: null,
        checksumOk: null,
        reason: 'error'
      });

      return {
        ok: false,
        attempts,
        ms,
        reason: 'error'
      };
    } finally {
      // CRITICAL: Always unfreeze video and restore preview
      try { 
        unfreezeVideo(videoEl); 
      } catch (e) {
        console.warn(`${logPrefix} unfreeze error:`, e);
      }
      
      // Ensure video is playing
      try {
        ensurePreviewPlaying(videoEl);
      } catch (e) {
        console.warn(`${logPrefix} preview restart error:`, e);
      }
      
      inFlightRef.current = false;
      console.log(`${logPrefix} preview_resume`);
    }
  };

  const setTorch = async (on: boolean): Promise<void> => {
    if (!streamRef.current) return;
    
    const track = streamRef.current.getVideoTracks()[0];
    if (!isTorchSupported(track)) return;
    
    await toggleTorch(track, on);
    setTorchEnabled(on);
  };

  const getTorchSupported = (): boolean => {
    if (!streamRef.current) return false;
    const track = streamRef.current.getVideoTracks()[0];
    return isTorchSupported(track);
  };

  return {
    snapAndDecode,
    setTorch,
    isTorchSupported: getTorchSupported(),
    torchEnabled,
    updateStreamRef
  };
}