import React, { useState, useRef, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Camera, Upload, X, Flashlight, FlashlightOff, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { lightTap } from '@/lib/haptics';
import { playShutter, bindShutterInit } from '@/lib/sound';

interface PhotoIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: 'log' | 'health';
  onImageReady: (fileOrBlob: File | Blob) => void;
  busy?: boolean;
  showEmpty?: boolean;
  onTryAgain?: () => void;
  onAddManually?: () => void;
  onUploadClick?: () => void;
}

export const PhotoIntakeModal: React.FC<PhotoIntakeModalProps> = ({
  isOpen,
  onClose,
  context,
  onImageReady,
  busy = false,
  showEmpty = false,
  onTryAgain,
  onAddManually,
  onUploadClick
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showCaptureFlash, setShowCaptureFlash] = useState(false);

  // Initialize camera when modal opens
  useEffect(() => {
    let mounted = true;
    
    if (isOpen && !busy) {
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
  }, [isOpen, busy]);

  // Stop camera stream when busy to free up camera
  useEffect(() => {
    if (busy && streamRef.current) {
      console.log('🎥 Stopping camera stream during processing');
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [busy]);

  // Bind shutter sound init to capture button
  useEffect(() => {
    const captureBtn = document.querySelector('[data-capture-btn]') as HTMLElement;
    bindShutterInit(captureBtn);
  }, [hasPermission]);

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

      // Ensure video element exists
      if (!videoRef.current) {
        console.error('🎥 Video element not found in DOM');
        setDebugInfo('Error: Video element not found');
        throw new Error('Video element not found');
      }

      console.log('🎥 Video element found:', videoRef.current);
      setDebugInfo('Video element found, requesting stream...');

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
      
      console.log('🎥 Setting video srcObject...');
      videoRef.current.srcObject = stream;
      setDebugInfo('Video element connected to stream...');
      
      // Set permission to true AFTER successful setup
      setHasPermission(true);
      
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
    if (!videoRef.current || !canvasRef.current || isCapturing || busy) return;

    setIsCapturing(true);
    
    try {
      // Capture effects
      lightTap(); // Haptic feedback
      await playShutter(); // Camera sound - must be in direct click handler for iOS
      
      // Screen flash effect
      setShowCaptureFlash(true);
      setTimeout(() => setShowCaptureFlash(false), 200);
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Canvas context not available');
      
      // Ensure video is ready and has dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('Video not ready for capture');
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0);
      
      // Short delay to show freeze effect then call parent
      setTimeout(() => {
        setIsCapturing(false);
        
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('📸 Photo captured successfully, size:', blob.size);
            onImageReady(blob);
          } else {
            throw new Error('Failed to create image blob');
          }
        }, 'image/jpeg', 0.9);
      }, 500);
      
    } catch (error) {
      console.error('Photo capture failed:', error);
      toast.error('Failed to capture photo');
      setIsCapturing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File upload triggered');
    const file = event.target.files?.[0];
    if (!file) return;
    
    console.log('File selected:', file.name, file.type, file.size);
    onImageReady(file);
    // Reset input value to allow selecting the same file again
    event.currentTarget.value = '';
  };

  const handleUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUploadClick) {
      onUploadClick();
    } else {
      fileInputRef.current?.click();
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
          {/* Video element - Full screen behind everything */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover z-0 ${hasPermission === true ? 'opacity-100' : 'opacity-0'}`}
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

          {/* Header Banner - Transparent overlay */}
          <div className="relative z-20 p-4">
            <div className="mx-4 mt-4 mb-4 bg-neutral-800/90 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between">
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

          {/* Corner Guides */}
          <div className="absolute top-44 left-8 w-6 h-6 border-l-2 border-t-2 border-emerald-400 z-30" />
          <div className="absolute top-44 right-8 w-6 h-6 border-r-2 border-t-2 border-emerald-400 z-30" />
          <div className="absolute bottom-40 left-8 w-6 h-6 border-l-2 border-b-2 border-emerald-400 z-30" />
          <div className="absolute bottom-40 right-8 w-6 h-6 border-r-2 border-b-2 border-emerald-400 z-30" />

          {/* Capture Flash Overlay */}
          {showCaptureFlash && (
            <div className="absolute inset-0 bg-white z-40 animate-pulse" 
                 style={{ animationDuration: '0.2s', animationIterationCount: 1 }} />
          )}


          {/* Busy Overlay - Small spinner while processing */}
          {busy && (
            <div className="absolute inset-0 bg-black/70 z-40 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-400/30 border-t-emerald-400 mx-auto mb-4" />
                  <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-emerald-400 animate-pulse" />
                </div>
                <p className="text-lg font-medium">Analyzing...</p>
                <p className="text-emerald-400 text-sm animate-pulse">🔍 Detecting food items</p>
              </div>
            </div>
          )}

          {/* Empty State - Inline inside modal */}
          {showEmpty && (
            <div className="absolute inset-0 bg-black/90 z-40 flex items-center justify-center p-4">
              <div className="bg-neutral-900 text-neutral-100 rounded-2xl p-6 max-w-xs w-full text-center">
                <div className="h-12 w-12 mx-auto mb-4 bg-neutral-700 rounded-full flex items-center justify-center">
                  <span className="text-xl">🍽️</span>
                </div>
                <h3 className="text-lg font-bold mb-3">No Items Detected</h3>
                <p className="text-neutral-300 text-sm mb-4">
                  We couldn't identify any food items. Try again or add manually.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={onTryAgain}
                    size="sm"
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={onAddManually}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    Add Manually
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Loading/Error States */}
          {hasPermission === null && !busy && (
            <div className="absolute inset-0 flex items-center justify-center z-40 bg-black">
              <div className="text-white text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Initializing camera...</p>
                {debugInfo && <p className="text-xs text-gray-400 mt-2">{debugInfo}</p>}
              </div>
            </div>
          )}
          
          {hasPermission !== true && hasPermission !== null && !busy && (
            <div className="absolute inset-0 flex items-center justify-center z-40 bg-black">
              <div className="text-white text-center">
                <Camera className="h-12 w-12 mx-auto mb-4 text-red-400" />
                <p>Camera access denied</p>
                {debugInfo && <p className="text-xs text-gray-400 mt-2">{debugInfo}</p>}
                <Button onClick={initCamera} className="mt-4">Try Again</Button>
              </div>
            </div>
          )}


          {/* Bottom instruction */}
          <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-xl z-30">
            <p className="text-white text-sm font-medium text-center">
              Position food in the frame
            </p>
            <p className="text-white/70 text-xs text-center mt-1">
              Fill the frame • Avoid glare • Keep steady
            </p>
          </div>

          {/* Controls - Fixed positioning */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-sm z-30">
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
                data-capture-btn
                disabled={!hasPermission || isCapturing || busy}
                className={`h-16 w-16 rounded-full p-0 shadow-lg transition-all duration-200 ${
                  isCapturing || busy 
                    ? 'bg-emerald-500 text-white animate-pulse' 
                    : 'bg-white text-black hover:bg-white/90 hover:scale-110'
                }`}
                title="Take photo"
              >
                {isCapturing ? (
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                ) : (
                  <Camera className="h-8 w-8" />
                )}
              </Button>

              {/* Upload Button */}
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleUpload}
                disabled={busy}
                className="bg-blue-500 hover:bg-blue-600 text-white h-12 w-12 rounded-full p-0 shadow-lg disabled:opacity-50"
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
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};