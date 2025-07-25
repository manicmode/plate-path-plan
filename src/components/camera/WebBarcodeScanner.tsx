import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Camera, AlertCircle } from 'lucide-react';
import jsQR from 'jsqr';

interface WebBarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  onClose: () => void;
}

export const WebBarcodeScanner: React.FC<WebBarcodeScannerProps> = ({
  onBarcodeDetected,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const scanningIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    startCamera();
    return () => {
      cleanup();
    };
  }, []);

  const startCamera = async () => {
    try {
      // ✅ 1. Ensure video element is created and mounted
      console.log("[VIDEO INIT] videoRef =", videoRef.current);
      if (!videoRef.current) {
        console.error("[VIDEO] videoRef is null — video element not mounted");
        return;
      }

      // ✅ 3. Confirm HTTPS is enforced on mobile
      if (location.protocol !== 'https:') {
        console.warn("[SECURITY] Camera requires HTTPS — current protocol:", location.protocol);
      }

      // ✅ 4. Confirm camera permissions
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'camera' as PermissionName }).then((res) => {
          console.log("[PERMISSION] Camera permission state:", res.state);
        }).catch((err) => {
          console.log("[PERMISSION] Could not query camera permission:", err);
        });
      }

      // ✅ 2. Add logging inside getUserMedia() block
      console.log("[CAMERA] Requesting camera stream...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      // ✅ 2. Stream received logging
      console.log("[CAMERA] Stream received:", mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // ✅ 5. Visually confirm that the <video> tag is rendering
        videoRef.current.style.border = "2px solid red";
        
        console.log("[CAMERA] srcObject set, playing video");
        setStream(mediaStream);
        setIsScanning(true);
        startScanning();
      } else {
        console.error("[CAMERA] videoRef.current is null");
      }
    } catch (err) {
      // ✅ 2. Enhanced error logging
      console.error("[CAMERA FAIL] getUserMedia error:", err);
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please check permissions and try again.');
    }
  };

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    scanningIntervalRef.current = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA && context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          onBarcodeDetected(code.data);
          cleanup();
        }
      }
    }, 100);
  };

  const cleanup = () => {
    if (scanningIntervalRef.current) {
      clearInterval(scanningIntervalRef.current);
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    setIsScanning(false);
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
        <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
        <p className="text-red-600 dark:text-red-400 text-center mb-4">
          {error}
        </p>
        <Button
          variant="outline"
          onClick={handleClose}
          className="border-red-300 text-red-600"
        >
          Close Scanner
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-64 object-cover"
        />
        <canvas
          ref={canvasRef}
          className="hidden"
        />
        
        {/* Scanning overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-56 h-36 border-2 border-emerald-400 rounded-lg relative">
            {/* Corner indicators */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
            
            {/* Scanning line */}
            <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-red-500 transform -translate-y-1/2 animate-pulse" />
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-emerald-600 bg-opacity-90 rounded-lg px-4 py-2">
            <span className="text-sm text-white font-medium">Scanning for barcode...</span>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        <p>Align the barcode within the frame</p>
        <p className="text-xs mt-1">Camera will automatically detect and scan barcodes</p>
      </div>

      <Button
        variant="outline"
        onClick={handleClose}
        className="w-full"
      >
        <X className="h-4 w-4 mr-2" />
        Cancel Scanning
      </Button>
    </div>
  );
};