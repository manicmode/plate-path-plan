import { useCallback, useRef, useState } from "react";

export type VCState = "idle" | "recording" | "processing";

export function useVoiceCoachRecorder(onFinalize: (blob: Blob) => Promise<void>) {
  const [state, setState] = useState<VCState>("idle");
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // guards
  const startedRef = useRef(false);
  const stoppingRef = useRef(false);
  const finalizedRef = useRef(false);

  const start = useCallback(async () => {
    console.log('[VCRecorder] Start called, current state:', state);
    if (startedRef.current || state === "recording") {
      console.log('[VCRecorder] Already recording, ignoring start');
      return;
    }
    startedRef.current = true;
    setState("processing");

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

      // Try preferred format, fall back gracefully
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; // Let browser choose
        }
      }
      console.log('[VCRecorder] Using mime type:', mimeType);

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mrRef.current = mr;
      chunksRef.current = [];
      stoppingRef.current = false;
      finalizedRef.current = false;

      const onData = (e: BlobEvent) => { 
        console.log('[VCRecorder] Audio chunk received:', e.data?.size);
        if (e.data?.size) chunksRef.current.push(e.data); 
      };
      
      const onStop = async () => {
        // absolutely NO mr.stop() or state transitions that trigger stop() here
        console.log('[VCRecorder] Stop event fired, finalized:', finalizedRef.current);
        if (finalizedRef.current) return;
        finalizedRef.current = true;
        
        try {
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
          console.log('[VCRecorder] Created blob:', blob.size, 'bytes, type:', blob.type);
          
          // protect the edge function from empty blobs (causes 500)
          if (!blob || blob.size < 1024) { // ~1KB
            console.warn('[VCRecorder] Skip finalize (empty/too small blob)');
            return;
          }
          
          setState("processing");
          await onFinalize(blob);
        } catch (error) {
          console.error('[VCRecorder] Error in finalization:', error);
        } finally {
          // Cleanup - remove listeners first
          mr.removeEventListener("dataavailable", onData);
          mr.removeEventListener("stop", onStop);
          mrRef.current = null;
          chunksRef.current = [];
          
          // Stop stream tracks
          if (streamRef.current) {
            console.log('[VCRecorder] Stopping stream tracks');
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
          }
          
          stoppingRef.current = false;
          startedRef.current = false;
          setState("idle");
          console.log('[VCRecorder] Cleanup completed');
        }
      };

      mr.addEventListener("dataavailable", onData);
      mr.addEventListener("stop", onStop);
      mr.start(100); // Collect data every 100ms
      setState("recording");
      console.log('[VCRecorder] Recording started successfully');
    } catch (error) {
      console.error('[VCRecorder] Error starting recording:', error);
      setState("idle");
      throw error;
    }
  }, [state, onFinalize]);

  const stop = useCallback(() => {
    console.log('[VCRecorder] Stop called');
    const mr = mrRef.current;
    if (!mr || mr.state === "inactive" || stoppingRef.current) {
      console.log('[VCRecorder] Stop ignored - no recorder, inactive, or already stopping');
      return;
    }
    stoppingRef.current = true;
    console.log('[VCRecorder] Calling MediaRecorder.stop()');
    
    // break any sync onStop→stop loops
    queueMicrotask(() => {
      try { 
        mr.stop(); 
      } catch (error) { 
        console.error('[VCRecorder] Error stopping recorder:', error);
        stoppingRef.current = false; 
      }
    });
  }, []);

  const cancel = useCallback(() => {
    console.log('[VCRecorder] Cancel called');
    // Immediate abort; do not finalize/upload
    finalizedRef.current = true;
    stop();
  }, [stop]);

  return { state, start, stop, cancel, streamRef };
}