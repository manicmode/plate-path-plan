/**
 * Central media devices manager for camera and microphone access
 * Ensures proper cleanup and resource management across the app
 */

import { useCallback, useRef, useEffect, useState } from 'react';

// Extended interfaces for torch support (not in standard types)
interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

interface ExtendedMediaTrackConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
}

interface CameraTorchControls {
  supported: boolean;
  on: () => Promise<void>;
  off: () => Promise<void>;
}

interface CameraHookResult {
  stream: MediaStream | null;
  start: () => Promise<void>;
  stop: () => void;
  attach: (video: HTMLVideoElement) => Promise<void>;
  isActive: boolean;
  torch: CameraTorchControls;
}

interface MicrophoneHookResult {
  stream: MediaStream | null;
  start: () => Promise<void>;
  stop: () => void;
  isActive: boolean;
}

interface CameraOptions {
  facingMode?: 'user' | 'environment' | string;
  width?: number;
  height?: number;
}

interface MicrophoneOptions {
  sampleRate?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
}

// Global registry for active streams (for emergency cleanup)
const activeStreams = new Set<MediaStream>();

// Configuration flags
const CAMERA_MANAGER_ENABLED = process.env.CAMERA_MANAGER_ENABLED !== 'false';
const IDLE_SHUTOFF_MS = 0; // Disabled for now

/**
 * Hook for camera access with torch control
 */
