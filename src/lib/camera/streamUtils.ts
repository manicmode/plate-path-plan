// Camera stream optimization utilities
import { trace } from '../util/log';

// Stop all tracks in a media stream safely
export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  
  try {
    const tracks = stream.getTracks();
    trace('CAMERA:STREAM:STOP', { trackCount: tracks.length });
    
    tracks.forEach(track => {
      try {
        track.stop();
      } catch (error) {
        trace('CAMERA:TRACK:STOP:ERROR', { error: String(error) });
      }
    });
  } catch (error) {
    trace('CAMERA:STREAM:STOP:ERROR', { error: String(error) });
  }
}

// Get optimized camera constraints for performance
export function getOptimizedConstraints(facingMode: 'user' | 'environment' = 'environment'): MediaStreamConstraints {
  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: { exact: facingMode },
      width: { ideal: 1280, max: 1920 }, // Cap at 1280 for performance, allow up to 1920
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 30 } // Cap frame rate for battery/performance
    },
    audio: false
  };
  
  trace('CAMERA:CONSTRAINTS:OPTIMIZED', { facingMode, constraints });
  return constraints;
}

// Switch camera with proper cleanup
export async function switchCamera(
  currentStream: MediaStream | null,
  newFacingMode: 'user' | 'environment'
): Promise<MediaStream> {
  // Stop current stream first
  if (currentStream) {
    stopMediaStream(currentStream);
  }
  
  // Get new stream with optimized constraints
  const constraints = getOptimizedConstraints(newFacingMode);
  
  try {
    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
    trace('CAMERA:SWITCH:SUCCESS', { 
      facingMode: newFacingMode,
      trackCount: newStream.getTracks().length 
    });
    return newStream;
  } catch (error) {
    trace('CAMERA:SWITCH:ERROR', { 
      facingMode: newFacingMode,
      error: String(error) 
    });
    throw error;
  }
}

// Get video track safely
export function getVideoTrack(stream: MediaStream | null): MediaStreamTrack | null {
  if (!stream) return null;
  
  const videoTracks = stream.getVideoTracks();
  return videoTracks.length > 0 ? videoTracks[0] : null;
}

// Apply camera settings optimization (zoom, focus, etc.)
export async function optimizeCameraSettings(track: MediaStreamTrack): Promise<void> {
  if (!track) return;
  
  try {
    const capabilities = track.getCapabilities() as any;
    const constraints: any = {};
    
    // Apply zoom if supported (for better barcode scanning)
    if (capabilities.zoom && capabilities.zoom.max > 1) {
      constraints.zoom = Math.min(2, capabilities.zoom.max); // 2x zoom max
    }
    
    // Apply focus mode if supported
    if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
      constraints.focusMode = 'continuous';
    }
    
    if (Object.keys(constraints).length > 0) {
      await track.applyConstraints({ advanced: [constraints] });
      trace('CAMERA:OPTIMIZE:APPLIED', constraints);
    }
  } catch (error) {
    trace('CAMERA:OPTIMIZE:ERROR', { error: String(error) });
    // Don't throw - optimization failure shouldn't break functionality
  }
}