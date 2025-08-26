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

    const startTime = performance.now();
    let attempts = 0;

    try {
      console.log(`${logPrefix} analyze_start`);
      
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
      // Always unfreeze
      unfreezeVideo(videoEl);
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
    torchEnabled
  };
}