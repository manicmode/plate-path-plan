import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Camera, Lightbulb, Upload } from 'lucide-react';
import { useTorch } from '@/lib/camera/useTorch';
import { prepareImageForAnalysis } from '@/lib/img/prepareImageForAnalysis';
import { supabase } from '@/integrations/supabase/client';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { toast } from 'sonner';
import { scannerLiveCamEnabled } from '@/lib/platform';
import { openPhotoCapture } from '@/components/camera/photoCapture';

// DEV: media lifecycle logging (scoped to this component; remove after audit)
const DEV_MEDIA_AUDIT = true;
function mediaLog(tag: string, videoEl: HTMLVideoElement | null | undefined) {
  if (!DEV_MEDIA_AUDIT) return;
  const v = videoEl || null;
  const s = (v?.srcObject as MediaStream) || null;
  const tracks = s ? s.getVideoTracks() : [];
  const readyStates = tracks.map(t => t.readyState);
  const videosWithSrc = Array.from(document.querySelectorAll('video'))
    .filter(el => (el as HTMLVideoElement).srcObject).length;
  const audioTracks = s ? s.getAudioTracks().length : 0;
  const activeEls = Array.from(document.querySelectorAll('video,audio')).map(e=>{
    const s = (e as any).srcObject as MediaStream | null;
    return { tag: e.tagName, hasAudio: !!s?.getAudioTracks?.().length, hasVideo: !!s?.getVideoTracks?.().length };
  });
  // eslint-disable-next-line no-console
  console.log(tag, {
    route: location.pathname + location.search,
    tracks: tracks.length,
    audioTracks,
    readyStates,
    videosWithSrc,
    activeEls,
  });
}

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { supportsTorch, torchOn, setTorch, ensureTorchState } = useTorch(trackRef);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      cleanup();
    }
    
    return cleanup;
  }, [open]);

  const startCamera = async () => {
    try {
      console.log("[PHOTO] Requesting camera stream...");
      const constraints = {
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Defensive strip: remove any audio tracks that slipped in
      const s = mediaStream;
      s.getAudioTracks?.().forEach(t => { try { t.stop(); } catch {} try { s.removeTrack(t); } catch {} });
      console.warn('[MEDIA][camera-only] removed audio tracks:', s.getAudioTracks?.().length);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        
        const track = mediaStream.getVideoTracks()[0];
        trackRef.current = track;
        setStream(mediaStream);
        
        mediaLog('[MEDIA][PhotoCapture][mount]', videoRef.current);
        
        // Ensure torch state after track is ready
        setTimeout(() => {
          ensureTorchState();
        }, 100);
        
        setError(null);
      }
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
        onOpenChange(false);
        return null;
      } catch (fallbackErr) {
        console.error("[PHOTO] Both live and photo capture failed:", err, fallbackErr);
        setError('Unable to access camera. Please check permissions and try again.');
      }
    }
  };

  const cleanup = () => {
    mediaLog('[MEDIA][PhotoCapture][pre_cleanup]', videoRef.current);

    const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks?.()?.[0];
    torchOff(track);

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    hardDetachVideo(videoRef.current);
    
    trackRef.current = null;
    setStream(null);
    setIsCapturing(false);

    mediaLog('[MEDIA][PhotoCapture][post_cleanup]', videoRef.current);
  };

  const toggleTorch = async () => {
    try {
      const result = await setTorch(!torchOn);
      if (!result.ok) {
        console.warn("Torch toggle failed:", result.reason);
      }
    } catch (error) {
      console.error("Error toggling torch:", error);
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

  const capturePhoto = async () => {
    if (!videoRef.current || !stream) return;

    setIsCapturing(true);
    playCameraClickSound();

    try {
      // Check if analyzer is enabled
      if (!isFeatureEnabled('image_analyzer_v1')) {
        console.log('[PHOTO] Analyzer disabled, redirecting to manual');
        toast.info('Photo analysis is in beta. Try manual or voice for now.');
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
      
      // Convert to base64
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
      
      console.log('[PHOTO] Photo captured, processing...');
      
      // Process with existing analyzer flow
      onCapture(imageBase64);
      onOpenChange(false);
      
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
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageBase64 = e.target?.result as string;
          console.log('[PHOTO] Image uploaded, processing...');
          onCapture(imageBase64);
          onOpenChange(false);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleExit = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-screen h-screen max-w-none max-h-none p-0 m-0 bg-black border-0 rounded-none [&>button]:hidden"
      >
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