export function useCamera(options: CameraOptions = {}): CameraHookResult {
  const streamRef = useRef<MediaStream | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const [isActive, setIsActive] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  
  // Update activity timestamp
  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const stop = useCallback(() => {
    console.log('🎥 [MEDIA] Stopping camera stream');
    
    if (streamRef.current && videoTrackRef.current) {
      // Turn off torch first (using inline code to avoid circular dependency)
      try {
        const capabilities = videoTrackRef.current.getCapabilities?.() as ExtendedMediaTrackCapabilities;
        if (capabilities?.torch) {
          videoTrackRef.current.applyConstraints({
            advanced: [{ torch: false } as ExtendedMediaTrackConstraintSet]
          }).catch(console.warn);
        }
      } catch (error) {
        console.warn('🔦 [MEDIA] Failed to turn torch OFF during cleanup:', error);
      }
      
      // Stop all tracks
      streamRef.current.getTracks().forEach(track => {
        console.log(`🎥 [MEDIA] Stopping track: ${track.kind} (${track.label})`);
        track.stop();
      });
      
      // Remove from global registry
      activeStreams.delete(streamRef.current);
      
      streamRef.current = null;
      videoTrackRef.current = null;
    }
    
    setIsActive(false);
  }, []);

  const start = useCallback(async () => {
    console.log('🎥 [MEDIA] Starting camera stream', options);
    
    // Stop existing stream first
    if (streamRef.current) {
      stop();
    }

    try {
      // Forgiving constraints with fallbacks for iOS Safari
      const baseConstraints: MediaStreamConstraints = {
        video: {
          facingMode: options.facingMode 
            ? { ideal: options.facingMode }
            : { ideal: 'environment' },
        },
        audio: false
      };

      // Add dimension constraints if specified
      if (options.width || options.height) {
        (baseConstraints.video as any).width = options.width ? { ideal: options.width } : undefined;
        (baseConstraints.video as any).height = options.height ? { ideal: options.height } : undefined;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(baseConstraints);
      } catch (error) {
        // Fallback with minimal constraints if the ideal ones fail
        console.warn('🎥 [MEDIA] Falling back to basic constraints:', error);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error('No video track available');
      }

      streamRef.current = stream;
      videoTrackRef.current = videoTrack;
      
      // Add to global registry
      activeStreams.add(stream);
      
      // Listen for stream tracks ending
      videoTrack.addEventListener('ended', () => {
        console.log('🎥 [MEDIA] Video track ended');
        setIsActive(false);
      });
      
      setIsActive(true);
      markActivity();
      
      console.log('🎥 [MEDIA] Camera stream started successfully');
      
    } catch (error) {
      console.error('🎥 [MEDIA] Failed to start camera:', error);
      
      // Clean up any partial streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        activeStreams.delete(streamRef.current);
        streamRef.current = null;
        videoTrackRef.current = null;
      }
      
      // User-friendly error handling
      let message = 'Camera access failed';
      if (error instanceof Error) {
        if (error.name === 'NotReadableError') {
          message = 'Camera is busy or unavailable';
        } else if (error.name === 'OverconstrainedError') {
          message = 'Camera constraints not supported';
        } else if (error.name === 'NotAllowedError') {
          message = 'Camera permission denied';
        }
      }
      
      throw new Error(message);
    }
  }, [options, stop, markActivity]);

  // Video attachment helper
  const attach = useCallback(async (video: HTMLVideoElement) => {
    if (!streamRef.current || !video) return;
    
    try {
      video.muted = true;
      video.playsInline = true;
      (video as any).webkitPlaysInline = true;
      video.srcObject = streamRef.current;
      await video.play();
      console.log('🎥 [MEDIA] Video attached and playing');
    } catch (error) {
      console.warn('🎥 [MEDIA] Failed to attach/play video:', error);
    }
  }, []);

  // Torch controls - only work after track is live
  const torch: CameraTorchControls = {
    supported: !!(videoTrackRef.current?.getCapabilities?.() as ExtendedMediaTrackCapabilities)?.torch,
    
    on: async () => {
      if (!videoTrackRef.current || videoTrackRef.current.readyState !== 'live') {
        console.warn('🔦 [MEDIA] Track not ready for torch control');
        return;
      }
      
      try {
        const capabilities = videoTrackRef.current.getCapabilities?.() as ExtendedMediaTrackCapabilities;
        if (capabilities?.torch) {
          await videoTrackRef.current.applyConstraints({
            advanced: [{ torch: true } as ExtendedMediaTrackConstraintSet]
          });
          console.log('🔦 [MEDIA] Torch turned ON');
          markActivity();
        }
      } catch (error) {
        console.warn('🔦 [MEDIA] Failed to turn torch ON:', error);
        // Don't stop the track on torch errors
      }
    },

    off: async () => {
      if (!videoTrackRef.current) return;
      
      try {
        const capabilities = videoTrackRef.current.getCapabilities?.() as ExtendedMediaTrackCapabilities;
        if (capabilities?.torch) {
          await videoTrackRef.current.applyConstraints({
            advanced: [{ torch: false } as ExtendedMediaTrackConstraintSet]
          });
          console.log('🔦 [MEDIA] Torch turned OFF');
        }
      } catch (error) {
        // Swallow errors during cleanup
        console.warn('🔦 [MEDIA] Failed to turn torch OFF:', error);
      }
    }
  };

  // Auto-shutdown on idle (DISABLED for now)
  useEffect(() => {
    if (!isActive || IDLE_SHUTOFF_MS === 0) return;

    const checkIdle = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed > IDLE_SHUTOFF_MS && isActive) {
        console.log('🎥 [MEDIA] Auto-shutdown due to inactivity');
        stop();
      }
    };

    const interval = setInterval(checkIdle, 5000);
    return () => clearInterval(interval);
  }, [isActive, stop]);

  // Page lifecycle guards (DISABLED for now - only keep beforeunload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isActive) {
        console.log('🎥 [MEDIA] Auto-stop on page unload');
        stop();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isActive, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    stream: streamRef.current,
    start,
    stop,
    attach,
    isActive,
    torch
  };
}

/**
 * Hook for microphone access
 */
