import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useId } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Camera, SwitchCamera, Zap, ZapOff, X, Lightbulb, Upload } from 'lucide-react';
import { camAcquire, camRelease, camHardStop, camOwnerMount, camOwnerUnmount } from '@/lib/camera/guardian';
import { attachStreamToVideo, detachVideo } from '@/lib/camera/videoAttach';
import { useTorch } from '@/lib/camera/useTorch';
import { prepareImageForAnalysis } from '@/lib/img/prepareImageForAnalysis';
import { supabase } from '@/integrations/supabase/client';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { handoffFromPhotoCapture } from '@/features/meal-capture/gateway';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { scannerLiveCamEnabled } from '@/lib/platform';
import { openPhotoCapture } from '@/components/camera/photoCapture';
import { logOwnerAcquire, logOwnerAttach, logOwnerRelease, logPerfOpen, logPerfClose, checkForLeaks } from '@/diagnostics/cameraInq';
import { stopAllVideos } from '@/lib/camera/globalFailsafe';
import { useAutoImmersive } from '@/lib/uiChrome';


function torchOff(track?: MediaStreamTrack) {
  try { track?.applyConstraints?.({ advanced: [{ torch: false }] as any }); } catch {}
}

function hardDetachVideo(video?: HTMLVideoElement | null) {
  if (!video) return;
  try { video.pause(); } catch {}
  try { (video as any).srcObject = null; } catch {}
  try { video.removeAttribute('src'); video.load?.(); } catch {}
}

interface PhotoCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (imageData: string) => void;
  onManualFallback: () => void;
}


