import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Camera, Lightbulb, Upload } from 'lucide-react';
import { useTorch } from '@/lib/camera/useTorch';
import { prepareImageForAnalysis } from '@/lib/img/prepareImageForAnalysis';
import { supabase } from '@/integrations/supabase/client';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { toast } from 'sonner';
import { scannerLiveCamEnabled } from '@/lib/platform';
import { openPhotoCapture } from '@/components/camera/photoCapture';
import { toLegacyFromPhoto } from '@/lib/health/toLegacyFromPhoto';
import { getOCR } from '@/lib/ocr';


function torchOff(track?: MediaStreamTrack) {
  try { track?.applyConstraints?.({ advanced: [{ torch: false }] as any }); } catch {}
}

function hardDetachVideo(video?: HTMLVideoElement | null) {
  if (!video) return;
  try { video.pause(); } catch {}
  try { (video as any).srcObject = null; } catch {}
  try { video.removeAttribute('src'); video.load?.(); } catch {}
}

interface PhotoCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (imageData: string) => void;
  onManualFallback: () => void;
}


// 1) Verify flags once (and print them)
const CFG = {
  PHOTO_ENABLED: import.meta.env.VITE_FEATURE_TAKE_PHOTO_ENABLED === 'true',
  PIPE_V1: import.meta.env.VITE_PHOTO_PIPE_V1 === 'true',
  PHOTO_BARCODES: import.meta.env.VITE_PHOTO_BARCODES_ENABLE === 'true',
  DEBUG: import.meta.env.VITE_DEBUG_PERF === 'true',
};

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  open,
  onOpenChange,
  onCapture,
  onManualFallback
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'camera' | 'photo-ocr-missing' | 'photo-ocr-failed' | 'photo-ocr-unavailable' | 'photo-ocr-error' | 'photo-ocr-too-large' | 'photo-ocr-service-down'>('camera');
  const inFlightRef = useRef<boolean>(false);
  const controllerRef = useRef<AbortController | null>(null);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<number>(0);

  const { supportsTorch, torchOn, setTorch, ensureTorchState } = useTorch(trackRef);

  // Print config once for debugging
  useEffect(() => {
    if (CFG.DEBUG) console.info('[PHOTO][CFG]', CFG);
  }, []);

  // 2) Hard block any scan hub while Take Photo is open
  useEffect(() => {
    if (open) {
      if (CFG.DEBUG) console.info('[PHOTO][BLOCK] Setting data-photo-open=1');
      document.body.setAttribute('data-photo-open', '1');
    } else {
      if (CFG.DEBUG) console.info('[PHOTO][BLOCK] Removing data-photo-open');
      document.body.removeAttribute('data-photo-open');
    }
    return () => {
      if (CFG.DEBUG) console.info('[PHOTO][BLOCK] Cleanup removing data-photo-open');
      document.body.removeAttribute('data-photo-open');
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      cleanup();
    }
    
    return cleanup;
  }, [open]);

  // 4) Cleanup on unmount (prevents "scanner remount" race)
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    controllerRef.current?.abort?.();
  }, []);

  const startCamera = async () => {
    try {
      console.log("[PHOTO] Requesting camera stream...");
      const constraints = {
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Defensive strip: remove any audio tracks that slipped in
      const s = mediaStream;
      s.getAudioTracks?.().forEach(t => { try { t.stop(); } catch {} try { s.removeTrack(t); } catch {} });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        
        const track = mediaStream.getVideoTracks()[0];
        trackRef.current = track;
        setStream(mediaStream);
        
        // Ensure torch state after track is ready
        setTimeout(() => {
          ensureTorchState();
        }, 100);
        
        setError(null);
      }
    } catch (err: any) {
      console.warn('[PHOTO] Live video denied, using native capture', err?.name || err);
      try {
        const file = await openPhotoCapture('image/*','environment');
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageBase64 = e.target?.result as string;
          onCapture(imageBase64);
        };
        reader.readAsDataURL(file);
        onOpenChange(false);
        return null;
      } catch (fallbackErr) {
        console.error("[PHOTO] Both live and photo capture failed:", err, fallbackErr);
        setError('Unable to access camera. Please check permissions and try again.');
      }
    }
  };

  const cleanup = () => {
    const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks?.()?.[0];
    torchOff(track);

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    hardDetachVideo(videoRef.current);
    
    trackRef.current = null;
    setStream(null);
    setIsCapturing(false);
  };

  const toggleTorch = async () => {
    try {
      console.log("[PHOTO-TORCH] Attempting to toggle torch. Current state:", torchOn, "Track:", !!trackRef.current);
      const result = await setTorch(!torchOn);
      console.log("[PHOTO-TORCH] Toggle result:", result);
      if (!result.ok) {
        console.warn("Torch toggle failed:", result.reason);
        toast.error(`Flash not available: ${result.reason}`);
      } else {
        console.log("[PHOTO-TORCH] Successfully toggled torch to:", !torchOn);
      }
    } catch (error) {
      console.error("Error toggling torch:", error);
      toast.error("Failed to toggle flashlight");
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

// Helper function to convert canvas to Uint8Array for OCR
const canvasToBytes = async (canvas: HTMLCanvasElement): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Canvas toBlob failed'));
        return;
      }
      const arrayBuffer = await blob.arrayBuffer();
      resolve(new Uint8Array(arrayBuffer));
    }, 'image/jpeg', 0.85);
  });
};

