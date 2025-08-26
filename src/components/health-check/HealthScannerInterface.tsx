import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Keyboard, Target, Zap, X, Search, Mic, Lightbulb, ArrowLeft, FlashlightIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { VoiceRecordingButton } from '../ui/VoiceRecordingButton';
import { normalizeHealthScanImage } from '@/utils/imageNormalization';
import { MultiPassBarcodeScanner } from '@/utils/barcodeScan';
import { BARCODE_V2 } from '@/lib/featureFlags';
import { freezeFrameAndDecode, unfreezeVideo, chooseBarcode, toggleTorch, isTorchSupported, stillFrameBarcodePass, safeTime, safeTimeEnd } from '@/lib/scan/freezeDecode';
import { useSnapAndDecode } from '@/lib/barcode/useSnapAndDecode';

interface HealthScannerInterfaceProps {
  onCapture: (imageData: string) => void;
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
  const { snapAndDecode, setTorch, isTorchSupported: torchSupported, torchEnabled, updateStreamRef } = useSnapAndDecode();

  // New response type for enhanced health scanner
  type HealthScanResponse = {
    ok: boolean;
    source?: 'barcode' | 'ocr';
    reason?: string;
    product?: {
      code?: string;
      name?: string;
      brand?: string;
      image?: string | null;
      ingredientsText?: string | null;
      nutriments?: {
        calories?: number|null;
        protein_g?: number|null;
        carbs_g?: number|null;
        fat_g?: number|null;
        sugar_g?: number|null;
        fiber_g?: number|null;
        sodium_mg?: number|null;
      };
    };
    health?: {
      score?: number;
      flags?: Array<{ kind: 'danger'|'warn'|'info'; label: string }>;
    };
    debug?: {
      ocrTokens?: string[];
      offQuery?: string;
      offHits?: number;
      bestScore?: number;
    };
  };

  const showImageNotRecognized = (reason?: string) => {
    setCurrentView('notRecognized');
  };

  // Tuning constants
  const QUICK_BUDGET_MS = 900;
  const ROI = { widthPct: 0.70, heightPct: 0.35 };
  const BURST_COUNT = 2;
  const BURST_DELAY_MS = 120;
  const ZOOM = 1.5;