export function useMicrophone(options: MicrophoneOptions = {}): MicrophoneHookResult {
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const stop = useCallback(() => {
    console.log('🎤 [MEDIA] Stopping microphone stream');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log(`🎤 [MEDIA] Stopping track: ${track.kind} (${track.label})`);
        track.stop();
      });
      
      activeStreams.delete(streamRef.current);
      streamRef.current = null;
    }
    
    setIsActive(false);
  }, []);

  const start = useCallback(async () => {
    console.log('🎤 [MEDIA] Starting microphone stream', options);
    
    if (streamRef.current) {
      stop();
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          sampleRate: options.sampleRate,
          echoCancellation: options.echoCancellation ?? true,
          noiseSuppression: options.noiseSuppression ?? true,
        },
        video: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const audioTrack = stream.getAudioTracks()[0];

      if (!audioTrack) {
        throw new Error('No audio track available');
      }

      streamRef.current = stream;
      activeStreams.add(stream);
      
      // Listen for audio track ending
      audioTrack.addEventListener('ended', () => {
        console.log('🎤 [MEDIA] Audio track ended');
        setIsActive(false);
      });
      
      setIsActive(true);
      markActivity();
      
      console.log('🎤 [MEDIA] Microphone stream started successfully');
      
    } catch (error) {
      console.error('🎤 [MEDIA] Failed to start microphone:', error);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        activeStreams.delete(streamRef.current);
        streamRef.current = null;
      }
      
      let message = 'Microphone access failed';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          message = 'Microphone permission denied';
        } else if (error.name === 'NotReadableError') {
          message = 'Microphone is busy or unavailable';
        }
      }
      
      throw new Error(message);
    }
  }, [options, stop, markActivity]);

  // Auto-shutdown and lifecycle - disabled for now
  useEffect(() => {
    if (!isActive || IDLE_SHUTOFF_MS === 0) return;

    const checkIdle = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed > IDLE_SHUTOFF_MS && isActive) {
        console.log('🎤 [MEDIA] Auto-shutdown due to inactivity');
        stop();
      }
    };

    const interval = setInterval(checkIdle, 5000);
    return () => clearInterval(interval);
  }, [isActive, stop]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isActive) {
        console.log('🎤 [MEDIA] Auto-stop on page unload');
        stop();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isActive, stop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    stream: streamRef.current,
    start,
    stop,
    isActive
  };
}

/**
 * Emergency cleanup utility - stops all active media streams
 */
export function stopAllMedia(): void {
  console.log('🚨 [MEDIA] Emergency stop all media streams');
  
  // Stop streams from global registry
  activeStreams.forEach(stream => {
    stream.getTracks().forEach(track => {
      console.log(`🚨 [MEDIA] Emergency stopping: ${track.kind} (${track.label})`);
      track.stop();
    });
  });
  
  activeStreams.clear();
  
  // Fallback: find any remaining active video/audio elements
  const mediaElements = document.querySelectorAll('video, audio') as NodeListOf<HTMLMediaElement>;
  mediaElements.forEach(element => {
    if (element.srcObject instanceof MediaStream) {
      element.srcObject.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          console.log(`🚨 [MEDIA] Emergency stopping element track: ${track.kind}`);
          track.stop();
        }
      });
      element.srcObject = null;
    }
  });
}

/**
 * Get debug info about active media streams
 */
export function getActiveMediaInfo() {
  const videoTracks: any[] = [];
  const audioTracks: any[] = [];
  
  activeStreams.forEach(stream => {
    stream.getVideoTracks().forEach(track => {
      videoTracks.push({
        kind: track.kind,
        label: track.label,
        readyState: track.readyState,
        enabled: track.enabled,
        muted: track.muted,
      });
    });
    
    stream.getAudioTracks().forEach(track => {
      audioTracks.push({
        kind: track.kind,
        label: track.label,
        readyState: track.readyState,
        enabled: track.enabled,
        muted: track.muted,
      });
    });
  });
  
  return { videoTracks, audioTracks, totalStreams: activeStreams.size };
}