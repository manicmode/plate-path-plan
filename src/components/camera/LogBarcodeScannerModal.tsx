import React, { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Zap, FlashlightIcon, Edit3 } from 'lucide-react';
import { useSnapAndDecode } from '@/lib/barcode/useSnapAndDecode';
import { HealthAnalysisLoading } from '@/components/health-check/HealthAnalysisLoading';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      
      // Use same endpoint as Health Scan with proper timeout
      const { data: result, error } = await supabase.functions.invoke('enhanced-health-scanner', {
        body: { mode: 'barcode', barcode, source: 'log' }
      });
      
      clearTimeout(timeout);
      
      if (error) {
        status = error.status || 'error';
        console.log(`[LOG] off_error:`, error);
      } else {
        status = 200;
        hit = !!result && !result.fallback;
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
        
        if (lookupResult.hit && lookupResult.data && !lookupResult.data.fallback) {
          onBarcodeDetected(result.raw);
          onOpenChange(false);
        } else if (lookupResult.data?.fallback) {
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
      >
        <div className="relative w-full h-full bg-black overflow-hidden">
          {/* Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
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

          {/* UI Overlay */}
          <div className="absolute inset-0 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black/70 to-transparent">
              <h2 className="text-white text-xl font-semibold">Scan Barcode</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Center Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              {/* Scanning Frame */}
              <div className="relative mb-8">
                {/* Main scanning frame with cyan corners */}
                <div className="relative w-80 h-48 border-2 border-transparent">
                  {/* Corner indicators */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400"></div>
                  
                  {/* Grid overlay */}
                  <div className="absolute inset-2 opacity-30">
                    <div className="w-full h-full grid grid-cols-4 grid-rows-3 gap-0">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="border border-cyan-400/20"></div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Scanning line */}
                  {isDecoding && (
                    <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-cyan-400 transform -translate-y-1/2 animate-pulse shadow-lg shadow-cyan-400/50" />
                  )}
                </div>
                
                <p className="text-white/90 text-center mt-4 text-sm">
                  Align the barcode within the frame and tap "Snap & Decode"
                </p>
                <p className="text-white/70 text-center mt-1 text-xs">
                  Instant barcode detection with 1-second analysis
                </p>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="p-6 bg-gradient-to-t from-black/70 to-transparent">
              <div className="space-y-4">
                {/* Main Action Button */}
                <Button
                  onClick={handleSnapAndDecode}
                  disabled={isDecoding || isLookingUp || !stream}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white h-14 text-lg font-medium disabled:opacity-50"
                >
                  {isDecoding ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                      Analyzing...
                    </>
                  ) : isLookingUp ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                      Looking up...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      Snap & Decode
                    </>
                  )}
                </Button>

                {/* Secondary Actions */}
                <div className="flex gap-3">
                  {/* Torch Toggle */}
                  {isTorchSupported && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleTorch}
                      className={`flex-1 border-white/30 text-white hover:bg-white/20 ${
                        torchEnabled ? 'bg-white/20' : 'bg-transparent'
                      }`}
                    >
                      <FlashlightIcon className={`h-4 w-4 mr-2 ${torchEnabled ? 'text-yellow-300' : ''}`} />
                      {torchEnabled ? 'Flash On' : 'Flash Off'}
                    </Button>
                  )}
                  
                  {/* Manual Entry */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onManualEntry}
                    className="flex-1 border-white/30 text-white hover:bg-white/20"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Enter Manually
                  </Button>
                </div>
              </div>
            </div>
          </div>

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