  useEffect(() => {
    if (currentView === 'scanner') {
      startCamera();
      warmUpDecoder();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
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
    try {
      console.log("[VIDEO INIT] videoRef =", videoRef.current);
      if (!videoRef.current) {
        console.error("[VIDEO] videoRef is null — video element not mounted");
        return;
      }

      // High-res back camera request with optimized constraints
      console.log("[CAMERA] Requesting high-res back camera...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: false
      });

      const videoTrack = mediaStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      console.log("[CAMERA] Stream received:", {
        width: settings.width,
        height: settings.height,
        frameRate: settings.frameRate,
        facingMode: settings.facingMode
      });

      setStream(mediaStream);
      updateStreamRef(mediaStream); // Update hook's stream reference for torch functionality
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log("[CAMERA] srcObject set, playing video");
      }
    } catch (error) {
      console.error("[CAMERA FAIL] getUserMedia error:", error);  
      // Fallback to basic camera
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        setStream(fallbackStream);
        updateStreamRef(fallbackStream); // Update hook's stream reference for torch functionality
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (fallbackError) {
        console.error('Camera access completely failed:', fallbackError);
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

  // Optimize blob to target size while maintaining quality
  const optimizeBlobSize = async (originalBlob: Blob, targetSizeKB: number): Promise<Blob> => {
    const targetBytes = targetSizeKB * 1024;
    
    if (originalBlob.size <= targetBytes) {
      console.log(`📏 Blob already optimized: ${Math.round(originalBlob.size/1024)}KB`);
      return originalBlob;
    }
    
    console.log(`📏 Optimizing blob: ${Math.round(originalBlob.size/1024)}KB -> target: ${targetSizeKB}KB`);
    
    // Convert blob to canvas for resizing
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    return new Promise((resolve) => {
      img.onload = () => {
        // Calculate new dimensions (maintain aspect ratio, cap at 1024px)
        let { width, height } = img;
        const MAX_DIMENSION = 1024;
        
        if (width > height && width > MAX_DIMENSION) {
          height = (height * MAX_DIMENSION) / width;
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = (width * MAX_DIMENSION) / height;
          height = MAX_DIMENSION;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try different quality levels
        let quality = 0.82;
        const tryQuality = () => {
          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(originalBlob);
              return;
            }
            
            if (blob.size <= targetBytes || quality <= 0.3) {
              resolve(blob);
            } else {
              quality -= 0.1;
              tryQuality();
            }
          }, 'image/jpeg', quality);
        };
        
        tryQuality();
      };
      
      img.src = URL.createObjectURL(originalBlob);
    });
  };
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

    safeTime('[HS] analyze_total');
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

      // Use shared hook
      const result = await snapAndDecode({
        videoEl: video,
        budgetMs: QUICK_BUDGET_MS,
        roi: { wPct: ROI.widthPct, hPct: ROI.heightPct },
        logPrefix: '[HS]'
      });

      // Return early on any 8/12/13/14-digit hit (even if checksum is false)
      if (result.ok && result.raw && /^\d{8,14}$/.test(result.raw)) {
        console.log('[HS] off_fetch_start', { code: result.raw });
        
        // Optional: Add toast for PWA testing  
        if (window.location.search.includes('debug=toast')) {
          const { toast } = await import('sonner');
          toast.info(`[HS] off_fetch_start: ${result.raw}`);
        }
        try {
          const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
            body: { mode: 'barcode', barcode: result.raw, source: 'health' }
          });
          console.log('[HS] off_result', { status: error ? 'error' : 200, hit: !!data });
          
          if (error) {
            console.warn('[HS] analyzer_unreachable', { error });
            throw new Error('Analyzer temporarily unreachable. Check network & retry.');
          }
          
          // Optional: Add toast for PWA testing
          if (window.location.search.includes('debug=toast')) {
            const { toast } = await import('sonner');
            toast.success(`[HS] off_result: ${!!data ? 'hit' : 'miss'}`);
          }
          
          if (data && !error) { 
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
            
            onCapture(fullBase64 + `&barcode=${result.raw}`);
            setIsFrozen(false);
            console.timeEnd('[HS] analyze_total');
            return; 
          }
        } catch (analyzerError) {
          console.warn('[HS] analyzer_exception', { error: analyzerError });
          // Continue to next step
        }
      }

      // No live barcode found - try still frame barcode pass before OCR
      console.log('barcodeScan: { attempts: "multi-pass", hit: false }');
      
      // First, try still frame barcode detection
      const stillCanvas = await captureStill();
      const stillResult = await stillFrameBarcodePass(stillCanvas.canvas, { 
        budgetMs: 700, 
        logPrefix: '[HS]' 
      });
      
      // If still frame found a barcode, use it
      if (stillResult.raw && /^\d{8,14}$/.test(stillResult.raw)) {
        console.log('[HS] off_fetch_start', { code: stillResult.raw });
        
        try {
          const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
            body: { mode: 'barcode', barcode: stillResult.raw, source: 'health' }
          });
          console.log('[HS] off_result', { status: error ? 'error' : 200, hit: !!data });
          
          if (data && !error) { 
            const processedImageData = stillCanvas.canvas.toDataURL('image/jpeg', 0.8);
            onCapture(processedImageData);
            return; // Early return on success
          }
        } catch (e) {
          console.warn('[HS] analyzer_exception', { e });
          // Fall through to OCR
        }
      }
      
      // No barcode found in still frame - fall back to OCR analysis
      console.log('About to call enhanced-health-scanner function...');
      
      // Optimize payload and call OCR analysis
      stillCanvas.canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        // Check size and skip recompression if already ≤300KB
        console.log('[HS] payload_kb:', Math.round(blob.size/1024));
        const optimizedBlob = blob.size <= 300 * 1024 ? blob : await optimizeBlobSize(blob, 300);
        
        const fr = new FileReader();
        fr.onload = async () => {
          const base64 = String(fr.result).split(',')[1] || '';
          
          try {
            const { data, error } = await supabase.functions.invoke<HealthScanResponse>('enhanced-health-scanner', {
              body: { image_b64: base64, hasDetectedBarcode: false }
            });
            
            console.log('[HSF] off_result', {
              ok: data?.ok,
              source: data?.source,
              reason: data?.reason,
              bestScore: data?.debug?.bestScore,
              offHits: data?.debug?.offHits,
            });
            
            if (data?.ok && data?.product) {
              // Map to existing modal model (no UI changes)
              onCapture(stillCanvas.canvas.toDataURL('image/jpeg', 0.8));
            } else {
              showImageNotRecognized(data?.reason ?? 'not_recognized');
            }
          } catch (e) {
            console.warn('[HS] analyzer_exception', { e });
            showImageNotRecognized('network_error');
          }
        };
        fr.readAsDataURL(optimizedBlob);
      }, 'image/jpeg', 0.82);
      
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
      safeTimeEnd('[HS] analyze_total');
      setIsScanning(false);
      setIsFrozen(false);
    }
  };

  const runExistingFullDecodePipeline = async (canvas: HTMLCanvasElement) => {
    let detectedBarcode: string | null = null;
    let barcodeResult: any = null;
    
    // Multi-pass barcode scanning if BARCODE_V2 enabled
    if (BARCODE_V2) {
      const scanner = new MultiPassBarcodeScanner();
      barcodeResult = await scanner.scan(canvas);
      
      if (barcodeResult) {
        detectedBarcode = barcodeResult.text;
        console.log("🔍 barcodeScan:", {
          attempts: barcodeResult.scale ? 'multi-scale' : 'multi-pass',
          hit: true,
          pass: barcodeResult.passName,
          rotation: barcodeResult.rotation,
          scale: barcodeResult.scale,
          format: barcodeResult.format,
          checkDigit: barcodeResult.checkDigitValid,
          value: detectedBarcode
        });
      } else {
        console.log("🔍 barcodeScan:", {
          attempts: 'multi-pass',
          hit: false
        });
      }
    }
    
    // Convert to base64 using CSP-safe method
    const fullBlob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.82);
    });

    // Optimize blob size for network reliability (<= 300KB)
    const optimizedBlob = await optimizeBlobSize(fullBlob, 300);
    
    const fullBase64 = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(optimizedBlob);
    });
    
    console.log(`📏 Optimized payload: ${Math.round((optimizedBlob.size)/1024)}KB`);
    
    // If barcode detected with valid check digit, short-circuit to OFF lookup
    if (detectedBarcode && (!barcodeResult.checkDigitValid || barcodeResult.checkDigitValid)) {
      console.log("🎯 Barcode path - short-circuiting to OFF lookup");
      
      // Call health processor with barcode
      const body = {
        detectedBarcode,
        imageBase64: fullBase64.split(',')[1], // Remove data URL prefix
        mode: 'scan',
        device: { 
          dpr: window.devicePixelRatio || 1, 
          vw: (videoRef.current?.videoWidth || 1920), 
          vh: (videoRef.current?.videoHeight || 1080)
        },
        hasDetectedBarcode: true
      };
      
      try {
        const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
          body
        });
        
        console.log('[HS] off_result', { status: error ? 'error' : 200, hit: !!data });
        
        if (!error && data && !data.fallback) {
          console.log("✅ Barcode path success:", data);
          onCapture(fullBase64 + `&barcode=${detectedBarcode}`);
          return;
        } else {
          console.log("⚠️ Barcode lookup failed or returned fallback, proceeding with image analysis");
        }
      } catch (funcError) {
        console.warn('[HS] barcode_lookup_exception', { error: funcError });
        // Continue to image analysis fallback
      }
    }
    
    // No barcode or barcode lookup failed - proceed with image analysis
    onCapture(fullBase64);
  };

  const handleFlashlightToggle = async () => {
    console.log('[HS] handleFlashlightToggle called', { 
      hasStream: !!stream, 
      torchEnabled,
      torchSupported: torchSupported()
    });
    
    if (!stream) {
      console.log('[HS] No stream available for flashlight toggle');
      return;
    }
    
    const newTorchState = !torchEnabled;
    console.log('[HS] Attempting to toggle torch to:', newTorchState);
    
    try {
      await setTorch(newTorchState);
      console.log('[HS] Flashlight toggle completed successfully');
    } catch (error) {
      console.error('[HS] Flashlight toggle failed:', error);
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
        onManualSearch(barcodeInput.trim(), 'text');
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
      <div className="relative flex flex-col min-h-dvh bg-black">
        {/* camera/video area */}
        <main className="flex-1 relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${isFrozen ? 'opacity-50' : 'opacity-100'}`}
          />
          
          {/* Shutter flash effect */}
          {isFrozen && (
            <div className="absolute inset-0 bg-white animate-pulse opacity-20 pointer-events-none"></div>
          )}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Scanning Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
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
                Scan a food barcode or aim your camera at a meal to inspect its health profile!
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

        {/* Sticky footer (always visible) */}
        <footer className="sticky bottom-0 z-40 bg-black/70 backdrop-blur-md px-4 pt-3 pb-safe">
          <ScannerActions
            onAnalyze={captureImage}
            onCancel={onCancel}
            onEnterBarcode={handleManualEntry}
            onFlashlight={handleFlashlightToggle}
            isScanning={isScanning}
            torchEnabled={torchEnabled}
            torchSupported={torchSupported()}
          />
        </footer>
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
              onVoiceResult={(text) => {
                console.log('🎤 Voice result received in HealthScanner:', text);
                setBarcodeInput(text);
                handleSearchDatabase();
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
      {/* GREEN CTA and Flashlight Toggle Row */}
      <div className="flex gap-2">
        <button
          onClick={onAnalyze}
          disabled={isScanning}
          className="flex-1 h-14 rounded-2xl text-lg font-semibold bg-emerald-600 text-white shadow-lg active:scale-[.99] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Zap className={`w-6 h-6 ${isScanning ? 'animate-spin' : 'animate-pulse'}`} />
          {isScanning ? '🔍 SCANNING...' : '🧪 ANALYZE NOW'}
        </button>
        
        {/* Flashlight Toggle */}
        {torchSupported && onFlashlight && (
          <button
            onClick={onFlashlight}
            disabled={isScanning}
            className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg active:scale-[.99] disabled:opacity-50 transition-colors ${
              torchEnabled 
                ? 'bg-yellow-500 text-white' 
                : 'bg-zinc-800 text-zinc-100'
            }`}
            title="Flashlight"
          >
            <FlashlightIcon className={`w-6 h-6 ${torchEnabled ? 'text-white' : 'text-zinc-300'}`} />
          </button>
        )}
      </div>

      {/* Middle: Enter Barcode Manually (unchanged) */}
      <button
        onClick={onEnterBarcode}
        className="h-12 rounded-xl bg-zinc-800 text-zinc-100 flex items-center justify-center gap-2"
      >
        <Keyboard className="w-5 h-5" />
        ⌨️ Enter Barcode Manually
      </button>

      {/* Red cancel LAST */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="h-12 rounded-xl bg-red-600/90 text-white flex items-center justify-center gap-2"
        >
          <X className="w-5 h-5" />
          Cancel
        </button>
      )}
    </div>
  );
}
