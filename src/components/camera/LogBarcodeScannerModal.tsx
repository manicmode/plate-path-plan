import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { stopMedia } from './stopMedia';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Zap, ZapOff, X, Pause, Play } from 'lucide-react';
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
import BarcodeViewport from '@/components/scanner/BarcodeViewport';
import { FF } from '@/featureFlags';
import { cameraPool } from '@/lib/camera/cameraPool';
import { useLocation } from 'react-router-dom';
import { ScanGuard } from '@/types/scan';

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
  blockCamera?: boolean;
}

export const LogBarcodeScannerModal: React.FC<LogBarcodeScannerModalProps> = ({
  open,
  onOpenChange,
  onBarcodeDetected,
  onManualEntry,
  blockCamera = false
}) => {
  // SSR guard - don't render on server
  if (typeof window === 'undefined') return null;
  // Don't mount internals when closed - MUST be before any hooks
  if (!open) return null;

  // Scanner mode state
  const [mode, setMode] = useState<'auto' | 'tap'>('auto');
  
  // Lifecycle-driven active state 
  const [documentVisible, setDocumentVisible] = useState(() => 
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );
  
  // Active flag computation - drives camera lifecycle
  const active = open && documentVisible; // Camera should be active in both modes
  
  // Generation token system to prevent late async resumes
  const scanGenRef = useRef(0); // bump to invalidate all pending async work
  const activeScanRef = useRef(false); // single source of truth for active state
  const isDecodingRef = useRef(false);
  
  // Lifecycle refs for proper cleanup
  const isActiveRef = useRef(false);
  const decodeAbortRef = useRef<AbortController | null>(null);
  
  // Unified cleanup refs
  const cleanedRef = useRef(false);
  const isMountedRef = useRef(false);
  
  // Compute desired scanning state from props
  const computeActiveScan = useCallback(() => {
    return open && documentVisible;
  }, [open, documentVisible]);
  
  console.log('[SCANNER][MOUNT]', { mode, active });
  const startTimeRef = useRef<number>(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const scanActiveRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const unregisterFromPoolRef = useRef<(() => void) | null>(null);
  const sessionIdRef = useRef(0); // late-resolve guard
  const tearingDownRef = useRef(false);
  const imageCaptureRef = useRef<any>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const allTracksRef = useRef<Set<MediaStreamTrack>>(new Set());
  
  const location = useLocation();
  
  const [isDecoding, setIsDecoding] = useState(false);
  const [phase, setPhase] = useState<ScanPhase>('scanning');
  
  // Red pill visibility - only in Auto mode when actively scanning
  const pillVisible = active && mode === 'auto';
  
  // Overlay visibility management
  const [overlayVisible, setOverlayVisible] = useState(false);
  useEffect(() => {
    if (phase !== 'scanning') {
      setOverlayVisible(true);
    } else {
      const t = setTimeout(() => setOverlayVisible(false), 160);
      return () => clearTimeout(t);
    }
  }, [phase]);
  const [error, setError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lastAttempt, setLastAttempt] = useState(0);
  const [showSlowHint, setShowSlowHint] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Reset scan state function (defined after state variables)
  const resetScan = useCallback(() => {
    setPhase('scanning');
    setOverlayVisible(false);
    setShowSuccess(false);
    setError(null);
    console.log('[SCANNER][RESET_SCAN]');
  }, []);
  
  // Reset scan state on route changes
  useEffect(() => {
    return () => resetScan();
  }, [location.pathname, resetScan]);

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
  
  // Scan loop guard and RAF cancel
  const scanRunningRef = useRef(false);

  // Create scan guard
  const createScanGuard = useCallback((): ScanGuard => ({
    gen: scanGenRef.current,
    signal: decodeAbortRef.current?.signal ?? new AbortController().signal,
    isOpen: () => open && document.visibilityState === 'visible'
  }), [open]);

  const { snapAndDecode, updateStreamRef } = useSnapAndDecode(
    createScanGuard(),
    (stream) => setStream(stream)
  );
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

  function clearTimers() {
    if (rafIdRef.current) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
    timeoutsRef.current.forEach(id => { try { clearTimeout(id); } catch {} });
    timeoutsRef.current = [];
  }

  function stopTracks() {
    const s = (videoRef.current?.srcObject as MediaStream) || stream || null;
    if (s) {
      try { s.getTracks().forEach(t => t.stop()); } catch {}
    }
    trackRef.current = null;
    if (videoRef.current) {
      try { videoRef.current.pause(); } catch {}
      videoRef.current.srcObject = null;
    }
    unregisterFromPoolRef.current?.();
    unregisterFromPoolRef.current = null;
  }

  function scanLoop() {
    if (!scanActiveRef.current || abortRef.current?.signal.aborted) return;
    // ... do a decode pass here ...
    if (!scanActiveRef.current || abortRef.current?.signal.aborted) return;
    rafIdRef.current = requestAnimationFrame(scanLoop);
  }

  const stopAutoscan = () => {
    runningRef.current = false;
    scanActiveRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (rafIdRef.current) { 
      cancelAnimationFrame(rafIdRef.current); 
      rafIdRef.current = null; 
    }
    abortRef.current?.abort();
    inFlightRef.current = false;
    hitsRef.current = [];
  };

  const startAutoscan = () => {
    if (!AUTOSCAN_ENABLED) return;
    runningRef.current = true;
    scanActiveRef.current = true;
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

  // If you auto-capture on successful decode, stop the loop *before* opening confirm
  const onAutoCapture = useCallback((code: string) => {
    scanActiveRef.current = false;           // stop RAF/decoder immediately
    sessionIdRef.current++;         // invalidate any in-flight startCamera
    abortRef.current?.abort();
    // now call upstream to open confirm; cleanup effect will stop tracks
    onBarcodeDetected(code);
  }, [onBarcodeDetected]);

  // Handle barcode capture from viewport - only in Auto mode
  const handleBarcodeCapture = useCallback(async (decoded: { code: string }) => {
    // Only allow auto-capture in Auto mode
    if (mode !== 'auto') return;
    
    console.log('[SCANNER] Auto-capture detected:', decoded.code);
    setPhase('captured');
    setShowSuccess(true);
    
    try {
      const lookupResult = await handleOffLookup(decoded.code);
      if (lookupResult.hit && lookupResult.data?.ok && lookupResult.data.product) {
        const ok = await SFX().play('scan_success');
        if (!ok) {
          const { FEATURE_SFX_DEBUG } = await import('@/lib/sound/debug');
          const { Sound } = await import('@/lib/sound/soundManager');
          await Sound.ensureUnlocked();
          Sound.play('beep');
          if (FEATURE_SFX_DEBUG) {
            console.log('[SFX][FALLBACK][BEEP]', { key: 'scan_success' });
          }
        }
        onAutoCapture(decoded.code);
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
  }, [mode, onAutoCapture, onOpenChange]);

  // Force capture for manual button
  const handleManualCapture = useCallback(() => {
    if ((window as any)._barcodeViewportForceCapture) {
      (window as any)._barcodeViewportForceCapture();
    }
  }, []);

  const viewportRef = useRef<any>(null);
  
  // Document visibility handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      setDocumentVisible(document.visibilityState === 'visible');
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Generation token lifecycle management
  useEffect(() => {
    const desired = computeActiveScan();

    if (desired) {
      // start session
      activeScanRef.current = true;
      const myGen = ++scanGenRef.current; // new session
      
      // Create new AbortController for this session
      if (decodeAbortRef.current) {
        decodeAbortRef.current.abort();
      }
      decodeAbortRef.current = new AbortController();
      
      console.log('[SCANNER][START]', { gen: myGen });
      startCameraAndLoop(myGen);
      return () => {
        // close session early before actual teardown to kill late async
        activeScanRef.current = false;
        ++scanGenRef.current; // invalidate any pending work
        if (decodeAbortRef.current) {
          decodeAbortRef.current.abort();
        }
        shutdownCamera('effect-cleanup');
      };
    } else {
      // ensure off
      activeScanRef.current = false;
      ++scanGenRef.current; // invalidate any pending work
      if (decodeAbortRef.current) {
        decodeAbortRef.current.abort();
      }
      shutdownCamera('inactive');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentVisible]);

  // Visibility guards that immediately shutdown if hidden
   useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') {
        activeScanRef.current = false;
        ++scanGenRef.current;
        if (decodeAbortRef.current) {
          decodeAbortRef.current.abort();
        }
        shutdownCamera('hidden');
      }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onVis);
    };
  }, []);

  useEffect(() => {
    if (open && stream) {
      // Update the stream reference for torch functionality
      if (videoRef.current) {
        updateStreamRef(stream);
      }
    }
  }, [open, stream, updateStreamRef]);

  // Hardened getUserMedia with lifecycle checks
  const getUserMediaSafely = useCallback(async (): Promise<MediaStream> => {
    const controller = decodeAbortRef.current;
    
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
        width: { ideal: 640 }, 
        height: { ideal: 480 } 
      } 
    };
    const basic = { video: true };
    
    let stream: MediaStream;
    try { 
      stream = await navigator.mediaDevices.getUserMedia(primary); 
    } catch (e: any) {
      console.warn('[CAM] high-res failed, trying fallback', e?.name);
      try {
        stream = await navigator.mediaDevices.getUserMedia(fallback);
      } catch (e2: any) {
        console.warn('[CAM] fallback failed, trying basic', e2?.name);
        stream = await navigator.mediaDevices.getUserMedia(basic);
      }
    }
    
    // Check if we became inactive while permission was open
    if (!isActiveRef.current || controller?.signal.aborted) {
      stream.getTracks().forEach(t => t.stop());
      throw new Error('cancelled: inactive');
    }
    
    return stream;
  }, []);

  // Guarded camera start with generation token
  const startCameraAndLoop = useCallback(async (myGen: number) => {
    // prevent double start
    if (!activeScanRef.current || scanGenRef.current !== myGen) return;

    try {
      console.log("[LOG] Starting guarded camera...", { gen: myGen });
      
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
        onOpenChange(false);
        return;
      }

      const mediaStream = await getCameraStreamSafely(myGen);
      if (!mediaStream) return;
      
      if (!videoRef.current || !activeScanRef.current || scanGenRef.current !== myGen) {
        // modal closed while awaiting stream; stop it immediately
        try { mediaStream.getTracks().forEach(t => t.stop()); } catch {}
        return;
      }
      
      // Track every track for guaranteed cleanup
      mediaStream.getTracks().forEach(track => {
        allTracksRef.current.add(track);
        track.onended = () => allTracksRef.current.delete(track);
      });
      
      // Register with camera pool using generation
      cameraPool.add(mediaStream, scanGenRef.current);
      
      await attachStreamToVideo(videoRef.current, mediaStream);
      
      const track = mediaStream.getVideoTracks()[0];
      trackRef.current = track;
      setStream(mediaStream);
      
      // Final check before starting decode loop
      if (!activeScanRef.current || scanGenRef.current !== myGen) {
        mediaStream.getTracks().forEach(t => t.stop());
        return;
      }
      
      // Start decode loop
      isDecodingRef.current = true;
      loopDecode(myGen);
      
      // Initialize zoom and torch
      updateStreamRef(mediaStream);
      setTimeout(() => ensureTorchState(), 100);
      
      setError(null);
      console.log('[CAMERA][STARTED]', { gen: myGen, active: activeScanRef.current });
    } catch (err: any) {
      console.warn('[SCANNER] Camera start failed:', err?.message || err);
      if (err.message !== 'cancelled: inactive') {
        setError('Unable to access camera. Please check permissions and try again.');
      }
    }
  }, [onBarcodeDetected, onOpenChange, updateStreamRef, ensureTorchState]);

  // Guarded getUserMedia with generation check
  const getCameraStreamSafely = useCallback(async (myGen: number): Promise<MediaStream | null> => {
    try {
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
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        } 
      };
      const basic = { video: true };
      
      let stream: MediaStream;
      try { 
        stream = await navigator.mediaDevices.getUserMedia(primary); 
      } catch (e: any) {
        console.warn('[CAM] high-res failed, trying fallback', e?.name);
        try {
          stream = await navigator.mediaDevices.getUserMedia(fallback);
        } catch (e2: any) {
          console.warn('[CAM] fallback failed, trying basic', e2?.name);
          stream = await navigator.mediaDevices.getUserMedia(basic);
        }
      }
      
      if (!activeScanRef.current || scanGenRef.current !== myGen) {
        try { stream.getTracks().forEach(t => t.stop()); } catch {}
        return null;
      }
      return stream;
    } catch {
      return null;
    }
  }, []);

  // Guarded decode loop
  const loopDecode = useCallback((myGen: number) => {
    if (!activeScanRef.current || scanGenRef.current !== myGen || !videoRef.current) return;

    // Simple decode pass - actual implementation would call decode functions
    rafIdRef.current = requestAnimationFrame(() => loopDecode(myGen));
  }, []);

  // Shutdown camera with proper cleanup
  const shutdownCamera = useCallback((reason: string) => {
    // stop loop first so no further work runs
    isDecodingRef.current = false;
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    
    const v = videoRef.current;
    const s = (v?.srcObject as MediaStream) || null;
    
    // Stop all streams by current generation
    const currentGen = scanGenRef.current;
    cameraPool.stopByGen(currentGen, reason);
    cameraPool.stopAll(`fallback-${reason}`);

    const count = s?.getTracks()?.length ?? 0;

    if (s) {
      try { s.getTracks().forEach(t => t.stop()); } catch {}
    }
    allTracksRef.current.forEach(t => { try { t.stop(); } catch {} });
    allTracksRef.current.clear();
    
    if (v) {
      try { v.pause(); } catch {}
      v.srcObject = null;
    }
    
    trackRef.current = null;
    setStream(null);
    
    console.log('[CAMERA][TEARDOWN:COMPLETE]', { videos: v ? 1 : 0, tracksStopped: count, reason });
  }, []);

  // Ref to force disable auto capture in viewport
  const forceDisableAutoRef = useRef<() => void>(() => {});
  
  const cleanup = async () => {
    if (tearingDownRef.current) return;
    tearingDownRef.current = true;
    
    console.log('[CAMERA][CLEANUP_START]', { tracked: allTracksRef.current.size, raf: !!rafIdRef.current });

    scanActiveRef.current = false;
    abortRef.current?.abort();

    // Cancel decoders FIRST
    imageCaptureRef.current = null;
    try { barcodeDetectorRef.current?.disconnect?.(); } catch {}
    barcodeDetectorRef.current = null;

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    // Reset torch/zoom (WebKit latch)
    const resets: Promise<void>[] = [];
    allTracksRef.current.forEach(track => {
      if (track.readyState === 'live') {
        resets.push(track.applyConstraints({ advanced: [{ torch: false, zoom: 1 } as any] }).catch(() => {}));
      }
    });

    const tracksToStop = new Set<MediaStreamTrack>();
    const s = (videoRef.current?.srcObject as MediaStream) || null;
    if (s) s.getTracks().forEach(t => tracksToStop.add(t));
    allTracksRef.current.forEach(t => tracksToStop.add(t));

    Promise.all(resets).finally(() => {
      tracksToStop.forEach(track => {
        console.log('[TRACK][STOPPING]', { id: track.id, state: track.readyState });
        try { track.stop(); } catch {}
        allTracksRef.current.delete(track);
      });
      if (videoRef.current) {
        try { videoRef.current.pause(); } catch {}
        videoRef.current.srcObject = null;
        try { videoRef.current.load(); } catch {}
      }
      unregisterFromPoolRef.current?.();
      unregisterFromPoolRef.current = null;
      cameraPool.stopAll('[MODAL_CLEANUP]');
      console.log('[CAMERA][TEARDOWN:COMPLETE]', { stopped: tracksToStop.size, remaining: allTracksRef.current.size });
    });

    try { updateStreamRef?.(null); } catch {}

    stopAutoscan();
    trackRef.current = null;
    setStream(null);
    setIsDecoding(false);
    setPhase('scanning');
    setIsLookingUp(false);
    tearingDownRef.current = false;
    resetScan();
  };
  
  // Unified cleanup function (idempotent) - defined after cleanup function
  const doCleanup = useCallback((reason: string) => {
    if (cleanedRef.current) return;
    cleanedRef.current = true;
    console.log('[SCANNER][CLOSE]', { reason });
    
    // Immediately disable auto capture to prevent camera restart
    forceDisableAutoRef.current?.();
    
    // 1) Stop scan loops, decoders, tracks
    cleanup();
    
    // 2) Red pill & scan state hard reset
    resetScan();
  }, [resetScan]);
  
  // Canonical close: ensures open=false and cleanup()
  const requestClose = useCallback((reason: string) => {
    doCleanup(reason);
    onOpenChange?.(false);
  }, [doCleanup, onOpenChange]);
  
  // Safety nets: any way the modal stops being "open" runs cleanup once
  useEffect(() => { 
    if (!open) doCleanup('open=false'); 
  }, [open, doCleanup]);
  
  // Mount/unmount tracking
  useEffect(() => { 
    isMountedRef.current = true; 
    return () => { 
      isMountedRef.current = false; 
      doCleanup('unmount');
    }; 
  }, [doCleanup]);
  
  // Camera lifecycle management
  useLayoutEffect(() => {
    if (open && !blockCamera) {
      logPerfOpen('LogBarcodeScannerModal');
      logOwnerAcquire('LogBarcodeScannerModal');
      camOwnerMount(OWNER);
      cleanedRef.current = false;
      // Camera lifecycle now handled by the active flag in useEffect
    } else {
      camOwnerUnmount(OWNER);
      camHardStop('modal_close');
      doCleanup('modal_close');
      logPerfClose('LogBarcodeScannerModal', startTimeRef.current);
      checkForLeaks('LogBarcodeScannerModal');
    }
    
    return () => {
      camOwnerUnmount(OWNER);
      camHardStop('unmount');
      doCleanup('unmount');
    };
  }, [open, blockCamera, doCleanup]);

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
        
        // NEW: direct fallback to our proxy on stub error
        try {
          const r = await fetch(`/api/off-proxy/${barcode}`);
          const j = await r.json().catch(() => null);
          if (j?.success && (j.images?.length || j.nutrition)) {
            console.log('[LOG][OFF_PROXY] fallback success', { barcode });
            // Close modal and let parent handle the result
            setIsLookingUp(false);
            onOpenChange(false);
            
            // Notify parent with the barcode string so it can handle the fallback
            setTimeout(() => {
              onBarcodeDetected(barcode);
            }, 100);
            return;
          }
        } catch (e) {
          console.log('[LOG][OFF_PROXY] fallback failed', e);
        }
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
      
      const result = await snapAndDecode(
        video,
        '[TAP]',
        createScanGuard()
      );

      // If decoded digits, try OFF lookup
      if (result && result.value && /^\d{8,14}$/.test(result.value)) {
        const lookupResult = await handleOffLookup(result.value);
        
        if (lookupResult.hit && lookupResult.data?.ok && lookupResult.data.product) {
          SFX().play('scan_success');
          playBeep();
          setShowSuccess(true);
          
          // Haptic feedback
          if ('vibrate' in navigator) {
            navigator.vibrate(50);
          }
          
          console.log('[BARCODE][SCAN:DETECTED]', { raw: result.value, format: 'tap-capture' });
          onBarcodeDetected(result.value);
          requestClose('successful_scan');
        } else if (lookupResult.data && !lookupResult.data.ok) {
          const reason = lookupResult.data.reason || 'unknown';
          const msg = reason === 'off_miss' && /^\d{8}$/.test(result.value)
            ? 'This 8-digit code is not in OpenFoodFacts. Try another side or enter manually.'
            : 'No product match. Try again or enter manually.';
          toast(msg);
        } else {
          toast.error('Lookup error. Please try again.');
        }
      } else {
        toast('Move closer / try again.');
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

  // Cleanup on unmount
  useEffect(() => () => { 
    stopMedia(videoRef.current); 
    console.log('[SCANNER][UNMOUNT]'); 
  }, []);

  // Event handlers
  const onEscapeKeyDown = useCallback(() => requestClose('escape'), [requestClose]);
  const onPointerDownOutside = useCallback(() => requestClose('outside'), [requestClose]);
  
  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) {
        // Force cleanup when dialog is closed
        console.log('[SCANNER] Dialog onOpenChange: closing, forcing cleanup');
        doCleanup('dialog_close');
        camHardStop('dialog_close');
        onOpenChange(false);
      }
    }}>
      <DialogContent 
        className="w-screen h-screen max-w-none max-h-none p-0 m-0 bg-black border-0 rounded-none [&>button]:hidden fixed inset-0 translate-x-0 translate-y-0 flex flex-col"
        onEscapeKeyDown={onEscapeKeyDown}
        onPointerDownOutside={onPointerDownOutside}
      >
        <DialogTitle><VisuallyHidden>Barcode Scanner</VisuallyHidden></DialogTitle>
        <DialogDescription><VisuallyHidden>Point your camera at a barcode</VisuallyHidden></DialogDescription>
        
        {/* Top Header - Title, Status, and Mode Toggle */}
        <header className="flex-none px-4 pt-[max(env(safe-area-inset-top),12px)] pb-4 text-center relative z-[120]">
          <h2 className="text-white text-lg font-semibold mb-2">Scan a barcode</h2>
          
          {/* Status chip */}
          <div className="flex justify-center mb-4" aria-live="polite">
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
              ) : mode === 'auto' ? (
                <>● Scanning active</>
              ) : (
                <>● Tap to scan</>
              )}
            </span>
          </div>

          {/* Mode Toggle */}
          <div className="flex justify-center">
            <div className="flex bg-white/10 rounded-full p-1">
              <button
                onClick={() => setMode('auto')}
                className={cn(
                  "px-4 py-2 text-sm rounded-full transition-all",
                  mode === 'auto'
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                    : "text-white/80 hover:text-white"
                )}
                aria-pressed={mode === 'auto'}
              >
                Auto
              </button>
              <button
                onClick={() => setMode('tap')}
                className={cn(
                  "px-4 py-2 text-sm rounded-full transition-all",
                  mode === 'tap'
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                    : "text-white/80 hover:text-white"
                )}
                aria-pressed={mode === 'tap'}
              >
                Tap
              </button>
            </div>
          </div>
          
          {/* Top-right controls */}
          <div className="absolute right-4 top-[max(env(safe-area-inset-top),12px)] flex gap-2">
            {/* Torch Button */}
            {supportsTorch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTorch}
                className={`text-white hover:bg-white/20 transition-colors duration-200 ${
                  torchOn ? 'bg-yellow-500/30 text-yellow-300' : ''
                }`}
                title={`Turn flash ${torchOn ? 'off' : 'on'}`}
              >
                {torchOn ? <Zap className="h-5 w-5 text-yellow-300" /> : <ZapOff className="h-5 w-5 text-white" />}
              </Button>
            )}
            
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                console.log('[SCANNER] Close button clicked, forcing cleanup');
                doCleanup('header_exit');
                camHardStop('header_exit');
                requestClose('header_exit');
              }}
              className="text-white hover:bg-white/20"
              aria-label="Close scanner"
              data-role="scanner-exit"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </header>

        {/* Camera Stage */}
        <main className="flex-1 flex items-center justify-center px-4">
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
            mode={mode}
            forceDisableAutoRef={forceDisableAutoRef}
          />
        </main>

        {/* Footer / CTA */}
        <footer className="flex-none px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+40px)]">
          {/* Only show Scan & Log button in Tap mode */}
          {mode === 'tap' && (
            <Button
              onClick={handleSnapAndDecode}
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
          )}
          
          <div className={cn("text-center", mode === 'tap' && "mt-3")}>
            <button
              onClick={onManualEntry}
              className="text-white/80 hover:text-white underline underline-offset-2 transition-colors duration-200"
            >
              Enter manually instead
            </button>
          </div>
        </footer>

        {/* Red Pill Overlay - only visible when actively scanning in Auto mode */}
        <ScanOverlay show={pillVisible} />

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
                onClick={() => startCameraAndLoop(++scanGenRef.current)}
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                Retry Camera Access
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};