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

  // Realistic human figure SVG for T-pose silhouette
  const HumanSilhouette = () => (
    <svg 
      width="240" 
      height="320" 
      viewBox="0 0 240 320" 
      className="opacity-60"
    >
      {/* Main body outline with realistic proportions */}
      <g 
        fill="none" 
        stroke="rgb(59 130 246)" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="animate-pulse"
        style={{
          filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))'
        }}
      >
        {/* Head */}
        <circle cx="120" cy="35" r="22" />
        
        {/* Neck */}
        <line x1="120" y1="57" x2="120" y2="70" />
        
        {/* Shoulders and torso */}
        <path d="M 95 70 Q 120 68 145 70" /> {/* Shoulders */}
        <line x1="95" y1="70" x2="100" y2="85" /> {/* Left shoulder line */}
        <line x1="145" y1="70" x2="140" y2="85" /> {/* Right shoulder line */}
        
        {/* Torso outline */}
        <path d="M 100 85 Q 120 83 140 85 L 135 140 Q 120 143 105 140 Z" />
        
        {/* Arms extended (T-pose) */}
        {/* Left arm */}
        <line x1="95" y1="70" x2="40" y2="75" /> {/* Upper arm */}
        <line x1="40" y1="75" x2="35" y2="110" /> {/* Forearm */}
        <circle cx="35" cy="115" r="4" /> {/* Hand */}
        
        {/* Right arm */}
        <line x1="145" y1="70" x2="200" y2="75" /> {/* Upper arm */}
        <line x1="200" y1="75" x2="205" y2="110" /> {/* Forearm */}
        <circle cx="205" cy="115" r="4" /> {/* Hand */}
        
        {/* Waist and hips */}
        <path d="M 105 140 Q 120 145 135 140" />
        <path d="M 105 140 Q 120 148 135 140 L 140 165 Q 120 168 100 165 Z" />
        
        {/* Legs */}
        {/* Left leg */}
        <line x1="108" y1="165" x2="105" y2="220" /> {/* Thigh */}
        <line x1="105" y1="220" x2="100" y2="275" /> {/* Shin */}
        <ellipse cx="95" cy="285" rx="8" ry="6" /> {/* Foot */}
        
        {/* Right leg */}
        <line x1="132" y1="165" x2="135" y2="220" /> {/* Thigh */}
        <line x1="135" y1="220" x2="140" y2="275" /> {/* Shin */}
        <ellipse cx="145" cy="285" rx="8" ry="6" /> {/* Foot */}
      </g>
      
      {/* Body landmarks */}
      <g fill="rgb(59 130 246)" className="animate-pulse" style={{ opacity: 0.8 }}>
        {/* Shoulder markers */}
        <circle cx="95" cy="70" r="2" />
        <circle cx="145" cy="70" r="2" />
        
        {/* Hip markers */}
        <circle cx="108" cy="165" r="2" />
        <circle cx="132" cy="165" r="2" />
        
        {/* Foot alignment markers */}
        <circle cx="95" cy="285" r="2" />
        <circle cx="145" cy="285" r="2" />
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
        
        {/* Scanning Overlay with Human Silhouette */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className={`relative transition-all duration-500 ${
              isCapturing ? 'scale-105' : 'scale-100'
            }`}>
              {/* Pulsing outer glow */}
              <div className="absolute inset-0 animate-pulse">
                <div className="w-full h-full border-2 border-blue-400/30 rounded-3xl shadow-[0_0_50px_rgba(59,130,246,0.3)]"></div>
              </div>
              
              {/* Main silhouette container */}
              <div className="relative p-8 border-2 border-blue-400/50 rounded-3xl bg-blue-500/5 backdrop-blur-sm">
                <HumanSilhouette />
                
                {/* Sparkle effects - evenly sized and distributed */}
                <div className="absolute top-6 left-6 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                <div className="absolute top-1/4 right-8 w-2 h-2 bg-white rounded-full animate-pulse delay-75"></div>
                <div className="absolute bottom-1/3 left-10 w-2 h-2 bg-blue-300 rounded-full animate-ping delay-150"></div>
                <div className="absolute top-2/3 right-6 w-2 h-2 bg-white rounded-full animate-pulse delay-300"></div>
                <div className="absolute bottom-6 right-12 w-2 h-2 bg-blue-400 rounded-full animate-ping delay-500"></div>
              </div>
              
              {/* Corner guides */}
              <div className="absolute -top-3 -left-3 w-6 h-6 border-t-3 border-l-3 border-blue-400 rounded-tl-lg"></div>
              <div className="absolute -top-3 -right-3 w-6 h-6 border-t-3 border-r-3 border-blue-400 rounded-tr-lg"></div>
              <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b-3 border-l-3 border-blue-400 rounded-bl-lg"></div>
              <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-3 border-r-3 border-blue-400 rounded-br-lg"></div>
            </div>
          </div>
        </div>

        {/* Header Text */}
        <div className="absolute top-8 left-4 right-4 text-center">
          <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-4 border border-blue-400/30">
            <h2 className="text-white text-lg font-bold mb-2">
              📸 Front Body Scan
            </h2>
            <p className="text-blue-300 text-sm animate-pulse">
              Stand straight with arms out. Fit your body into the outline.
            </p>
          </div>
        </div>

        {/* Grid Overlay */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px'
          }}></div>
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

      {/* Bottom Controls */}
      <div className="p-6 bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex flex-col space-y-4">
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