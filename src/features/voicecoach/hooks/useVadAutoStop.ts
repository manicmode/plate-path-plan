import { useEffect, useRef } from "react";

type Opts = {
  stream: MediaStream | null;
  isRecording: boolean;
  onSilenceStop: (reason: 'silence' | 'maxDuration') => void;
  trailingMs?: number;      // default 1000ms for iOS  
  minVoiceRms?: number;     // default ~-45dB threshold
  maxMs?: number;           // default 30000
  minActiveMs?: number;     // minimum active speech before allowing auto-stop
  minTotalMs?: number;      // minimum total recording time
  onVadUpdate?: (rms: number, silenceMs: number | null, peakDb: number) => void;
};

export function useVadAutoStop({
  stream, 
  isRecording, 
  onSilenceStop, 
  trailingMs = 1000, // iOS-optimized 
  minVoiceRms = 0.003, // ~-45dB threshold
  maxMs = 30000,
  minActiveMs = 600, // don't stop until 600ms of voice seen
  minTotalMs = 1000, // recording won't auto-stop before 1s total
  onVadUpdate
}: Opts) {
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Float32Array | null>(null);
  const startedAtRef = useRef<number>(0);
  const silenceSinceRef = useRef<number | null>(null);
  const firedStopRef = useRef(false);
  const peakDbRef = useRef<number>(-Infinity);
  const totalVoiceTimeRef = useRef<number>(0);
  const lastVoiceTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!stream || !isRecording) return;

    console.log('[VAD] Starting VAD analysis');
    
    firedStopRef.current = false;
    peakDbRef.current = -Infinity;
    totalVoiceTimeRef.current = 0;
    lastVoiceTimeRef.current = 0;
    
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC({ sampleRate: 24000 });
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.1; // More responsive
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;

    src.connect(analyser);
    ctxRef.current = ctx;
    srcRef.current = src;
    analyserRef.current = analyser;
    dataRef.current = new Float32Array(analyser.fftSize);
    startedAtRef.current = performance.now();
    silenceSinceRef.current = null;

    console.log('[VAD] Audio context created, starting analysis loop');

    const callStopOnce = (reason: 'silence' | 'maxDuration') => {
      if (firedStopRef.current) return;
      firedStopRef.current = true;
      console.log('[VAD] Auto-stopping due to:', reason);
      onSilenceStop(reason);
    };

    const tick = () => {
      if (!analyserRef.current || !dataRef.current || firedStopRef.current) {
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
      
      // Convert to decibels for better threshold handling
      const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
      peakDbRef.current = Math.max(peakDbRef.current, db);
      
      const now = performance.now();
      
      // Voice activity detection using dB threshold (~-45dB)
      const silenceThreshold = -45;
      const isVoice = db > silenceThreshold;
      
      if (!isVoice) {
        // Silence detected
        if (silenceSinceRef.current === null) {
          silenceSinceRef.current = now;
          console.log('[VAD] Silence started, dB:', db.toFixed(1));
        }
        const silenceMs = now - silenceSinceRef.current;
        
        // Update debug callback
        onVadUpdate?.(rms, silenceMs, peakDbRef.current);
        
        // Check minimum requirements before allowing auto-stop
        const totalRecordingMs = now - startedAtRef.current;
        const hasMinVoice = totalVoiceTimeRef.current >= minActiveMs;
        const hasMinTotal = totalRecordingMs >= minTotalMs;
        
        // Auto-stop after trailing silence (with minimum requirements)
        if (silenceMs >= trailingMs && hasMinVoice && hasMinTotal) {
          callStopOnce('silence');
          return; // Stop the loop
        }
      } else {
        // Voice detected
        if (silenceSinceRef.current !== null) {
          console.log('[VAD] Voice resumed, dB:', db.toFixed(1));
        }
        
        // Track voice activity time
        const voiceGapMs = lastVoiceTimeRef.current > 0 ? now - lastVoiceTimeRef.current : 0;
        if (voiceGapMs < 200) { // Consider continuous if gap < 200ms
          totalVoiceTimeRef.current += voiceGapMs;
        }
        lastVoiceTimeRef.current = now;
        
        silenceSinceRef.current = null;
        
        // Update debug callback
        onVadUpdate?.(rms, null, peakDbRef.current);
      }

      // Max recording time check
      const totalRecordingMs = now - startedAtRef.current;
      if (totalRecordingMs >= maxMs) {
        callStopOnce('maxDuration');
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
      silenceSinceRef.current = null;
      // firedStopRef intentionally not reset here; it resets on next start
    };
  }, [stream, isRecording, onSilenceStop, trailingMs, minVoiceRms, maxMs, minActiveMs, minTotalMs, onVadUpdate]);

  // Return current VAD state for external use
  return {
    isAnalyzing: isRecording && !!stream,
  };
}