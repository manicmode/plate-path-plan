import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, SwitchCamera, Zap, ZapOff, X, Lightbulb, Check, Info } from 'lucide-react';
import { toast } from 'sonner';
import { camHardStop, camOwnerMount, camOwnerUnmount } from '@/lib/camera/guardian';
import { attachStreamToVideo, detachVideo } from '@/lib/camera/videoAttach';
import { useSnapAndDecode } from '@/lib/barcode/useSnapAndDecode';
import { HealthAnalysisLoading } from '@/components/health-check/HealthAnalysisLoading';
import { supabase } from '@/integrations/supabase/client';
import { toLegacyFromEdge } from '@/lib/health/toLegacyFromEdge';
import { logScoreNorm } from '@/lib/health/extractScore';
import { useTorch } from '@/lib/camera/useTorch';
import { scannerLiveCamEnabled } from '@/lib/platform';
import { openPhotoCapture } from '@/components/camera/photoCapture';
import { decodeBarcodeFromFile } from '@/lib/decodeFromImage';
import { logOwnerAcquire, logOwnerAttach, logOwnerRelease, logPerfOpen, logPerfClose, checkForLeaks } from '@/diagnostics/cameraInq';
import { ScanOverlay } from '@/components/camera/ScanOverlay';
import { playBeep } from '@/lib/sound/soundManager';

function torchOff(track?: MediaStreamTrack) {
  try { track?.applyConstraints?.({ advanced: [{ torch: false }] as any }); } catch {}
}

function hardDetachVideo(video?: HTMLVideoElement | null) {
  if (!video) return;
  try { video.pause(); } catch {}
  try { (video as any).srcObject = null; } catch {}
  try { video.removeAttribute('src'); video.load?.(); } catch {}
}

const SCAN_OVERLAY_REV = "2025-08-31T15:50Z-r1";

