import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Camera, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openPhotoCapture } from '@/components/camera/photoCapture';
import { analyzeForHealthScan } from '@/healthscan/orchestrator';
import { toast } from 'sonner';

export default function HealthScanPhotoSheet() {
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captureStarted, setCaptureStarted] = useState(false);

  useEffect(() => {
    // Auto-start capture when component mounts
    handleStartCapture();
  }, []);

  const handleStartCapture = async () => {
    if (captureStarted) return;
    setCaptureStarted(true);
    
    try {
      console.log('[HEALTH-SCAN] Starting photo capture...');
      const file = await openPhotoCapture('image/*', 'environment');
      
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          handleCapture(result);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('[HEALTH-SCAN] Capture failed:', err);
      if (err.name !== 'AbortError') {
        setError('Failed to capture photo. Please try again.');
      }
      setCaptureStarted(false);
    }
  };

  const handleCapture = async (imageBase64: string) => {
    console.log('[HEALTH-SCAN] Photo captured, analyzing...');
    setIsAnalyzing(true);
    setError(null);

    try {
      const { results, _debug } = await analyzeForHealthScan(imageBase64);
      
      console.log('[HEALTH-SCAN] Analysis complete:', { itemCount: results.length });
      
      // Navigate to health report with results
      navigate('/health-report', { 
        replace: true,
        state: { 
          items: results,
          _debug,
          imageBase64 // Keep for potential retake
        } 
      });
    } catch (err) {
      console.error('[HEALTH-SCAN] Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setIsAnalyzing(false);
    }
  };

  const handleClose = () => {
    navigate('/scan', { replace: true });
  };

  const handleRetry = () => {
    setError(null);
    setIsAnalyzing(false);
    setCaptureStarted(false);
    handleStartCapture();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
          <h1 className="text-white font-semibold">Health Scan Photo</h1>
          <div className="w-9" /> {/* Balance */}
        </div>
      </div>

      {/* Camera Content */}
      <div className="h-full flex flex-col">
        {!isAnalyzing && !error ? (
          <div className="flex-1 flex items-center justify-center bg-black">
            {!captureStarted ? (
              <div className="text-center text-white">
                <Camera className="h-16 w-16 mx-auto mb-4 text-white/70" />
                <p className="text-lg font-medium mb-2">Ready to Capture</p>
                <p className="text-sm text-white/70 mb-6">Position your meal in view</p>
                <Button
                  onClick={handleStartCapture}
                  variant="default"
                  className="px-8 py-3"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
              </div>
            ) : (
              <div className="text-center text-white">
                <div className="animate-pulse">
                  <Camera className="h-16 w-16 mx-auto mb-4 text-white/70" />
                </div>
                <p className="text-lg font-medium">Opening Camera...</p>
                <p className="text-sm text-white/70 mt-2">Please allow camera access</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-black">
            {isAnalyzing ? (
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
                <p className="text-lg font-medium">Analyzing your photo...</p>
                <p className="text-sm text-white/70 mt-2">This may take a few seconds</p>
              </div>
            ) : error ? (
              <div className="text-center text-white p-6">
                <div className="mb-4">
                  <Camera className="h-12 w-12 mx-auto text-red-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Analysis Failed</h3>
                  <p className="text-white/70 mb-6">{error}</p>
                </div>
                <div className="space-y-3">
                  <Button
                    onClick={handleRetry}
                    variant="default"
                    className="w-full"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retake Photo
                  </Button>
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}