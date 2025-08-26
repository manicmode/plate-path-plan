import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, ScanBarcode, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { enhancedBarcodeDecode } from '@/lib/barcode/enhancedDecoder';
import { startScanReport, finalizeScanReport, copyDebugToClipboard } from '@/lib/barcode/diagnostics';
import { cropReticleROIFromVideo } from '@/lib/barcode/roiUtils';

interface FoodLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProductData {
  productName?: string;
  brand?: string;
  ingredients?: string[];
  nutritionSummary?: Record<string, number>;
  barcode?: string;
}

interface FoodItem {
  productName: string;
  brand?: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const FoodLogModal: React.FC<FoodLogModalProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [foodData, setFoodData] = useState<ProductData | null>(null);
  const [foodItem, setFoodItem] = useState<FoodItem>({
    productName: '',
    brand: '',
    serving: '1 serving',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);

  // Check if debug is enabled
  React.useEffect(() => {
    const debugEnabled = process.env.NEXT_PUBLIC_SCAN_DEBUG === '1' || 
                        new URLSearchParams(window.location.search).get('scan_debug') === '1' ||
                        localStorage.getItem('SCAN_DEBUG') === '1';
    setIsDebugEnabled(debugEnabled);
  }, []);

  const initCamera = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        
        if (isDebugEnabled) {
          const track = mediaStream.getVideoTracks()[0];
          if (track) {
            const settings = track.getSettings();
            console.log('[HS_DIAG] Camera settings:', settings);
          }
        }
      }
    } catch (error) {
      console.error('Camera initialization failed:', error);
      toast.error('Camera access denied. Please use manual entry.');
    }
  };

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureAndDecode = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    
    // Create DPR-correct ROI directly from video (no pre-compression)
    const roiCanvas = cropReticleROIFromVideo(video);

    // Convert ROI canvas to blob for barcode decoding
    const blob = await new Promise<Blob>((resolve) => {
      roiCanvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/jpeg', 0.95);
    });

    if (!blob) return;

    // Enhanced barcode decode with full ROI
    const result = await enhancedBarcodeDecode(
      blob, 
      { x: 0, y: 0, w: roiCanvas.width, h: roiCanvas.height }, // Full ROI area
      window.devicePixelRatio, 
      1500
    );
    
    if (result.success && result.code) {
      await processBarcode(result.code);
      
      if (isDebugEnabled) {
        finalizeScanReport({
          success: true,
          code: result.code,
          normalizedAs: result.normalizedAs,
          checkDigitOk: result.checkDigitOk || false,
          willScore: true,
          willFallback: false,
          totalMs: result.totalMs
        });
      }
    } else {
      toast.error('No barcode detected. Try manual entry.');
      
      if (isDebugEnabled) {
        finalizeScanReport({
          success: false,
          willScore: false,
          willFallback: true,
          totalMs: result.totalMs
        });
      }
    }
  };

  const processBarcode = async (barcode: string) => {
    setIsLoading(true);
    
    try {
      // Use same enhanced-health-scanner function with barcode mode
      const response = await supabase.functions.invoke('enhanced-health-scanner', {
        body: { mode: 'barcode', barcode, source: 'log' }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.productName) {
        setFoodData(data);
        setFoodItem({
          productName: data.productName || '',
          brand: data.brand || '',
          serving: '1 serving',
          calories: data.nutritionSummary?.calories || 0,
          protein: data.nutritionSummary?.protein || 0,
          carbs: data.nutritionSummary?.carbs || 0,
          fat: data.nutritionSummary?.fat || 0
        });
        setShowConfirm(true);
        setIsScanning(false);
        cleanup();
      } else {
        toast.error('Product not found in database');
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      toast.error('Failed to lookup product. Try manual entry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualBarcode = () => {
    if (manualBarcode.trim() && /^\d{8,14}$/.test(manualBarcode.trim())) {
      processBarcode(manualBarcode.trim());
    } else {
      toast.error('Please enter a valid barcode (8-14 digits)');
    }
  };

  const addToLog = async () => {
    if (!user || !foodItem.productName) return;

    try {
      const { error } = await supabase.from('nutrition_logs').insert({
        user_id: user.id,
        food_name: foodItem.productName,
        brand: foodItem.brand,
        barcode: foodData?.barcode,
        ingredients: foodData?.ingredients || [],
        serving_size: foodItem.serving,
        calories: foodItem.calories,
        protein_g: foodItem.protein,
        carbs_g: foodItem.carbs,
        fat_g: foodItem.fat,
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      toast.success(`${foodItem.productName} added to your food log!`);
      onOpenChange(false);
      resetState();
    } catch (error) {
      console.error('Error adding to log:', error);
      toast.error('Failed to add to log. Please try again.');
    }
  };

  const resetState = () => {
    setIsScanning(false);
    setShowConfirm(false);
    setManualBarcode('');
    setFoodData(null);
    setFoodItem({
      productName: '',
      brand: '',
      serving: '1 serving',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    });
    cleanup();
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full h-full max-h-[100dvh] p-0 border-0 bg-black overflow-hidden" 
                     style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Header */}
        <div className="relative p-4 bg-black text-white border-b border-gray-800">
          <Button
            onClick={handleClose}
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">Scan Barcode</h2>
          <p className="text-sm text-gray-400">Add food to your log</p>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden">
          {showConfirm ? (
            // Confirmation Screen
            <div className="p-6 bg-background text-foreground h-full overflow-y-auto">
              <h3 className="text-xl font-semibold mb-4">Confirm Food Item</h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Product Name</Label>
                  <Input
                    value={foodItem.productName}
                    onChange={(e) => setFoodItem(prev => ({ ...prev, productName: e.target.value }))}
                  />
                </div>
                
                {foodItem.brand && (
                  <div>
                    <Label>Brand</Label>
                    <Input
                      value={foodItem.brand}
                      onChange={(e) => setFoodItem(prev => ({ ...prev, brand: e.target.value }))}
                    />
                  </div>
                )}
                
                <div>
                  <Label>Serving Size</Label>
                  <Input
                    value={foodItem.serving}
                    onChange={(e) => setFoodItem(prev => ({ ...prev, serving: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Calories</Label>
                    <Input
                      type="number"
                      value={foodItem.calories}
                      onChange={(e) => setFoodItem(prev => ({ ...prev, calories: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Protein (g)</Label>
                    <Input
                      type="number"
                      value={foodItem.protein}
                      onChange={(e) => setFoodItem(prev => ({ ...prev, protein: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Carbs (g)</Label>
                    <Input
                      type="number"
                      value={foodItem.carbs}
                      onChange={(e) => setFoodItem(prev => ({ ...prev, carbs: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Fat (g)</Label>
                    <Input
                      type="number"
                      value={foodItem.fat}
                      onChange={(e) => setFoodItem(prev => ({ ...prev, fat: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 space-y-3">
                <Button onClick={addToLog} className="w-full" disabled={!foodItem.productName}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Log
                </Button>
                <Button onClick={() => setShowConfirm(false)} variant="outline" className="w-full">
                  Back to Scanner
                </Button>
              </div>
            </div>
          ) : isScanning ? (
            // Camera Scanner
            <div className="relative h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Reticle */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-32 border-2 border-white rounded-lg bg-white/10 backdrop-blur-sm">
                  <div className="w-full h-full border border-white/50 rounded-md relative">
                    <div className="absolute inset-x-0 top-1/2 transform -translate-y-0.5 h-px bg-red-500" />
                    <div className="absolute inset-y-0 left-1/2 transform -translate-x-0.5 w-px bg-red-500" />
                  </div>
                </div>
              </div>
              
              {/* Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="text-center mb-4">
                  <p className="text-white text-sm">Align barcode within frame</p>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    onClick={captureAndDecode}
                    disabled={isLoading}
                    className="flex-1 gradient-primary"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <ScanBarcode className="h-4 w-4 mr-2" />
                        Scan
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setIsScanning(false)}
                    variant="outline"
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    Manual Entry
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Initial Screen with Manual Entry
            <div className="p-6 bg-background text-foreground h-full">
              <div className="text-center mb-6">
                <ScanBarcode className="h-12 w-12 mx-auto mb-3 text-primary" />
                <h3 className="text-lg font-semibold mb-2">Scan Product Barcode</h3>
                <p className="text-sm text-muted-foreground">
                  Position barcode within camera frame or enter manually
                </p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <Label>Enter Barcode Manually</Label>
                  <Input
                    placeholder="123456789012"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleManualBarcode()}
                  />
                </div>
                
                <Button onClick={handleManualBarcode} variant="outline" className="w-full" disabled={!manualBarcode.trim()}>
                  Lookup Product
                </Button>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    setIsScanning(true);
                    initCamera();
                  }}
                  className="w-full gradient-primary"
                >
                  <ScanBarcode className="h-4 w-4 mr-2" />
                  Start Camera Scanner
                </Button>
                
                <Button onClick={handleClose} variant="outline" className="w-full">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Debug Button */}
        {isDebugEnabled && (
          <Button
            onClick={copyDebugToClipboard}
            className="fixed bottom-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 h-auto"
            size="sm"
          >
            Copy Debug
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};