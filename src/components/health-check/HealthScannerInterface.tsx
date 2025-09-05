import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Keyboard, Target, Zap, X, Search, Mic, Lightbulb, ArrowLeft, FlashlightIcon, SwitchCamera, ZapOff, Check } from 'lucide-react';
import { camAcquire, camRelease, camHardStop, camOwnerMount, camOwnerUnmount } from '@/lib/camera/guardian';
import { attachStreamToVideo, detachVideo } from '@/lib/camera/videoAttach';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { prepareImageForAnalysis, prepareImageForAnalysisLegacy } from '@/lib/img/prepareImageForAnalysis';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { ScanOverlay } from '@/components/camera/ScanOverlay';
import { VoiceRecordingButton } from '../ui/VoiceRecordingButton';
import { normalizeHealthScanImage } from '@/utils/imageNormalization';
import { MultiPassBarcodeScanner } from '@/utils/barcodeScan';
import { BARCODE_V2 } from '@/lib/featureFlags';
import { freezeFrameAndDecode, unfreezeVideo, chooseBarcode } from '@/lib/scan/freezeDecode';
import { useSnapAndDecode } from '@/lib/barcode/useSnapAndDecode';
import { useTorch } from '@/lib/camera/useTorch';
import { scannerLiveCamEnabled } from '@/lib/platform';
import { toLegacyFromEdge } from '@/lib/health/toLegacyFromEdge';
import { playBeep } from '@/lib/sound/soundManager';
import { SFX } from '@/lib/sfx/sfxManager';
import { openPhotoCapture } from '@/components/camera/photoCapture';
import { mark, measure, checkBudget } from '@/lib/perf';
import { PERF_BUDGET } from '@/config/perfBudget';
import { logOwnerAcquire, logOwnerAttach, logOwnerRelease, logPerfOpen, logPerfClose, checkForLeaks } from '@/diagnostics/cameraInq';
import { stopAllVideos } from '@/lib/camera/globalFailsafe';
import { useAutoImmersive } from '@/lib/uiChrome';
import { openHealthReportFromBarcode } from '@/features/health/openHealthReport';
import { normalizeBarcode } from '@/lib/barcode/normalizeBarcode';
import { toast } from 'sonner';
import { devLog } from '@/lib/camera/devLog';
import { photoReportFromImage } from '@/features/health/photoReportFromImage';

const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG_PERF === 'true';

function useDynamicViewportVar() {
  useLayoutEffect(() => {
    const set = () => {
      const h =
        (window.visualViewport && Math.round(window.visualViewport.height)) ||
        window.innerHeight;
      document.documentElement.style.setProperty('--app-dvh', `${h}px`);
    };
    set();
    window.addEventListener('resize', set);
    window.visualViewport?.addEventListener('resize', set);
    return () => {
      window.removeEventListener('resize', set);
      window.visualViewport?.removeEventListener('resize', set);
    };
  }, []);
}


function torchOff(track?: MediaStreamTrack) {
  try { track?.applyConstraints?.({ advanced: [{ torch: false }] as any }); } catch {}
}

function hardDetachVideo(video?: HTMLVideoElement | null) {
  if (!video) return;
  try { video.pause(); } catch {}
  try { (video as any).srcObject = null; } catch {}
  try { video.removeAttribute('src'); video.load?.(); } catch {}
}

interface HealthScannerInterfaceProps {
  onCapture: (imageData: string | { 
    imageBase64: string; 
    detectedBarcode: string | null;
    ocrTextNormalized?: string;
    ocrBlocks?: any[];
    nutritionFields?: any;
    _photoUnified?: boolean;
    _lockView?: string;
  }) => void;
  onManualEntry: () => void;
  onManualSearch?: (query: string, type: 'text' | 'voice') => void;
  onCancel?: () => void;
  mode?: 'barcode' | 'photo' | 'mixed';
  onAnalysisTimeout?: () => void;
  onAnalysisFail?: (reason: string) => void;
  onAnalysisSuccess?: (report: any) => void;
}


