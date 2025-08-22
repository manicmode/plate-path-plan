import { useCallback, useRef, useState } from "react";

export type VCState = "idle" | "recording" | "processing";

// Helper function to get best audio type for device
function getBestAudioType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/mpeg'
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      console.log('[VCRecorder] Selected audio type:', type);
      return type;
    }
  }
  
  console.log('[VCRecorder] No preferred type supported, using default');
  return '';
}

export function useVoiceCoachRecorder(
  onFinalize: (blob: Blob, metadata: { mimeType: string; isIosSafari: boolean }) => Promise<void>,
  onRecordingStart?: () => void
) {
  const [state, setState] = useState<VCState>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Hard guards to prevent recursion and double-stop
  const isRecordingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const finalizedRef = useRef(false);

  const start = useCallback(async () => {
    console.log('[VCRecorder] Start called, current state:', state);
    if (isRecordingRef.current) {
      console.log('[VCRecorder] Already recording, ignoring start');
      return;
    }
    
    // Reset all guards for new session
    isRecordingRef.current = true;
    isStoppingRef.current = false;
    finalizedRef.current = false;
    setState("processing"); // Keep processing until recorder.onstart fires

    try {
      // iOS: unlock audio context
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) { 
        try { 
          const ctx = new AC();
          await ctx.resume(); 
          console.log('[VCRecorder] Audio context unlocked');
        } catch (e) {
          console.log('[VCRecorder] Audio context unlock failed (non-critical):', e);
        }
      }

      console.log('[VCRecorder] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: { ideal: true }, 
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true }
        },
      });
      streamRef.current = stream;
      console.log('[VCRecorder] Microphone access granted');

      // Get best audio type for this device
      const bestType = getBestAudioType();
      const isIosSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent);
      
      const mr = new MediaRecorder(stream, bestType ? { mimeType: bestType } : undefined);
      recorderRef.current = mr;
      chunksRef.current = [];

      const onData = (e: BlobEvent) => { 
        console.log('[VCRecorder] Audio chunk received:', e.data?.size);
        if (e.data?.size) chunksRef.current.push(e.data); 
      };
      
      // CRITICAL: Only show "Listening..." after onstart fires
      const onStart = () => {
        console.log('[VCRecorder] MediaRecorder.onstart fired - now truly recording');
        setState("recording"); // NOW we show "Listening..."
        // Notify parent that recording has truly started
        onRecordingStart?.();
      };
      
      const onStop = async () => {
        // CRITICAL: Hard guard against double finalization
        console.log('[VCRecorder] MediaRecorder.onstop fired, finalized:', finalizedRef.current);
        if (finalizedRef.current) {
          console.log('[VCRecorder] Already finalized, ignoring onstop');
          return;
        }
        finalizedRef.current = true;
        
        try {
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
          console.log('[VCRecorder] Created blob:', blob.size, 'bytes, type:', blob.type);
          
          // Protect against tiny clips but allow short phrases
          if (!blob || blob.size < 512) {
            console.warn('[VCRecorder] Skip finalize (empty/too small blob):', blob?.size || 0, 'bytes');
            return;
          }
          
          console.log('[VCRecorder] Finalizing blob:', blob.size, 'bytes, type:', blob.type);
          
          setState("processing");
          await onFinalize(blob, { 
            mimeType: blob.type || mr.mimeType || "audio/webm",
            isIosSafari 
          });
        } catch (error) {
          console.error('[VCRecorder] Error in finalization:', error);
        } finally {
          // Cleanup - remove listeners first to prevent any re-entrancy
          try {
            mr.removeEventListener("dataavailable", onData);
            mr.removeEventListener("start", onStart);
            mr.removeEventListener("stop", onStop);
          } catch (e) {
            console.warn('[VCRecorder] Error removing listeners:', e);
          }
          
          recorderRef.current = null;
          chunksRef.current = [];
          
          // Stop stream tracks
          if (streamRef.current) {
            console.log('[VCRecorder] Stopping stream tracks');
            try {
              streamRef.current.getTracks().forEach(t => t.stop());
            } catch (e) {
              console.warn('[VCRecorder] Error stopping tracks:', e);
            }
            streamRef.current = null;
          }
          
          // Reset all guards and return to idle
          setTimeout(() => {
            isStoppingRef.current = false;
            isRecordingRef.current = false;
            setState("idle");
          }, 100);
          console.log('[VCRecorder] Cleanup completed');
        }
      };

      mr.addEventListener("dataavailable", onData);
      mr.addEventListener("start", onStart);
      mr.addEventListener("stop", onStop);
      
      // Start recording immediately - pre-roll buffer
      mr.start(100);
      console.log('[VCRecorder] MediaRecorder started, waiting for onstart...');
      
    } catch (error) {
      console.error('[VCRecorder] Error starting recording:', error);
      // Reset guards on error
      isRecordingRef.current = false;
      isStoppingRef.current = false;
      setState("idle");
      throw error;
    }
  }, [onFinalize, onRecordingStart]);

  const stop = useCallback(() => {
    console.log('[VCRecorder] stop() called');
    const mr = recorderRef.current;
    
    // Guard against multiple calls and already stopped states
    if (!mr || mr.state === "inactive" || isStoppingRef.current || !isRecordingRef.current) {
      console.log('[VCRecorder] Stop ignored - no recorder, inactive, or already stopping');
      return;
    }
    
    isStoppingRef.current = true;
    console.log('[VCRecorder] Calling MediaRecorder.stop()');
    
    try { 
      mr.stop(); 
    } catch (error) { 
      console.error('[VCRecorder] Error stopping recorder:', error);
      // Reset guards on error
      isStoppingRef.current = false;
    }
  }, []);

  const cancel = useCallback(() => {
    console.log('[VCRecorder] Cancel called');
    // Immediate abort; do not finalize/upload
    finalizedRef.current = true;
    stop();
  }, [stop]);

  return { state, start, stop, cancel, streamRef };
}