type ScanPhase = 'scanning' | 'captured' | 'analyzing' | 'presenting';

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
  const startTimeRef = useRef<number>(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [phase, setPhase] = useState<ScanPhase>('scanning');
  
  // One overlay flag derived from phase
  const overlayWanted = phase !== 'scanning';
  
  // Hysteresis: ensure overlay doesn't flicker if phase bounces quickly
  const [overlayVisible, setOverlayVisible] = useState(false);
  useEffect(() => {
    if (overlayWanted) {
      setOverlayVisible(true);
    } else {
      const t = setTimeout(() => setOverlayVisible(false), 160);
      return () => clearTimeout(t);
    }
  }, [overlayWanted]);
  const [error, setError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lastAttempt, setLastAttempt] = useState(0);
  const [showSlowHint, setShowSlowHint] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Autoscan refs
  const inFlightRef = useRef(false);
  const rafRef = useRef<number>(0);
  const cooldownUntilRef = useRef(0);
  const hitsRef = useRef<{code:string,t:number}[]>([]);
  const runningRef = useRef(false);

  const { snapAndDecode, updateStreamRef } = useSnapAndDecode();
  const { supportsTorch, torchOn, setTorch, ensureTorchState } = useTorch(() => trackRef.current);

  // Constants and refs
  const OWNER = 'log_barcode_scanner';

  // Feature flag for autoscan (set to true to enable)
  const AUTOSCAN_ENABLED = false;
  const THROTTLE = import.meta.env.VITE_SCANNER_THROTTLE === 'true';
  const BUDGET_MS = THROTTLE ? 500 : 900;
  const ROI = { widthPct: 0.7, heightPct: 0.35 }; // horizontal band
  const COOLDOWN_MS = THROTTLE ? 300 : 600;

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
            setPhase('captured');
            setShowSuccess(true);
            stopAutoscan();
            
            // Haptic feedback
            if ('vibrate' in navigator) {
              navigator.vibrate(50); // Light haptic
            }
            
            const lookupResult = await handleOffLookup(last);
        if (lookupResult.hit && lookupResult.data?.ok && lookupResult.data.product) {
          playBeep();
          onBarcodeDetected(last);
          onOpenChange(false);
            } else {
              setPhase('scanning');
              setShowSuccess(false);
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

  useLayoutEffect(() => {
    if (open) {
      logPerfOpen('LogBarcodeScannerModal');
      logOwnerAcquire('LogBarcodeScannerModal');
      camOwnerMount(OWNER);
      startCamera();
    } else {
      camOwnerUnmount(OWNER);
      camHardStop('modal_close');
      cleanup();
      logPerfClose('LogBarcodeScannerModal', startTimeRef.current);
      checkForLeaks('LogBarcodeScannerModal');
    }
    
    // Enhanced cleanup on unmount when throttle enabled
    return () => {
      const THROTTLE = import.meta.env.VITE_SCANNER_THROTTLE === 'true';
      if (THROTTLE) {
        // Cancel any pending animation frames and timers
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        // Reset all refs
        inFlightRef.current = false;
        runningRef.current = false;
        hitsRef.current = [];
      }
      camOwnerUnmount(OWNER);
      camHardStop('unmount');
      cleanup();
    };
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
      
      // Show slow hint after 2 seconds if no barcode detected
      const slowHintTimer = setTimeout(() => {
        if (phase === 'scanning' && !isDecoding && !isLookingUp) {
          setShowSlowHint(true);
          // Auto-hide after 3 seconds
          setTimeout(() => setShowSlowHint(false), 3000);
        }
      }, 2000);
      
      return () => clearTimeout(slowHintTimer);
    }
    return () => {
      stopAutoscan();
    };
  }, [open, stream, startAutoscan, stopAutoscan, updateStreamRef, phase, isDecoding, isLookingUp]);

  const startCamera = async () => {
    // iOS fallback: use photo capture for barcode
    if (!scannerLiveCamEnabled()) {
      console.warn('[SCANNER] iOS fallback: photo capture for barcode');
      try {
        const file = await openPhotoCapture('image/*','environment');
        const val = await decodeBarcodeFromFile(file);
        if (val) {
          console.log('[BARCODE][SCAN:DETECTED]', { raw: val, format: 'photo-fallback' });
          onBarcodeDetected(val);
        }
      } catch {}
      onOpenChange(false); // close the scanner UI since we're one-shot
      return null; // prevent live pipeline from starting  
    }

    try {
      console.log("[LOG] Requesting camera stream...");
      const THROTTLE = import.meta.env.VITE_SCANNER_THROTTLE === 'true';
      
      // Use ideal constraints with robust fallback
      const getCamera = async () => {
        const primary = { 
          video: { 
            facingMode: { ideal: 'environment' }, 
            width: { ideal: THROTTLE ? 640 : 1280 }, 
            height: { ideal: THROTTLE ? 480 : 720 } 
          } 
        };
        const fallback = { video: true };
        
        try { 
          return await navigator.mediaDevices.getUserMedia(primary); 
        } catch (e: any) {
          console.warn('[CAM] primary failed', e?.name);
          return await navigator.mediaDevices.getUserMedia(fallback);
        }
      };
      
      const mediaStream = await getCamera();
      
      // Defensive strip: remove any audio tracks that slipped in
      const s = mediaStream;
      s.getAudioTracks?.().forEach(t => { try { t.stop(); } catch {} try { s.removeTrack(t); } catch {} });

      if (videoRef.current) {
        await attachStreamToVideo(videoRef.current, mediaStream);
        
        const track = mediaStream.getVideoTracks()[0];
        trackRef.current = track;
        setStream(mediaStream);
        
        // Camera inquiry logging
        const streamId = (mediaStream as any).__camInqId || 'unknown';
        logOwnerAttach('LogBarcodeScannerModal', streamId);
        
        // Update the stream reference for existing hook compatibility
        updateStreamRef(mediaStream);
        
        // Ensure torch state after track is ready
        setTimeout(() => {
          ensureTorchState();
        }, 100);
        
        setError(null);
      }
    } catch (err: any) {
      console.warn('[SCANNER] Live video denied, using photo fallback', err?.name || err);
      try {
        const file = await openPhotoCapture('image/*','environment');
        const val = await decodeBarcodeFromFile(file);
        if (val) {
          console.log('[BARCODE][SCAN:DETECTED]', { raw: val, format: 'photo-fallback-2' });
          onBarcodeDetected(val);
        }
        onOpenChange(false);
        return null;
      } catch (fallbackErr) {
        console.error("[LOG] Both live and photo capture failed:", err, fallbackErr);
        setError('Unable to access camera. Please check permissions and try again.');
      }
    }
  };

  const cleanup = () => {
    const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks?.()?.[0];
    torchOff(track);

    const s = (videoRef.current?.srcObject as MediaStream) || undefined;
    const stoppedKinds: string[] = [];
    if (s) {
      stoppedKinds.push(...s.getTracks().map(t => t.kind));
      s.getTracks().forEach(t => t.stop());
    }

    // Camera inquiry logging
    if (stoppedKinds.length > 0) {
      logOwnerRelease('LogBarcodeScannerModal', stoppedKinds);
    }

    detachVideo(videoRef.current);

    // tiniest fix because the hook already supports it:
    try { updateStreamRef?.(null); } catch {}

    stopAutoscan();
    trackRef.current = null;
    setStream(null);
    setIsDecoding(false);
    setPhase('scanning');
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
      
      console.log('[BCF][INVOKE:REQUEST]', {
        fn: 'enhanced-health-scanner',
        url: (supabase as any)?.functions?.url,
        projectUrl: (supabase as any)?.rest?.url,
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
      });
      
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
      console.error('[BCF][INVOKE:ERROR]', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      });
      if (error.name === 'AbortError') {
        status = 'timeout';
        console.log(`[LOG] off_timeout:`, error);
      } else {
        status = 'error';
        console.log(`[LOG] off_error:`, error);
      }
      console.warn('[BCF][FALLBACK:UNKNOWN_PRODUCT]', { barcode, reason: 'invoke-failed' });
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
    setPhase('captured');
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
        playBeep();
        setShowSuccess(true);
        
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
        
        console.log('[BARCODE][SCAN:DETECTED]', { raw: result.raw, format: 'manual-capture' });
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
        setPhase('scanning');
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
      console.log("[TORCH] Attempting to toggle torch. Current state:", torchOn, "Track:", !!trackRef.current);
      const result = await setTorch(!torchOn);
      console.log("[TORCH] Toggle result:", result);
      if (!result.ok) {
        console.warn("Torch toggle failed:", result.reason);
        toast.error(`Flash not available: ${result.reason}`);
      } else {
        console.log("[TORCH] Successfully toggled torch to:", !torchOn);
      }
    } catch (error) {
      console.error("Error toggling torch:", error);
      toast.error("Failed to toggle flashlight");
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
          />

          {/* Framing Mask - darkens everything except the scan area */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
            style={{
              maskImage: 'radial-gradient(ellipse 45% 25% at center, transparent 60%, black 85%)',
              WebkitMaskImage: 'radial-gradient(ellipse 45% 25% at center, transparent 60%, black 85%)'
            }}
          />

          {/* Unified Scan Overlay */}
          <ScanOverlay show={overlayVisible} />

          {/* Frozen Overlay */}
          {phase !== 'scanning' && (
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
              <h2 className="text-white text-xl font-semibold text-center w-full">Scan a barcode</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="absolute right-4 text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
              
              {/* Floating Torch Button */}
              {supportsTorch && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTorch}
                  className={`absolute right-16 text-white hover:bg-white/20 transition-colors duration-200 ${
                    torchOn ? 'bg-yellow-500/30 text-yellow-300' : ''
                  }`}
                  title={`Turn flash ${torchOn ? 'off' : 'on'}`}
                >
                  <Lightbulb className={`h-5 w-5 ${torchOn ? 'text-yellow-300' : 'text-white'}`} />
                </Button>
              )}
            </div>

            {/* Status Chip */}
            <div className="px-4 pb-2">
              <div className="inline-flex items-center px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <div className="text-xs text-white/80">
                  {isLookingUp ? (
                    <>
                      <div className="inline-block w-2 h-2 bg-cyan-400 rounded-full mr-2 animate-pulse" />
                      Looking up product...
                    </>
                  ) : isDecoding ? (
                    <>
                      <div className="inline-block w-2 h-2 bg-cyan-400 rounded-full mr-2 animate-pulse" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <div className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2" />
                      Ready to scan
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Center Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-8">
              {/* Centered scan frame */}
              <div className="relative w-[82vw] max-w-[680px] aspect-[7/4] pointer-events-none">
                {/* Corner indicators with glow effect */}
                <div className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 transition-all duration-300 ${
                  showSuccess ? 'border-green-400 shadow-lg shadow-green-400/50' : 'border-cyan-400 shadow-lg shadow-cyan-400/30'
                } ${phase === 'scanning' ? 'animate-pulse' : ''}`}></div>
                <div className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 transition-all duration-300 ${
                  showSuccess ? 'border-green-400 shadow-lg shadow-green-400/50' : 'border-cyan-400 shadow-lg shadow-cyan-400/30'
                } ${phase === 'scanning' ? 'animate-pulse' : ''}`}></div>
                <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 transition-all duration-300 ${
                  showSuccess ? 'border-green-400 shadow-lg shadow-green-400/50' : 'border-cyan-400 shadow-lg shadow-cyan-400/30'
                } ${phase === 'scanning' ? 'animate-pulse' : ''}`}></div>
                <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 transition-all duration-300 ${
                  showSuccess ? 'border-green-400 shadow-lg shadow-green-400/50' : 'border-cyan-400 shadow-lg shadow-cyan-400/30'
                } ${phase === 'scanning' ? 'animate-pulse' : ''}`}></div>
                
                {/* Scanning line animation */}
                {phase === 'scanning' && (
                  <div className="absolute inset-x-4 top-1/2 h-0.5 transform -translate-y-1/2">
                    <div className="h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[scan_2.4s_ease-in-out_infinite] shadow-lg shadow-cyan-400/50 blur-[1px]" />
                  </div>
                )}
                
                {/* Success checkmark */}
                {showSuccess && (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500 rounded-full p-1.5 animate-[scale_180ms_ease-out] shadow-lg shadow-green-500/50">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              
              {/* Helper text */}
              <div className="mt-4 text-center">
                <p className="text-white/80 text-sm font-medium">
                  Align the code in the frame— we'll auto-detect
                </p>
                
                {/* Slow hint */}
                {showSlowHint && (
                  <div className="mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="text-white/60 text-xs">
                      Hold steady • Try turning on flash
                    </p>
                  </div>
                )}
                
                {/* Supported formats tooltip */}
                <div className="relative mt-2">
                  <button
                    onClick={() => setShowTooltip(!showTooltip)}
                    className="inline-flex items-center text-white/50 hover:text-white/70 text-xs transition-colors"
                  >
                    <Info className="h-3 w-3 mr-1" />
                    Supported formats
                  </button>
                  
                  {showTooltip && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-black/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white/80 whitespace-nowrap border border-white/20">
                      UPC-A, EAN-13, EAN-8, Code-128, QR codes
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black/90 rotate-45 border-l border-t border-white/20"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Gradient Tint - Stays at bottom */}
            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
            
            {/* Bottom Controls - Safe area */}
            <footer className="absolute bottom-6 inset-x-0 pb-[env(safe-area-inset-bottom)] px-4 space-y-4 pt-16">
              {/* Main Action Button */}
              <Button
                onClick={handleSnapAndDecode}
                disabled={isDecoding || isLookingUp || !stream}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white h-14 text-lg font-medium disabled:opacity-50 transition-all duration-200"
              >
                {isDecoding ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                    Scanning...
                  </>
                ) : isLookingUp ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                    Looking up product...
                  </>
                ) : (
                  <>
                    <Camera className="h-5 w-5 mr-2" />
                    Scan & Log
                  </>
                )}
              </Button>

              {/* Secondary Action - Link Style */}
              <div className="text-center">
                <button
                  onClick={onManualEntry}
                  className="text-white/70 hover:text-white text-sm underline underline-offset-2 transition-colors duration-200"
                >
                  Enter manually instead
                </button>
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