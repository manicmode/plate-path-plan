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

// Auto-shutdown timer
let autoShutdownTimer: NodeJS.Timeout | null = null;
const AUTO_SHUTDOWN_DELAY = 30000; // 30 seconds

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
      // iOS Safari compatibility constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: options.facingMode 
            ? { ideal: options.facingMode }
            : { ideal: 'environment' },
          width: options.width ? { ideal: options.width } : undefined,
          height: options.height ? { ideal: options.height } : undefined,
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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

      // Ensure torch is off initially (inline to avoid circular dependency)
      try {
        const capabilities = videoTrackRef.current.getCapabilities?.() as ExtendedMediaTrackCapabilities;
        if (capabilities?.torch) {
          await videoTrackRef.current.applyConstraints({
            advanced: [{ torch: false } as ExtendedMediaTrackConstraintSet]
          });
        }
      } catch (error) {
        // Ignore errors for unsupported devices
      }
      
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

  // Torch controls
  const torch: CameraTorchControls = {
    supported: !!(videoTrackRef.current?.getCapabilities?.() as ExtendedMediaTrackCapabilities)?.torch,
    
    on: async () => {
      if (!videoTrackRef.current) return;
      
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
        console.warn('🔦 [MEDIA] Failed to turn torch OFF:', error);
      }
    }
  };

  // Auto-shutdown on idle
  useEffect(() => {
    if (!isActive) return;

    const checkIdle = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed > AUTO_SHUTDOWN_DELAY && isActive) {
        console.log('🎥 [MEDIA] Auto-shutdown due to inactivity');
        stop();
      }
    };

    const interval = setInterval(checkIdle, 5000);
    return () => clearInterval(interval);
  }, [isActive, stop]);

  // Page lifecycle guards
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isActive) {
        console.log('🎥 [MEDIA] Auto-stop on page hidden');
        stop();
      }
    };

    const handleBeforeUnload = () => {
      if (isActive) {
        console.log('🎥 [MEDIA] Auto-stop on page unload');
        stop();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
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

  // Auto-shutdown and lifecycle - same as camera
  useEffect(() => {
    if (!isActive) return;

    const checkIdle = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed > AUTO_SHUTDOWN_DELAY && isActive) {
        console.log('🎤 [MEDIA] Auto-shutdown due to inactivity');
        stop();
      }
    };

    const interval = setInterval(checkIdle, 5000);
    return () => clearInterval(interval);
  }, [isActive, stop]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isActive) {
        console.log('🎤 [MEDIA] Auto-stop on page hidden');
        stop();
      }
    };

    const handleBeforeUnload = () => {
      if (isActive) {
        console.log('🎤 [MEDIA] Auto-stop on page unload');
        stop();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
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