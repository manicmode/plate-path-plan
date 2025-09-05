import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, ZapOff, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { camHardStop, camOwnerMount, camOwnerUnmount } from '@/lib/camera/guardian';
import { attachStreamToVideo } from '@/lib/camera/videoAttach';
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
import { SFX } from '@/lib/sfx/sfxManager';
import BarcodeViewport, { AutoToggleChip } from '@/components/scanner/BarcodeViewport';
import { FF } from '@/featureFlags';

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
  // SSR guard - don't render on server
  if (typeof window === 'undefined') return null;
  // Don't mount internals when closed
  if (!open) return null;
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
  const THROTTLE = import.meta.env.VITE_SCANNER_THROTTLE === 'true';
  const COOLDOWN_MS = 600;
  const BUDGET_MS = 900;
  const ROI = { widthPct: 0.7, heightPct: 0.35 };
  const AUTOSCAN_ENABLED = false;

  // Helper functions
  const detachVideo = (video: HTMLVideoElement | null) => {
    if (!video) return;
    try { video.pause(); } catch {}
    try { (video as any).srcObject = null; } catch {}
  };

  const stopAutoscan = () => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    inFlightRef.current = false;
    hitsRef.current = [];
  };

  const startAutoscan = () => {
    if (!AUTOSCAN_ENABLED) return;
    runningRef.current = true;
    hitsRef.current = [];
  };

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
      @keyframes pulseCorners { 
        0% { filter: drop-shadow(0 0 0 rgba(34,197,94,0.0)); } 
        100% { filter: drop-shadow(0 0 8px rgba(34,197,94,0.6)); } 
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Handle barcode capture from viewport
  const handleBarcodeCapture = useCallback(async (decoded: { code: string }) => {
    console.log('[SCANNER] Auto-capture detected:', decoded.code);
    setPhase('captured');
    setShowSuccess(true);
    
    try {
      const lookupResult = await handleOffLookup(decoded.code);
      if (lookupResult.hit && lookupResult.data?.ok && lookupResult.data.product) {
        SFX().play('scan_success');
        playBeep(); // legacy fallback
        onBarcodeDetected(decoded.code);
        onOpenChange(false);
      } else {
        setPhase('scanning');
        setShowSuccess(false);
      }
    } catch (error) {
      console.warn('Lookup failed:', error);
      setPhase('scanning');
      setShowSuccess(false);
    }
  }, [onBarcodeDetected, onOpenChange]);

  // Force capture for manual button
  const handleManualCapture = useCallback(() => {
    if ((window as any)._barcodeViewportForceCapture) {
      (window as any)._barcodeViewportForceCapture();
    }
  }, []);

  const viewportRef = useRef<any>(null);

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
    
    return () => {
      camOwnerUnmount(OWNER);
      camHardStop('unmount');
      cleanup();
    };
  }, [open]);

  useEffect(() => {
    if (open && stream) {
      // Update the stream reference for torch functionality
      if (videoRef.current) {
        updateStreamRef(stream);
      }
    }
  }, [open, stream, updateStreamRef]);

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

    if (stoppedKinds.length > 0) {
      logOwnerRelease('LogBarcodeScannerModal', stoppedKinds);
    }

    detachVideo(videoRef.current);

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
          <header className="row-start-1 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2 relative">
            <h2 className="text-white text-lg font-semibold text-center">Scan a barcode</h2>
            
            {/* Auto toggle chip */}
            {FF.FEATURE_AUTO_CAPTURE && (
              <AutoToggleChip className="absolute left-4 top-1/2 -translate-y-1/2" />
            )}
            
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="absolute right-4 text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
            
            {/* Torch Button */}
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
                {torchOn ? <Zap className="h-5 w-5 text-yellow-300" /> : <ZapOff className="h-5 w-5 text-white" />}
              </Button>
            )}
            
            {/* Status chip */}
            <div className="mt-2 flex h-[28px] items-center justify-center">
              <span className="px-2.5 py-1 rounded-full text-[11px] bg-emerald-400/12 text-emerald-300 border border-emerald-300/25">
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
          </header>

          {/* Centered Stage */}
          <main className="row-start-2 grid place-items-center px-4">
            <div className="-translate-y-[clamp(8px,3vh,28px)]">
              <BarcodeViewport
                videoRef={videoRef}
                trackRef={trackRef}
                onCapture={handleBarcodeCapture}
                currentZoom={currentZoom}
                useCSSZoom={useCSSZoom}
                onZoomToggle={handleZoomToggle}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerEnd={handlePointerEnd}
                onVideoClick={handleVideoClick}
              />
            </div>
          </main>

          {/* Footer / CTA */}
          <footer className="row-start-3 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+40px)]">
            <Button
              onClick={handleManualCapture}
              disabled={isDecoding || isLookingUp || !stream}
              className="w-full rounded-2xl py-4 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white font-medium h-14 disabled:opacity-60 transition-all duration-200"
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
                <span className="inline-flex items-center gap-2">📷 Scan & Log</span>
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