export const HealthScannerInterface: React.FC<HealthScannerInterfaceProps> = ({
  onCapture,
  onManualEntry,
  onManualSearch,
  onCancel,
  mode,
  onAnalysisTimeout,
  onAnalysisFail,
  onAnalysisSuccess
}) => {
  // Enable immersive mode (hide bottom nav) when scanner is active
  useAutoImmersive(true);
  
  const startTimeRef = useRef<number>(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [currentView, setCurrentView] = useState<'scanner' | 'manual' | 'notRecognized'>('scanner');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  type ScanPhase = 'scanning' | 'captured' | 'analyzing' | 'presenting';
  const [phase, setPhase] = useState<ScanPhase>('scanning');
  
  const [warmScanner, setWarmScanner] = useState<MultiPassBarcodeScanner | null>(null);
  const { user } = useAuth();
  const { snapAndDecode, updateStreamRef } = useSnapAndDecode();
  const { supportsTorch, torchOn, setTorch, ensureTorchState } = useTorch(() => trackRef.current);

  // One overlay flag derived from phase
  const overlayWanted = phase !== 'scanning';
  
  // Hysteresis: ensure overlay doesn't flicker if phase bounces quickly
  const [overlayVisible, setOverlayVisible] = useState(false);
  useEffect(() => {
    if (overlayWanted) {
      setOverlayVisible(true);
    } else {
      const t = setTimeout(() => setOverlayVisible(false), 160); // 120–180ms is good
      return () => clearTimeout(t);
    }
  }, [overlayWanted]);

  const OWNER = 'health_scanner';
  
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

  // Apply dynamic viewport height fix
  useDynamicViewportVar();

  // Mode detection and logging - PIN to barcode when in barcode modal
  const effectiveMode = mode === 'barcode' ? 'barcode' : (mode ?? 'mixed');
  
  // Feature flags
  const urlParams = new URLSearchParams(window.location.search);
  const STICKY = urlParams.get('stickyMount') !== '0' && (window as any).__scannerStickyMount !== false; // Default ON, override with ?stickyMount=0
  const scannerStickyMount = STICKY;
  const PHOTO_UNIFIED = urlParams.get('photoUnified') !== '0' && isFeatureEnabled('photo_unified_pipeline'); // Default ON
  
  // Performance throttling
  const lastDecodeTime = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const isVisible = useRef<boolean>(true);
  const THROTTLE_MS = PERF_BUDGET.scannerThrottleMs;

  // Scanner mount probe
  const releaseNow = useCallback(() => {
    // release BEFORE any navigation/unmount
    detachVideo(videoRef.current);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    
    camOwnerUnmount(OWNER);
    camRelease(OWNER);
    logOwnerRelease('HealthScannerInterface', ['video']);
    try { updateStreamRef?.(null); } catch {}
    
    trackRef.current = null;
    streamRef.current = null;
    setStream(null);
  }, [updateStreamRef]);

  // Modal close handler - final cleanup
  const onModalClose = useCallback(() => {
    camHardStop('modal_close');
    releaseNow();
    if (onCancel) onCancel();
  }, [releaseNow, onCancel]);

  useLayoutEffect(() => {
    // Phase 1 instrumentation - gated and rate-limited
    mountSeqRef.current++;
    mountTimeRef.current = Date.now();
    
    // Once-only mount logs
    if (!onceMountedRef.current) {
      onceMountedRef.current = true;
      devLog('SCAN][MOUNT_SEQ', mountSeqRef.current, { effectiveMode });
      
      // Dump on mount (once)
      const dumpOnMount = (window as any).__camDump?.() || 'no dump available';
      devLog('SCAN][DUMP] on mount', dumpOnMount);
    }
    
    if (DEBUG) devLog('HEALTH][MOUNT', { effectiveMode });
    
    mark('[HS] component_mount');
    logPerfOpen('HealthScannerInterface');
    logOwnerAcquire('HealthScannerInterface');
    camOwnerMount(OWNER);
    
    return () => {
      const unmountTime = Date.now();
      const mountDuration = unmountTime - mountTimeRef.current;
      const isThrash = mountDuration < 300;
      
      devLog('SCAN][UNMOUNT', { seq: mountSeqRef.current, duration: mountDuration, thrash: isThrash });
      
      // Dump on unmount
      const dumpOnUnmount = (window as any).__camDump?.() || 'no dump available';
      devLog('SCAN][DUMP] on unmount', dumpOnUnmount);
      
      if (DEBUG) devLog('HEALTH][UNMOUNT');
      
      // Clear any pending probe timeouts
      probeTimeoutsRef.current.forEach(clearTimeout);
      probeTimeoutsRef.current = [];
      
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Final cleanup on component unmount
      camOwnerUnmount(OWNER);
      camHardStop('unmount');
      releaseNow();
      logPerfClose('HealthScannerInterface', startTimeRef.current);
      checkForLeaks('HealthScannerInterface');
    };
  }, []);

  // Unmount guard removed - using onModalClose for cleanup

  // Page visibility handling for performance
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisible.current = !document.hidden;
      if (DEBUG) devLog('HS] visibility', { visible: isVisible.current });
      
      // Pause scanning when page is hidden
      if (document.hidden) {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Tuning constants
  const QUICK_BUDGET_MS = 900;
  const ROI = { widthPct: 0.70, heightPct: 0.35 };
  const BURST_COUNT = 2;
  const BURST_DELAY_MS = 120;
  const ZOOM = 1.5;

  useEffect(() => {
    // Stable mount: only start camera once, don't restart on view changes
    if (STICKY) {
      startCamera();
      warmUpDecoder();
      return; // No cleanup on view changes - parent owns cleanup
    }
    
    // Legacy behavior: restart on view changes (causes thrash)
    if (currentView === 'scanner') {
      startCamera();
      warmUpDecoder();
    }
    return () => {
      if (!STICKY) {
        releaseNow();
      }
    };
  }, []); // Fixed deps - only run once per mount

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
      await scanner.scanQuick(warmCanvas).catch(() => null);
      setWarmScanner(scanner);
      devLog('WARM] Decoder warmed up');
    } catch (error) {
      devLog('WARM] Decoder warm-up failed:', error);
    }
  };

  useEffect(() => {
    if (currentView === 'manual' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [currentView]);

  const startCamera = async () => {
    if (streamRef.current) return streamRef.current;
    
    // Guard photo capture in barcode-only mode
    if (effectiveMode === 'barcode') {
      devLog('BARCODE] Skipping photo capture - barcode-only mode');
    }
    
    // iOS fallback: use photo capture for photo analysis
    if (!scannerLiveCamEnabled()) {
      if (effectiveMode === 'barcode') {
        devLog('BARCODE] iOS: skipping photo capture in barcode-only mode');
        return null;
      }
      devLog('PHOTO] iOS fallback: photo capture (no live stream)');
      try {
        const file = await openPhotoCapture('image/*','environment');
        // Process the file with unified vision v1 detector
        const reader = new FileReader();
        reader.onload = async (e) => {
          const imageBase64 = e.target?.result as string;
          try {
            // Use unified Vision v1 detector
            const { detectFoodVisionV1 } = await import('@/detect/vision_v1');
            const detectionResult = await detectFoodVisionV1(imageBase64);
            
            // Process results for health scan
            onCapture(imageBase64);
          } catch (error) {
            console.error('[HEALTH-SCAN] Detection error:', error);
            onCapture(imageBase64); // Fallback to original processing
          }
        };
        reader.readAsDataURL(file);
      } catch {}
      return null;
    }

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
          width: { ideal: 720 }, 
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
      devLog('VIDEO] Stream received:', mediaStream);

      const videoTrack = mediaStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      
      if (DEBUG) {
        devLog('HS] Stream settings:', {
          width: settings.width,
          height: settings.height,
          facingMode: settings.facingMode,
          deviceId: settings.deviceId?.substring(0, 8) + '...' // No PII
        });
      }

      trackRef.current = videoTrack;
      setStream(mediaStream);
      // Update stream reference
      updateStreamRef(mediaStream);

      // Camera inquiry logging
      const streamId = (mediaStream as any).__camInqId || 'unknown';
      logOwnerAttach('HealthScannerInterface', streamId);

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
          
        } catch (playError) {
          devLog('SCAN][VIDEO][PLAY][ERR', { err: playError });
          throw playError;
        }
        
        // Ensure torch state after track is ready
        setTimeout(() => {
          ensureTorchState();
        }, 200);
      }
      
      // Log torch capabilities (debug only)
      const caps = videoTrack?.getCapabilities?.();
      if (DEBUG) {
        devLog('TORCH] caps', caps ? Object.keys(caps) : 'none');
        devLog('TORCH] supported', !!(caps && 'torch' in caps));
      }
      
      return mediaStream;
    } catch (error: any) {
      devLog('PHOTO] Live video denied, using native capture', error?.name || error);
      try {
        const file = await openPhotoCapture('image/*','environment');
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageBase64 = e.target?.result as string;
          onCapture(imageBase64);
        };
        reader.readAsDataURL(file);
        return null;
      } catch (fallbackErr) {
        console.error("[HS] Both live and photo capture failed:", error, fallbackErr);
        // Fallback to the regular view since this component doesn't have error state
        setCurrentView('manual');
      }
    }
  };

  const playCameraClickSound = () => { SFX().play('shutter'); };

  // Helper function to crop center ROI for barcode detection
  const cropCenterROI = (srcCanvas: HTMLCanvasElement): HTMLCanvasElement => {
    const w = srcCanvas.width, h = srcCanvas.height;
    const roiW = Math.round(w * 0.7);
    const roiH = Math.round(h * 0.4);
    const x = Math.round((w - roiW) / 2);
    const y = Math.round((h - roiH) / 2);

    const out = document.createElement('canvas');
    out.width = roiW; 
    out.height = roiH;
    const ctx = out.getContext('2d')!;
    ctx.drawImage(srcCanvas, x, y, roiW, roiH, 0, 0, roiW, roiH);
    return out;
  };

  // Helper: prefer true stills, fallback to canvas frame
  const captureStillFromVideo = async (video: HTMLVideoElement): Promise<HTMLCanvasElement> => {
    const track = (video.srcObject as MediaStream)?.getVideoTracks?.()?.[0];
    const isBrowser = typeof window !== 'undefined';
    let bitmap: ImageBitmap | null = null;

    if (isBrowser && track && 'ImageCapture' in window) {
      try {
        const ic = new (window as any).ImageCapture(track);
        // grabFrame() is fast and widely supported on iOS Safari; takePhoto() if available
        bitmap = await ic.grabFrame().catch(() => null);
      } catch { bitmap = null; }
    }

    // Fallback: draw current video frame
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

  // Fixed ROI calculation
  function computeRoi(viewW: number, viewH: number) {
    const size = Math.min(viewW, viewH) * 0.7; // square ROI centered
    const roiW = size;
    const roiH = size;
    const left = (viewW - roiW) / 2;
    const top  = (viewH - roiH) / 2;
    return { roiW, roiH, left, top };
  }

  // Crop ROI in video pixel space
  const cropReticleROI = (src: HTMLCanvasElement): HTMLCanvasElement => {
    const w = src.width, h = src.height;
    const roi = computeRoi(w, h);
    const out = document.createElement('canvas');
    out.width = roi.roiW; 
    out.height = roi.roiH;
    out.getContext('2d')!.drawImage(src, roi.left, roi.top, roi.roiW, roi.roiH, 0, 0, roi.roiW, roi.roiH);
    return out;
  };

  // Quick decode on the frozen image (≤ 900ms)
  const enhancedBarcodeDecodeQuick = async (canvas: HTMLCanvasElement): Promise<any> => {
    const scanner = warmScanner || new MultiPassBarcodeScanner();
    return await scanner.scanQuick(canvas);
  };

  // Helper functions for canvas manipulation
  const scaleCanvas = (canvas: HTMLCanvasElement, scale: number): HTMLCanvasElement => {
    if (scale === 1.0) return canvas;
    
    const scaled = document.createElement('canvas');
    scaled.width = Math.round(canvas.width * scale);
    scaled.height = Math.round(canvas.height * scale);
    
    const ctx = scaled.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0, scaled.width, scaled.height);
    
    return scaled;
  };

  const rotateCanvas = (canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement => {
    if (degrees === 0) return canvas;
    
    const rotatedCanvas = document.createElement('canvas');
    const ctx = rotatedCanvas.getContext('2d')!;
    
    if (degrees === 90 || degrees === 270) {
      rotatedCanvas.width = canvas.height;
      rotatedCanvas.height = canvas.width;
    } else {
      rotatedCanvas.width = canvas.width;
      rotatedCanvas.height = canvas.height;
    }
    
    ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    
    return rotatedCanvas;
  };

  const invertCanvas = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const inverted = document.createElement('canvas');
    inverted.width = canvas.width;
    inverted.height = canvas.height;
    const ctx = inverted.getContext('2d')!;
    
    ctx.drawImage(canvas, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, inverted.width, inverted.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];         // R
      data[i + 1] = 255 - data[i + 1]; // G
      data[i + 2] = 255 - data[i + 2]; // B
      // Alpha unchanged
    }
    
    ctx.putImageData(imageData, 0, 0);
    return inverted;
  };

  const decodeFromCanvas = async (canvas: HTMLCanvasElement): Promise<any> => {
    const scanner = new MultiPassBarcodeScanner();
    // Use the scanner's reader directly
    const dataUrl = canvas.toDataURL('image/png');
    const img = new Image();
    img.src = dataUrl;
    await new Promise(resolve => { img.onload = resolve; });
    
    return await (scanner as any).reader.decodeFromImageElement(img);
  };

  // Helper to convert canvas to base64 without CSP violation
  const canvasToBase64 = async (canvas: HTMLCanvasElement): Promise<string> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed'));
          return;
        }
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(blob);
      }, 'image/jpeg', 0.85);
    });
  };

  // Capture high-resolution still image
  const captureStill = async (): Promise<{ canvas: HTMLCanvasElement; captureType: 'ImageCapture' | 'VideoFrame' }> => {
    if (!videoRef.current) throw new Error('Video not ready');
    
    const video = videoRef.current;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    console.log(`📹 Video dimensions: ${videoWidth}×${videoHeight}`);
    
    // Try ImageCapture API for highest quality
    if (stream && 'ImageCapture' in window) {
      try {
        const track = stream.getVideoTracks()[0];
        const imageCapture = new (window as any).ImageCapture(track);
        
        // Get highest quality photo
        const blob = await imageCapture.takePhoto();
        const img = new Image();
        const canvas = document.createElement('canvas');
        
        await new Promise((resolve, reject) => {
          img.onload = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            resolve(void 0);
          };
          img.onerror = reject;
          img.src = URL.createObjectURL(blob);
        });
        
        console.log(`📸 ImageCapture: ${canvas.width}×${canvas.height}`);
        return { canvas, captureType: 'ImageCapture' };
      } catch (error) {
        console.warn('ImageCapture failed, falling back to video frame:', error);
      }
    }
    
    // Fallback: capture from video element at full resolution
    const canvas = document.createElement('canvas');
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    
    console.log(`📸 VideoFrame: ${canvas.width}×${canvas.height}`);
    return { canvas, captureType: 'VideoFrame' };
  };

  const captureImage = async () => {
    // Guard photo capture in barcode-only mode
    if (effectiveMode === 'barcode') {
      console.log('[BARCODE] Ignoring photo capture - barcode-only mode');
      return;
    }
    
    if (!videoRef.current || !canvasRef.current) {
      console.error("❌ Missing video or canvas ref!", {
        video: !!videoRef.current,
        canvas: !!canvasRef.current
      });
      return;
    }

    // Throttle capture attempts
    const now = Date.now();
    if (now - lastDecodeTime.current < PERF_BUDGET.scannerThrottleMs) {
      if (DEBUG) console.log('[HS] throttled, too soon');
      return;
    }
    lastDecodeTime.current = now;

    if (DEBUG) console.log('[SCANNER][CAPTURE] freeze');
    mark('[HS] analyze_start');
    setPhase('captured');
    playCameraClickSound();
    setIsScanning(true);
    
    try {
      const video = videoRef.current;
      await video.play(); // ensure >0 dimensions on iOS
      
      // Apply zoom constraint before capture (NO auto-torch!)
      if (stream) {
        const track = stream.getVideoTracks()[0];
        if (track) {
          try {
            const capabilities = track.getCapabilities() as any;
            if (capabilities.zoom && capabilities.zoom.max > 1) {
              await track.applyConstraints({
                advanced: [{ zoom: Math.min(2, capabilities.zoom.max) } as any]
              });
            }
          } catch (e) {
            if (DEBUG) console.warn('[HS] zoom constraint failed:', e);
          }
        }
      }

      // Capture still image for both barcode and OCR processing
      const { canvas } = await captureStill();
      
      // Convert to blob for efficient processing
      const fullBlob = await new Promise<Blob>(resolve => {
        canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.8);
      });
      
      // Convert to base64 for compatibility
      const fullBase64 = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(fullBlob);
      });

      // Check for unified photo pipeline
      if (PHOTO_UNIFIED) {
        devLog('PHOTO][UNIFIED] Using unified pipeline');
        
        // Convert to File for unified pipeline
        const file = new File([fullBlob], 'photo.jpg', { type: 'image/jpeg' });
        
        const result = await photoReportFromImage(file);
        
        if ('success' in result && result.success) {
          // Never mount barcode scanner - pass data directly
          onCapture({
            imageBase64: result.payload.originalImage?.split(',')[1] || '',
            detectedBarcode: result.source === 'barcode' ? result.payload.barcode : null
          });
          return;
        } else if ('error' in result) {
          devLog('PHOTO][UNIFIED][ERROR]', result.error, result.reason);
          // Fall through to legacy flow
        }
      }
      if (import.meta.env.VITE_DEBUG_PERF === 'true') {
        console.info('[PHOTO][ROUTE]', { 
          foundBarcode: false, 
          sentMode: 'ocr',
          size: { w: canvas.width, h: canvas.height }, 
          compressedKB: Math.round(fullBlob.size / 1024) 
        });
      }

      let detectedBarcode: string | null = null;
      
      // 1) Barcode detection if enabled
      if (import.meta.env.VITE_PHOTO_BARCODES_ENABLE === 'true') {
        try {
          console.log('[PHOTO] Checking for barcode...');
          const roiCanvas = cropReticleROI(canvas);
          const enhanced = enhancedBarcodeDecodeQuick(roiCanvas);
          const result = await Promise.race([
            enhanced,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
          ]);
          
          if (result?.text) {
            detectedBarcode = result.text;
            console.log('[PHOTO][BARCODE][FOUND]', detectedBarcode);
            
            if (import.meta.env.VITE_DEBUG_PERF === 'true') {
              console.info('[PHOTO][ROUTE]', { 
                foundBarcode: true, 
                sentMode: 'barcode',
                size: { w: canvas.width, h: canvas.height }, 
                compressedKB: Math.round(fullBlob.size / 1024) 
              });
            }
            
            // Route to barcode pipeline and return early
            onCapture({
              imageBase64: fullBase64.split(',')[1],
              detectedBarcode
            });
            return;
          }
        } catch (error) {
          console.log('[PHOTO] No barcode detected or timeout');
        }
      }

      if (import.meta.env.VITE_DEBUG_PERF === 'true') {
        console.info('[PHOTO][ROUTE]', { 
          foundBarcode: false, 
          sentMode: 'ocr',
          size: { w: canvas.width, h: canvas.height }, 
          compressedKB: Math.round(fullBlob.size / 1024) 
        });
      }

      // 2) No barcode found - proceed with OCR/image analysis
      if (import.meta.env.VITE_PHOTO_PIPE_V1 === 'true') {
        // New OCR pipeline
        try {
          console.log('[PHOTO] Using OCR pipeline...');
          
          // Compress image for OCR
          const prep = await prepareImageForAnalysis(fullBlob, { 
            maxEdge: 1280, 
            quality: 0.7, 
            targetMaxBytes: 900_000 
          });

          // Send to edge function with OCR mode
          const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
            body: {
              mode: 'ocr',
              imageBase64: prep.base64NoPrefix
            }
          });

          if (!error && data?.extractedText) {
            // Process with new OCR parser
            const { toLegacyFromPhoto } = await import('@/lib/health/toLegacyFromPhoto');
            const legacy = toLegacyFromPhoto(data.extractedText);
            
            // Build report (mirror barcode early return)
            const report = {
              source: 'photo',
              title: legacy.productName,
              image_url: fullBase64,
              health: { score: legacy.healthScore, unit: '0-10' },
              ingredientFlags: (legacy.flags || []).map((f: any) => ({
                ingredient: f.title || f.label || f.code || 'Ingredient',
                flag: f.reason || f.description || f.label || '',
                severity: /high|danger/i.test(f.severity) ? 'high' : /med|warn/i.test(f.severity) ? 'medium' : 'low',
              })),
              nutritionData: legacy.nutritionData,
              ...(import.meta.env.VITE_SHOW_PER_SERVING === 'true' && {
                nutritionDataPerServing: legacy.nutritionDataPerServing
              }),
              serving_size: legacy.serving_size,
              _dataSource: legacy._dataSource,
            };

            if (import.meta.env.VITE_DEBUG_PERF === 'true') {
              console.info('[PHOTO][FINAL]', {
                score10: report.health?.score,
                flagsCount: report.ingredientFlags?.length,
                per100g: { 
                  kcal: report.nutritionData?.energyKcal, 
                  sugar_g: report.nutritionData?.sugar_g, 
                  sodium_mg: report.nutritionData?.sodium_mg 
                },
                perServing: { 
                  kcal: report.nutritionDataPerServing?.energyKcal, 
                  sugar_g: report.nutritionDataPerServing?.sugar_g, 
                  sodium_mg: report.nutritionDataPerServing?.sodium_mg 
                },
                serving: report.serving_size
              });
            }

            // Pass the report data in a compatible way
            onCapture({
              imageBase64: prep.base64NoPrefix,
              detectedBarcode: null
            });
            return;
          }
        } catch (error) {
          console.warn('[PHOTO] OCR pipeline failed, falling back to legacy:', error);
        }
      }

      // 3) Fallback to existing barcode detection and processing
      // Use shared hook
      const result = await snapAndDecode({
        videoEl: video,
        budgetMs: QUICK_BUDGET_MS,
        roi: { wPct: ROI.widthPct, hPct: ROI.heightPct },
        logPrefix: '[HS]'
      });

      // Return early on any 8/12/13/14-digit hit (even if checksum is false)
      if (result.ok && result.raw && /^\d{8,14}$/.test(result.raw)) {
        mark('[HS] barcode_found');
        if (DEBUG) console.log('[HS] off_fetch_start', { code: result.raw });
        
        // Optional: Add toast for PWA testing  
        if (window.location.search.includes('debug=toast')) {
          const { toast } = await import('@/components/ui/sonner');
          toast.info(`[HS] off_fetch_start: ${result.raw}`);
        }
        
        mark('[HS] edge_call_start');
        const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
          body: { mode: 'barcode', barcode: result.raw, source: 'health-scan' }
        });
        mark('[HS] edge_call_end');
        measure('[HS] edge_call_total', '[HS] edge_call_start');
        
        if (DEBUG) console.log('[HS] off_result', { status: error ? 'error' : 200, hit: !!data });
        
        // Optional: Add toast for PWA testing
        if (window.location.search.includes('debug=toast')) {
          const { toast } = await import('@/components/ui/sonner');
          toast.success(`[HS] off_result: ${!!data ? 'hit' : 'miss'}`);
        }
        // Legacy: Barcode path - only succeed when we have meaningful data
        if (data && !error && data.ok && !data.fallback) {
          const hasProductData =
            !!(data.product?.productName || data.product?.product_name || data.itemName) ||
            !!data.barcode;

          if (hasProductData) {
            // Convert to base64 for result
            const still = await captureStillFromVideo(video);
            const fullBlob: Blob = await new Promise((resolve, reject) => {
              still.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.85);
            });
            const fullBase64 = await new Promise<string>((resolve, reject) => {
              const fr = new FileReader();
              fr.onload = () => resolve(String(fr.result));
              fr.onerror = () => reject(fr.error);
              fr.readAsDataURL(fullBlob);
            });
            
            if (DEBUG) console.log('[SCANNER][CAPTURE] onCapture with barcode');
            onCapture(fullBase64 + `&barcode=${result.raw}`);
            // PATCH 4: DO NOT capture again here - already captured once above
            if (DEBUG) console.log('[SCANNER][CAPTURE] unfreeze after success');
            return;
          } else {
            console.warn('[HS] OFF hit but no product data, continuing to burst');
            // continue with the existing burst flow
          }
        } else {
          console.warn('[HS][BARCODE] Legacy preflight insufficient, falling back to normal image analysis', {
            ok: data?.ok, 
            fallback: data?.fallback, 
            error: !!error
          });
          // let the normal analyzer path run
        }
      }

      // 2) Burst fallback (parallel capture and race)
      console.log('[HS] burst_start');
      const burstPromises = Array.from({ length: BURST_COUNT }).map(async (_, i) => {
        await new Promise(r => setTimeout(r, BURST_DELAY_MS * (i + 1)));
        return await snapAndDecode({
          videoEl: video,
          budgetMs: QUICK_BUDGET_MS,
          roi: { wPct: ROI.widthPct, hPct: ROI.heightPct },
          logPrefix: '[HS]'
        });
      });

      const winner = await Promise.race(burstPromises);
      if (winner.ok && winner.raw && /^\d{8,14}$/.test(winner.raw)) {
        console.log('[HS] off_fetch_start', { code: winner.raw });
        const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
          body: { mode: 'barcode', barcode: winner.raw, source: 'health' }
        });
        console.log('[HS] off_result', { status: error ? 'error' : 200, hit: !!data });
        
        if (data && !error && data.ok && !data.fallback) {
          const hasProductData =
            !!(data.product?.productName || data.product?.product_name || data.itemName) ||
            !!data.barcode;

          if (hasProductData) {
            const still = await captureStillFromVideo(video);
            const fullBlob: Blob = await new Promise((resolve, reject) => {
              still.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.85);
            });
            const fullBase64 = await new Promise<string>((resolve, reject) => {
              const fr = new FileReader();
              fr.onload = () => resolve(String(fr.result));
              fr.onerror = () => reject(fr.error);
              fr.readAsDataURL(fullBlob);
            });
            
            // PATCH 4: Remove duplicate capture - onCapture already includes the barcode
            onCapture(fullBase64 + `&barcode=${winner.raw}`);
            return; // Early exit on success
          } else {
            console.warn('[HS] OFF hit but no product data, continuing to burst');
            // continue with the existing burst flow
          }
        } else {
          console.warn('[HS][BARCODE] Legacy preflight insufficient, falling back to normal image analysis', {
            ok: data?.ok, 
            fallback: data?.fallback, 
            error: !!error
          });
          // let the normal analyzer path run
        }
      }

      // 3) Last resort: run the existing full-pass pipeline
      const still = await captureStillFromVideo(video);
      await runExistingFullDecodePipeline(still);
      
    } catch (conversionError) {
      console.error("❌ Image processing failed:", conversionError);
      // Fallback to basic canvas capture
      const canvas = canvasRef.current!;
      const video = videoRef.current!;
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const fallbackImageData = canvas.toDataURL('image/jpeg', 0.8);
      onCapture(fallbackImageData);
    } finally {
      // PATCH 4: Always unfreeze and reset scanning state
      if (DEBUG) console.log('[SCANNER][CAPTURE] unfreeze in finally');
      setIsScanning(false);
      if (videoRef.current) {
        unfreezeVideo(videoRef.current);
      }
      setPhase('scanning'); // Reset to scanning phase(false); // Ensure this always runs for success, error, or timeout
      setPhase('scanning'); // Reset to scanning phase
      mark('[HS] analyze_end');
      measure('[HS] analyze_total', '[HS] analyze_start');
      const analyzeTime = performance.now() - (performance.getEntriesByName('[HS] analyze_start')[0]?.startTime || 0);
      checkBudget('analyze_total', analyzeTime, PERF_BUDGET.analyzeTotalMs);
    }
  };

  const runQuickBarcodeScan = async (canvas: HTMLCanvasElement): Promise<string | null> => {
    const QUICK_SCAN_MS = 1000;
    const QUICK_PASSES = 4;
    
    if (!BARCODE_V2) return null;
    
    console.log(`[HS] Quick barcode scan - budget: ${QUICK_SCAN_MS}ms, max passes: ${QUICK_PASSES}`);
    
    const scanner = warmScanner || new MultiPassBarcodeScanner();
    const barcodeResult = await scanner.scanQuick(canvas);
    
    if (barcodeResult) {
      console.log("🔍 Quick barcode hit:", {
        pass: barcodeResult.passName,
        rotation: barcodeResult.rotation,
        scale: barcodeResult.scale,
        format: barcodeResult.format,
        checkDigit: barcodeResult.checkDigitValid,
        value: barcodeResult.text,
        timeMs: barcodeResult.decodeTimeMs
      });
      return barcodeResult.text;
    }
    
    console.log("🔍 Quick barcode scan: no detection");
    return null;
  };

  const runExistingFullDecodePipeline = async (canvas: HTMLCanvasElement) => {
    // Run capped quick check only - no more 76 passes!
    const detectedBarcode = await runQuickBarcodeScan(canvas);
    
    // Convert to base64 using CSP-safe method
    const fullBlob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.85);
    });

    const fullBase64 = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(fullBlob);
    });
    
    // Feature flag check for Photo Pipeline v2
    const usePhotoPipelineV2 = typeof import.meta.env.VITE_PHOTO_PIPELINE_V2 !== 'undefined' && 
                               import.meta.env.VITE_PHOTO_PIPELINE_V2 === 'true';

    if (detectedBarcode) {
      console.log('[PHOTO][BARCODE][HIT]', { 
        value: detectedBarcode, 
        format: 'auto', // Could be enhanced with format detection
        ms: Date.now() % 10000 // Simple timing indicator
      });
      
      if (usePhotoPipelineV2) {
        // Photo Pipeline v2: No server call, just pass data to modal
        console.log("🎯 Photo Pipeline v2: Barcode detected, passing to modal");
        onCapture({
          imageBase64: fullBase64.split(',')[1],
          detectedBarcode
        });
        return;
      } else {
        // Legacy behavior: Call server directly
        console.log("🎯 Legacy: Barcode path - short-circuiting to OFF lookup");
        
        // Call health processor with barcode
        const body = {
          detectedBarcode,
          imageBase64: fullBase64.split(',')[1], // Remove data URL prefix
          mode: 'scan'
        };
        
        const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
          body
        });
        
        if (!error && data && !data.fallback) {
          console.log("✅ Barcode path success:", data);
          SFX().play('scan_success');
          playBeep(); // legacy fallback
          onCapture(fullBase64 + `&barcode=${detectedBarcode}`);
          return;
        } else {
          console.log("⚠️ Barcode lookup failed or returned fallback, proceeding with image analysis");
        }
      }
    } else {
      console.log('[PHOTO][BARCODE][MISS]', { 
        value: null, 
        format: null, 
        ms: Date.now() % 10000
      });
    }
    
    // No barcode or barcode lookup failed - proceed with image analysis
    if (effectiveMode === 'barcode') {
      console.log('[BARCODE] Skipping photo analysis - barcode-only mode');
      return;
    }
    
    if (isFeatureEnabled('photo_encoder_v1')) {
      try {
        console.log("🖼️ Using optimized photo encoder for analysis");
        const prep = await prepareImageForAnalysis(fullBlob, { 
          maxEdge: 1280, 
          quality: 0.7, 
          targetMaxBytes: 900_000 
        });
        console.debug('[IMG PREP]', { w: prep.width, h: prep.height, bytes: prep.bytes });
        
        // Log capture details
        console.log('[PHOTO][CAPTURE]', { 
          w: prep.width, 
          h: prep.height, 
          bytes: prep.bytes 
        });

        // Pass prepared image data to HealthCheckModal for analysis
        onCapture({
          imageBase64: prep.base64NoPrefix,
          detectedBarcode: detectedBarcode ?? null,
        });
      } catch (error) {
        console.warn("⚠️ Photo encoder failed, falling back to original:", error);
        // Fallback to original image
        onCapture(fullBase64);
      }
    } else {
      // Original behavior when feature flag is disabled
      onCapture(fullBase64);
    }
  };

  const handleFlashlightToggle = async () => {
    try {
      const result = await setTorch(!torchOn);
      if (!result.ok) {
        console.warn("Torch toggle failed:", result.reason);
      }
    } catch (error) {
      console.error("Error toggling torch:", error);
    }
  };

  const handleManualEntry = () => {
    setCurrentView('manual');
  };
  
  // Handle barcode submission from manual entry
  const handleSubmitBarcode = useCallback(async () => {
    if (!barcodeInput.trim()) return;
    
    const result = normalizeBarcode(barcodeInput.trim());
    if (result && typeof result === 'object' && result.normalized) {
      console.log('[MANUAL] Submitting barcode:', result.normalized);
      onCapture({ imageBase64: '', detectedBarcode: result.normalized });
    } else {
      console.warn('[MANUAL] Invalid barcode format:', barcodeInput);
      // Use sonner toast for user feedback
      const { toast } = await import('sonner');
      toast('Invalid barcode format. Please check and try again.');
    }
  }, [barcodeInput, onCapture]);

  // Helper function to detect if input is a barcode
  const isBarcode = (input: string): boolean => {
    // Remove non-digits and check if it looks like a barcode
    const digits = input.replace(/\D+/g, '');
    // Common barcode lengths: 8 (EAN-8), 11-13 (UPC/EAN-13), 12 (UPC-A)
    return digits.length >= 8 && digits.length <= 14 && digits === input.replace(/\s+/g, '');
  };

  const handleSearchDatabase = async () => {
    if (barcodeInput.trim()) {
      console.log('🔍 Searching database for:', barcodeInput);
      
      const inputValue = barcodeInput.trim();
      
      // Check if input looks like a barcode
      if (isBarcode(inputValue)) {
        console.log('[MANUAL][BARCODE] Detected barcode input, using unified pipeline');
        
        try {
          const result = await openHealthReportFromBarcode(inputValue, 'scanner-manual');
          
          if ('error' in result) {
            const errorMsg = result.error === 'not_found' 
              ? 'Product not found in database' 
              : result.error === 'invalid_barcode'
              ? 'Invalid barcode format'
              : 'Failed to fetch product information';
            
            toast.error(errorMsg);
            
            // Generate suggestions on barcode failure
            await generateSmartSuggestions(barcodeInput);
            setShowSuggestions(true);
            return;
          }
          
          // Close scanner modal and navigate to health report
          console.log('[MANUAL][SUCCESS] Barcode found, closing modal');
          camHardStop('modal_close'); // Force stop BEFORE cleanup
          releaseNow(); // Ensure camera cleanup before navigation
          
          // Use the same navigation pattern as auto-decode
          if (onManualSearch) {
            // If we have onManualSearch, the parent will handle the result
            onCapture({
              imageBase64: '', // No image for barcode-only
              detectedBarcode: result.payload.barcode || inputValue
            });
          } else {
            // Direct navigation (fallback)
            window.location.href = `/health-report-standalone?barcode=${encodeURIComponent(result.payload.barcode || inputValue)}&source=scanner-manual`;
          }
          
        } catch (error) {
          console.error('[MANUAL][BARCODE][ERROR]', error);
          toast.error('Failed to process barcode');
          await generateSmartSuggestions(barcodeInput);
          setShowSuggestions(true);
        }
        
        return;
      }
      
      // If we have the onManualSearch prop, use it for product names (preferred)
      if (onManualSearch) {
        try {
          await onManualSearch(inputValue, 'text');
        } catch (error) {
          console.error('❌ Manual search failed:', error);
          throw error; // Re-throw to be caught by voice handler
        }
        return;
      }
      
      // Fallback: try to call the health-check-processor directly for product names
      try {
        const { data, error } = await supabase.functions.invoke('health-check-processor', {
          body: {
            inputType: 'text',
            data: inputValue,
            userId: user?.id,
            detectedBarcode: null
          }
        });
        
        console.log('✅ Search result:', data);
        
        if (error) {
          console.error('❌ Search error:', error);
          // Generate suggestions on error
          await generateSmartSuggestions(barcodeInput);
          setShowSuggestions(true);
          return;
        }
        
        // If successful, switch to fallback to show results
        if (data) {
          onManualEntry();
        }
      } catch (error) {
        console.error('❌ Error calling health-check-processor:', error);
        // Fallback to generating suggestions
        await generateSmartSuggestions(barcodeInput);
        setShowSuggestions(true);
      }
    }
  };

  const generateSmartSuggestions = async (userInput: string = '') => {
    setIsLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-smart-suggestions', {
        body: { 
          userInput: userInput.trim(),
          userId: user?.id 
        }
      });

      if (error) throw error;
      
      if (data && data.suggestions) {
        setSmartSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
      // Fallback to default suggestions
      setSmartSuggestions([
        "Coca Cola 12oz Can",
        "Lay's Classic Potato Chips", 
        "Organic Bananas",
        "Vitamin D3 1000 IU",
        "Greek Yogurt - Plain"
      ]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    // Check if suggestion looks like a barcode
    if (isBarcode(suggestion)) {
      console.log('[SUGGESTION][BARCODE] Processing barcode suggestion:', suggestion);
      
      try {
        const result = await openHealthReportFromBarcode(suggestion, 'scanner-manual');
        
        if ('error' in result) {
          toast.error(result.error === 'not_found' ? 'Product not found' : 'Failed to process barcode');
          return;
        }
        
        // Close scanner and navigate
        camHardStop('modal_close'); // Force stop BEFORE cleanup
        releaseNow();
        if (onManualSearch) {
          onCapture({
            imageBase64: '',
            detectedBarcode: result.payload.barcode || suggestion
          });
        } else {
          window.location.href = `/health-report-standalone?barcode=${encodeURIComponent(result.payload.barcode || suggestion)}&source=scanner-manual`;
        }
        
      } catch (error) {
        console.error('[SUGGESTION][BARCODE][ERROR]', error);
        toast.error('Failed to process barcode');
      }
      
    } else {
      // Use the manual search if available for product names, otherwise fall back to manual entry
      if (onManualSearch) {
        onManualSearch(suggestion, 'text');
      } else {
        setBarcodeInput(suggestion);
        onManualEntry(); // This will trigger the health check
      }
    }
  };

  // Load suggestions when view changes to notRecognized (scan failed)
  useEffect(() => {
    if (currentView === 'notRecognized') {
      generateSmartSuggestions();
      setShowSuggestions(true);
    }
  }, [currentView]);

  // Render all views, use CSS to show/hide when sticky mount is enabled
  // Block barcode scanner mounting in photo unified mode
  const isBarcodeView = currentView === 'scanner' && effectiveMode !== 'photo';
  
  if (STICKY) {
    return (
      <>
        {/* Scanner View - always mounted, hidden when not active */}
        {/* Only mount scanner for barcode mode, never for photo unified */}
        <div 
          className={`scanner-root ${!isBarcodeView ? 'hidden' : ''}`}
          style={{
            position: 'fixed',
            inset: 0,
            height: 'var(--app-dvh, 100dvh)',
            overflow: 'hidden',
            background: 'black',
            zIndex: 100,
            display: !isBarcodeView ? 'none' : 'block'
          }}
        >
          <main className={`scanner-container h-full relative overflow-hidden`}>
            {/* Live Camera Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'translateZ(0)'
              }}
              className={`transition-opacity duration-300 translate-z-0 ${phase !== 'scanning' ? 'opacity-50' : 'opacity-100'}`}
            />
            
            {/* Shutter flash effect */}
            {phase !== 'scanning' && (
              <div className="absolute inset-0 bg-white animate-pulse opacity-20 pointer-events-none"></div>
            )}
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Unified Scan Overlay */}
            <ScanOverlay show={overlayVisible} />
            
            {/* Scanning Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative pointer-events-none">
                <div className={`w-64 h-64 border-4 border-green-400 rounded-3xl transition-all duration-500 ${
                  isScanning ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]' : 'shadow-[0_0_30px_rgba(34,197,94,0.4)]'
                }`}>
                  <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                  <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`transition-all duration-300 ${isScanning ? 'animate-pulse' : 'animate-bounce'}`}>
                      <Target className={`w-16 h-16 transition-colors ${
                        isScanning ? 'text-red-400' : 'text-green-400'
                      }`} />
                    </div>
                  </div>
                  
                  {isScanning && (
                    <div className="absolute inset-0 overflow-hidden rounded-3xl">
                      <div className="w-full h-1 bg-red-500 animate-[slide_0.5s_ease-in-out_infinite] shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Header Text */}
            <div className="absolute top-8 left-4 right-4 text-center">
              <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-4 border border-green-400/30">
                <h2 className="text-white text-lg font-bold mb-2">
                  🔬 Health Inspector Scanner
                </h2>
                <p className="text-green-300 text-sm animate-pulse">
                  Scan a food barcode to inspect its health profile!
                </p>
              </div>
            </div>

            {/* Grid Overlay */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="w-full h-full" style={{
                backgroundImage: `
                  linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)
                `,
                backgroundSize: '30px 30px'
              }}></div>
            </div>
          </main>

          {/* CTA bar */}
          <div
            className="scanner-cta"
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
              padding: '0 20px',
              zIndex: 1010,
              pointerEvents: 'auto'
            }}
          >
            <ScannerActions
              onAnalyze={captureImage}
              onCancel={onModalClose}
              onEnterBarcode={handleManualEntry}
              onFlashlight={handleFlashlightToggle}
              isScanning={isScanning}
              torchEnabled={torchOn}
              torchSupported={supportsTorch}
            />
          </div>
        </div>

        {/* Manual Entry View - always mounted, hidden when not active */}
        <div className={currentView !== 'manual' ? 'hidden' : 'w-full h-full bg-background flex flex-col overflow-hidden'}>
          <div className="p-6 border-b bg-card">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentView('scanner')}
                className="rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold text-foreground">Manual Entry</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Enter Barcode Manually
              </h3>
              <div className="space-y-4">
                <Input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Enter barcode number (e.g., 123456789012)"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="text-center text-lg font-mono"
                />
                <Button 
                  onClick={handleSubmitBarcode}
                  className="w-full"
                  disabled={!barcodeInput.trim() || isLoadingSuggestions}
                >
                  {isLoadingSuggestions ? 'Processing...' : 'Submit Barcode'}
                </Button>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => onManualSearch?.('', 'voice')}
                  variant="outline"
                  className="flex-1"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Voice Search
                </Button>
                <span className="text-muted-foreground text-sm">or</span>
                <Button
                  onClick={() => onManualSearch?.('', 'text')}
                  variant="outline"
                  className="flex-1"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Text Search
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Not Recognized View - always mounted, hidden when not active */}
        <div className={currentView !== 'notRecognized' ? 'hidden' : 'w-full h-full bg-background flex flex-col overflow-hidden'}>
          <div className="p-6 border-b bg-card">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentView('scanner')}
                className="rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold text-foreground">Image Not Recognized</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                We couldn't identify this image
              </h3>
              <p className="text-muted-foreground">
                Try taking another photo or search manually below
              </p>
            </div>

            {showSuggestions && smartSuggestions.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-3">💡 Smart Suggestions:</h4>
                <div className="grid gap-2">
                  {smartSuggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start text-left h-auto p-3"
                      onClick={() => onManualSearch?.(suggestion, 'text')}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={() => setCurrentView('scanner')}
              variant="outline"
              className="w-full border-green-400 text-green-600 hover:bg-green-50"
            >
              <Camera className="w-5 h-5 mr-2" />
              📸 Try Scanning Again
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Legacy behavior: conditional rendering (causes thrash)
  if (currentView === 'scanner') {
    return (
      <div 
        className="scanner-root"
        style={{
          position: 'fixed',
          inset: 0,
          height: 'var(--app-dvh, 100dvh)',
          overflow: 'hidden',
          background: 'black',
          zIndex: 1000,
        }}
      >

        {/* camera/video area */}
        <main 
          className="flex-1 relative overflow-hidden"
          style={{
            position: 'absolute',
            inset: 0,
            height: '100%',
            overflow: 'hidden'
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'translateZ(0)'     // prevent black frames on iOS
            }}
            className={`transition-opacity duration-300 translate-z-0 ${phase !== 'scanning' ? 'opacity-50' : 'opacity-100'}`}
          />
          
          {/* Shutter flash effect */}
          {phase !== 'scanning' && (
            <div className="absolute inset-0 bg-white animate-pulse opacity-20 pointer-events-none"></div>
          )}
          <canvas ref={canvasRef} className="hidden" />
          
           {/* Scanning Overlay */}
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="relative pointer-events-none">
              <div className={`w-64 h-64 border-4 border-green-400 rounded-3xl transition-all duration-500 ${
                isScanning ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]' : 'shadow-[0_0_30px_rgba(34,197,94,0.4)]'
              }`}>
                <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`transition-all duration-300 ${isScanning ? 'animate-pulse' : 'animate-bounce'}`}>
                    <Target className={`w-16 h-16 transition-colors ${
                      isScanning ? 'text-red-400' : 'text-green-400'
                    }`} />
                  </div>
                </div>
                
                {isScanning && (
                  <div className="absolute inset-0 overflow-hidden rounded-3xl">
                    <div className="w-full h-1 bg-red-500 animate-[slide_0.5s_ease-in-out_infinite] shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Header Text - moved back up */}
          <div className="absolute top-8 left-4 right-4 text-center">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-4 border border-green-400/30">
              <h2 className="text-white text-lg font-bold mb-2">
                🔬 Health Inspector Scanner
              </h2>
              <p className="text-green-300 text-sm animate-pulse">
                Scan a food barcode to inspect its health profile!
              </p>
            </div>
          </div>

          {/* Grid Overlay */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="w-full h-full" style={{
              backgroundImage: `
                linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)
              `,
              backgroundSize: '30px 30px'
            }}></div>
          </div>

        </main>

        {/* CTA bar fixed to real bottom */}
        <div
          className="scanner-cta"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            padding: '0 20px',
            zIndex: 1010,         // above overlays
            pointerEvents: 'auto' // make sure it's clickable
          }}
        >
          <ScannerActions
            onAnalyze={captureImage}
            onCancel={onModalClose}
            onEnterBarcode={handleManualEntry}
            onFlashlight={handleFlashlightToggle}
            isScanning={isScanning}
            torchEnabled={torchOn}
            torchSupported={supportsTorch}
          />
        </div>
      </div>
    );
  }

  // Manual Entry View
  if (currentView === 'manual') {
    return (
      <div className="w-full h-full bg-background flex flex-col overflow-hidden">
        <div className="p-6 border-b bg-card">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentView('scanner')}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold text-foreground">Manual Entry</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Barcode Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              Enter Barcode or Product Name
            </label>
            <Input
              ref={barcodeInputRef}
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan barcode or type product name..."
              className="text-lg py-3 bg-muted/50 border-2 focus:border-primary"
            />
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearchDatabase}
            disabled={!barcodeInput.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-lg"
          >
            <Search className="w-5 h-5 mr-2" />
            Search Database
          </Button>

          {/* Voice Recognition Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Mic className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Voice Recognition</span>
            </div>
            <VoiceRecordingButton 
              onVoiceResult={async (text) => {
                console.log('🎤 Voice result received in HealthScanner:', text);
                setBarcodeInput(text);
                
                // Add error handling for voice processing
                try {
                  await handleSearchDatabase();
                } catch (error) {
                  console.error('❌ Voice search failed:', error);
                  // Reset any loading states and show error
                  setShowSuggestions(true);
                  await generateSmartSuggestions(text);
                }
              }}
            />
          </div>

          {/* Quick Suggestions - Only show after failed search/voice input */}
          {showSuggestions && smartSuggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">Quick Suggestions</span>
                {isLoadingSuggestions && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {smartSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="justify-start text-left hover:bg-muted hover:bg-green-50 hover:border-green-300 transition-colors"
                  >
                    <span className="text-green-600 mr-2">🔍</span>
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Image Not Recognized View
  if (currentView === 'notRecognized') {
    return (
      <div className="w-full h-full bg-background flex flex-col overflow-hidden">
        <div className="p-6 border-b bg-card">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentView('scanner')}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold text-foreground">Image Not Recognized</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Message */}
          <div className="text-center space-y-4 py-8">
            <div className="text-6xl">🤔</div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                We couldn't identify any food items or barcodes in your image.
              </h3>
              <p className="text-muted-foreground">
                Try one of the options below to continue your health analysis.
              </p>
            </div>
          </div>

          {/* Manual Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              Type Barcode or Food Name
            </label>
            <Input
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Enter product barcode or name..."
              className="text-lg py-3 bg-muted/50 border-2 focus:border-primary"
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleSearchDatabase}
              disabled={!barcodeInput.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3"
            >
              <Search className="w-5 h-5 mr-2" />
              Search Database
            </Button>

            <Button
              variant="outline"
              className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              <Mic className="w-5 h-5 mr-2" />
              🎤 Use Voice Input
            </Button>
          </div>

          {/* Quick Suggestions - AI-powered and context-aware */}
          {smartSuggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">Quick Suggestions</span>
                {isLoadingSuggestions && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {smartSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="justify-start text-left hover:bg-muted hover:bg-green-50 hover:border-green-300 transition-colors"
                  >
                    <span className="text-green-600 mr-2">🔍</span>
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Try Again Button */}
          <Button
            onClick={() => setCurrentView('scanner')}
            variant="outline"
            className="w-full border-green-400 text-green-600 hover:bg-green-50"
          >
            <Camera className="w-5 h-5 mr-2" />
            📸 Try Scanning Again
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

// ScannerActions component with swapped button order
function ScannerActions({
  onAnalyze,
  onEnterBarcode,
  onCancel,
  onFlashlight,
  isScanning = false,
  torchEnabled = false,
  torchSupported = false,
}: {
  onAnalyze: () => void;
  onEnterBarcode: () => void;
  onCancel?: () => void;
  onFlashlight?: () => void;
  isScanning?: boolean;
  torchEnabled?: boolean;
  torchSupported?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {/* GREEN CTA Button - Full Width */}
      <button
        onClick={onAnalyze}
        disabled={isScanning}
        className="w-full h-14 rounded-2xl text-lg font-semibold bg-emerald-600 text-white shadow-lg active:scale-[.99] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Zap className={`w-6 h-6 ${isScanning ? 'animate-spin' : 'animate-pulse'}`} />
        {isScanning ? '🔍 SCANNING...' : '🧪 ANALYZE NOW'}
      </button>

      {/* Secondary Actions Row */}
      <div className="flex gap-3">
        {/* Flashlight Toggle */}
        {torchSupported && onFlashlight && (
          <button
            onClick={onFlashlight}
            disabled={isScanning}
            className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
              torchEnabled 
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30' 
                : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
            } ${isScanning ? 'opacity-50' : ''}`}
            title={`Turn flashlight ${torchEnabled ? 'off' : 'on'}`}
          >
            <Lightbulb className={`w-5 h-5 ${torchEnabled ? 'text-yellow-400' : 'text-zinc-300'}`} />
            {torchEnabled ? 'Flash On' : 'Flash'}
          </button>
        )}
        
        {/* Enter Barcode Manually */}
        <button
          onClick={onEnterBarcode}
          className={`h-12 rounded-xl bg-zinc-800 text-zinc-100 flex items-center justify-center gap-2 border border-zinc-700 ${
            torchSupported ? 'flex-1' : 'w-full'
          }`}
        >
          <Keyboard className="w-5 h-5" />
          ⌨️ Manual Entry
        </button>
      </div>

      {/* Red cancel LAST */}
      {onCancel && (
        <button
          onClick={() => {
            console.log('[SCANNER] Cancel button clicked');
            onCancel();
          }}
          className="h-12 rounded-xl bg-red-600/90 text-white flex items-center justify-center gap-2"
        >
          <X className="w-5 h-5" />
          Cancel
        </button>
      )}
    </div>
  );
}
