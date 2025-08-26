import React, { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Zap, FlashlightIcon, Edit3 } from 'lucide-react';
import { useSnapAndDecode } from '@/lib/barcode/useSnapAndDecode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LogBarcodeScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBarcodeDetected: (barcode: string) => void;
  onManualEntry: () => void;
}

// Scan Frame Component
function ScanFrame() {
  return (
    <div className="relative mx-auto max-w-[680px] aspect-[16/10]">
      {/* frame border with corner glow */}
      <div className="scan-frame absolute inset-0 rounded-[22px]" />
      {/* subtle grid overlay */}
      <div className="absolute inset-[10px] rounded-[16px] opacity-35 mix-blend-screen scan-grid" />
    </div>
  );
}

export const LogBarcodeScannerModal: React.FC<LogBarcodeScannerModalProps> = ({
  open,
  onOpenChange,
  onBarcodeDetected,
  onManualEntry
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lastAttempt, setLastAttempt] = useState(0);

  const { snapAndDecode, setTorch, isTorchSupported, torchEnabled } = useSnapAndDecode();

  // Constants for decode parameters
  const BUDGET_MS = 900;
  const ROI = { widthPct: 0.7, heightPct: 0.35 }; // horizontal band
  const COOLDOWN_MS = 600;

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      cleanup();
    }
    
    return cleanup;
  }, [open]);

  const startCamera = async () => {
    try {
      console.log("[LOG] Requesting camera stream...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setStream(mediaStream);
        setError(null);
      }
    } catch (err) {
      console.error("[LOG] Camera access error:", err);
      setError('Unable to access camera. Please check permissions and try again.');
    }
  };

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setIsDecoding(false);
    setIsFrozen(false);
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
      
      // Use same endpoint as Health Scan
      const { data: result, error } = await supabase.functions.invoke('enhanced-health-scanner', {
        body: { mode: 'barcode', barcode, source: 'log' }
      });
      
      clearTimeout(timeout);
      
      if (error) {
        status = error.status || 'error';
        console.log(`[LOG] off_error:`, error);
      } else {
        status = 200;
        hit = !!result?.ok && !!result.product;
        data = result;
      }
      
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        status = 'timeout';
        console.log(`[LOG] off_timeout:`, error);
      } else {
        status = 'error';
        console.log(`[LOG] off_error:`, error);
      }
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
    
    console.time('[LOG] analyze_total');
    setIsDecoding(true);
    setIsFrozen(true);
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
        setIsFrozen(false);
      }, 450); // Small cooldown before allowing next attempt
      console.timeEnd('[LOG] analyze_total');
    }
  };

  const toggleTorch = async () => {
    try {
      await setTorch(!torchEnabled);
    } catch (error) {
      console.error("Error toggling torch:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-screen h-screen max-w-none max-h-none p-0 m-0 bg-black border-0 rounded-none"
        showCloseButton={false}
      >
        <div className="relative flex flex-col min-h-dvh bg-black overflow-hidden">
          {/* Header with centered title */}
          <header className="sticky top-0 z-50 pt-safe px-4 pb-2 bg-gradient-to-b from-black/60 to-black/0 backdrop-blur-md">
            <div className="grid grid-cols-3 items-center">
              <span aria-hidden="true" /> {/* left spacer for true centering */}
              <h1 className="justify-self-center text-white text-xl font-semibold tracking-wide scan-title">
                Scan Barcode
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="justify-self-end p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border-0"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </header>

          {/* Main video area with centered frame */}
          <main className="relative flex-1">
            {/* Video sits behind */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                filter: isFrozen ? 'brightness(0.3)' : 'none',
                transition: 'filter 0.2s ease'
              }}
            />

            {/* Frame container - vertically centered */}
            <div className="pointer-events-none absolute inset-x-6 sm:inset-x-12 top-1/2 -translate-y-1/2">
              <ScanFrame />
              
              {/* Scanning line animation - only while decoding */}
              {isDecoding && (
                <div className="pointer-events-none absolute inset-0 rounded-[22px] overflow-hidden">
                  <div className="scanline" />
                </div>
              )}
            </div>

            {/* Processing overlay */}
            {(isDecoding || isLookingUp) && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="text-white text-center bg-black/60 backdrop-blur-md rounded-2xl px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    <span className="text-lg font-medium">
                      {isDecoding ? 'Decoding...' : 'Looking up product...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Bottom Controls - Safe area */}
          <footer className="sticky bottom-0 z-50 bg-gradient-to-t from-black/70 to-black/0 px-4 pt-3 pb-safe">
            <div className="flex flex-col gap-3 max-w-[680px] mx-auto">
              {/* Instructions text */}
              <div className="text-center text-white/90">
                <p className="text-sm font-medium">Align barcode in frame and tap to scan</p>
                <p className="text-xs text-white/70 mt-1">Supports UPC-A, EAN-13, and EAN-8 codes</p>
              </div>
              
              {/* Main Action Button */}
              <Button
                onClick={handleSnapAndDecode}
                disabled={isDecoding || isLookingUp || !stream}
                className="h-14 rounded-2xl text-lg font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg active:scale-[.99] disabled:opacity-50"
              >
                {isDecoding ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                    Decoding...
                  </>
                ) : isLookingUp ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                    Looking up product...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    ⚡ Snap & Decode
                  </>
                )}
              </Button>

              {/* Secondary Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={onManualEntry}
                  className="flex-1 h-12 rounded-xl bg-white/8 text-white/90 hover:bg-white/12 border-0"
                >
                  ✍️ Enter Manually
                </Button>
                
                {/* Torch toggle if supported */}
                {isTorchSupported && (
                  <Button
                    onClick={toggleTorch}
                    className={`h-12 px-4 rounded-xl border-0 ${
                      torchEnabled 
                        ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30' 
                        : 'bg-white/8 text-white/90 hover:bg-white/12'
                    }`}
                  >
                    🔦 {torchEnabled ? 'Flash On' : 'Flash Off'}
                  </Button>
                )}
              </div>
            </div>
          </footer>

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-6 z-50">
              <div className="text-center bg-black/60 backdrop-blur-md rounded-2xl p-6">
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