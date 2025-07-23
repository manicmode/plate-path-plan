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

  // Athletic human figure outline for pose guidance
  const HumanOutline = () => (
    <svg 
      width="280" 
      height="380" 
      viewBox="0 0 280 380" 
      className="opacity-70"
    >
      {/* Athletic human outline with realistic proportions */}
      <g 
        fill="none" 
        stroke="hsl(var(--primary))" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="animate-pulse"
        style={{
          filter: 'drop-shadow(0 0 12px hsl(var(--primary) / 0.6))',
          animation: 'pulse 2s ease-in-out infinite'
        }}
      >
        {/* Head - more realistic shape */}
        <ellipse cx="140" cy="40" rx="18" ry="22" />
        
        {/* Neck */}
        <path d="M 140 62 L 140 75" />
        
        {/* Shoulders - athletic build */}
        <path d="M 105 75 Q 140 70 175 75" />
        
        {/* Torso - V-shaped athletic build */}
        <path d="M 105 75 L 115 95 L 120 130 L 125 160 L 130 175" />
        <path d="M 175 75 L 165 95 L 160 130 L 155 160 L 150 175" />
        
        {/* Waist */}
        <path d="M 130 175 Q 140 177 150 175" />
        
        {/* Hips */}
        <path d="M 130 175 L 125 185 L 120 195" />
        <path d="M 150 175 L 155 185 L 160 195" />
        
        {/* Arms extended - T-pose */}
        {/* Left arm */}
        <path d="M 105 75 L 60 80 L 45 85" /> {/* Upper arm */}
        <path d="M 45 85 L 35 95 L 30 120" /> {/* Forearm */}
        <ellipse cx="25" cy="125" rx="6" ry="4" /> {/* Hand */}
        
        {/* Right arm */}
        <path d="M 175 75 L 220 80 L 235 85" /> {/* Upper arm */}
        <path d="M 235 85 L 245 95 L 250 120" /> {/* Forearm */}
        <ellipse cx="255" cy="125" rx="6" ry="4" /> {/* Hand */}
        
        {/* Legs - athletic stance */}
        {/* Left leg */}
        <path d="M 120 195 L 115 240 L 112 290 L 110 335" /> {/* Thigh to ankle */}
        <ellipse cx="105" cy="345" rx="12" ry="8" /> {/* Foot */}
        
        {/* Right leg */}
        <path d="M 160 195 L 165 240 L 168 290 L 170 335" /> {/* Thigh to ankle */}
        <ellipse cx="175" cy="345" rx="12" ry="8" /> {/* Foot */}
        
        {/* Muscle definition lines */}
        <path d="M 125 100 Q 140 95 155 100" opacity="0.6" /> {/* Chest */}
        <path d="M 130 120 Q 140 115 150 120" opacity="0.6" /> {/* Abs */}
      </g>
      
      {/* Body alignment markers */}
      <g fill="hsl(var(--primary))" className="animate-ping" style={{ opacity: 0.8 }}>
        {/* Shoulder markers */}
        <circle cx="105" cy="75" r="3" />
        <circle cx="175" cy="75" r="3" />
        
        {/* Hip markers */}
        <circle cx="125" cy="185" r="3" />
        <circle cx="155" cy="185" r="3" />
        
        {/* Foot alignment markers */}
        <circle cx="105" cy="345" r="3" />
        <circle cx="175" cy="345" r="3" />
        
        {/* Hand markers */}
        <circle cx="25" cy="125" r="3" />
        <circle cx="255" cy="125" r="3" />
      </g>
    </svg>
  );

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
        
        {/* Human Outline Overlay - Clean and immersive */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className={`relative transition-all duration-500 ${
            isCapturing ? 'scale-105' : 'scale-100'
          } ${hasImageReady ? 'filter brightness-110 hue-rotate-60' : ''}`}>
            <div className="relative">
              <HumanOutline />
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

      {/* Bottom Controls - Positioned higher to avoid main menu overlap */}
      <div className="absolute bottom-24 left-4 right-4 z-30">
        <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-4 border border-primary/20">
          <div className="flex flex-col space-y-3">
            {/* Action Buttons Row */}
            <div className="flex space-x-3">
              {/* Cancel Button */}
              <Button
                onClick={handleCancel}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl border-2 border-red-500 transition-all duration-300"
              >
                <X className="w-5 h-5 mr-2" />
                Cancel
              </Button>

              {/* Upload from Gallery */}
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex-1 bg-gray-600/20 border-gray-400 text-gray-300 hover:bg-gray-600/30 hover:text-white transition-all duration-300"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload
              </Button>
            </div>

            {/* Continue Button */}
            <Button
              onClick={hasImageReady ? handleContinue : captureImage}
              disabled={isCapturing}
              className={`relative font-bold py-4 text-lg border-2 transition-all duration-300 ${
                hasImageReady 
                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]'
              } text-white disabled:opacity-50`}
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