export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  open,
  onOpenChange,
  onCapture,
  onManualFallback
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Stable IDs for accessibility
  const titleId = useId();
  const descId = useId();
  
  // Enable immersive mode (hide bottom nav) when modal is open
  useAutoImmersive(open);
  
  const startTimeRef = useRef<number>(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { supportsTorch, torchOn, setTorch, ensureTorchState } = useTorch(() => trackRef.current);

  const OWNER = 'photo_capture';

  const releaseNow = useCallback(() => {
    // release BEFORE any navigation/unmount
    detachVideo(videoRef.current);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    
    camOwnerUnmount(OWNER);
    camRelease(OWNER);
    logOwnerRelease('PhotoCaptureModal', ['video']);
    
    trackRef.current = null;
    streamRef.current = null;
    setStream(null);
    setIsCapturing(false);
  }, []);

  useLayoutEffect(() => {
    if (open) {
      logPerfOpen('PhotoCaptureModal');
      logOwnerAcquire('PhotoCaptureModal');
      camOwnerMount(OWNER);
      startCamera();
    } else {
      camOwnerUnmount(OWNER);
      camHardStop('modal_close');
      releaseNow();
      logPerfClose('PhotoCaptureModal', startTimeRef.current);
      checkForLeaks('PhotoCaptureModal');
    }
    
    return () => {
      camOwnerUnmount(OWNER);
      camHardStop('unmount');
      releaseNow();
    };
  }, [open, releaseNow]);

  // Unmount guard
  useEffect(() => () => releaseNow(), [releaseNow]);

  const startCamera = async () => {
    if (streamRef.current) return streamRef.current;
    
    try {
      console.log("[PHOTO] Requesting camera stream...");
      
      // Use ideal constraints with robust fallback
      const getCamera = async () => {
        const primary = { 
          video: { 
            facingMode: { ideal: 'environment' }, 
            width: { ideal: 1280 }, 
            height: { ideal: 720 } 
          } 
        };
        const fallback = { video: true };
        
        try { 
          return await camAcquire(OWNER, primary); 
        } catch (e: any) {
          console.warn('[CAM] primary failed', e?.name);
          return await camAcquire(OWNER, fallback);
        }
      };
      
      const mediaStream = await getCamera();
      streamRef.current = mediaStream;
      
      if (videoRef.current) {
        await attachStreamToVideo(videoRef.current, mediaStream);
        
        const track = mediaStream.getVideoTracks()[0];
        trackRef.current = track;
        setStream(mediaStream);
        
        // Camera inquiry logging
        const streamId = (mediaStream as any).__camInqId || 'unknown';
        logOwnerAttach('PhotoCaptureModal', streamId);
        
        // Ensure torch state after track is ready
        setTimeout(() => {
          ensureTorchState();
        }, 100);
        
        setError(null);
      }
      
      return mediaStream;
    } catch (err: any) {
      console.warn('[PHOTO] Live video denied, using native capture', err?.name || err);
      try {
        const file = await openPhotoCapture('image/*','environment');
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageBase64 = e.target?.result as string;
          onCapture(imageBase64);
        };
        reader.readAsDataURL(file);
        camHardStop('modal_close');
        onOpenChange(false);
        return null;
      } catch (fallbackErr) {
        console.error("[PHOTO] Both live and photo capture failed:", err, fallbackErr);
        setError('Unable to access camera. Please check permissions and try again.');
      }
    }
  };

  const releaseCamera = () => {
    const s = streamRef.current; 
    streamRef.current = null;
    if (!s) return;
    
    const track = s.getVideoTracks?.()?.[0];
    torchOff(track);

    const stoppedKinds: string[] = [];
    try { 
      s.getTracks().forEach(t => { 
        stoppedKinds.push(t.kind);
        try { t.stop(); } catch {} 
      }); 
    } catch {}

    // Camera inquiry logging
    if (stoppedKinds.length > 0) {
      logOwnerRelease('PhotoCaptureModal', stoppedKinds);
    }

    try { if (videoRef.current) videoRef.current.srcObject = null; } catch {}
    hardDetachVideo(videoRef.current);
    
    trackRef.current = null;
    setStream(null);
    setIsCapturing(false);
  };

  const toggleTorch = async () => {
    try {
      console.log("[PHOTO-TORCH] Attempting to toggle torch. Current state:", torchOn, "Track:", !!trackRef.current);
      const result = await setTorch(!torchOn);
      console.log("[PHOTO-TORCH] Toggle result:", result);
      if (!result.ok) {
        console.warn("Torch toggle failed:", result.reason);
        toast.error(`Flash not available: ${result.reason}`);
      } else {
        console.log("[PHOTO-TORCH] Successfully toggled torch to:", !torchOn);
      }
    } catch (error) {
      console.error("Error toggling torch:", error);
      toast.error("Failed to toggle flashlight");
    }
  };

  const playCameraClickSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.log('Camera click sound not available');
    }
  };

  const stopTracksSafely = async (stream?: MediaStream | null) => {
    try { 
      stream?.getTracks().forEach(t => t.stop()); 
    } catch {}
    await new Promise(r => setTimeout(r, 40)); // small settle for iOS
  };

  const handleCapturedBlob = async (blob: Blob) => {
    // Try meal capture gateway first
    const photoUrl = URL.createObjectURL(blob);
    const handedOff = await handoffFromPhotoCapture(
      photoUrl, 
      "?" + searchParams.toString()
    );

    if (handedOff) {
      // Stop camera and close modal
      await stopTracksSafely(streamRef.current);
      onOpenChange(false);
      
      // Navigate to entry route with token
      setTimeout(() => {
        // Find the token by looking for mc:entry: keys
        const keys = Object.keys(sessionStorage).filter(k => k.startsWith('mc:entry:'));
        const token = keys.length > 0 ? keys[0].replace('mc:entry:', '') : '';
        navigate(`/meal-capture/entry?photoToken=${token}`, { replace: true });
      }, 0);
      
      return;
    }

    // Clean up object URL if not used
    URL.revokeObjectURL(photoUrl);

    // Legacy path (unchanged) - convert blob to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageBase64 = e.target?.result as string;
      onCapture(imageBase64);
    };
    reader.readAsDataURL(blob);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !stream) return;

    setIsCapturing(true);
    playCameraClickSound();

    try {
      // Check if analyzer is enabled
      if (!isFeatureEnabled('image_analyzer_v1')) {
        console.log('[PHOTO] Analyzer disabled, redirecting to manual');
        toast.info('Photo analysis is in beta. Try manual or voice for now.');
        camHardStop('modal_close');
        onOpenChange(false);
        onManualFallback();
        return;
      }

      console.log('[PHOTO] Capturing photo...');
      
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob for new gateway system
      canvas.toBlob(async (blob) => {
        if (blob) {
          await handleCapturedBlob(blob);
          camHardStop('modal_close');
          onOpenChange(false);
        }
      }, 'image/jpeg', 0.85);
      
    } catch (error) {
      console.error('[PHOTO] Capture failed:', error);
      toast.error('Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('[PHOTO] Image uploaded, processing...');
        await handleCapturedBlob(file);
        camHardStop('modal_close');
        onOpenChange(false);
      }
    };
    input.click();
  };

  const handleExit = useCallback(() => {
    camHardStop('modal_close');       // Force stop BEFORE anything else  
    releaseNow();                     // Then normal cleanup
    stopAllVideos();                  // Belt & suspenders
    onOpenChange(false);              // Finally close/navigate
  }, [releaseNow, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-screen h-screen max-w-none max-h-none p-0 m-0 bg-black border-0 rounded-none [&>button]:hidden"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <VisuallyHidden asChild>
          <DialogTitle id={titleId}>Take Photo</DialogTitle>
        </VisuallyHidden>
        
        <VisuallyHidden asChild>
          <DialogDescription id={descId}>
            Use your camera to take a picture.
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

          {/* UI Overlay */}
          <div className="absolute inset-0 flex flex-col">
            {/* Header Banner - moved all the way up */}
            <div className="absolute top-4 left-4 right-4 z-20 mt-[env(safe-area-inset-top)]">
              <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl">📸</span>
                  </div>
                  <h2 className="text-white text-xl font-bold text-center">
                    Photo Health Analyzer
                  </h2>
                </div>
                <p className="text-green-300 text-sm animate-pulse text-center">
                  Take a photo of brand product or a meal for health report!
                </p>
              </div>
            </div>

            {/* Center - Camera Viewfinder - positioned below banner with more spacing */}
            <div className="absolute top-44 bottom-48 left-4 right-4 flex items-center justify-center">
              {/* Camera frame overlay - Extended vertically to use most of the available space */}
              <div className="relative w-full max-w-[400px] h-full pointer-events-none">
                {/* Corner indicators */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400"></div>
                
                {/* Center crosshair */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-6 h-6 border border-cyan-400 rounded-full opacity-60"></div>
                </div>
              </div>
            </div>

            {/* Bottom gradient */}
            <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-10" />
            
            {/* Flashlight Button - Positioned above upload button */}
            {supportsTorch && (
              <div className="absolute bottom-32 right-12 pb-[env(safe-area-inset-bottom)] z-50 pointer-events-auto">
                <Button
                  onClick={toggleTorch}
                  size="lg"
                  className={`rounded-full w-12 h-12 p-0 transition-all duration-200 border-2 shadow-lg ${
                    torchOn 
                      ? 'bg-white/20 hover:bg-white/30 text-yellow-400 border-yellow-400 shadow-yellow-400/30' 
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/40'
                  }`}
                  title={`Turn flashlight ${torchOn ? 'off' : 'on'}`}
                >
                  <Lightbulb className={`h-5 w-5 ${torchOn ? 'text-yellow-400' : 'text-white'}`} />
                </Button>
              </div>
            )}
            
            {/* Bottom Controls */}
            <footer className="absolute bottom-8 inset-x-0 pb-[env(safe-area-inset-bottom)] px-8 z-20">
              {/* Instructions */}
              <div className="text-center text-white/90 mb-6">
                <p className="text-lg font-medium">Position food in the frame</p>
                <p className="text-sm text-white/70 mt-1">Capture, upload, or exit</p>
              </div>
              
              {/* Three Control Buttons */}
              <div className="flex justify-center items-center gap-8">
                {/* Exit Button - Red */}
                <Button
                  onClick={handleExit}
                  size="lg"
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full w-14 h-14 p-0"
                >
                  <X className="h-5 w-5" />
                </Button>

                {/* Capture Button - Center, larger */}
                <Button
                  onClick={capturePhoto}
                  disabled={isCapturing || !stream}
                  size="lg"
                  className="bg-white text-black hover:bg-gray-200 rounded-full w-20 h-20 p-0 disabled:opacity-50"
                >
                  {isCapturing ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent" />
                  ) : (
                    <Camera className="h-8 w-8" />
                  )}
                </Button>

                {/* Upload Button */}
                <Button
                  onClick={handleImageUpload}
                  size="lg"
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-14 h-14 p-0"
                >
                  <Upload className="h-5 w-5" />
                </Button>
              </div>
            </footer>
          </div>

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-8">
              <div className="text-center text-white">
                <p className="text-lg mb-4">{error}</p>
                <Button onClick={startCamera} variant="outline" className="text-white border-white">
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};