import { useState, useRef, useCallback } from 'react';
import { freezeFrameAndDecode, unfreezeVideo, chooseBarcode, toggleTorch, isTorchSupported } from '@/lib/scan/freezeDecode';
import { ScanGuard } from '@/types/scan';
import { ScanResult } from '@/types/barcode';
import { cameraPool } from '@/lib/camera/cameraPool';

export type DecodeOutcome = {
  ok: boolean;
  raw?: string;
  format?: string;
  checksumOk?: boolean;
  attempts: number;
  ms: number;
  reason?: string;
};

export function useSnapAndDecode(
  guard?: ScanGuard,
  updateStreamRef?: (stream: MediaStream | null) => void
) {
  const [torchEnabled, setTorchEnabled] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const inFlightRef = useRef(false);

  // Method to set the stream reference from outside
  const internalUpdateStreamRef = useCallback((stream: MediaStream | null) => {
    streamRef.current = stream;
    updateStreamRef?.(stream);
  }, [updateStreamRef]);

  const ensurePreviewPlaying = useCallback(async (video: HTMLVideoElement, scanGuard: ScanGuard) => {
    if (scanGuard.signal.aborted || !scanGuard.isOpen()) {
      console.log('[SNAP] preview resume blocked: guard failed');
      return;
    }
    
    if (!video.srcObject) {
      if (scanGuard.signal.aborted || !scanGuard.isOpen()) {
        console.log('[SNAP] restart blocked: guard failed');
        return;
      }
      
      console.log('[SNAP] restarting camera stream');
      await restartCameraStream(video, { facingMode: 'environment' }, scanGuard);
      return;
    }
    
    if (scanGuard.signal.aborted || !scanGuard.isOpen()) return;
    
    if (video.paused) {
      video.play().catch(() => {});
    }
  }, []);

  const restartCameraStream = useCallback(async (video: HTMLVideoElement, opts: { facingMode: string }, scanGuard: ScanGuard) => {
    if (scanGuard.signal.aborted || !scanGuard.isOpen()) {
      console.log('[SNAP] restartCameraStream blocked: guard failed');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: opts,
        audio: false
      });

      // Check guards after async operation
      if (scanGuard.signal.aborted || !scanGuard.isOpen()) {
        console.log('[SNAP] restartCameraStream blocked after getUserMedia: guard failed');
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      // Register with pool using generation
      cameraPool.add(stream, scanGuard.gen);

      streamRef.current = stream;
      internalUpdateStreamRef(stream);
      
      video.srcObject = stream;
      await video.play();

      // Final guard check
      if (scanGuard.signal.aborted || !scanGuard.isOpen()) {
        stream.getTracks().forEach(t => t.stop());
        video.srcObject = null;
        return;
      }
    } catch (error) {
      console.error('[SNAP] Failed to restart camera:', error);
    }
  }, [internalUpdateStreamRef]);

  const snapAndDecode = useCallback(async (
    options: { 
      videoEl: HTMLVideoElement; 
      budgetMs?: number; 
      roi?: { wPct: number; hPct: number }; 
      logPrefix?: string 
    } | HTMLVideoElement,
    logPrefixLegacy = '[SNAP]',
    scanGuard?: ScanGuard
  ): Promise<any> => {
    // Handle both new object-style and legacy parameter-style calls
    const isLegacyCall = options instanceof HTMLVideoElement;
    const videoEl = isLegacyCall ? options : options.videoEl;
    const logPrefix = isLegacyCall ? logPrefixLegacy : (options.logPrefix || '[SNAP]');
    // Guard: check if scan session is still active
    if (scanGuard && (scanGuard.signal.aborted || !scanGuard.isOpen())) {
      console.log(`${logPrefix} blocked: guard failed`);
      return null;
    }

    // Single-flight guard
    if (inFlightRef.current) {
      console.log(`${logPrefix} decode_cancelled: busy`);
      return null;
    }
    
    inFlightRef.current = true;
    const startTime = performance.now();
    let attempts = 0;

    try {
      console.log(`${logPrefix} analyze_start`);
      
      // Optional: Add toast for PWA testing when console isn't available
      if (window.location.search.includes('debug=toast')) {
        const { toast } = await import('@/components/ui/sonner');
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
      const roi = { wPct: 0.7, hPct: 0.35 };
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
        budgetMs: 900,
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
          const { toast } = await import('@/components/ui/sonner');
          toast.success(`${logPrefix} barcode found: ${chosenBarcode}`);
        }

        // Return legacy format for backward compatibility
        return {
          ok: true,
          raw: chosenBarcode,
          format: result.result?.format || 'unknown',
          checksumOk: result.result?.checkDigitValid || null,
          attempts: attempts,
          ms: ms,
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
          raw: null,
          format: null,
          checksumOk: null,
          attempts: attempts,
          ms: ms,
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
        raw: null,
        format: null,
        checksumOk: null,
        attempts: attempts,
        ms: ms,
        reason: 'error'
      };
    } finally {
      // CRITICAL: Always unfreeze video and restore preview
      try { 
        unfreezeVideo(videoEl); 
      } catch (e) {
        console.warn(`${logPrefix} unfreeze error:`, e);
      }
      
      // Ensure video is playing - but only if still active
      try {
        if (scanGuard && !scanGuard.signal.aborted && scanGuard.isOpen()) {
          await ensurePreviewPlaying(videoEl, scanGuard);
        } else {
          console.log(`${logPrefix} preview resume skipped: guard failed`);
        }
      } catch (e) {
        console.warn(`${logPrefix} preview restart error:`, e);
      }
      
      inFlightRef.current = false;
      console.log(`${logPrefix} preview_resume`);
    }
  }, [ensurePreviewPlaying]);

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
    torchEnabled,
    isTorchSupported: getTorchSupported(),
    updateStreamRef: internalUpdateStreamRef
  };
}