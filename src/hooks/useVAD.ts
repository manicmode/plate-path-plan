import { useEffect, useRef, useState } from 'react';

interface UseVADOptions {
  threshold?: number;
  silenceDurationMs?: number;
  onSilence?: () => void;
}

export const useVAD = (
  audioStream: MediaStream | null, 
  options: UseVADOptions = {}
) => {
  const { threshold = 0.01, silenceDurationMs = 1500, onSilence } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout>();
  const isActiveRef = useRef(false);

  useEffect(() => {
    if (!audioStream) {
      cleanup();
      return;
    }

    isActiveRef.current = true;
    
    try {
      // Create audio context and analyser
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(audioStream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Start monitoring audio levels
      const checkAudioLevel = () => {
        if (!isActiveRef.current || !analyser) return;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate RMS (Root Mean Square) for volume level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength) / 255;
        
        const wasSpeaking = isSpeaking;
        const nowSpeaking = rms > threshold;
        
        if (nowSpeaking !== wasSpeaking) {
          setIsSpeaking(nowSpeaking);
        }
        
        // Clear existing timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        if (nowSpeaking) {
          // Speaking detected, clear silence timeout
          silenceTimeoutRef.current = undefined;
        } else if (wasSpeaking) {
          // Just stopped speaking, start silence countdown
          silenceTimeoutRef.current = setTimeout(() => {
            if (isActiveRef.current && onSilence) {
              onSilence();
            }
          }, silenceDurationMs);
        }
        
        // Continue monitoring
        if (isActiveRef.current) {
          requestAnimationFrame(checkAudioLevel);
        }
      };
      
      checkAudioLevel();
      
    } catch (error) {
      console.error('[VAD] Error setting up audio monitoring:', error);
    }

    return cleanup;
  }, [audioStream, threshold, silenceDurationMs, onSilence]);

  const cleanup = () => {
    isActiveRef.current = false;
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = undefined;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setIsSpeaking(false);
  };

  return { 
    isSpeaking, 
    analyser: analyserRef.current,
    cleanup 
  };
};