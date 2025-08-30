import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Camera, AlertCircle, FlashlightIcon, Zap, Lightbulb } from 'lucide-react';
import { MultiPassBarcodeScanner } from '@/utils/barcodeScan';
import { supabase } from '@/integrations/supabase/client';
import { useSnapAndDecode } from '@/lib/barcode/useSnapAndDecode';
import { scannerLiveCamEnabled } from '@/lib/platform';
import { openPhotoCapture } from '@/components/camera/photoCapture';
import { decodeBarcodeFromFile } from '@/lib/decodeFromImage';
import { logOwnerAcquire, logOwnerAttach, logOwnerRelease, logPerfOpen, logPerfClose, checkForLeaks } from '@/diagnostics/cameraInq';
import { camAcquire, camRelease, camHardStop, camOwnerMount, camOwnerUnmount } from '@/lib/camera/guardian';
import { attachStreamToVideo, detachVideo } from '@/lib/camera/videoAttach';
import { stopAllVideos } from '@/lib/camera/globalFailsafe';
import { devLog } from '@/lib/camera/devLog';

// Removed debug logging - mediaLog function removed

function torchOff(track?: MediaStreamTrack) {
  try { track?.applyConstraints?.({ advanced: [{ torch: false }] as any }); } catch {}
}

function hardDetachVideo(video?: HTMLVideoElement | null) {
  if (!video) return;
  try { video.pause(); } catch {}
  try { (video as any).srcObject = null; } catch {}
  try { video.removeAttribute('src'); video.load?.(); } catch {}
}

interface WebBarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  onClose: () => void;
  disabled?: boolean;
}

// PHASE 3: Stream/track forensics helper - gated
function tapStream(s: MediaStream, component: string) {
  devLog('FLOW][enter] ${component}', location.pathname + location.search);
  s.addEventListener?.('inactive', () => devLog('STREAM][inactive', { component }));
  for (const t of s.getTracks()) {
    t.addEventListener?.('ended', () => devLog('TRACK][ended', { kind: t.kind, component }));
    t.addEventListener?.('mute', () => devLog('TRACK][mute', { kind: t.kind, component }));
    t.addEventListener?.('unmute', () => devLog('TRACK][unmute', { kind: t.kind, component }));
  }
}

