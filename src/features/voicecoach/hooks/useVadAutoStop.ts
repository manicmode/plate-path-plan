import { useEffect, useRef } from "react";

type Opts = {
  stream: MediaStream | null;
  isRecording: boolean;
  onSilenceStop: () => void;
  trailingMs?: number;      // default 900
  minVoiceRms?: number;     // default 0.015
  maxMs?: number;           // default 30000
  onVadUpdate?: (rms: number, silenceMs: number | null) => void; // For debug display
};

export function useVadAutoStop({
  stream, 
  isRecording, 
  onSilenceStop, 
  trailingMs = 900, 
  minVoiceRms = 0.015, 
  maxMs = 30000,
  onVadUpdate
}: Opts) {
  const rafRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);
  const silenceStartRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const srcRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const dataRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    if (!stream || !isRecording) {
      // Cleanup if not recording
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (srcRef.current) {
        try { srcRef.current.disconnect(); } catch {}
        srcRef.current = null;
      }
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch {}
        analyserRef.current = null;
      }
      if (ctxRef.current) {
        try { ctxRef.current.close(); } catch {}
        ctxRef.current = null;
      }
      console.log('[VAD] Stopped - stream or recording ended');
      return;
    }

    console.log('[VAD] Starting VAD analysis');
    
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC({ sampleRate: 24000 });
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.3;

    src.connect(analyser);
    ctxRef.current = ctx;
    srcRef.current = src;
    analyserRef.current = analyser;
    dataRef.current = new Float32Array(analyser.fftSize);
    startTsRef.current = performance.now();
    silenceStartRef.current = null;

    console.log('[VAD] Audio context created, starting analysis loop');

    const tick = () => {
      if (!analyserRef.current || !dataRef.current) {
        console.log('[VAD] Tick stopped - no analyser or data buffer');
        return;
      }
      
      analyserRef.current.getFloatTimeDomainData(dataRef.current);

      // Calculate RMS (Root Mean Square) for volume level
      let sum = 0;
      const buf = dataRef.current;
      for (let i = 0; i < buf.length; i++) {
        sum += buf[i] * buf[i];
      }
      const rms = Math.sqrt(sum / buf.length);

      const now = performance.now();
      const totalRecordingMs = now - startTsRef.current;
      
      // Voice activity detection
      if (rms < minVoiceRms) {
        // Silence detected
        if (silenceStartRef.current === null) {
          silenceStartRef.current = now;
          console.log('[VAD] Silence started, RMS:', rms.toFixed(4));
        }
        const silenceMs = now - silenceStartRef.current;
        
        // Update debug callback
        onVadUpdate?.(rms, silenceMs);
        
        // Auto-stop after trailing silence
        if (silenceMs >= trailingMs) {
          console.log('[VAD] Auto-stopping due to silence:', silenceMs, 'ms');
          onSilenceStop();
          return; // Stop the loop
        }
      } else {
        // Voice detected
        if (silenceStartRef.current !== null) {
          console.log('[VAD] Voice resumed, RMS:', rms.toFixed(4));
        }
        silenceStartRef.current = null;
        
        // Update debug callback
        onVadUpdate?.(rms, null);
      }

      // Max recording time check
      if (totalRecordingMs >= maxMs) {
        console.log('[VAD] Auto-stopping due to max time:', totalRecordingMs, 'ms');
        onSilenceStop();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    // Cleanup function
    return () => {
      console.log('[VAD] Cleaning up');
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      try { srcRef.current?.disconnect(); } catch {}
      try { analyserRef.current?.disconnect(); } catch {}
      try { ctxRef.current?.close(); } catch {}
      ctxRef.current = null;
      analyserRef.current = null;
      srcRef.current = null;
    };
  }, [stream, isRecording, onSilenceStop, trailingMs, minVoiceRms, maxMs, onVadUpdate]);

  // Return current VAD state for external use
  return {
    isAnalyzing: isRecording && !!stream,
  };
}