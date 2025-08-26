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

  // ROI settings - same as Health Scan  
  const ROI = { widthPct: 0.70, heightPct: 0.35 };
  const BUDGET_MS = 900;

  const startCamera = async () => {
    try {
      console.log("[LOG] Requesting camera stream...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
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
    const timeout = setTimeout(() => controller.abort(), 4500);
    
    let hit = false;
    let status: string | number = 'error';
    let data = null;
    
    try {
      setIsLookingUp(true);
      // Use same endpoint as Health Scan
      const { data: result, error } = await supabase.functions.invoke('enhanced-health-scanner', {
        body: { mode: 'barcode', barcode, source: 'log' }
      });
      
      if (error) {
        status = error.status || 'error';
      } else {
        status = 200;
        hit = !!result && !result.fallback;
        data = result;
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        status = 'timeout';
      } else {
        status = 'error';
      }
    } finally {
      clearTimeout(timeout);
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
    if (now - lastAttempt < 600) {
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
          toast.info(msg);
        } else {
          toast.error('Barcode not found in database. Try scanning again or enter manually.');
        }
      } else {
        toast.info('No barcode detected. Try again with better lighting.');
      }
      
    } catch (error) {
      console.error('[LOG] Snap & decode error:', error);
      toast.error('Failed to scan barcode. Please try again.');
    } finally {
      // Add small delay before re-enabling to prevent rapid-fire attempts
      setTimeout(() => {
        setIsDecoding(false);
        setIsFrozen(false);
      }, 450);
      console.timeEnd('[LOG] analyze_total');
    }
  };

  // Camera setup on modal open (no auto-snap)
  useEffect(() => {
    if (!open) {
      cleanup();
      setError(null);
      return;
    }

    let cancelled = false;

    const init = async () => {
      await startCamera();
    };

    init();
    
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [open]);

  const handleClose = () => {
    cleanup();
    onOpenChange(false);
  };

  if (!open) return null;

  // Show loading animation while looking up barcode
  if (isLookingUp) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-none w-full h-full p-0 bg-black">
          <HealthAnalysisLoading 
            message="Looking up product information..." 
            analysisType="barcode" 
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-full h-full p-0 bg-black">
        <div className="relative w-full h-full flex flex-col">
          {/* Full-screen video */}
          <div className="relative flex-1 bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isFrozen ? 'opacity-50' : 'opacity-100'
              }`}
            />

            {/* Freeze flash effect */}
            {isFrozen && (
              <div className="absolute inset-0 bg-white animate-pulse opacity-20 pointer-events-none"></div>
            )}

            {/* Distinct Log scanner overlay - cyan corners + grid */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-80 h-48">
                {/* Cyan corner brackets */}
                <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-cyan-400"></div>
                
                {/* Faint grid */}
                <div className="absolute inset-2 opacity-20" style={{
                  backgroundImage: `
                    linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px'
                }}></div>
                
                {/* Horizontal scan line */}
                <div className="absolute top-1/2 left-2 right-2 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent transform -translate-y-1/2 animate-pulse"></div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="absolute top-16 left-4 right-4 bg-red-500/90 backdrop-blur-sm rounded-xl p-4">
                <p className="text-white text-center font-medium">{error}</p>
              </div>
            )}
          </div>

          {/* Bottom actions - same layout as Health Scan */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pb-8">
            <div className="max-w-md mx-auto space-y-4">
              {/* Main scan button */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSnapAndDecode}
                  disabled={isDecoding}
                  className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-semibold rounded-2xl shadow-lg"
                >
                  <Zap className={`w-5 h-5 mr-2 ${isDecoding ? 'animate-spin' : 'animate-pulse'}`} />
                  {isFrozen ? 'ANALYZING...' : 'SNAP & DECODE'}
                </Button>

                {/* Flashlight toggle */}
                {stream && isTorchSupported && (
                  <Button
                    onClick={() => setTorch(!torchEnabled)}
                    disabled={isDecoding}
                    variant="secondary"
                    size="icon"
                    className={`h-14 w-14 rounded-2xl transition-colors ${
                      torchEnabled 
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                    }`}
                  >
                    <FlashlightIcon className="w-5 h-5" />
                  </Button>
                )}
              </div>

              {/* Secondary actions */}
              <div className="flex gap-3">
                <Button
                  onClick={onManualEntry}
                  variant="outline"
                  className="flex-1 h-12 bg-zinc-800/80 border-zinc-600 text-white hover:bg-zinc-700/80 rounded-xl"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Enter Barcode Manually
                </Button>

                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="h-12 px-6 bg-zinc-800/80 border-zinc-600 text-white hover:bg-zinc-700/80 rounded-xl"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>

              {/* Instructions */}
              <p className="text-center text-sm text-zinc-400">
                Align barcode in the cyan frame and tap "Snap & Decode" to analyze.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};