import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useId } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Camera, X, Upload } from 'lucide-react';

export type UnifiedPhotoCaptureModalProps = {
  isOpen: boolean;
  onClose: () => void;
  
  // Called when the user captures or picks a photo.
  // Provide a File or Blob (with type 'image/*').
  onConfirm: (file: File | Blob) => void;

  // Small text block; Logging will use: "Position food in the frame"
  // Health Scan keeps its own copy; do not import from Health Scan.
  title?: string;        // default: "Photo Capture"
  subtitle?: string;     // default: "Capture, upload, or exit"

  // NEW — top banner content (for Logging)
  bannerEmoji?: string;      // default: "🍽️"
  bannerTitle?: string;      // default: "Log your meal"
  bannerSubtext?: string;    // default: "Capture or upload a food photo"

  // Optional: override labels/icons if we ever need variants
  labels?: {
    close?: string;      // default: "Close"
    capture?: string;    // default: "Capture"
    upload?: string;     // default: "Upload"
  };
  
  blockCamera?: boolean;
};

export const UnifiedPhotoCaptureModal: React.FC<UnifiedPhotoCaptureModalProps> = (props) => {
  // Default values (put near the component top):
  const {
    isOpen, onClose, onConfirm,
    title = "Position food in the frame",
    subtitle = "Capture, upload, or exit",
    bannerEmoji = "🍽️",
    bannerTitle = "Log your meal",
    bannerSubtext = "Capture or upload a food photo",
    labels = {},
    blockCamera = false
  } = props;
  // Stable IDs for accessibility
  const titleId = useId();
  const descId = useId();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const releaseCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }
    
    setStream(null);
    setIsCapturing(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current) return;
    
    if (blockCamera || (typeof window !== 'undefined' && (window as any).__confirmOpen)) {
      console.log('[UNIFIED_CAMERA][BLOCKED_WHILE_CONFIRM]');
      return;
    }
    
    try {
      console.log("[UNIFIED_CAMERA] Requesting camera stream...");
      
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!mountedRef.current) {
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }
      
      streamRef.current = mediaStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setStream(mediaStream);
        setError(null);
      }
      
    } catch (err: any) {
      console.warn('[UNIFIED_CAMERA] Camera access failed:', err?.name || err);
      setError('Camera access needed. You can Upload instead.');
    }
  }, []);

  useLayoutEffect(() => {
    mountedRef.current = true;
    
    if (isOpen && !blockCamera) {
      startCamera();
    } else {
      releaseCamera();
    }
    
    return () => {
      mountedRef.current = false;
      releaseCamera();
    };
  }, [isOpen, blockCamera, startCamera, releaseCamera]);

  // Cleanup on unmount
  useEffect(() => () => releaseCamera(), [releaseCamera]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !stream) return;

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      
      // Get video dimensions
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      // Center crop to square for better detection
      const cropSize = Math.min(videoWidth, videoHeight) * 0.8;
      const cropX = (videoWidth - cropSize) / 2;
      const cropY = (videoHeight - cropSize) / 2;
      
      canvas.width = cropSize;
      canvas.height = cropSize;
      
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, cropX, cropY, cropSize, cropSize, 0, 0, cropSize, cropSize);
      
      canvas.toBlob((blob) => {
        if (blob && mountedRef.current) {
          onConfirm(blob);
        }
      }, 'image/jpeg', 0.95);
      
    } catch (error) {
      console.error('[UNIFIED_CAMERA] Capture failed:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [stream, onConfirm]);

  const handleImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment'); // iOS hint for rear camera
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && mountedRef.current) {
        onConfirm(file);
      }
    };
    
    input.click();
  }, [onConfirm]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="w-screen h-screen max-w-none max-h-none p-0 m-0 bg-black border-0 rounded-none [&>button]:hidden"
        style={{ zIndex: 720 }}
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <VisuallyHidden asChild>
          <DialogTitle id={titleId}>{title}</DialogTitle>
        </VisuallyHidden>
        
        <VisuallyHidden asChild>
          <DialogDescription id={descId}>
            {subtitle}
          </DialogDescription>
        </VisuallyHidden>
        
        <div className="relative w-full h-full bg-black overflow-hidden">
          {/* Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* TOP BANNER — Logging variant */}
          <div className="absolute top-6 left-4 right-4 z-[5] mt-[env(safe-area-inset-top)]">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">{bannerEmoji}</span>
                </div>
                <h2 className="text-white text-xl font-bold text-center">
                  {bannerTitle}
                </h2>
              </div>
              <p className="text-white/80 text-sm text-center">
                {bannerSubtext}
              </p>
            </div>
          </div>

          {/* UI Overlay */}
          <div className="absolute inset-0 flex flex-col">
            {/* Center - Camera Viewfinder */}
            <div className="absolute top-44 bottom-48 left-4 right-4 flex items-center justify-center">
              <div className="relative w-full max-w-[400px] h-full pointer-events-none">
                {/* Framing corners - copied from Health Scan */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400"></div>
                
                {/* Center reticle - copied from Health Scan */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-6 h-6 border border-cyan-400 rounded-full opacity-60"></div>
                </div>
              </div>
            </div>

            {/* Bottom gradient */}
            <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-10" />
            
            {/* Bottom Controls - copied from Health Scan */}
            <footer className="absolute bottom-8 inset-x-0 pb-[env(safe-area-inset-bottom)] px-8 z-20">
              {/* Instructions */}
              <div className="text-center text-white/90 mb-6">
                <p className="text-lg font-medium">{title}</p>
                <p className="text-sm text-white/70 mt-1">{subtitle}</p>
              </div>
              
              {/* Three Control Buttons */}
              <div className="flex justify-center items-center gap-8">
                {/* Close Button - Red */}
                <Button
                  onClick={onClose}
                  size="lg"
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full w-14 h-14 p-0"
                  title={labels.close || "Close"}
                >
                  <X className="h-5 w-5" />
                </Button>

                {/* Capture Button - Center, larger */}
                <Button
                  onClick={capturePhoto}
                  disabled={isCapturing || !stream}
                  size="lg"
                  className="bg-white text-black hover:bg-gray-200 rounded-full w-20 h-20 p-0 disabled:opacity-50"
                  title={labels.capture || "Capture"}
                >
                  {isCapturing ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent" />
                  ) : (
                    <Camera className="h-8 w-8" />
                  )}
                </Button>

                {/* Upload Button - Blue */}
                <Button
                  onClick={handleImageUpload}
                  size="lg"
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-14 h-14 p-0"
                  title={labels.upload || "Upload"}
                >
                  <Upload className="h-5 w-5" />
                </Button>
              </div>
            </footer>
          </div>

          {/* Error State - inline message when camera access denied */}
          {error && (
            <div className="absolute top-24 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-2xl p-4 border border-red-500/20">
              <div className="text-center text-white">
                <p className="text-sm text-red-300 mb-2">⚠️ {error}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
