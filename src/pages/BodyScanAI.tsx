
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Upload, ArrowRight, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { validateImageFile, getImageDimensions } from '@/utils/imageValidation';
import { useToast } from '@/hooks/use-toast';

export default function BodyScanAI() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasImageReady, setHasImageReady] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [cameraMode, setCameraMode] = useState<'environment' | 'user'>('environment');
  const [showOrientationWarning, setShowOrientationWarning] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraMode]);

  useEffect(() => {
    // Lock screen orientation to portrait if supported
    const lockOrientation = async () => {
      try {
        if ('orientation' in screen && 'lock' in screen.orientation) {
          await (screen.orientation as any).lock('portrait');
        }
      } catch (error) {
        console.log('Orientation lock not supported:', error);
      }
    };

    // Handle orientation change for unsupported devices
    const handleOrientationChange = () => {
      if (window.innerHeight < window.innerWidth) {
        setShowOrientationWarning(true);
      } else {
        setShowOrientationWarning(false);
      }
    };

    lockOrientation();
    handleOrientationChange();
    
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
      
      // Unlock orientation when leaving the page
      try {
        if ('orientation' in screen && 'unlock' in screen.orientation) {
          (screen.orientation as any).unlock();
        }
      } catch (error) {
        console.log('Orientation unlock not supported:', error);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { exact: cameraMode },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.log('Video autoplay prevented, will play on user interaction');
        }
      }
      setStream(mediaStream);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions and try again.",
        variant: "destructive"
      });
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsCapturing(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
    setHasImageReady(true);
    setIsCapturing(false);
    
    toast({
      title: "Photo Captured!",
      description: "Front body scan complete. Ready to continue to side scan.",
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast({
        title: "Invalid Image",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    if (validation.warning) {
      toast({
        title: "Large Image",
        description: validation.warning,
      });
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setCapturedImage(imageData);
      setHasImageReady(true);
      
      toast({
        title: "Image Uploaded!",
        description: "Front body image ready. You can now continue to the side scan.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleContinue = () => {
    if (hasImageReady && capturedImage) {
      sessionStorage.setItem('frontBodyScan', capturedImage);
      navigate('/body-scan-side');
    }
  };

  const handleCancel = () => {
    navigate('/exercise-hub');
  };

  const handleImageLoad = () => {
    console.log('Body outline image loaded successfully');
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    console.log('Failed to load body outline image');
    setImageError(true);
    setImageLoaded(false);
  };

  const toggleCamera = () => {
    setCameraMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden portrait:block landscape:hidden">
      {/* Landscape orientation warning */}
      {showOrientationWarning && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-yellow-500/90 text-black p-6 rounded-2xl text-center max-w-sm">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-lg font-bold mb-2">Please Rotate Your Device</h3>
            <p className="text-sm">
              For the best body scanning experience, please hold your device in portrait mode.
            </p>
          </div>
        </div>
      )}

      {/* Main content - only show in portrait */}
      <div className="portrait:block landscape:hidden w-full h-full">
      {/* Camera video background */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={() => {
            if (videoRef.current) {
              videoRef.current.play().catch(console.log);
            }
          }}
          className="w-full h-full object-cover"
          style={{ 
            transform: 'scaleX(-1)',
            WebkitTransform: 'scaleX(-1)'
          }}
        />
      </div>
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Grid Overlay - Fixed behind camera */}
      <div className="absolute inset-0 opacity-20 pointer-events-none z-10">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
          filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.3))'
        }}></div>
      </div>

      {/* Header Instructions - Fixed at top with proper spacing */}
      <div className="absolute top-4 md:top-6 left-4 right-4 z-20">
        <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
          <h2 className="text-white text-lg font-bold mb-2 text-center">
            📸 Front Body Scan
          </h2>
          <p className="text-white/90 text-sm text-center">
            Stand upright with arms out. Match your body to the glowing outline.
          </p>
        </div>
      </div>

      {/* Camera Toggle Button - Top Right */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end space-y-2">
        <Button
          onClick={toggleCamera}
          className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm border border-white/30 text-white hover:bg-black/70 transition-all duration-300"
          size="sm"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1 border border-white/20">
          <span className="text-white text-xs font-medium">
            {cameraMode === 'environment' ? 'Back Camera Active' : 'Front Camera Active'}
          </span>
        </div>
      </div>
      
      {/* Body Silhouette Overlay - Vertically centered with bigger size */}
      <div className="absolute inset-0 flex items-center justify-center mt-[-4vh] z-15">
        <div className={`relative transition-all duration-500 ${
          isCapturing ? 'scale-105' : 'scale-100'
        } ${hasImageReady ? 'filter brightness-110 hue-rotate-60' : ''}`}>
          <img 
            src="/lovable-uploads/f79fe9f7-e1df-47ea-bdca-a4389f4528f5.png"
            alt=""
            className="w-[98vw] max-h-[85vh] h-auto opacity-90 object-contain animate-slow-pulse drop-shadow-[0_0_8px_rgba(0,255,255,0.8)] drop-shadow-[0_0_16px_rgba(0,255,255,0.6)] drop-shadow-[0_0_24px_rgba(0,255,255,0.4)]"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      </div>

      {/* Capture success overlay */}
      {hasImageReady && (
        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center z-16">
          <div className="bg-green-500/90 text-white px-6 py-3 rounded-full font-bold animate-fade-in">
            ✅ Front scan complete!
          </div>
        </div>
      )}

      {/* Fixed Bottom Controls - Matching Health Scanner */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent z-20">
        <div className="flex flex-col space-y-4">
          {/* Cancel Button */}
          <Button
            onClick={handleCancel}
            className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl border-2 border-red-500 transition-all duration-300"
          >
            <X className="w-5 h-5 mr-2" />
            Cancel
          </Button>

          {/* Upload Button */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="bg-blue-600/20 border-blue-400 text-blue-300 hover:bg-blue-600/30 hover:text-white transition-all duration-300"
          >
            <Upload className="w-5 h-5 mr-2" />
            📷 Upload Image
          </Button>

          {/* Main Action Button */}
          <Button
            onClick={hasImageReady ? handleContinue : captureImage}
            disabled={isCapturing}
            className={`relative bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 
                     text-white font-bold py-4 text-lg border-2 border-green-400 
                     shadow-[0_0_20px_rgba(61,219,133,0.4)] hover:shadow-[0_0_30px_rgba(61,219,133,0.6)]
                     transition-all duration-300 disabled:opacity-50`}
          >
            <div className="flex items-center justify-center">
              {hasImageReady ? (
                <>
                  <ArrowRight className="w-6 h-6 mr-3" />
                  🚀 Continue to Side Scan
                </>
              ) : (
                <>
                  <div className={`w-6 h-6 mr-3 ${isCapturing ? 'animate-spin' : 'animate-pulse'}`}>⚡</div>
                  {isCapturing ? '🔍 SCANNING...' : '📸 Capture Front View'}
                </>
              )}
            </div>
            {!hasImageReady && !isCapturing && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                           animate-[shimmer_2s_ease-in-out_infinite] rounded-lg"></div>
            )}
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      </div>
    </div>
  );
}
