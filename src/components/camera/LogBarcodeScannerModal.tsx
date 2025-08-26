import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Zap, FlashlightIcon, Edit3 } from 'lucide-react';
import { useSnapAndDecode } from '@/lib/barcode/useSnapAndDecode';
import { HealthAnalysisLoading } from '@/components/health-check/HealthAnalysisLoading';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { toLegacyFromEdge } from '@/lib/health/toLegacyFromEdge';
import { logScoreNorm } from '@/lib/health/extractScore';

interface LogBarcodeScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBarcodeDetected: (barcode: string) => void;
  onManualEntry: () => void;
}

export const LogBarcodeScannerModal: React.FC<LogBarcodeScannerModalProps> = ({
  open,
  onOpenChange,
  onBarcodeDetected,
  onManualEntry
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lastAttempt, setLastAttempt] = useState(0);

  // Autoscan refs
  const inFlightRef = useRef(false);
  const rafRef = useRef<number>(0);
  const cooldownUntilRef = useRef(0);
  const hitsRef = useRef<{code:string,t:number}[]>([]);
  const runningRef = useRef(false);

  const { snapAndDecode, setTorch, isTorchSupported, torchEnabled, updateStreamRef } = useSnapAndDecode();

  // Feature flag for autoscan (set to true to enable)
  const AUTOSCAN_ENABLED = false;

  // Constants for decode parameters
  const BUDGET_MS = 900;
  const ROI = { widthPct: 0.7, heightPct: 0.35 }; // horizontal band
  const COOLDOWN_MS = 600;

  // Quick decode for autoscan with better tolerance
  const quickDecode = useCallback(async (video: HTMLVideoElement, opts: { budgetMs: number }) => {
    if (!video.videoWidth || !video.videoHeight) return null;
    
    try {
      const result = await snapAndDecode({
        videoEl: video,
        budgetMs: opts.budgetMs,
        roi: { wPct: ROI.widthPct, hPct: ROI.heightPct },
        logPrefix: '[LOG]'
      });
      
      return result.ok ? { ok: true, code: result.raw } : null;
    } catch (error) {
      return null;
    }
  }, [snapAndDecode, ROI]);

  // Autoscan functions
  const startAutoscan = useCallback(() => {
    if (!AUTOSCAN_ENABLED) return;
    console.log('[LOG] autoscan_start');
    runningRef.current = true;
    hitsRef.current = [];
    const tick = async () => {
      if (!runningRef.current) return;
      const now = performance.now();
      
      if (now < cooldownUntilRef.current || inFlightRef.current || !videoRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      
      inFlightRef.current = true;
      try {
        const result = await quickDecode(videoRef.current, { budgetMs: 180 });
        if (result?.ok && /^\d{8,14}$/.test(result.code)) {
          console.log('[LOG] quick_hit', { code: result.code });
          hitsRef.current.push({ code: result.code, t: now });
          hitsRef.current = hitsRef.current.filter(h => now - h.t <= 600);
          
          const last = hitsRef.current[hitsRef.current.length - 1].code;
          const count = hitsRef.current.filter(h => h.code === last).length;
          
          if (count >= 3) {
            console.log('[LOG] stable_lock', { code: last });
            setIsFrozen(true);
            stopAutoscan();
            
            const lookupResult = await handleOffLookup(last);
            if (lookupResult.hit && lookupResult.data?.ok && lookupResult.data.product) {
              onBarcodeDetected(last);
              onOpenChange(false);
            } else {
              setIsFrozen(false);
              startAutoscan(); // Resume if no match
            }
            return;
          }
        } else {
          cooldownUntilRef.current = now + 120;
        }
      } finally {
        inFlightRef.current = false;
        if (runningRef.current) {
          rafRef.current = requestAnimationFrame(tick);
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [AUTOSCAN_ENABLED, quickDecode, onBarcodeDetected, onOpenChange]);

  const stopAutoscan = useCallback(() => {
    console.log('[LOG] autoscan_stop');
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    inFlightRef.current = false;
    hitsRef.current = [];
  }, []);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      cleanup();
    }
    
    return cleanup;
  }, [open]);

  useEffect(() => {
    if (open && stream) {
      // Start autoscan when camera is ready
      startAutoscan();
      
      // Update the stream reference for torch functionality
      if (videoRef.current) {
        // Simply update the stream reference directly
        updateStreamRef(stream);
      }
    }
    return () => {
      stopAutoscan();
    };
  }, [open, stream, startAutoscan, stopAutoscan, updateStreamRef]);

  const startCamera = async () => {
    try {
      console.log("[LOG] Requesting camera stream...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setStream(mediaStream);
        // Update the stream reference for torch functionality
        updateStreamRef(mediaStream);
        setError(null);
      }
    } catch (err) {
      console.error("[LOG] Camera access error:", err);
      setError('Unable to access camera. Please check permissions and try again.');
    }
  };

  const cleanup = () => {
    stopAutoscan();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setIsDecoding(false);
    setIsFrozen(false);
    setIsLookingUp(false);
  };

  const handleOffLookup = async (barcode: string): Promise<{ hit: boolean; status: string | number; data?: any }> => {
    console.log(`[LOG] off_fetch_start`, { code: barcode });
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    let hit = false;
    let status: string | number = 'error';
    let data = null;
    
    try {
      setIsLookingUp(true);
      
      // Use same endpoint as Health Scan
      const { data: result, error } = await supabase.functions.invoke('enhanced-health-scanner', {
        body: { mode: 'barcode', barcode, source: 'log' }
      });
      
      clearTimeout(timeout);
      
      // Forensic logging for Log → Confirm flow
      console.log('[LOG PIPELINE]', 'enhanced-health-scanner', { mode: 'barcode', barcode, source: 'log' });
      
      if (error) {
        status = error.status || 'error';
        console.log(`[LOG] off_error:`, error);
      } else {
        status = 200;
        hit = !!result?.ok && !!result.product;
        data = result;
        
        if (result) {
          // RCA telemetry for Log flow
          const legacy = toLegacyFromEdge(result);
          console.groupCollapsed('[LOG] RCA legacy');
          console.log('edge.product.name', result?.product?.name);
          console.log('edge.product.health.score', result?.product?.health?.score);
          console.log('edge.product.health.flags.len', result?.product?.health?.flags?.length ?? 0);
          console.log('legacy.productName', legacy?.productName);
          console.log('legacy.healthScore', legacy?.healthScore);
          console.log('legacy.healthFlags.len', legacy?.healthFlags?.length ?? 0);
          console.log('legacy.ingredientsText.len', legacy?.ingredientsText?.length ?? 0);
          console.groupEnd();
          
          // Score normalization telemetry
          logScoreNorm('score_norm:log.edge', result?.product?.health?.score, null);
          logScoreNorm('score_norm:log.legacy', legacy?.healthScore, null);
        }
      }
      
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        status = 'timeout';
        console.log(`[LOG] off_timeout:`, error);
      } else {
        status = 'error';
        console.log(`[LOG] off_error:`, error);
      }
    } finally {
      setIsLookingUp(false);
    }
    
    console.log(`[LOG] off_result`, { status, hit });
    return { hit, status, data };
  };

  const handleSnapAndDecode = async () => {
    // Single-flight guard with cooldown
    if (isDecoding) {
      console.log('[LOG] decode_cancelled: busy');
      return;
    }
    
    const now = Date.now();
    if (now - lastAttempt < COOLDOWN_MS) {
      console.log('[LOG] decode_cancelled: cooldown');
      return;
    }
    
    if (!videoRef.current) return;
    
    // Pause autoscan during manual decode
    const wasRunning = runningRef.current;
    if (wasRunning) stopAutoscan();
    
    console.time('[LOG] analyze_total');
    setIsDecoding(true);
    setIsFrozen(true);
    setError(null);
    setLastAttempt(now);
    
    try {
      const video = videoRef.current;
      
      const result = await snapAndDecode({
        videoEl: video,
        budgetMs: BUDGET_MS,
        roi: { wPct: ROI.widthPct, hPct: ROI.heightPct },
        logPrefix: '[LOG]'
      });

      // If decoded digits, try OFF lookup
      if (result.ok && result.raw && /^\d{8,14}$/.test(result.raw)) {
        const lookupResult = await handleOffLookup(result.raw);
        
        if (lookupResult.hit && lookupResult.data?.ok && lookupResult.data.product) {
          onBarcodeDetected(result.raw);
          onOpenChange(false);
        } else if (lookupResult.data && !lookupResult.data.ok) {
          const reason = lookupResult.data.reason || 'unknown';
          const msg = reason === 'off_miss' && /^\d{8}$/.test(result.raw)
            ? 'This 8-digit code is not in OpenFoodFacts. Try another side or enter manually.'
            : 'No product match. Try again or enter manually.';
          toast(msg);
        } else {
          toast.error('Lookup error. Please try again.');
        }
      } else {
        toast('No barcode detected. Try again.');
      }
    } finally {
      setTimeout(() => {
        setIsDecoding(false);
        setIsFrozen(false);
        // Resume autoscan if it was running
        if (wasRunning && AUTOSCAN_ENABLED) {
          startAutoscan();
        }
      }, 450); // Small cooldown before allowing next attempt
      console.timeEnd('[LOG] analyze_total');
    }
  };

  const toggleTorch = async () => {
    try {
      await setTorch(!torchEnabled);
    } catch (error) {
      console.error("Error toggling torch:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-screen h-screen max-w-none max-h-none p-0 m-0 bg-black border-0 rounded-none [&>button]:hidden"
      >
        <div className="relative w-full h-full bg-black overflow-hidden">
          {/* Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{
              filter: isFrozen ? 'brightness(0.3)' : 'none',
              transition: 'filter 0.2s ease'
            }}
          />

          {/* Frozen Overlay */}
          {isFrozen && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-pulse text-lg">Processing...</div>
              </div>
            </div>
          )}

          {/* UI Overlay */}
          <div className="absolute inset-0 flex flex-col">
            {/* Header */}
            <div className="relative flex items-center p-4 pt-8 bg-gradient-to-b from-black/70 to-transparent mt-[env(safe-area-inset-top)]">
              <h2 className="text-white text-xl font-semibold text-center w-full">Scan Barcode</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="absolute right-4 text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Center Content */}
            <div className="flex-1 flex items-center justify-center px-4 -mt-32">
              {/* Centered scan frame */}
              <div className="relative w-[82vw] max-w-[680px] aspect-[7/4] pointer-events-none">
                {/* Corner indicators */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400"></div>
                
                {/* Grid overlay */}
                <div className="absolute inset-4 opacity-20">
                  <div className="w-full h-full grid grid-cols-6 grid-rows-3 gap-0">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <div key={i} className="border border-cyan-400/30"></div>
                    ))}
                  </div>
                </div>
                
                {/* Scanning line animation */}
                {(isDecoding || isLookingUp) && (
                  <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-cyan-400 transform -translate-y-1/2 animate-pulse shadow-lg shadow-cyan-400/50" />
                )}
              </div>
            </div>

            {/* Gradient Tint - Stays at bottom */}
            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
            
            {/* Bottom Controls - Safe area */}
            <footer className="absolute bottom-6 inset-x-0 pb-[env(safe-area-inset-bottom)] px-4 space-y-3 pt-16">
              {/* Instructions text */}
              <div className="text-center text-white/90 mb-4">
                <p className="text-sm font-medium">Align barcode in frame and tap to scan</p>
                <p className="text-xs text-white/70 mt-1">Supports UPC-A, EAN-13, and EAN-8 codes</p>
              </div>
              
              {/* Main Action Button */}
              <Button
                onClick={handleSnapAndDecode}
                disabled={isDecoding || isLookingUp || !stream}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white h-14 text-lg font-medium disabled:opacity-50"
              >
                {isDecoding ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                    Decoding...
                  </>
                ) : isLookingUp ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                    Looking up product...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Snap & Decode
                  </>
                )}
              </Button>

              {/* Secondary Actions */}
              <div className="flex gap-3">
                {/* Torch Toggle - Always show */}
                <Button
                  variant="outline"
                  onClick={toggleTorch}
                  disabled={!isTorchSupported}
                  className={`flex-1 border-white/30 text-white hover:bg-white/20 h-12 ${
                    torchEnabled ? 'bg-white/20' : 'bg-transparent'
                  } ${!isTorchSupported ? 'opacity-50' : ''}`}
                >
                  {torchEnabled ? '💡 Flash On' : '💡 Flash Off'}
                </Button>
                
                {/* Manual Entry */}
                <Button
                  variant="outline"
                  onClick={onManualEntry}
                  className="flex-1 border-white/30 text-white hover:bg-white/20 h-12"
                >
                  ✏️ Enter Manually
                </Button>
              </div>
            </footer>
          </div>

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6">
              <div className="text-center">
                <p className="text-white text-lg mb-4">{error}</p>
                <Button
                  onClick={startCamera}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  Retry Camera Access
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};