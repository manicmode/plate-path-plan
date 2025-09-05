import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, SwitchCamera, Zap, ZapOff, X, Lightbulb, Check, Info, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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

  // Zoom functionality state
  const [currentZoom, setCurrentZoom] = useState(1);
  const [supportsZoom, setSupportsZoom] = useState(false);
  const [maxZoom, setMaxZoom] = useState(3);
  const [useCSSZoom, setUseCSSZoom] = useState(false);
  const currentZoomRef = useRef(1);
  const pinchBaseRef = useRef<number | null>(null);
  const lastTapRef = useRef(0);
  const activePointersRef = useRef<Map<number, PointerEvent>>(new Map());

  // Autoscan refs
  const inFlightRef = useRef(false);
  const rafRef = useRef<number>(0);
  const cooldownUntilRef = useRef(0);
  const hitsRef = useRef<{code:string,t:number}[]>([]);
  const runningRef = useRef(false);

  const { snapAndDecode, updateStreamRef } = useSnapAndDecode();
  const { supportsTorch, torchOn, setTorch, ensureTorchState } = useTorch(() => trackRef.current);

  // Safe zoom application with fallback to CSS zoom
  const safeZoom = useCallback(async (track: MediaStreamTrack, zoomLevel: number) => {
    const caps: any = track.getCapabilities?.() ?? {};
    if (caps.zoom) {
      const clampedZoom = Math.max(caps.zoom.min ?? 1, Math.min(zoomLevel, caps.zoom.max ?? 3));
      try {
        await track.applyConstraints({ advanced: [{ zoom: clampedZoom } as any] });
        currentZoomRef.current = clampedZoom;
        setCurrentZoom(clampedZoom);
        return true;
      } catch (error) {
        console.warn('Hardware zoom failed, falling back to CSS zoom:', error);
        setUseCSSZoom(true);
        return false;
      }
    } else if (videoRef.current) {
      // CSS fallback
      setUseCSSZoom(true);
      const cssZoom = Math.max(1, Math.min(zoomLevel, 3));
      currentZoomRef.current = cssZoom;
      setCurrentZoom(cssZoom);
      return false;
    }
    return false;
  }, []);

  // Gesture handlers for pinch-to-zoom
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!videoRef.current || !trackRef.current) return;
    
    activePointersRef.current.set(e.pointerId, e.nativeEvent);
    (e.target as Element).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(async (e: React.PointerEvent) => {
    if (!videoRef.current || !trackRef.current) return;
    
    activePointersRef.current.set(e.pointerId, e.nativeEvent);
    
    if (activePointersRef.current.size === 2) {
      const pointers = [...activePointersRef.current.values()];
      const distance = Math.hypot(
        pointers[0].clientX - pointers[1].clientX,
        pointers[0].clientY - pointers[1].clientY
      );
      
      if (!pinchBaseRef.current) {
        pinchBaseRef.current = distance;
        return;
      }
      
      const scale = distance / pinchBaseRef.current;
      const targetZoom = Math.max(1, Math.min(currentZoomRef.current * scale, maxZoom));
      
      await safeZoom(trackRef.current, targetZoom);
    }
  }, [safeZoom, maxZoom]);

  const handlePointerEnd = useCallback(() => {
    activePointersRef.current.clear();
    pinchBaseRef.current = null;
  }, []);

  // Double-tap to toggle zoom
  const handleVideoClick = useCallback(async () => {
    if (!trackRef.current) return;
    
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      const nextZoom = currentZoom < (maxZoom * 0.6) ? Math.min(2, maxZoom) : 1;
      await safeZoom(trackRef.current, nextZoom);
    }
    lastTapRef.current = now;
  }, [currentZoom, maxZoom, safeZoom]);

  // Zoom toggle button handler
  const handleZoomToggle = useCallback(async () => {
    if (!trackRef.current) return;
    
    const nextZoom = currentZoom < (maxZoom * 0.6) ? Math.min(2, maxZoom) : 1;
    await safeZoom(trackRef.current, nextZoom);
  }, [currentZoom, maxZoom, safeZoom]);

  // Constants and refs
  const OWNER = 'log_barcode_scanner';

  // Feature flag for autoscan (set to true to enable)
  const AUTOSCAN_ENABLED = false;
  const THROTTLE = import.meta.env.VITE_SCANNER_THROTTLE === 'true';
  const BUDGET_MS = THROTTLE ? 500 : 900;
  const ROI = { widthPct: 0.7, heightPct: 0.35 }; // horizontal band
  const COOLDOWN_MS = THROTTLE ? 300 : 600;

  // Add keyframes to the styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes scan { 
        0% { transform: translateY(-36%); opacity: 0.2; } 
        50% { transform: translateY(36%); opacity: 0.9; } 
        100% { transform: translateY(-36%); opacity: 0.2; } 
      }
      @keyframes fade { 
        0%, 100% { opacity: 0; } 
        10%, 90% { opacity: 1; } 
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
      console.log("[LOG] Requesting high-resolution camera stream...");
      const THROTTLE = import.meta.env.VITE_SCANNER_THROTTLE === 'true';
      
      // Request high-resolution rear camera for better zoom quality
      const getCamera = async () => {
        const primary = { 
          video: { 
            facingMode: { ideal: 'environment' }, 
            width: { ideal: 1920 }, 
            height: { ideal: 1080 },
            aspectRatio: 16/9
          } 
        };
        const fallback = { 
          video: { 
            facingMode: { ideal: 'environment' }, 
            width: { ideal: THROTTLE ? 640 : 1280 }, 
            height: { ideal: THROTTLE ? 480 : 720 } 
          } 
        };
        const basic = { video: true };
        
        try { 
          return await navigator.mediaDevices.getUserMedia(primary); 
        } catch (e: any) {
          console.warn('[CAM] high-res failed, trying fallback', e?.name);
          try {
            return await navigator.mediaDevices.getUserMedia(fallback);
          } catch (e2: any) {
            console.warn('[CAM] fallback failed, trying basic', e2?.name);
            return await navigator.mediaDevices.getUserMedia(basic);
          }
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
        
        // Initialize zoom capabilities
        const caps: any = track.getCapabilities?.() ?? {};
        if (caps.zoom) {
          setSupportsZoom(true);
          setMaxZoom(caps.zoom.max ?? 3);
          setUseCSSZoom(false);
          
          // Set default zoom level
          const defaultZoom = Math.min(2, caps.zoom.max ?? 2);
          await safeZoom(track, defaultZoom);
          console.log('[ZOOM] Hardware zoom available, max:', caps.zoom.max, 'default:', defaultZoom);
        } else {
          console.log('[ZOOM] No hardware zoom, using CSS fallback');
          setSupportsZoom(false);
          setUseCSSZoom(true);
          const defaultZoom = 1.3;
          currentZoomRef.current = defaultZoom;
          setCurrentZoom(defaultZoom);
        }
        
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
        <div className="grid h-full grid-rows-[auto_1fr_auto]">
          {/* Header */}
          <header className="row-start-1 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2 flex items-center justify-between">
            <h2 className="text-white text-lg font-semibold mx-auto">Scan a barcode</h2>
            
            {/* Close Button */}
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
          </header>

          {/* Centered Stage */}
          <main className="row-start-2 grid place-items-center px-4">
            {/* Status row – fixed height, centered */}
            <div className="flex h-[28px] items-center justify-center mb-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] bg-emerald-400/12 text-emerald-300 border border-emerald-400/25">
                {isLookingUp ? (
                  <>
                    <div className="inline-block w-1.5 h-1.5 bg-cyan-400 rounded-full mr-2 animate-pulse" />
                    Looking up product...
                  </>
                ) : isDecoding ? (
                  <>
                    <div className="inline-block w-1.5 h-1.5 bg-cyan-400 rounded-full mr-2 animate-pulse" />
                    Scanning...
                  </>
                ) : (
                  <>● Ready to scan</>
                )}
              </span>
            </div>

            {/* Lift the frame slightly (clamped) so it feels centered */}
            <div className="-translate-y-[clamp(8px,3vh,28px)]">
              <div className="relative w-[min(86vw,360px)] aspect-[4/5] rounded-3xl overflow-hidden">
                {/* Video element absolutely fills */}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover",
                    useCSSZoom && "will-change-transform"
                  )}
                  style={useCSSZoom ? {
                    transform: `scale(${currentZoom})`,
                    transformOrigin: 'center center'
                  } : undefined}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                  onPointerLeave={handlePointerEnd}
                  onClick={handleVideoClick}
                />

                {/* Vignette overlay with smoother fade and bigger bright area */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 42%, ' +
                      'rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.08) 35%, ' +
                      'rgba(0,0,0,0.18) 58%, rgba(0,0,0,0.36) 72%, ' +
                      'rgba(0,0,0,0.58) 86%, rgba(0,0,0,0.72) 100%)'
                  }}
                />

                {/* Corners */}
                <div className="absolute inset-10">
                  <div className={cn(
                    "absolute left-0 top-0 h-5 w-5 border-t-2 border-l-2 rounded-tl-md transition-all duration-180",
                    showSuccess ? "border-green-400/80 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "border-cyan-400/80"
                  )} />
                  <div className={cn(
                    "absolute right-0 top-0 h-5 w-5 border-t-2 border-r-2 rounded-tr-md transition-all duration-180",
                    showSuccess ? "border-green-400/80 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "border-cyan-400/80"
                  )} />
                  <div className={cn(
                    "absolute left-0 bottom-0 h-5 w-5 border-b-2 border-l-2 rounded-bl-md transition-all duration-180",
                    showSuccess ? "border-green-400/80 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "border-cyan-400/80"
                  )} />
                  <div className={cn(
                    "absolute right-0 bottom-0 h-5 w-5 border-b-2 border-r-2 rounded-br-md transition-all duration-180",
                    showSuccess ? "border-green-400/80 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "border-cyan-400/80"
                  )} />
                </div>

                {/* Scan line */}
                <div className="absolute left-12 right-12 top-1/2 h-px
                                bg-gradient-to-r from-transparent via-cyan-300 to-transparent
                                animate-[scan_2.4s_ease-in-out_infinite]" />
                
                {/* Success checkmark */}
                {showSuccess && (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500 rounded-full p-1.5 animate-[scale_180ms_ease-out] shadow-lg shadow-green-500/50">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}

                {/* Zoom Toggle Button */}
                <button
                  onClick={handleZoomToggle}
                  className="absolute right-2 top-2 rounded-full px-2.5 py-1 text-xs bg-black/50 text-white border border-white/10 hover:bg-black/70 transition-colors"
                >
                  {currentZoom <= 1.05 ? '1×' : `${currentZoom.toFixed(1)}×`}
                </button>
                  
                {/* HINT (no layout shift) */}
                <div
                  aria-live="polite"
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-4 h-5 flex items-center justify-center text-[12px] text-white/80"
                >
                  {showSlowHint && (
                    <span className="animate-[fade_2.2s_ease-in-out_infinite] bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm">
                      Hold steady • Try turning on flash
                    </span>
                  )}
                </div>
              </div>
            </div>
          </main>

          {/* Footer / CTA */}
          <footer className="row-start-3 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
            <Button
              onClick={handleSnapAndDecode}
              disabled={isDecoding || isLookingUp || !stream}
              className="w-full rounded-2xl py-4 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white font-medium h-14 disabled:opacity-50 transition-all duration-200"
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
                <span className="inline-flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Scan & Log
                </span>
              )}
            </Button>
            
            <div className="text-center mt-3">
              <button
                onClick={onManualEntry}
                className="text-white/80 hover:text-white underline underline-offset-2 transition-colors duration-200"
              >
                Enter manually instead
              </button>
            </div>
          </footer>

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