export const WebBarcodeScanner: React.FC<WebBarcodeScannerProps> = ({
  onBarcodeDetected,
  onClose,
  disabled = false
}) => {
  const startTimeRef = useRef<number>(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isFrozen, setIsFrozen] = useState(false);
  const [warmScanner, setWarmScanner] = useState<MultiPassBarcodeScanner | null>(null);
  const scanningIntervalRef = useRef<NodeJS.Timeout>();
  const { snapAndDecode, setTorch, isTorchSupported: torchSupported, torchEnabled } = useSnapAndDecode();

  const OWNER = 'barcode_scanner';
  
  // Mount thrash detection + once guards
  const mountSeqRef = useRef(0);
  const mountTimeRef = useRef(0);
  const onceMountedRef = useRef(false);
  const onceGumCalledRef = useRef(false);
  const onceGumOkRef = useRef(false);
  const onceVideoAttachRef = useRef(false);
  const onceVideoPlayRef = useRef(false);
  const probedRef = useRef(false);
  const probeTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Tuning constants  
  const QUICK_BUDGET_MS = 900;
  const ROI = { widthPct: 0.70, heightPct: 0.35 };
  const BURST_COUNT = 2;
  const BURST_DELAY_MS = 120;
  const ZOOM = 1.5;

  // Helper: prefer true stills, fallback to canvas frame
  const captureStillFromVideo = async (video: HTMLVideoElement): Promise<HTMLCanvasElement> => {
    const track = (video.srcObject as MediaStream)?.getVideoTracks?.()?.[0];
    const isBrowser = typeof window !== 'undefined';
    let bitmap: ImageBitmap | null = null;

    if (isBrowser && track && 'ImageCapture' in window) {
      try {
        const ic = new (window as any).ImageCapture(track);
        bitmap = await ic.grabFrame().catch(() => null);
      } catch { bitmap = null; }
    }

    const canvas = document.createElement('canvas');
    const vw = video.videoWidth || 1920;
    const vh = video.videoHeight || 1080;
    canvas.width = vw; 
    canvas.height = vh;
    const ctx = canvas.getContext('2d')!;
    if (bitmap) {
      ctx.drawImage(bitmap, 0, 0, vw, vh);
    } else {
      ctx.drawImage(video, 0, 0, vw, vh);
    }
    return canvas;
  };

  // Crop ROI in video pixel space (center 70% × 35% - tighter band)
  const cropReticleROI = (src: HTMLCanvasElement): HTMLCanvasElement => {
    const w = src.width, h = src.height;
    const roiW = Math.round(w * ROI.widthPct);
    const roiH = Math.round(h * ROI.heightPct);
    const x = Math.round((w - roiW) / 2);
    const y = Math.round((h - roiH) / 2);
    const out = document.createElement('canvas');
    out.width = roiW; 
    out.height = roiH;
    out.getContext('2d')!.drawImage(src, x, y, roiW, roiH, 0, 0, roiW, roiH);
    return out;
  };

  const handleAnalyzeNow = async () => {
    if (!videoRef.current) {
      devLog('LOG] Video ref not available');
      return;
    }

    // Rate-limited timing log
    const lastAnalyze = (window as any).__lastAnalyzeLog || 0;
    if (Date.now() - lastAnalyze > 1000) {
      devLog('LOG] analyze_total start');
      (window as any).__lastAnalyzeLog = Date.now();
    }
    
    setIsScanning(true);
    setIsFrozen(true);
    
    try {
      const video = videoRef.current;
      
      // Ensure video is ready before processing
      if (!video.videoWidth || !video.videoHeight) {
        await new Promise<void>((resolve) => {
          const handler = () => {
            video.removeEventListener('loadedmetadata', handler);
            resolve();
          };
          video.addEventListener('loadedmetadata', handler, { once: true });
        });
      }
      
      // Apply zoom constraint before capture (NO auto-torch!)
      if (stream) {
        const track = stream.getVideoTracks()[0];
        if (track) {
          try {
            await track.applyConstraints({ 
              advanced: [{ zoom: ZOOM } as any] 
            });
            devLog('LOG] zoom applied:', ZOOM);
          } catch (zoomError) {
            devLog('LOG] zoom not supported:', zoomError);
          }
        }
      }

      // Use shared hook
      const result = await snapAndDecode({
        videoEl: video,
        budgetMs: QUICK_BUDGET_MS,
        roi: { wPct: ROI.widthPct, hPct: ROI.heightPct },
        logPrefix: '[LOG]'
      });

      // Return early on any 8/12/13/14-digit hit
      if (result.ok && result.raw && /^\d{8,14}$/.test(result.raw)) {
        devLog('LOG] off_fetch_start', { code: result.raw });
        
        // Optional: Add toast for PWA testing
        if (window.location.search.includes('debug=toast')) {
          const { toast } = await import('sonner');
          toast.info(`[LOG] off_fetch_start: ${result.raw}`);
        }
        onBarcodeDetected(result.raw);
        // Don't call cleanup here - parent handles it
        onClose();
        return;
      }

      // 2) Burst fallback (parallel capture and race)
      devLog('LOG] burst_start');
      const burstPromises = Array.from({ length: BURST_COUNT }).map(async (_, i) => {
        await new Promise(r => setTimeout(r, BURST_DELAY_MS * (i + 1)));
        return await snapAndDecode({
          videoEl: video,
          budgetMs: QUICK_BUDGET_MS,
          roi: { wPct: ROI.widthPct, hPct: ROI.heightPct },
          logPrefix: '[LOG]'
        });
      });

      const winner = await Promise.race(burstPromises);
      if (winner.ok && winner.raw && /^\d{8,14}$/.test(winner.raw)) {
        devLog('LOG] off_fetch_start', { code: winner.raw });
        onBarcodeDetected(winner.raw);
        // Don't call cleanup here - parent handles it  
        onClose();
        return;
      }

      // 3) No barcode found
      devLog('LOG] no_barcode_found');
      setError('No barcode detected. Please try again with better lighting.');
      
    } catch (error) {
      devLog('LOG] Scan error:', error);
      setError('Failed to scan barcode. Please try again.');
    } finally {
      // CRITICAL: Always cleanup to prevent hangs
      setIsScanning(false);
      setIsFrozen(false);
    }
  };

  const handleFlashlightToggle = async () => {
    if (!stream) return;
    
    const newTorchState = !torchEnabled;
    await setTorch(newTorchState);
  };

  const releaseNow = useCallback(() => {
    // release BEFORE any navigation/unmount
    detachVideo(videoRef.current);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    
    camOwnerUnmount(OWNER);
    camRelease(OWNER);
    logOwnerRelease('WebBarcodeScanner', ['video']);
    
    if (scanningIntervalRef.current) {
      clearInterval(scanningIntervalRef.current);
    }
    
    streamRef.current = null;
    setIsScanning(false);
    setStream(null);
  }, []);

  const handleClose = useCallback(() => {
    // Parent handles cleanup now - just call onClose
    onClose();
  }, [onClose]);

  // Warm-up the decoder on modal open  
  const warmUpDecoder = async () => {
    try {
      const scanner = new MultiPassBarcodeScanner();
      
      // Run a no-op decode on a tiny blank canvas to JIT/warm caches
      const warmCanvas = document.createElement('canvas');
      warmCanvas.width = 100;
      warmCanvas.height = 50;
      const ctx = warmCanvas.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 100, 50);
      
      // Warm decode (will fail but initializes reader)
      await scanner.scanQuick(warmCanvas, { enabled: true }).catch(() => null);
      setWarmScanner(scanner);
      devLog('WARM] Decoder warmed up');
    } catch (error) {
      devLog('WARM] Decoder warm-up failed:', error);
    }
  };

  useLayoutEffect(() => {
    // Phase 1 instrumentation - behind ?camInq=1
    const isInquiry = window.location.search.includes('camInq=1');
    mountSeqRef.current++;
    mountTimeRef.current = Date.now();
    
    // Once-only mount logs
    if (!onceMountedRef.current) {
      onceMountedRef.current = true;
      devLog('SCAN][MOUNT_SEQ', mountSeqRef.current);
      
      // Dump on mount (once)
      const dumpOnMount = (window as any).__camDump?.() || 'no dump available';
      devLog('SCAN][DUMP] on mount', dumpOnMount);
    }
    
    logPerfOpen('WebBarcodeScanner');
    logOwnerAcquire('WebBarcodeScanner');
    camOwnerMount(OWNER);
    startCamera();
    warmUpDecoder();
    return () => {
      const unmountTime = Date.now();
      const mountDuration = unmountTime - mountTimeRef.current;
      const isThrash = mountDuration < 300;
      
      devLog('SCAN][UNMOUNT', { seq: mountSeqRef.current, duration: mountDuration, thrash: isThrash });
      
      // Dump on unmount
      const dumpOnUnmount = (window as any).__camDump?.() || 'no dump available';
      devLog('SCAN][DUMP] on unmount', dumpOnUnmount);
      
      devLog('CAMERA] cleanup', { OWNER });
      // Parent owns cleanup - only cleanup if this is a final close, not view toggle
      logPerfClose('WebBarcodeScanner', startTimeRef.current);
      checkForLeaks('WebBarcodeScanner');
    };
  }, [releaseNow]);

  const startCamera = async () => {
    if (disabled) {
      devLog('SCAN][DISABLED', 'Scanner disabled by prop');
      return null;
    }
    
    if (streamRef.current) return streamRef.current;
    
    try {
      devLog('VIDEO INIT] videoRef =', videoRef.current);
      if (!videoRef.current) {
        devLog('VIDEO] videoRef is null — video element not mounted');
        return;
      }

      // Use ideal constraints with robust fallback
      const getCamera = async () => {
        // Feature flags
        const scannerVideoFix = (window as any).__scannerVideoFix === true; // Default OFF
        
        const baseConstraints = { 
          facingMode: { ideal: 'environment' }, 
          width: { ideal: 1280 }, 
          height: { ideal: 720 }
        };
        
        const primary = { 
          video: scannerVideoFix ? 
            { ...baseConstraints, frameRate: { ideal: 24, max: 30 } } : 
            baseConstraints
        };
        const fallback = { video: true };
        
        // Once-only GUM logs
        if (!onceGumCalledRef.current) {
          onceGumCalledRef.current = true;
          devLog('SCAN][GUM][CALL', { constraints: primary });
          // Dump before acquire
          const dumpBefore = (window as any).__camDump?.() || 'no dump available';
          devLog('SCAN][DUMP] before acquire', dumpBefore);
        }
        
        try { 
          const stream = await camAcquire(OWNER, primary);
          
          if (!onceGumOkRef.current) {
            onceGumOkRef.current = true;
            const streamId = (stream as any).__camInqId || stream.id || 'unknown';
            const tracks = stream.getTracks().map(t => ({ kind: t.kind, label: t.label, readyState: t.readyState }));
            devLog('SCAN][GUM][OK', { id: streamId, trackCount: tracks.length });
          }
          
          return stream;
        } catch (e: any) {
          devLog('CAM] primary failed', e?.name);
          
          devLog('SCAN][GUM][CALL', { constraints: fallback, reason: 'primary_failed' });
          
          const stream = await camAcquire(OWNER, fallback);
          
          if (!onceGumOkRef.current) {
            onceGumOkRef.current = true;
            const streamId = (stream as any).__camInqId || stream.id || 'unknown';
            const tracks = stream.getTracks().map(t => ({ kind: t.kind, label: t.label, readyState: t.readyState }));
            devLog('SCAN][GUM][OK', { id: streamId, trackCount: tracks.length, fallback: true });
          }
          
          return stream;
        }
      };
      
      const mediaStream = await getCamera();
      streamRef.current = mediaStream;
      
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Once-only attach logs
        if (!onceVideoAttachRef.current) {
          onceVideoAttachRef.current = true;
          devLog('SCAN][VIDEO][ATTACH', { 
            hasSrc: !!video.srcObject, 
            playsInline: (video as any).playsInline, 
            muted: video.muted, 
            autoplay: video.autoplay 
          });
        }
        
        try {
          await attachStreamToVideo(video, mediaStream);
          
          if (!onceVideoPlayRef.current) {
            onceVideoPlayRef.current = true;
            devLog('SCAN][VIDEO][PLAY][OK');
            
            // Readiness probe - exactly 5 times @ 100ms, then stop
            if (!probedRef.current) {
              probedRef.current = true;
              let probeCount = 0;
              const probeReady = () => {
                if (probeCount < 5) {
                  devLog('SCAN][VIDEO][READY', { 
                    readyState: video.readyState, 
                    w: video.videoWidth, 
                    h: video.videoHeight 
                  });
                  probeCount++;
                  const timeoutId = setTimeout(probeReady, 100);
                  probeTimeoutsRef.current.push(timeoutId);
                }
              };
              probeReady();
              
              // Dump after attach to show live tracks (once)
              const dumpAfter = (window as any).__camDump?.() || 'no dump available';
              devLog('SCAN][DUMP] after attach', dumpAfter);
            }
          }
          
          devLog('CAMERA] Video attached and playing');
        } catch (playError) {
          devLog('SCAN][VIDEO][PLAY][ERR', { err: playError });
          throw playError;
        }
        
        // Camera inquiry logging
        const streamId = (mediaStream as any).__camInqId || 'unknown';
        logOwnerAttach('WebBarcodeScanner', streamId);
        
        setStream(mediaStream);
        setIsScanning(true);
      } else {
        devLog('CAMERA] videoRef.current is null');
      }
      
      return mediaStream;
    } catch (err: any) {
      devLog('SCANNER] Live video denied, using photo fallback', err?.name || err);
      try {
        const file = await openPhotoCapture('image/*','environment');
        const val = await decodeBarcodeFromFile(file);
        if (val) onBarcodeDetected(val);
        // Don't call cleanup here - parent handles it
        onClose();
        return null;
      } catch (fallbackErr) {
        devLog('CAMERA FAIL] Both live and photo capture failed:', err, fallbackErr);
        setError('Unable to access camera. Please check permissions and try again.');
      }
    }
  };

  // Remove unmount guard - parent handles cleanup
  // useEffect(() => () => releaseNow(), [releaseNow]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
        <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
        <p className="text-red-600 dark:text-red-400 text-center mb-4">
          {error}
        </p>
        <Button
          variant="outline"
          onClick={handleClose}
          className="border-red-300 text-red-600"
        >
          Close Scanner
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-64 object-cover transition-opacity duration-300 ${isFrozen ? 'opacity-50' : 'opacity-100'}`}
        />
        <canvas
          ref={canvasRef}
          className="hidden"
        />
        
        {/* Freeze flash effect */}
        {isFrozen && (
          <div className="absolute inset-0 bg-white animate-pulse opacity-20 pointer-events-none"></div>
        )}
        
        {/* Scanning overlay */}
        <div className="absolute inset-0 flex items-start justify-center pt-12">
          <div className="w-56 h-36 border-2 border-emerald-400 rounded-lg relative">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
            
            <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-red-500 transform -translate-y-1/2 animate-pulse" />
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          {/* Main Action Row */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleAnalyzeNow}
              disabled={isScanning}
              className="flex-1 h-12 rounded-2xl text-lg font-semibold bg-emerald-600 text-white shadow-lg active:scale-[.99] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Zap className={`w-5 h-5 ${isScanning ? 'animate-spin' : 'animate-pulse'}`} />
              {isFrozen ? 'ANALYZING...' : 'SNAP & DECODE'}
            </button>
            
            {/* Flashlight Toggle */}
            {stream && torchSupported && (
              <button
                onClick={handleFlashlightToggle}
                disabled={isScanning}
                className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg active:scale-[.99] disabled:opacity-50 transition-all duration-200 ${
                  torchEnabled 
                    ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-400/50' 
                    : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                }`}
                title={`Turn flashlight ${torchEnabled ? 'off' : 'on'}`}
              >
                <Lightbulb className={`w-5 h-5 ${torchEnabled ? 'text-yellow-300' : 'text-zinc-300'}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        <p>Align the barcode within the frame and tap "Snap & Decode"</p>
        <p className="text-xs mt-1">Instant barcode detection with 1-second analysis</p>
      </div>

      <Button
        variant="outline"
        onClick={handleClose}
        className="w-full"
      >
        <X className="h-4 w-4 mr-2" />
        Cancel Scanning
      </Button>
    </div>
  );
};