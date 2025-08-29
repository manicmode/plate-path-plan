import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Keyboard, Target, Zap, X, Search, Mic, Lightbulb, ArrowLeft, FlashlightIcon } from 'lucide-react';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { prepareImageForAnalysis, prepareImageForAnalysisLegacy } from '@/lib/img/prepareImageForAnalysis';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { VoiceRecordingButton } from '../ui/VoiceRecordingButton';
import { normalizeHealthScanImage } from '@/utils/imageNormalization';
import { MultiPassBarcodeScanner } from '@/utils/barcodeScan';
import { BARCODE_V2 } from '@/lib/featureFlags';
import { freezeFrameAndDecode, unfreezeVideo, chooseBarcode } from '@/lib/scan/freezeDecode';
import { useSnapAndDecode } from '@/lib/barcode/useSnapAndDecode';
import { useTorch } from '@/lib/camera/useTorch';
import { scannerLiveCamEnabled } from '@/lib/platform';
import { toLegacyFromEdge } from '@/lib/health/toLegacyFromEdge';
import { openPhotoCapture } from '@/components/camera/photoCapture';
import { mark, measure, checkBudget } from '@/lib/perf';
import { PERF_BUDGET } from '@/config/perfBudget';

const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG_PERF === 'true';
const TORCH_FIX = import.meta.env.VITE_SCANNER_TORCH_FIX === 'true';

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
  onCapture: (imageData: string | { imageBase64: string; detectedBarcode: string | null }) => void;
  onManualEntry: () => void;
  onManualSearch?: (query: string, type: 'text' | 'voice') => void;
  onCancel?: () => void;
}


