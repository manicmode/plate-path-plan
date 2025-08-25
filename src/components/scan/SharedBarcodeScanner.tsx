import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Keyboard, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MultiPassBarcodeScanner } from '@/utils/barcodeScan';
import { BARCODE_V2 } from '@/lib/featureFlags';
import { lightTap } from '@/lib/haptics';
import { toastOnce } from '@/lib/toastOnce';

interface SharedBarcodeScannerProps {
  onDetected: (code: { raw: string; type: 'ean13' | 'upc' | 'ean8' | 'qr' }) => void;
  onCancel: () => void;
  allowManual?: boolean;
  context?: 'health' | 'log';
}

export const SharedBarcodeScanner: React.FC<SharedBarcodeScannerProps> = ({
  onDetected,
  onCancel,
  allowManual = true,
  context = 'log'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [currentView, setCurrentView] = useState<'scanner' | 'manual'>('scanner');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [scanStartTime, setScanStartTime] = useState<number>(0);

  const requestId = useRef(crypto.randomUUID());

  useEffect(() => {
    if (currentView === 'scanner') {
      startCamera();
      logTelemetry('barcode.opened', { started: true, device: 'unknown' });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'manual' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [currentView]);

  const logTelemetry = (event: string, data: any) => {
    console.log(`[telemetry] ${requestId.current} ${event}:`, data);
  };

  const startCamera = async () => {
    try {
      console.log("[SHARED SCANNER] Starting high-res camera...");
      setScanStartTime(Date.now());
      
      // High-res back camera request (same as Health Scanner)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false
      });

      const videoTrack = mediaStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      
      logTelemetry('barcode.opened', {
        started: true,
        device: { w: settings.width, h: settings.height, fps: settings.frameRate }
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log("[SHARED SCANNER] Video stream started");
      }
    } catch (error) {
      console.error("[SHARED SCANNER] Camera failed:", error);
      toastOnce('error', 'Camera access denied - use manual entry');
      setCurrentView('manual');
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || !BARCODE_V2) {
      console.warn("[SHARED SCANNER] Missing refs or BARCODE_V2 disabled");
      return;
    }

    try {
      setIsScanning(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      // Capture full-res frame
      let capturedCanvas: HTMLCanvasElement;
      let captureType = 'VideoFrame';

      // Try ImageCapture API first
      if ('ImageCapture' in window && stream) {
        try {
          const track = stream.getVideoTracks()[0];
          const imageCapture = new (window as any).ImageCapture(track);
          const bitmap = await imageCapture.takePhoto();
          
          capturedCanvas = document.createElement('canvas');
          capturedCanvas.width = bitmap.width;
          capturedCanvas.height = bitmap.height;
          const captureCtx = capturedCanvas.getContext('2d');
          if (captureCtx) {
            captureCtx.drawImage(bitmap, 0, 0);
            captureType = 'ImageCapture';
          } else {
            throw new Error('Canvas context failed');
          }
        } catch (error) {
          console.log("[SHARED SCANNER] ImageCapture failed, using video frame");
          // Fallback to video frame
          capturedCanvas = canvas;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
        }
      } else {
        // Fallback to video frame capture
        capturedCanvas = canvas;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
      }

      logTelemetry('barcode.frame', {
        roi: { w: capturedCanvas.width, h: capturedCanvas.height, scale: 1.0, rotation: 0, inverted: false },
        pass: 1,
        captureType
      });

      // Multi-pass barcode scanning with bulletproof implementation
      const startTime = Date.now();
      const scanner = new MultiPassBarcodeScanner();
      const barcodeResult = await scanner.scan(capturedCanvas);

      const elapsedMs = Date.now() - startTime;

      if (barcodeResult) {
        const { text: barcodeValue, passName, rotation, format, checkDigitValid } = barcodeResult;
        
        logTelemetry('barcode.decoded', {
          value: barcodeValue,
          format: format || 'unknown',
          valid: checkDigitValid,
          elapsedMs,
          pass: passName,
          rotation
        });

        // Light haptic feedback
        await lightTap();
        
        // Freeze preview briefly and show green border
        setDetectedBarcode(barcodeValue);
        setTimeout(() => {
          const type = format?.toLowerCase().includes('ean13') ? 'ean13' :
                      format?.toLowerCase().includes('upc') ? 'upc' :
                      format?.toLowerCase().includes('ean8') ? 'ean8' : 'qr';
          
          onDetected({ raw: barcodeValue, type: type as any });
        }, 300);
        
      } else {
        logTelemetry('barcode.frame', {
          roi: { w: capturedCanvas.width, h: capturedCanvas.height },
          pass: 'all_failed',
          elapsedMs
        });
        console.log("[SHARED SCANNER] No barcode detected in current frame");
      }
    } catch (error) {
      console.error("[SHARED SCANNER] Capture/analyze error:", error);
      toastOnce('error', 'Scanning failed - try manual entry');
    } finally {
      setIsScanning(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBarcode = barcodeInput.trim().replace(/\s+/g, '');
    
    if (!/^\d{8,14}$/.test(cleanBarcode)) {
      toastOnce('error', 'Please enter a valid barcode (8-14 digits)');
      return;
    }

    logTelemetry('barcode.decoded', {
      value: cleanBarcode,
      format: 'manual',
      valid: true,
      elapsedMs: Date.now() - scanStartTime,
      pass: 'manual_entry'
    });

    const type = cleanBarcode.length === 13 ? 'ean13' :
                 cleanBarcode.length === 12 ? 'upc' :
                 cleanBarcode.length === 8 ? 'ean8' : 'upc';
    
    onDetected({ raw: cleanBarcode, type });
  };

  const actionLabel = context === 'health' ? 'Analyze Now' : 'Add from Barcode';
  const canAnalyze = detectedBarcode || (!isScanning && currentView === 'scanner');

  return (
    <div className="relative flex flex-col min-h-dvh bg-black">
      {/* Camera/Video Area */}
      <main className="flex-1 relative overflow-hidden">
        {currentView === 'scanner' ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`relative w-72 h-44 border-2 rounded-2xl ${
                detectedBarcode ? 'border-emerald-400 shadow-emerald-400/50' : 'border-white/50'
              } shadow-lg`}>
                {/* Corner indicators */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white"></div>
                
                {/* Animated scan line when actively scanning */}
                {isScanning && (
                  <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-emerald-400 transform -translate-y-1/2 animate-pulse shadow-lg" />
                )}

                {detectedBarcode && (
                  <div className="absolute inset-0 bg-emerald-400/20 rounded-2xl border-2 border-emerald-400 animate-pulse" />
                )}
              </div>
            </div>

            {/* Status text */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-black/70 backdrop-blur-md rounded-full px-4 py-2">
                <span className="text-white text-sm font-medium">
                  {detectedBarcode ? '✅ Barcode detected!' : 
                   isScanning ? 'Scanning...' : 'Align barcode in frame'}
                </span>
              </div>
            </div>
          </>
        ) : (
          /* Manual Entry View */
          <div className="flex-1 flex items-center justify-center p-6 bg-gray-900">
            <div className="w-full max-w-sm space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Keyboard className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Enter Barcode Manually
                </h3>
                <p className="text-gray-400 text-sm">
                  Type the barcode number from the product
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <Input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value.replace(/[^\d\s]/g, ''))}
                  placeholder="e.g., 022000287311"
                  className="text-center text-lg font-mono tracking-wider bg-gray-800 border-gray-600 text-white"
                  maxLength={14}
                />
                <p className="text-xs text-gray-500 text-center">
                  Look for numbers below the barcode stripes
                </p>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Sticky Footer Actions */}
      <footer className="sticky bottom-0 z-40 bg-black/70 backdrop-blur-md px-4 pt-3 pb-safe">
        <div className="grid grid-cols-1 gap-3">
          {/* Primary CTA - Green, bigger */}
          <Button
            onClick={currentView === 'scanner' ? captureAndAnalyze : handleManualSubmit}
            disabled={currentView === 'scanner' ? !canAnalyze : !barcodeInput.trim()}
            className="h-14 rounded-2xl text-lg font-semibold bg-emerald-600 text-white shadow-lg active:scale-[.99] disabled:opacity-50"
          >
            {currentView === 'scanner' ? 
              (detectedBarcode ? `🎯 ${actionLabel}` : `📸 ${actionLabel}`) :
              '🔍 Search Product'
            }
          </Button>

          {/* Manual Entry toggle */}
          {allowManual && (
            <Button
              onClick={() => setCurrentView(currentView === 'scanner' ? 'manual' : 'scanner')}
              className="h-12 rounded-xl bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            >
              {currentView === 'scanner' ? '⌨️ Enter Barcode Manually' : '📷 Back to Scanner'}
            </Button>
          )}

          {/* Cancel - Red, last */}
          <Button
            onClick={onCancel}
            className="h-12 rounded-xl bg-red-600/90 text-white hover:bg-red-700"
          >
            ✖️ Cancel
          </Button>
        </div>
      </footer>
    </div>
  );
};