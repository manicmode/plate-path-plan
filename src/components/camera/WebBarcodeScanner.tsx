import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Camera, AlertCircle } from 'lucide-react';
import { MultiPassBarcodeScanner } from '@/utils/barcodeScan';
import { supabase } from '@/integrations/supabase/client';

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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isFrozen, setIsFrozen] = useState(false);
  const [warmScanner, setWarmScanner] = useState<MultiPassBarcodeScanner | null>(null);
  const scanningIntervalRef = useRef<NodeJS.Timeout>();

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
    console.log('[HS] analyze_start');
    
    if (!videoRef.current) {
      console.error('[HS] Video ref not available');
      return;
    }

    const t0 = performance.now();
    setIsFrozen(true);
    
    let track: MediaStreamTrack | null = null;
    
    try {
      const video = videoRef.current;
      await video.play();
      
      // Apply camera constraints before capture
      if (stream) {
        track = stream.getVideoTracks()[0];
        if (track) {
          try {
            await track.applyConstraints({ 
              advanced: [{ zoom: ZOOM } as any] 
            });
            console.log('[HS] zoom applied:', ZOOM);
          } catch (zoomError) {
            console.log('[HS] zoom not supported:', zoomError);
          }
          
          // Enable torch if supported
          try {
            await track.applyConstraints({ 
              advanced: [{ torch: true } as any] 
            });
            console.log('[HS] torch enabled');
          } catch (torchError) {
            console.log('[HS] torch not supported:', torchError);
          }
        }
      }
      
      const vw = video.videoWidth, vh = video.videoHeight;
      const roiW = Math.round(vw * ROI.widthPct);
      const roiH = Math.round(vh * ROI.heightPct);
      
      console.log('[HS] roi', {
        vw, vh, roiW, roiH, 
        x: Math.round((vw - roiW) / 2), 
        y: Math.round((vh - roiH) / 2)
      });

      const still = await captureStillFromVideo(video);
      const roi = cropReticleROI(still);

      console.time('[HS] decode');
      const scanner = warmScanner || new MultiPassBarcodeScanner();
      const quick = await scanner.scanQuick(roi);
      console.timeEnd('[HS] decode');
      
      const ms = Math.round(performance.now() - t0);
      const raw = quick?.text ?? null;
      
      console.log('[HS] barcode_ms:', ms);
      console.log('[HS] barcode_result:', { 
        raw, 
        type: quick?.format ?? null, 
        checksumOk: quick?.checkDigitValid ?? null, 
        reason: quick ? 'decoded' : 'not_found'
      });

      // Return early on any 8/12/13/14-digit hit (even if checksum is false)
      if (raw && /^\d{8,14}$/.test(raw)) {
        console.log('[HS] off_fetch_start', { code: raw });
        const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
          body: { mode: 'barcode', barcode: raw, source: 'log' }
        });
        console.log('[HS] off_result', { status: error ? 'error' : 200, hit: !!data });
        if (data && !error) { 
          onBarcodeDetected(raw);
          cleanup();
          onClose();
          console.log('[HS] analyze_total:', Math.round(performance.now() - t0));
          return; 
        }
      }

      // Parallelize burst capture (race)  
      console.log('[HS] burst_start');
      const burstPromises = Array.from({ length: BURST_COUNT }).map(async (_, i) => {
        await new Promise(r => setTimeout(r, BURST_DELAY_MS * (i + 1)));
        const s = await captureStillFromVideo(video);
        const r = cropReticleROI(s);
        return await scanner.scanQuick(r);
      });

      const winner = await Promise.race(burstPromises);
      const rawFull = winner?.text ?? null;
      if (rawFull && /^\d{8,14}$/.test(rawFull)) {
        onBarcodeDetected(rawFull);
        cleanup();
        onClose();
      } else {
        setError('No barcode detected. Please try again with better lighting.');
      }
      
    } catch (error) {
      console.error('[HS] Scan error:', error);
      setError('Failed to scan barcode. Please try again.');
    } finally {
      // Turn off torch
      if (track) {
        try {
          await track.applyConstraints({ 
            advanced: [{ torch: false } as any] 
          });
        } catch (torchError) {
          console.log('[HS] torch disable failed:', torchError);
        }
      }
      
      setIsFrozen(false);
      console.log('[HS] analyze_total:', Math.round(performance.now() - t0));
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

  useEffect(() => {
    startCamera();
    warmUpDecoder();
    return () => {
      cleanup();
    };
  }, []);

  const startCamera = async () => {
    try {
      console.log("[VIDEO INIT] videoRef =", videoRef.current);
      if (!videoRef.current) {
        console.error("[VIDEO] videoRef is null — video element not mounted");
        return;
      }

      if (location.protocol !== 'https:') {
        console.warn("[SECURITY] Camera requires HTTPS — current protocol:", location.protocol);
      }

      if (navigator.permissions) {
        navigator.permissions.query({ name: 'camera' as PermissionName }).then((res) => {
          console.log("[PERMISSION] Camera permission state:", res.state);
        }).catch((err) => {
          console.log("[PERMISSION] Could not query camera permission:", err);
        });
      }

      console.log("[CAMERA] Requesting camera stream...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      console.log("[CAMERA] Stream received:", mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.style.border = "2px solid red";
        console.log("[CAMERA] srcObject set, playing video");
        setStream(mediaStream);
        setIsScanning(true);
      } else {
        console.error("[CAMERA] videoRef.current is null");
      }
    } catch (err) {
      console.error("[CAMERA FAIL] getUserMedia error:", err);
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please check permissions and try again.');
    }
  };

  const cleanup = () => {
    if (scanningIntervalRef.current) {
      clearInterval(scanningIntervalRef.current);
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    setIsScanning(false);
  };

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
        
        {/* Shutter flash effect */}
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

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <Button
            onClick={handleAnalyzeNow}
            disabled={isScanning || isFrozen}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            {isFrozen ? 'Analyzing...' : 'Snap & Decode'}
          </Button>
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