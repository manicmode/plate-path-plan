import React, { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Zap } from 'lucide-react';
import { useSnapAndDecode } from '@/lib/barcode/useSnapAndDecode';
import { HealthAnalysisLoading } from '@/components/health-check/HealthAnalysisLoading';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { setTorch } from '@/lib/scan/torch';

interface LogBarcodeScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBarcodeDetected: (barcode: string) => void;
  onManualEntry: () => void;
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
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isTorchSupported, setIsTorchSupported] = useState(false);

  const { snapAndDecode } = useSnapAndDecode();

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
          facingMode: { exact: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setStream(mediaStream);
        setError(null);
        
        // Check torch support
        const track = mediaStream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === 'function') {
          const caps = track.getCapabilities() as any;
          setIsTorchSupported(!!(caps && 'torch' in caps && caps.torch));
        }
      }
    } catch (err) {
      console.error("[LOG] Camera access error:", err);
      // Fallback without exact facing mode if first attempt fails
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
          setStream(mediaStream);
          setError(null);
          
          // Check torch support
          const track = mediaStream.getVideoTracks()[0];
          if (track && typeof track.getCapabilities === 'function') {
            const caps = track.getCapabilities() as any;
            setIsTorchSupported(!!(caps && 'torch' in caps && caps.torch));
          }
        }
      } catch (fallbackErr) {
        console.error("[LOG] Camera fallback error:", fallbackErr);
        setError('Unable to access camera. Please check permissions and try again.');
      }
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
    if (!videoRef.current) return;
    
    try {
      const success = await setTorch(videoRef.current, !torchEnabled);
      if (success) {
        setTorchEnabled(!torchEnabled);
      } else {
        toast('Flash not supported on this device');
      }
    } catch (error) {
      console.error("Error toggling torch:", error);
      toast('Flash not supported on this device');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-screen h-screen max-w-none max-h-none p-0 m-0 bg-black border-0 rounded-none"
        showCloseButton={false}
        style={{
          '--scanner-header-h': '72px',
          '--scanner-actions-h': '200px'
        } as React.CSSProperties}
      >
        <div className="relative w-full h-full bg-black overflow-hidden">
          {/* Video Element - Behind everything */}
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

          {/* Frozen Overlay */}
          {isFrozen && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-pulse text-lg">Processing...</div>
              </div>
            </div>
          )}

          {/* Header */}
          <header 
            className="pt-safe-top px-4 pb-2 bg-gradient-to-b from-black/70 to-transparent flex justify-between items-center"
            style={{ height: 'var(--scanner-header-h)' }}
          >
            <h2 className="text-white text-xl font-semibold">Scan Barcode</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
          </header>

          {/* Center Content - Vertically centered scan frame */}
          <div
            className="relative px-4"
            style={{
              minHeight: 'calc(100vh - var(--scanner-header-h) - var(--scanner-actions-h))',
            }}
          >
            <div className="grid place-items-center h-full">
              <div className="relative z-10 pointer-events-none">
                {/* Centered scan frame */}
                <div className="relative w-[82vw] max-w-[680px] aspect-[7/4]">
                  {/* Corner indicators */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400"></div>
                  
                  {/* Grid overlay */}
                  <div className="absolute inset-4 opacity-20">
                    <div className="w-full h-full grid grid-cols-6 grid-rows-3 gap-0">
                      {Array.from({ length: 18 }).map((_, i) => (
                        <div key={i} className="border border-cyan-400/30"></div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Scanning line animation */}
                  {(isDecoding || isLookingUp) && (
                    <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-cyan-400 transform -translate-y-1/2 animate-pulse shadow-lg shadow-cyan-400/50" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Controls - Safe area */}
          <footer 
            className="pb-safe-bottom pt-3 px-4 bg-gradient-to-t from-black/80 via-black/60 to-transparent absolute bottom-0 inset-x-0 space-y-3"
            style={{ height: 'var(--scanner-actions-h)' }}
          >
            {/* Instructions text */}
            <div className="text-center text-white/90 mb-4">
              <p className="text-sm font-medium">Align barcode in frame and tap to scan</p>
              <p className="text-xs text-white/70 mt-1">Supports UPC-A, EAN-13, and EAN-8 codes</p>
            </div>
            
            {/* Main Action Button */}
            <Button
              onClick={handleSnapAndDecode}
              disabled={isDecoding || isLookingUp || !stream}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white h-14 text-lg font-medium disabled:opacity-50"
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
                  ⚡️ Snap & Decode
                </>
              )}
            </Button>

            {/* Secondary Actions */}
            <div className="flex gap-3">
              {/* Torch Toggle */}
              {isTorchSupported && (
                <Button
                  variant="outline"
                  onClick={toggleTorch}
                  className={`flex-1 border-white/30 text-white hover:bg-white/20 h-12 ${
                    torchEnabled ? 'bg-white/20' : 'bg-transparent'
                  }`}
                >
                  💡 {torchEnabled ? 'Flash On' : 'Flash Off'}
                </Button>
              )}
              
              {/* Manual Entry */}
              <Button
                variant="outline"
                onClick={onManualEntry}
                className="flex-1 border-white/30 text-white hover:bg-white/20 h-12"
              >
                ✏️ Enter Manually
              </Button>
            </div>
          </footer>

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6">
              <div className="text-center">
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