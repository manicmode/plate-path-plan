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
  trailingMs = 1000,
  minVoiceRms = 0.003,
  maxMs = 30000,
  minActiveMs = 600,
  minTotalMs = 1000,
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
  
  // Onset detection state
  const hasOnsetRef = useRef(false);
  const onsetTimeRef = useRef<number>(0);
  
  // Timing constants
  const ONSET_MIN_TOTAL_MS = 1000; // Don't auto-stop before this
  const POST_ONSET_MIN_MS = 1200;  // After first voice detected, keep recording at least this long
  const ONSET_DB_THRESHOLD = -35;  // Voice onset detection threshold

  useEffect(() => {
    if (!stream || !isRecording) return;

    console.log('[VAD] Starting VAD analysis with onset detection');
    
    firedStopRef.current = false;
    peakDbRef.current = -Infinity;
    totalVoiceTimeRef.current = 0;
    lastVoiceTimeRef.current = 0;
    hasOnsetRef.current = false;
    onsetTimeRef.current = 0;
    
    const setupAudio = async () => {
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC({ sampleRate: 24000 });
      
      // CRITICAL: Resume audio context immediately for iOS
      try {
        await ctx.resume();
        console.log('[VAD] Audio context resumed successfully');
      } catch (e) {
        console.warn('[VAD] Audio context resume failed:', e);
      }
      
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.1;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      // CRITICAL: Single connection, never torn down until cleanup
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

        // Calculate RMS and dB
        let sum = 0;
        const buf = dataRef.current;
        for (let i = 0; i < buf.length; i++) {
          sum += buf[i] * buf[i];
        }
        const rms = Math.sqrt(sum / buf.length);
        const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
        peakDbRef.current = Math.max(peakDbRef.current, db);
        
        const now = performance.now();
        
        // Voice onset detection
        if (!hasOnsetRef.current && db > ONSET_DB_THRESHOLD) {
          hasOnsetRef.current = true;
          onsetTimeRef.current = now;
          console.log(`[VAD] Voice onset detected at ${db.toFixed(1)}dB`);
        }
        
        // Voice activity detection for silence tracking
        const silenceThreshold = -45;
        const isVoice = db > silenceThreshold;
        
        if (!isVoice) {
          // Silence detected
          if (silenceSinceRef.current === null) {
            silenceSinceRef.current = now;
            console.log('[VAD] Silence started, dB:', db.toFixed(1));
          }
          const silenceMs = now - silenceSinceRef.current;
          
          onVadUpdate?.(rms, silenceMs, peakDbRef.current);
          
          // Apply onset gates before considering auto-stop
          const totalRecordingMs = now - startedAtRef.current;
          const minTotalGuard = totalRecordingMs < ONSET_MIN_TOTAL_MS;
          const postOnsetGuard = hasOnsetRef.current ? (now - onsetTimeRef.current < POST_ONSET_MIN_MS) : true;
          
          const canConsiderSilence = !minTotalGuard && !postOnsetGuard;
          
          console.log(`[VAD] Silence check - total:${totalRecordingMs.toFixed(0)}ms, hasOnset:${hasOnsetRef.current}, canStop:${canConsiderSilence}`);
          
          if (canConsiderSilence && silenceMs >= trailingMs) {
            callStopOnce('silence');
            return;
          }
        } else {
          // Voice detected
          if (silenceSinceRef.current !== null) {
            console.log('[VAD] Voice resumed, dB:', db.toFixed(1));
          }
          
          // Track continuous voice activity
          const voiceGapMs = lastVoiceTimeRef.current > 0 ? now - lastVoiceTimeRef.current : 0;
          if (voiceGapMs < 200) {
            totalVoiceTimeRef.current += voiceGapMs;
          }
          lastVoiceTimeRef.current = now;
          
          silenceSinceRef.current = null;
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
    };

    setupAudio();

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
      hasOnsetRef.current = false;
      onsetTimeRef.current = 0;
      totalVoiceTimeRef.current = 0;
      lastVoiceTimeRef.current = 0;
      // firedStopRef intentionally not reset here; it resets on next start
    };
  }, [stream, isRecording, onSilenceStop, trailingMs, minVoiceRms, maxMs, minActiveMs, minTotalMs, onVadUpdate]);

  // Return current VAD state for external use
  return {
    isAnalyzing: isRecording && !!stream,
  };
}