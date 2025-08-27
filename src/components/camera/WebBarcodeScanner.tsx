import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, AlertCircle, FlashlightIcon, Zap } from 'lucide-react';
import { MultiPassBarcodeScanner } from '@/utils/barcodeScan';
import { useSnapAndDecode } from '@/lib/barcode/useSnapAndDecode';
import { useCamera } from '@/lib/media/useMediaDevices';

interface WebBarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  onClose: () => void;
}

export const WebBarcodeScanner: React.FC<WebBarcodeScannerProps> = ({
  onBarcodeDetected,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFrozen, setIsFrozen] = useState(false);
  const [warmScanner, setWarmScanner] = useState<MultiPassBarcodeScanner | null>(null);
  const scanningIntervalRef = useRef<NodeJS.Timeout>();
  
  // Use camera hook instead of manual stream management
  const camera = useCamera({
    facingMode: 'environment',
    width: 1280,
    height: 720
  });
  
  const { snapAndDecode } = useSnapAndDecode();

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
      console.error('[WEB] Video ref not available');
      return;
    }

    console.time('[WEB] analyze_total');
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
      if (camera.stream) {
        const track = camera.stream.getVideoTracks()[0];
        if (track) {
          try {
            await track.applyConstraints({ 
              advanced: [{ zoom: ZOOM } as any] 
            });
            console.log('[WEB] zoom applied:', ZOOM);
          } catch (zoomError) {
            console.log('[WEB] zoom not supported:', zoomError);
          }
        }
      }

      // Use shared hook
      const result = await snapAndDecode({
        videoEl: video,
        budgetMs: QUICK_BUDGET_MS,
        roi: { wPct: ROI.widthPct, hPct: ROI.heightPct },
        logPrefix: '[WEB]'
      });

      // Return early on any 8/12/13/14-digit hit
      if (result.ok && result.raw && /^\d{8,14}$/.test(result.raw)) {
        console.log('[WEB] barcode_found', { code: result.raw });
        onBarcodeDetected(result.raw);
        cleanup();
        onClose();
        console.timeEnd('[WEB] analyze_total');
        return; 
      }

      // 2) Burst fallback (parallel capture and race)
      console.log('[WEB] burst_start');
      const burstPromises = Array.from({ length: BURST_COUNT }).map(async (_, i) => {
        await new Promise(r => setTimeout(r, BURST_DELAY_MS * (i + 1)));
        return await snapAndDecode({
          videoEl: video,
          budgetMs: QUICK_BUDGET_MS,
          roi: { wPct: ROI.widthPct, hPct: ROI.heightPct },
          logPrefix: '[WEB]'
        });
      });

      const winner = await Promise.race(burstPromises);
      if (winner.ok && winner.raw && /^\d{8,14}$/.test(winner.raw)) {
        console.log('[WEB] burst_winner', { code: winner.raw });
        onBarcodeDetected(winner.raw);
        cleanup();
        onClose();
        console.timeEnd('[WEB] analyze_total');
        return; 
      }

      // 3) No barcode found
      console.log('[WEB] no_barcode_found');
      setError('No barcode detected. Please try again with better lighting.');
      
    } catch (error) {
      console.error('[WEB] Scan error:', error);
      setError('Failed to scan barcode. Please try again.');
    } finally {
      setIsScanning(false);
      setIsFrozen(false);
      console.timeEnd('[WEB] analyze_total');
    }
  };

  const handleFlashlightToggle = async () => {
    try {
      if (camera.torch.supported && camera.isActive) {
        // Simple toggle - try turning off first, then on
        try {
          await camera.torch.off();
        } catch {
          await camera.torch.on();
        }
      }
    } catch (error) {
      console.error('Failed to toggle flashlight:', error);
    }
  };

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

  const startCamera = async () => {
    try {
      console.log("[WEB] Starting camera with useCamera hook...");
      await camera.start();
      if (videoRef.current) {
        await camera.attach(videoRef.current);
      }
      setIsScanning(false); // Ready to scan
      setError(null);
    } catch (err) {
      console.error("[WEB] Failed to start camera:", err);
      setError('Unable to access camera. Please check permissions and try again.');
    }
  };

  // Update video element when camera stream changes
  useEffect(() => {
    if (camera.stream && videoRef.current) {
      camera.attach(videoRef.current);
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [camera.stream, camera.attach]);

  const cleanup = async () => {
    if (scanningIntervalRef.current) {
      clearInterval(scanningIntervalRef.current);
      scanningIntervalRef.current = undefined;
    }
    
    // Turn off torch before stopping
    try {
      await camera.torch.off();
    } catch (error) {
      console.warn('Failed to turn off torch:', error);
    }
    
    // Stop camera
    camera.stop();
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
    setError(null);
    setIsFrozen(false);
  };

  useEffect(() => {
    startCamera();
    warmUpDecoder();
    return () => {
      cleanup();
    };
  }, []);

  const handleClose = () => {
    cleanup();
    onClose();
  };

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
      <div className="relative h-[60vh] bg-black overflow-hidden rounded-xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isFrozen ? 'opacity-50' : 'opacity-100'}`}
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
        <div className="absolute inset-0 flex items-center justify-center">
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
              disabled={isScanning || !camera.isActive}
              className="flex-1 h-12 rounded-2xl text-lg font-semibold bg-emerald-600 text-white shadow-lg active:scale-[.99] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Zap className={`w-5 h-5 ${isScanning ? 'animate-spin' : 'animate-pulse'}`} />
              {isFrozen ? 'ANALYZING...' : 'SNAP & DECODE'}
            </button>
            
            {/* Flashlight Toggle */}
            {camera.torch.supported && (
              <button
                onClick={handleFlashlightToggle}
                disabled={isScanning || !camera.isActive}
                className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg active:scale-[.99] disabled:opacity-50 transition-colors ${
                  camera.isActive 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-zinc-800 text-zinc-100'
                }`}
                title="Flashlight"
              >
                <FlashlightIcon className={`w-5 h-5 ${camera.isActive ? 'text-white' : 'text-zinc-300'}`} />
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