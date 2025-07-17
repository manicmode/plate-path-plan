import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Keyboard, Target, Zap } from 'lucide-react';

interface HealthScannerInterfaceProps {
  onCapture: (imageData: string) => void;
  onManualEntry: () => void;
}

export const HealthScannerInterface: React.FC<HealthScannerInterfaceProps> = ({
  onCapture,
  onManualEntry
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsScanning(true);
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Add a small delay for visual feedback
    setTimeout(() => {
      onCapture(imageData);
    }, 500);
  };

  return (
    <div className="relative w-full h-full bg-black flex flex-col">
      {/* Video Stream */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Scanning Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Animated Scanner Frame */}
          <div className="relative">
            <div className={`w-64 h-64 border-4 border-green-400 rounded-3xl transition-all duration-500 ${
              isScanning ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]' : 'shadow-[0_0_30px_rgba(34,197,94,0.4)]'
            }`}>
              {/* Corner indicators */}
              <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
              <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
              <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
              
              {/* Barcode Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`transition-all duration-300 ${isScanning ? 'animate-pulse' : 'animate-bounce'}`}>
                  <Target className={`w-16 h-16 transition-colors ${
                    isScanning ? 'text-red-400' : 'text-green-400'
                  }`} />
                </div>
              </div>
              
              {/* Scanning line */}
              {isScanning && (
                <div className="absolute inset-0 overflow-hidden rounded-3xl">
                  <div className="w-full h-1 bg-red-500 animate-[slide_0.5s_ease-in-out_infinite] shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Header Text */}
        <div className="absolute top-8 left-4 right-4 text-center">
          <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-4 border border-green-400/30">
            <h2 className="text-white text-lg font-bold mb-2">
              🔬 Health Inspector Scanner
            </h2>
            <p className="text-green-300 text-sm animate-pulse">
              Scan a food barcode or aim your camera at a meal to inspect its health profile!
            </p>
          </div>
        </div>

        {/* Grid Overlay for Tech Feel */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px'
          }}></div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-6 bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex flex-col space-y-4">
          {/* Manual Entry Button */}
          <Button
            onClick={onManualEntry}
            variant="outline"
            className="bg-blue-600/20 border-blue-400 text-blue-300 hover:bg-blue-600/30 hover:text-white transition-all duration-300"
          >
            <Keyboard className="w-5 h-5 mr-2" />
            🔢 Enter Barcode Manually
          </Button>

          {/* Main Analyze Button */}
          <Button
            onClick={captureImage}
            disabled={isScanning}
            className="relative bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 
                     text-white font-bold py-4 text-lg border-2 border-red-400 
                     shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]
                     transition-all duration-300 disabled:opacity-50"
          >
            <div className="flex items-center justify-center">
              <Zap className={`w-6 h-6 mr-3 ${isScanning ? 'animate-spin' : 'animate-pulse'}`} />
              {isScanning ? '🔍 SCANNING...' : '🚨 ANALYZE NOW'}
            </div>
            {!isScanning && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                           animate-[shimmer_2s_ease-in-out_infinite] rounded-lg"></div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};