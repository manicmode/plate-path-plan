import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { runFoodDetectionPipeline } from '@/lib/pipelines/runFoodDetectionPipeline';
import { HealthReportReviewModal } from '@/components/health-report/HealthReportReviewModal';
import { generateHealthReport } from '@/lib/health/generateHealthReport';
import { ReviewItem } from '@/components/camera/ReviewItemsScreen';
import { FF } from '@/featureFlags';

export default function HealthScanPhoto() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [detectedItems, setDetectedItems] = useState<ReviewItem[]>([]);

  // Initialize camera
  useEffect(() => {
    initCamera();
    return () => {
      cleanup();
    };
  }, []);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (error) {
      console.error('Camera access denied:', error);
      setHasPermission(false);
      toast.error('Camera access is required for photo capture');
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsCapturing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Canvas context not available');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0);
      
      // Convert to base64
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
      
      // Start analysis with timeout
      setIsAnalyzing(true);
      abortControllerRef.current = new AbortController();
      
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
        setIsAnalyzing(false);
        toast.error('Analysis timed out. Please try again.');
      }, 12000);

      try {
        console.log('[HEALTH_SCAN] Starting food detection...');
        const result = await runFoodDetectionPipeline(imageBase64, { mode: 'health' });
        clearTimeout(timeoutId);
        
        if (abortControllerRef.current?.signal.aborted) return;
        
        if (result.success && result.items.length > 0) {
          setDetectedItems(result.items);
          setShowReviewModal(true);
          toast.success('Food detection complete!');
        } else {
          toast.error('No food items detected. Please try again.');
        }
        
      } catch (error) {
        clearTimeout(timeoutId);
        if (!abortControllerRef.current?.signal.aborted) {
          console.error('Analysis failed:', error);
          toast.error('Analysis failed. Please try again.');
        }
      } finally {
        setIsAnalyzing(false);
      }
      
    } catch (error) {
      console.error('Photo capture failed:', error);
      toast.error('Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsAnalyzing(false);
    setIsCapturing(false);
  };

  const handleClose = () => {
    cleanup();
    navigate('/scan');
  };

  if (!FF.FEATURE_HEALTH_SCAN_PHOTO) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Feature Not Available</h1>
          <p className="text-muted-foreground mb-6">
            Health Scan photo capture is not currently available.
          </p>
          <Button onClick={handleClose}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-4">Camera Access Required</h1>
          <p className="text-muted-foreground mb-6">
            Please allow camera access to take photos for health analysis.
          </p>
          <div className="space-x-4">
            <Button onClick={initCamera}>Try Again</Button>
            <Button variant="outline" onClick={handleClose}>Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  const handleShowHealthReport = async (selectedItems: ReviewItem[]) => {
    try {
      const reportData = await generateHealthReport(selectedItems);
      navigate('/health-scan/report', { 
        state: { 
          ...reportData,
          source: 'photo_health_scan' 
        },
        replace: true 
      });
    } catch (error) {
      console.error('Failed to generate health report:', error);
      toast.error('Failed to generate health report');
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-black/50">
        <h1 className="text-white text-lg font-semibold">Health Scan Photo</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="text-white hover:bg-white/20"
          disabled={isAnalyzing}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Camera View */}
      <div className="relative h-full flex items-center justify-center">
        {hasPermission && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
        
        {hasPermission === null && (
          <div className="text-white text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Initializing camera...</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-black/50">
        <div className="flex items-center justify-center space-x-8">
          {isAnalyzing ? (
            <div className="flex flex-col items-center space-y-2">
              <Button
                variant="outline"
                size="lg"
                onClick={handleRetake}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Retake
              </Button>
              <div className="flex items-center space-x-2 text-white text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analyzing photo...</span>
              </div>
            </div>
          ) : (
            <Button
              size="lg"
              onClick={capturePhoto}
              disabled={!hasPermission || isCapturing}
              className="bg-white text-black hover:bg-white/90 h-16 w-16 rounded-full p-0"
            >
              <Camera className="h-8 w-8" />
            </Button>
          )}
        </div>
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Health Report Review Modal */}
      <HealthReportReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onShowHealthReport={handleShowHealthReport}
        onNext={() => {}} // Not used in health scan flow
        onLogImmediately={() => {}} // Not used in health scan flow
        items={detectedItems}
      />
    </div>
  );
}