export const HealthScannerInterface: React.FC<HealthScannerInterfaceProps> = ({
  onCapture,
  onManualEntry,
  onManualSearch,
  onCancel
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [currentView, setCurrentView] = useState<'scanner' | 'manual' | 'notRecognized'>('scanner');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [warmScanner, setWarmScanner] = useState<MultiPassBarcodeScanner | null>(null);
  const { user } = useAuth();
  const { snapAndDecode, updateStreamRef } = useSnapAndDecode();
  const { supported, ready, on, toggle, attach } = useTorch();

  // Apply dynamic viewport height fix
  useDynamicViewportVar();

  // Performance throttling
  const lastDecodeTime = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const isVisible = useRef<boolean>(true);
  const THROTTLE_MS = PERF_BUDGET.scannerThrottleMs;

  // Scanner mount probe
  useEffect(() => {
    if (DEBUG) console.log('[SCANNER][MOUNT]');
    mark('[HS] component_mount');
    return () => {
      if (DEBUG) console.log('[SCANNER][UNMOUNT]');
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Page visibility handling for performance
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisible.current = !document.hidden;
      if (DEBUG) console.log('[HS] visibility', { visible: isVisible.current });
      
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
    // Don't mount scanner if photo modal is open
    if (document.body.getAttribute('data-photo-open') === '1') {
      if (DEBUG) console.log('[SCANNER][BLOCKED] Photo modal is open, not mounting scanner');
      return;
    }
    
    if (currentView === 'scanner') {
      startCamera();
      warmUpDecoder();
    }
    return () => {
      // 1) Torch off first
      const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks?.()?.[0];
      torchOff(track);

      // 2) Stop all tracks
      const stream = (videoRef.current?.srcObject as MediaStream) || undefined;
      if (stream) {
        for (const t of stream.getTracks()) {
          try { t.stop(); } catch {}
          try { stream.removeTrack(t); } catch {}
        }
      }

      // 3) Detach video & clear refs
      hardDetachVideo(videoRef.current);
      try { updateStreamRef?.(null); } catch {}
    };
  }, [currentView]);

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
      console.log('[WARM] Decoder warmed up');
    } catch (error) {
      console.warn('[WARM] Decoder warm-up failed:', error);
    }
  };

  useEffect(() => {
    if (currentView === 'manual' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [currentView]);

  const startCamera = async () => {
    // iOS fallback: use photo capture for photo analysis
    if (!scannerLiveCamEnabled()) {
      console.warn('[PHOTO] iOS fallback: photo capture (no live stream)');
      try {
        const file = await openPhotoCapture('image/*','environment');
        // Process the file with existing photo analysis flow
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageBase64 = e.target?.result as string;
          onCapture(imageBase64);
        };
        reader.readAsDataURL(file);
      } catch {}
      return null;
    }

    try {
      console.log("[VIDEO INIT] videoRef =", videoRef.current);
      if (!videoRef.current) {
        console.error("[VIDEO] videoRef is null — video element not mounted");
        return;
      }

      // High-res back camera request with optimized constraints for performance
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // don't use exact to keep iOS happy
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Defensive strip: remove any audio tracks that slipped in
      const s = mediaStream;
      s.getAudioTracks?.().forEach(t => { try { t.stop(); } catch {} try { s.removeTrack(t); } catch {} });

      console.log("[VIDEO] Stream received:", mediaStream);

      const videoTrack = mediaStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      
      if (DEBUG) {
        console.log('[HS] Stream settings:', {
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

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
          
          // Attach torch hook when stream changes
          if (TORCH_FIX) {
            const track = mediaStream.getVideoTracks()[0] || null;
            attach(track);
            if (DEBUG) console.info('[TORCH] attach', { hasTrack: !!track });
          }
        }
      
      // Log torch capabilities (debug only)
      const caps = videoTrack?.getCapabilities?.();
      if (DEBUG) {
        console.log('[TORCH] caps', caps ? Object.keys(caps) : 'none');
        console.log('[TORCH] supported', !!(caps && 'torch' in caps));
      }
    } catch (error: any) {
      console.warn('[PHOTO] Live video denied, using native capture', error?.name || error);
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

  const playCameraClickSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.log('Camera click sound not available');
    }
  };

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
    setIsFrozen(true);
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
            await track.applyConstraints({ 
              advanced: [{ zoom: ZOOM } as any] 
            });
            console.log('[HS] zoom applied:', ZOOM);
          } catch (zoomError) {
            console.log('[HS] zoom not supported:', zoomError);
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

      if (import.meta.env.VITE_DEBUG_PERF === 'true') {
        console.info('[PHOTO][ROUTE]', { 
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
        const DEBUG = import.meta.env.VITE_DEBUG_PERF === 'true';
        const HEALTH_DEBUG = import.meta.env.VITE_HEALTH_DEBUG_SAFE === 'true';
        const OCR_TIMEOUT_MS = 15000;

        // Import health diagnostics if debug enabled
        let hlog: any, newCID: any, safeScore: any, runFlagsEngine: any;
        if (HEALTH_DEBUG) {
          try {
            const logger = await import('@/lib/health/logger');
            const scorer = await import('@/lib/health/score');
            const flagger = await import('@/lib/health/flags');
            hlog = logger.hlog;
            newCID = logger.newCID;
            safeScore = scorer.safeScore;
            runFlagsEngine = flagger.runFlagsEngine;
          } catch (e) {
            console.warn('[HEALTH] Debug imports failed, continuing without diagnostics:', e);
          }
        }

        const cid = HEALTH_DEBUG && newCID ? newCID() : undefined;
        const ctx = HEALTH_DEBUG ? { cid, tags: ['PHOTO'] } : undefined;

        async function runVisionOCR(imageBase64: string) {
          let timeoutId: any;
          const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('timeout')), OCR_TIMEOUT_MS);
          });

          if (DEBUG) console.info('[PHOTO][OCR][HTTP]', { status: 'invoking', provider: 'vision' });
          if (HEALTH_DEBUG && hlog) hlog('[OCR][HTTP] request → vision-ocr', ctx);

          try {
            const ocrPromise = supabase.functions.invoke('vision-ocr', {
              body: { imageBase64 },
              headers: cid ? { 'x-cid': cid } : undefined
            });

            const result = await Promise.race([ocrPromise, timeoutPromise]);
            clearTimeout(timeoutId);

            const { data, error } = result as any;

            if (DEBUG) console.info('[PHOTO][OCR][RESP]', { ok: !!data?.ok, textLen: data?.text?.length ?? 0, reason: data?.reason });
            if (HEALTH_DEBUG && hlog) hlog('[OCR][RESP] payload', ctx, { ok: !!data?.ok, textLen: data?.text?.length ?? 0, reason: data?.reason });

            if (error) {
              if (DEBUG) console.info('[PHOTO][OCR][RESP]', { ok: false, reason: 'invoke_error', error });
              return { ok: false as const, reason: 'invoke_error' };
            }
            if (!data || typeof data !== 'object') {
              if (DEBUG) console.info('[PHOTO][OCR][RESP]', { ok: false, reason: 'no_data' });
              return { ok: false as const, reason: 'no_data' };
            }
            if (!data.ok) {
              if (DEBUG) console.info('[PHOTO][OCR][RESP]', { ok: false, reason: data.reason || 'provider_error' });
              return { ok: false as const, reason: data.reason || 'provider_error' };
            }

            return { ok: true as const, text: String(data.text || '') };
          } catch (err: any) {
            clearTimeout(timeoutId);
            const isTimeout = err?.message === 'timeout';
            if (DEBUG) console.info('[PHOTO][OCR][RESP]', { ok: false, reason: isTimeout ? 'timeout' : 'exception', err: String(err) });
            return { ok: false as const, reason: isTimeout ? 'timeout' : 'exception' };
          }
        }

        // Compress image for OCR
        const prep = await prepareImageForAnalysis(fullBlob, { 
          maxEdge: 1280, 
          quality: 0.7, 
          targetMaxBytes: 900_000 
        });

        if (HEALTH_DEBUG && hlog) hlog('Start capture', ctx);

        let ocrResult;
        try {
          ocrResult = await runVisionOCR(prep.base64NoPrefix);
          if (ocrResult.ok) {
            // Build unified report exactly like barcode/manual
            const { toLegacyFromPhoto } = await import('@/lib/health/toLegacyFromPhoto');
            const { parseNutritionFromOCR } = await import('@/lib/health/parseNutritionPanel');
            
            // Parse nutrition data
            const parsed = parseNutritionFromOCR(ocrResult.text);
            if (HEALTH_DEBUG && hlog) hlog('[PARSE] nutrition profile', ctx, parsed);

            const legacy = toLegacyFromPhoto(ocrResult.text);

            // Enhanced scoring if debug enabled
            let enhancedScore = legacy.healthScore;
            if (HEALTH_DEBUG && safeScore && parsed?.per100) {
              const scoreIn = {
                calories_per_serving: parsed.perServing?.energyKcal,
                sugar_g_per_100g: parsed.per100?.sugar_g,
                satfat_g_per_100g: parsed.per100?.satfat_g,
                sodium_mg_per_100g: parsed.per100?.sodium_mg,
                fiber_g_per_100g: parsed.per100?.fiber_g,
                protein_g_per_100g: parsed.per100?.protein_g,
                ultra_processed: false // Would need ingredient analysis for this
              };
              
              if (hlog) hlog('[SCORE_IN]', ctx, scoreIn);
              
              try {
                const scoreOut = await safeScore(scoreIn);
                if (hlog) hlog('[SCORE_OUT]', ctx, scoreOut);
                enhancedScore = scoreOut.finalScore / 10; // Convert to 0-10 scale
              } catch (e) {
                console.warn('[HEALTH] Safe scoring failed:', e);
              }
            }

            // Enhanced flags if debug enabled
            let enhancedFlags = legacy.flags;
            if (HEALTH_DEBUG && runFlagsEngine) {
              if (hlog) hlog('[FLAGS_IN] ingredients + facts', ctx, { 
                ingredients: parsed?.ingredients_text, 
                facts: parsed?.per100 
              });
              
              try {
                const newFlags = runFlagsEngine({ ...parsed, facts: parsed?.per100 });
                if (hlog) hlog('[FLAGS_OUT]', ctx, newFlags);
                
                // Convert to legacy format
                enhancedFlags = newFlags.map((f: any) => ({
                  title: f.code,
                  reason: f.reason,
                  severity: f.severity,
                  label: f.code,
                  description: f.reason
                }));
              } catch (e) {
                console.warn('[HEALTH] Enhanced flags failed:', e);
              }
            }
            
            const report = {
              source: 'photo',
              title: legacy.productName,
              image_url: fullBase64,
              health: { score: enhancedScore || legacy.healthScore, unit: '0-10' },
              ingredientFlags: (enhancedFlags || legacy.flags || []).map((f: any) => ({
                ingredient: f.title || f.label || f.code || 'Ingredient',
                flag: f.reason || f.description || f.label || '',
                severity: /high|danger/i.test(f.severity) ? 'high' : /med|warn/i.test(f.severity) ? 'medium' : 'low',
              })),
              nutritionData: legacy.nutritionData,
              ...(import.meta.env.VITE_SHOW_PER_SERVING === 'true' && {
                nutritionDataPerServing: legacy.nutritionDataPerServing,
              }),
              serving_size: legacy.serving_size,
              _dataSource: legacy._dataSource,
            };

            if (DEBUG) console.info('[PHOTO][FINAL]', {
              score10: report.health?.score,
              flagsCount: report.ingredientFlags?.length,
              per100g: {
                kcal: report.nutritionData?.energyKcal,
                sugar_g: report.nutritionData?.sugar_g,
                sodium_mg: report.nutritionData?.sodium_mg,
              },
              perServing: {
                kcal: report.nutritionDataPerServing?.energyKcal,
                sugar_g: report.nutritionDataPerServing?.sugar_g,
                sodium_mg: report.nutritionDataPerServing?.sodium_mg,
              },
              serving: report.serving_size,
            });

            if (HEALTH_DEBUG && hlog) hlog('[FINAL]', ctx, report);

            // Pass the report data in a compatible way
            onCapture({
              imageBase64: prep.base64NoPrefix,
              detectedBarcode: null
            });
            return;
          } else {
            // Graceful failure path - fall back to legacy pipeline
            if (DEBUG) console.warn('[PHOTO] Vision OCR failed, falling back to legacy:', ocrResult.reason);
            if (HEALTH_DEBUG && hlog) hlog('FAIL', { ...ctx, tags: ['PHOTO','FAIL'] }, ocrResult.reason);
          }
        } catch (error) {
          if (DEBUG) console.warn('[PHOTO] OCR pipeline exception, falling back to legacy:', error);
          if (HEALTH_DEBUG && hlog) hlog('FAIL', { ...ctx, tags: ['PHOTO','FAIL'] }, String(error));
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
      setIsFrozen(false); // Ensure this always runs for success, error, or timeout
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
      await toggle();
    } catch (error) {
      console.error("Error toggling torch:", error);
    }
  };

  const handleManualEntry = () => {
    setCurrentView('manual');
  };

  const handleSearchDatabase = async () => {
    if (barcodeInput.trim()) {
      console.log('🔍 Searching database for:', barcodeInput);
      
      // If we have the onManualSearch prop, use it (preferred)
      if (onManualSearch) {
        try {
          await onManualSearch(barcodeInput.trim(), 'text');
        } catch (error) {
          console.error('❌ Manual search failed:', error);
          throw error; // Re-throw to be caught by voice handler
        }
        return;
      }
      
      // Fallback: try to call the health-check-processor directly
      try {
        const { data, error } = await supabase.functions.invoke('health-check-processor', {
          body: {
            inputType: 'text',
            data: barcodeInput.trim(),
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

  const handleSuggestionClick = (suggestion: string) => {
    // Use the manual search if available, otherwise fall back to manual entry
    if (onManualSearch) {
      onManualSearch(suggestion, 'text');
    } else {
      setBarcodeInput(suggestion);
      onManualEntry(); // This will trigger the health check
    }
  };

  // Load suggestions when view changes to notRecognized (scan failed)
  useEffect(() => {
    if (currentView === 'notRecognized') {
      generateSmartSuggestions();
      setShowSuggestions(true);
    }
  }, [currentView]);

  // Scanner View
  if (currentView === 'scanner') {
    return (
      <div 
        className="scanner-root"
        style={{
          position: 'fixed',
          inset: 0,
          height: 'var(--app-dvh, 100dvh)',   // dynamic height
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
            className={`transition-opacity duration-300 ${isFrozen ? 'opacity-50' : 'opacity-100'}`}
          />
          
          {/* Shutter flash effect */}
          {isFrozen && (
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
            onCancel={onCancel}
            onEnterBarcode={handleManualEntry}
            onFlashlight={handleFlashlightToggle}
            isScanning={isScanning}
            torchEnabled={on}
            torchSupported={supported}
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