// 3) Rewire the capture handler to OCR (never call mode:'scan')
  const capturePhoto = async () => {
    if (!videoRef.current || !stream) return;
    
    if (!CFG.PHOTO_ENABLED || !CFG.PIPE_V1) return; // keep old behavior / noop

    if (inFlightRef.current) return; // re-entry guard
    inFlightRef.current = true;
    
    setIsCapturing(true);
    playCameraClickSound();

    try {
      console.log('[PHOTO] Capturing photo...');
      
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
      const capturedImageUrl = imageBase64;
      
      console.log('[PHOTO] Photo captured, processing...');
      
      let routedToBarcode = false;

      // Single barcode-from-image try
      if (CFG.PHOTO_BARCODES) {
        // TODO: Implement tryDecodeBarcodeFromImage when barcode detection is ready
        // const bc = await tryDecodeBarcodeFromImage(imageBase64);
        if (CFG.DEBUG) console.info('[PHOTO][ROUTE]', { foundBarcode: false });
        // if (bc) {
        //   routedToBarcode = true;
        //   await runBarcodeFlow(bc); // existing barcode path
        //   return;
        // }
      }

      // Compress image for OCR
      const prep = await prepareImageForAnalysis(canvas);
      const imageBytes = await canvasToBytes(canvas);

      // OCR using new function
      const ocrResult = await getOCR(`data:image/jpeg;base64,${prep.base64NoPrefix}`);
      if (!ocrResult.ok) {
        if (CFG.DEBUG) console.info('[PHOTO][OCR]', { skipped: true, reason: ocrResult.reason });
        // Stay in modal with precise reason
        const status = ocrResult.reason === 'provider_disabled' ? 'photo-ocr-unavailable' : 'photo-ocr-failed';
        setStatus(status);
        toast.info('OCR unavailable—try barcode or manual entry.');
        return;
      }

      // Extract text
      const text = ocrResult.text || '';
      if (CFG.DEBUG) console.info('[PHOTO][OCR][FINAL]', { textLen: text.length, snippet: text.slice(0, 100) });
      if (!text || text.trim().length < 8) {
        if (CFG.DEBUG) console.info('[PHOTO][OCR][EMPTY]');
        setStatus('photo-ocr-missing'); // stays in modal
        return;
      }
      if (CFG.DEBUG) console.info('[PHOTO][OCR]', { success: true, textLength: text.length });

      // Parse & map to unified shape
      const legacy = toLegacyFromPhoto(text);

      const report = {
        source: 'photo',
        title: legacy.productName,
        image_url: capturedImageUrl,
        health: { score: legacy.healthScore, unit: '0-10' },
        ingredientFlags: (legacy.flags || []).map((f: any) => ({
          ingredient: f.title || f.label || f.code || 'Ingredient',
          flag: f.reason || f.description || f.label || '',
          severity: (/high|danger/i.test(f.severity) ? 'high' : /med|warn/i.test(f.severity) ? 'medium' : 'low') as 'low'|'medium'|'high',
        })),
        nutritionData: legacy.nutritionData,
        ...(import.meta.env.VITE_SHOW_PER_SERVING === 'true' && {
          nutritionDataPerServing: legacy.nutritionDataPerServing,
        }),
        serving_size: legacy.serving_size,
        _dataSource: legacy._dataSource,
      };

      if (CFG.DEBUG) console.info('[PHOTO][FINAL]', {
        score10: report.health?.score,
        flagsCount: report.ingredientFlags?.length,
        per100g: { kcal: report.nutritionData?.energyKcal, sugar_g: report.nutritionData?.sugar_g, sodium_mg: report.nutritionData?.sodium_mg },
        perServing: { kcal: report.nutritionDataPerServing?.energyKcal, sugar_g: report.nutritionDataPerServing?.sugar_g, sodium_mg: report.nutritionDataPerServing?.sodium_mg },
        serving: report.serving_size
      });

      // Process with existing analyzer flow - pass as string for compatibility
      onCapture(JSON.stringify(report));
      onOpenChange(false);
      
      } catch (error) {
        console.error('[PHOTO] Capture failed:', error);
        toast.error('Failed to capture photo. Please try again.');
        setStatus('photo-ocr-error');
      } finally {
        setIsCapturing(false);
        inFlightRef.current = false;
      }
    };

  const handleImageUpload = async () => {
    if (!CFG.PHOTO_ENABLED || !CFG.PIPE_V1) {
      // Old behavior
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const imageBase64 = e.target?.result as string;
            console.log('[PHOTO] Image uploaded, processing...');
            onCapture(imageBase64);
            onOpenChange(false);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
      return;
    }
    
    // New OCR-direct flow
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsCapturing(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
          const imageBase64 = e.target?.result as string;
          console.log('[PHOTO] Image uploaded, processing...');
          
          try {
            // Process through same OCR flow as capture
            const response = await fetch(imageBase64);
            const blob = await response.blob();
            const prep = await prepareImageForAnalysis(blob);
            const arrayBuffer = await blob.arrayBuffer();
            const imageBytes = new Uint8Array(arrayBuffer);

            // OCR using new function
            const ocrResult = await getOCR(imageBase64);
            if (!ocrResult.ok) {
              if (CFG.DEBUG) console.info('[PHOTO][OCR]', { skipped: true, reason: ocrResult.reason });
              const status = ocrResult.reason === 'provider_disabled' ? 'photo-ocr-unavailable' : 'photo-ocr-failed';
              setStatus(status);
              toast.info('OCR unavailable—try barcode or manual entry.');
              return;
            }

            // Extract text
            const text = ocrResult.text || '';
            if (CFG.DEBUG) console.info('[PHOTO][OCR][FINAL]', { textLen: text.length, snippet: text.slice(0, 100) });
            if (!text || text.trim().length < 8) {
              if (CFG.DEBUG) console.info('[PHOTO][OCR][EMPTY]');
              setStatus('photo-ocr-missing'); // stays in modal
              return;
            }
            if (CFG.DEBUG) console.info('[PHOTO][OCR]', { success: true, textLength: text.length });

            const legacy = toLegacyFromPhoto(text);
            const report = {
              source: 'photo',
              title: legacy.productName,
              image_url: imageBase64,
              health: { score: legacy.healthScore, unit: '0-10' },
              ingredientFlags: (legacy.flags || []).map((f: any) => ({
                ingredient: f.title || f.label || f.code || 'Ingredient',
                flag: f.reason || f.description || f.label || '',
                severity: (/high|danger/i.test(f.severity) ? 'high' : /med|warn/i.test(f.severity) ? 'medium' : 'low') as 'low'|'medium'|'high',
              })),
              nutritionData: legacy.nutritionData,
              ...(import.meta.env.VITE_SHOW_PER_SERVING === 'true' && {
                nutritionDataPerServing: legacy.nutritionDataPerServing,
              }),
              serving_size: legacy.serving_size,
              _dataSource: legacy._dataSource,
            };

            if (CFG.DEBUG) console.info('[PHOTO][FINAL]', {
              score10: report.health?.score,
              flagsCount: report.ingredientFlags?.length,
              per100g: { kcal: report.nutritionData?.energyKcal, sugar_g: report.nutritionData?.sugar_g, sodium_mg: report.nutritionData?.sodium_mg },
              perServing: { kcal: report.nutritionDataPerServing?.energyKcal, sugar_g: report.nutritionDataPerServing?.sugar_g, sodium_mg: report.nutritionDataPerServing?.sodium_mg },
              serving: report.serving_size
            });

            onCapture(JSON.stringify(report));
            onOpenChange(false);
          } catch (error) {
            console.error('[PHOTO] Upload processing failed:', error);
            toast.error('Failed to process uploaded image.');
            setStatus('photo-ocr-error');
          } finally {
            setIsCapturing(false);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleExit = () => {
    onOpenChange(false);
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

          {/* UI Overlay */}
          <div className="absolute inset-0 flex flex-col">
            {/* Header Banner - moved all the way up */}
            <div className="absolute top-4 left-4 right-4 z-20 mt-[env(safe-area-inset-top)]">
              <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl">📸</span>
                  </div>
                  <h2 className="text-white text-xl font-bold text-center">
                    Photo Health Analyzer
                  </h2>
                </div>
                <p className="text-green-300 text-sm animate-pulse text-center">
                  Take a photo of brand product or a meal for health report!
                </p>
              </div>
            </div>

            {/* Center - Camera Viewfinder - positioned below banner with more spacing */}
            <div className="absolute top-44 bottom-48 left-4 right-4 flex items-center justify-center">
              {/* Camera frame overlay - Extended vertically to use most of the available space */}
              <div className="relative w-full max-w-[400px] h-full pointer-events-none">
                {/* Corner indicators */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400"></div>
                
                {/* Center crosshair */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-6 h-6 border border-cyan-400 rounded-full opacity-60"></div>
                </div>
              </div>
            </div>

            {/* Bottom gradient */}
            <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-10" />
            
            {/* Flashlight Button - Positioned above upload button */}
            {supportsTorch && (
              <div className="absolute bottom-32 right-12 pb-[env(safe-area-inset-bottom)] z-50 pointer-events-auto">
                <Button
                  onClick={toggleTorch}
                  size="lg"
                  className={`rounded-full w-12 h-12 p-0 transition-all duration-200 border-2 shadow-lg ${
                    torchOn 
                      ? 'bg-white/20 hover:bg-white/30 text-yellow-400 border-yellow-400 shadow-yellow-400/30' 
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/40'
                  }`}
                  title={`Turn flashlight ${torchOn ? 'off' : 'on'}`}
                >
                  <Lightbulb className={`h-5 w-5 ${torchOn ? 'text-yellow-400' : 'text-white'}`} />
                </Button>
              </div>
            )}
            
            {/* Bottom Controls */}
            <footer className="absolute bottom-8 inset-x-0 pb-[env(safe-area-inset-bottom)] px-8 z-20">
              {/* Instructions */}
              <div className="text-center text-white/90 mb-6">
                <p className="text-lg font-medium">Position food in the frame</p>
                <p className="text-sm text-white/70 mt-1">Capture, upload, or exit</p>
              </div>
              
              {/* Three Control Buttons */}
              <div className="flex justify-center items-center gap-8">
                {/* Exit Button - Red */}
                <Button
                  onClick={handleExit}
                  size="lg"
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full w-14 h-14 p-0"
                >
                  <X className="h-5 w-5" />
                </Button>

                {/* Capture Button - Center, larger */}
                <Button
                  onClick={capturePhoto}
                  disabled={isCapturing || !stream}
                  size="lg"
                  className="bg-white text-black hover:bg-gray-200 rounded-full w-20 h-20 p-0 disabled:opacity-50"
                >
                  {isCapturing ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent" />
                  ) : (
                    <Camera className="h-8 w-8" />
                  )}
                </Button>

                {/* Upload Button */}
                <Button
                  onClick={handleImageUpload}
                  size="lg"
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-14 h-14 p-0"
                >
                  <Upload className="h-5 w-5" />
                </Button>
              </div>
            </footer>
          </div>

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-8">
              <div className="text-center text-white">
                <p className="text-lg mb-4">{error}</p>
                <Button onClick={startCamera} variant="outline" className="text-white border-white">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* OCR Missing State */}
          {status === 'photo-ocr-missing' && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-8">
              <div className="text-center text-white max-w-sm">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold mb-2">OCR Unavailable</h3>
                <p className="text-white/70 mb-6">
                  Text recognition is not configured. Try scanning a barcode or manual entry instead.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={() => {setStatus('camera'); onManualFallback();}} 
                    variant="outline" 
                    className="text-white border-white"
                  >
                    Manual Entry
                  </Button>
                  <Button 
                    onClick={() => setStatus('camera')} 
                    className="bg-primary"
                  >
                    Back to Camera
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* OCR Error State */}
          {status === 'photo-ocr-error' && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-8">
              <div className="text-center text-white max-w-sm">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold mb-2">OCR Failed</h3>
                <p className="text-white/70 mb-6">
                  Could not read text from the photo. Try taking another photo or manual entry.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={() => {setStatus('camera'); onManualFallback();}} 
                    variant="outline" 
                    className="text-white border-white"
                  >
                    Manual Entry
                  </Button>
                  <Button 
                    onClick={() => setStatus('camera')} 
                    className="bg-primary"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};