import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Upload, ArrowRight } from 'lucide-react';
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

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Remove stream dependency to prevent infinite loop

  const startCamera = async () => {
    try {
      // Clean up any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Ensure video plays on iOS
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
      // Store the front image (you can implement proper storage later)
      sessionStorage.setItem('frontBodyScan', capturedImage);
      
      // Navigate to side body scan (you'll need to create this page)
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

  return (
    <div className="relative w-full h-screen bg-black flex flex-col overflow-hidden">
      <div className="flex-1 relative">
        {/* Camera video background - positioned absolutely to ensure proper rendering */}
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => {
              // Ensure video plays after metadata is loaded
              if (videoRef.current) {
                videoRef.current.play().catch(console.log);
              }
            }}
            className="w-full h-full object-cover"
            style={{ 
              transform: 'scaleX(-1)', // Mirror the video for better UX
              WebkitTransform: 'scaleX(-1)' // iOS compatibility
            }}
          />
        </div>
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Human Outline Overlay - Using uploaded PNG image */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className={`relative transition-all duration-500 ${
            isCapturing ? 'scale-105' : 'scale-100'
          } ${hasImageReady ? 'filter brightness-110 hue-rotate-60' : ''}`}>
            <div className="relative">
              {!imageError ? (
                <img 
                  src="/lovable-uploads/76dd7719-6db9-4f38-9ba7-758d3da65e27.png"
                  alt="Body pose guide"
                  className="w-[300px] max-w-[90vw] h-auto opacity-80 animate-pulse"
                  style={{
                    filter: 'drop-shadow(0 0 12px hsl(var(--primary) / 0.6))',
                    animation: 'pulse 2s ease-in-out infinite'
                  }}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              ) : (
                <img 
                  src="/lovable-uploads/efb4b7c2-4b95-482c-b50b-17a9a86b8c29.png"
                  alt="Body pose guide"
                  className="w-[300px] max-w-[90vw] h-auto opacity-80 animate-pulse"
                  style={{
                    filter: 'drop-shadow(0 0 12px hsl(var(--primary) / 0.6))',
                    animation: 'pulse 2s ease-in-out infinite'
                  }}
                  onLoad={handleImageLoad}
                  onError={() => console.log('Both body outline images failed to load')}
                />
              )}
            </div>
          </div>
        </div>

        {/* Header Instructions */}
        <div className="absolute top-6 left-4 right-4 text-center z-20">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-primary/20">
            <h2 className="text-white text-lg font-bold mb-1">
              📸 Front Body Scan
            </h2>
            <p className="text-primary/90 text-sm">
              Stand upright with arms out. Match your body to the glowing outline.
            </p>
          </div>
        </div>

        {/* Capture success overlay */}
        {hasImageReady && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
            <div className="bg-green-500/90 text-white px-6 py-3 rounded-full font-bold animate-fade-in">
              ✅ Front scan complete!
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls - Match Health Inspector layout exactly */}
      <div className="p-6 bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex flex-col space-y-4">
          {/* Cancel Button - Centered with w-1/2 width */}
          <div className="flex justify-center">
            <Button
              onClick={handleCancel}
              className="w-1/2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl border-2 border-red-500 transition-all duration-300"
            >
              <X className="w-5 h-5 mr-2" />
              Cancel
            </Button>
          </div>

          {/* Upload from Gallery - Full width with blue styling */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="bg-blue-600/20 border-blue-400 text-blue-300 hover:bg-blue-600/30 hover:text-white transition-all duration-300"
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload Image
          </Button>

          {/* Continue/Capture Button - Full width */}
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
                  <div className={`w-6 h-6 mr-3 ${isCapturing ? 'animate-spin' : 'animate-pulse'}`}>📸</div>
                  {isCapturing ? 'Capturing...' : 'Capture Front View'}
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
  );
}
