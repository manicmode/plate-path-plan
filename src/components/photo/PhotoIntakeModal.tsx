import React, { useState, useRef, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Camera, Upload, X, Flashlight, FlashlightOff, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PhotoIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: 'log' | 'health';
  onImageReady: (fileOrBlob: File | Blob) => void;
}

export const PhotoIntakeModal: React.FC<PhotoIntakeModalProps> = ({
  isOpen,
  onClose,
  context,
  onImageReady
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Initialize camera when modal opens - with better timing
  useEffect(() => {
    let mounted = true;
    
    if (isOpen) {
      // Add small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (mounted) {
          console.log('🎥 Modal opened, initializing camera...');
          setDebugInfo('Starting camera initialization...');
          initCamera();
        }
      }, 100);
      
      return () => {
        clearTimeout(timer);
        mounted = false;
      };
    } else {
      cleanup();
      setDebugInfo('');
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const initCamera = async () => {
    try {
      console.log('🎥 Requesting camera access...');
      setDebugInfo('Requesting camera permissions...');
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        },
        audio: false
      });
      
      console.log('🎥 Camera stream obtained:', stream);
      console.log('🎥 Stream active:', stream.active);
      console.log('🎥 Video tracks:', stream.getVideoTracks().length);
      setDebugInfo(`Camera stream active: ${stream.active}`);
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        console.log('🎥 Setting video srcObject...');
        videoRef.current.srcObject = stream;
        setDebugInfo('Video element connected to stream...');
        
        // Wait for video to load metadata
        videoRef.current.addEventListener('loadedmetadata', () => {
          console.log('🎥 Video metadata loaded');
          console.log('🎥 Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
          setDebugInfo(`Video loaded: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}`);
        });
        
        // Ensure video plays
        try {
          await videoRef.current.play();
          console.log('🎥 Video playing successfully');
          setDebugInfo('Camera is now active');
        } catch (playError) {
          console.log('🎥 Video play failed:', playError);
          setDebugInfo('Video play failed, but might still work');
        }
      } else {
        console.error('🎥 Video ref is null');
        setDebugInfo('Error: Video element not found');
      }
      
      setHasPermission(true);
    } catch (error) {
      console.error('🎥 Camera access denied:', error);
      setDebugInfo(`Camera error: ${(error as Error).message}`);
      setHasPermission(false);
      toast.error('Camera access is required for photo capture');
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setHasPermission(null);
  };

  const toggleFlash = async () => {
    if (!streamRef.current) return;
    
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (track.getCapabilities && track.applyConstraints) {
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !flashEnabled } as any]
          });
          setFlashEnabled(!flashEnabled);
        }
      }
    } catch (error) {
      console.log('Flash not supported or failed to toggle');
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;

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
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          onImageReady(blob);
        }
      }, 'image/jpeg', 0.8);
      
    } catch (error) {
      console.error('Photo capture failed:', error);
      toast.error('Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File upload triggered');
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name, file.type, file.size);
      onImageReady(file);
      // Reset input value to allow selecting the same file again
      event.target.value = '';
    }
  };

  const contextConfig = {
    log: {
      title: '📸 Photo Logging',
      subtitle: 'Take a photo of your meal or upload from gallery'
    },
    health: {
      title: '🔍 Photo Health Analyzer',
      subtitle: 'Take a photo of brand product or meal for health report'
    }
  };

  const config = contextConfig[context];

  if (hasPermission === false) {
    return (
      <Dialog.Root open={isOpen} onOpenChange={onClose}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 text-neutral-100 rounded-2xl p-8 max-w-md w-full text-center">
              <Camera className="h-16 w-16 mx-auto mb-4 text-neutral-400" />
              <Dialog.Title className="text-2xl font-bold mb-4">Camera Access Required</Dialog.Title>
              <Dialog.Description className="text-neutral-300 mb-6">
                Please allow camera access to take photos for {context === 'log' ? 'logging' : 'health analysis'}.
              </Dialog.Description>
              <div className="flex gap-4">
                <Button onClick={initCamera} className="flex-1">Try Again</Button>
                <Button variant="outline" onClick={onClose} className="flex-1">Go Back</Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black z-50" />
        <Dialog.Content className="fixed inset-0 bg-black text-white z-50 flex flex-col">
          {/* Header Banner */}
          <div className="relative z-20 p-4">
            <div className="mx-4 mt-8 mb-4 bg-neutral-800/90 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between">
              <div>
                <Dialog.Title className="text-white text-lg font-semibold">{config.title}</Dialog.Title>
                <Dialog.Description className="text-emerald-400 text-sm mt-1">{config.subtitle}</Dialog.Description>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-red-500/20 bg-red-500/80 hover:bg-red-500 h-10 w-10 rounded-full p-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Camera View Container */}
          <div className="flex-1 relative overflow-hidden">
            {/* Top Corner Guides - moved higher and closer to banner */}
            <div className="absolute top-2 left-8 w-6 h-6 border-l-2 border-t-2 border-emerald-400 z-30" />
            <div className="absolute top-2 right-8 w-6 h-6 border-r-2 border-t-2 border-emerald-400 z-30" />
            
            {/* Camera View - Fixed z-index and positioning */}
            <div className="absolute inset-0 bg-black">
              {hasPermission === true && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover z-10"
                  style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%'
                  }}
                  onLoadedMetadata={() => {
                    console.log('🎥 Video loaded metadata:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
                    setDebugInfo(`Video active: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}`);
                  }}
                  onError={(e) => {
                    console.error('🎥 Video error:', e);
                    setDebugInfo('Video element error');
                  }}
                  onCanPlay={() => {
                    console.log('🎥 Video can play');
                    setDebugInfo('Video ready to play');
                  }}
                />
              )}
              
              {hasPermission === null && (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-black">
                  <div className="text-white text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Initializing camera...</p>
                    {debugInfo && <p className="text-xs text-gray-400 mt-2">{debugInfo}</p>}
                  </div>
                </div>
              )}
              
              {hasPermission !== true && hasPermission !== null && (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-black">
                  <div className="text-white text-center">
                    <Camera className="h-12 w-12 mx-auto mb-4 text-red-400" />
                    <p>Camera access denied</p>
                    {debugInfo && <p className="text-xs text-gray-400 mt-2">{debugInfo}</p>}
                    <Button onClick={initCamera} className="mt-4">Try Again</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Debug info overlay - remove in production */}
            {debugInfo && hasPermission === true && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded z-40">
                {debugInfo}
              </div>
            )}

            {/* Bottom instruction */}
            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-xl z-30">
              <p className="text-white text-sm font-medium text-center">
                Position food in the frame
              </p>
              <p className="text-white/70 text-xs text-center mt-1">
                Fill the frame • Avoid glare • Keep steady
              </p>
            </div>

            {/* Bottom Corner Guides */}
            <div className="absolute bottom-32 left-8 w-6 h-6 border-l-2 border-b-2 border-emerald-400 z-30" />
            <div className="absolute bottom-32 right-8 w-6 h-6 border-r-2 border-b-2 border-emerald-400 z-30" />
          </div>

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-sm">
            <div className="flex items-center justify-center space-x-8">
              {/* Flash Toggle */}
              <Button
                variant="ghost"
                size="lg"
                onClick={toggleFlash}
                className="text-white hover:bg-white/20 h-12 w-12 rounded-full p-0 border border-white/20"
                disabled={!hasPermission}
                title="Toggle flash"
              >
                {flashEnabled ? (
                  <Flashlight className="h-6 w-6" />
                ) : (
                  <FlashlightOff className="h-6 w-6" />
                )}
              </Button>

              {/* Capture Button */}
              <Button
                size="lg"
                onClick={capturePhoto}
                disabled={!hasPermission || isCapturing}
                className="bg-white text-black hover:bg-white/90 h-16 w-16 rounded-full p-0 shadow-lg"
                title="Take photo"
              >
                {isCapturing ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <Camera className="h-8 w-8" />
                )}
              </Button>

              {/* Upload Button */}
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  console.log('Upload button clicked');
                  fileInputRef.current?.click();
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white h-12 w-12 rounded-full p-0 shadow-lg"
                title="Upload from gallery"
              >
                <Upload className="h-6 w-6" />
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

          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};