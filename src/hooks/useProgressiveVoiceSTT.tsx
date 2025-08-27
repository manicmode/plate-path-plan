import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { isFeatureEnabled } from '@/lib/featureFlags';

interface UseProgressiveVoiceSTTReturn {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  setTranscript: (text: string) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  isBrowserSTTSupported: () => boolean;
  isServerSTTAvailable: () => boolean;
  sttMethod: 'none' | 'browser' | 'server';
}

export const useProgressiveVoiceSTT = (): UseProgressiveVoiceSTTReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [sttMethod, setSttMethod] = useState<'none' | 'browser' | 'server'>('none');
  
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const debugLog = (step: string, data?: any) => {
    console.log(`🎤 [ProgressiveSTT] ${step}:`, data);
  };

  // Check if browser STT is supported
  const isBrowserSTTSupported = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SpeechRecognition && window.isSecureContext;
  }, []);

  // Check if server STT is available (flag + secrets)
  const isServerSTTAvailable = useCallback(() => {
    return isFeatureEnabled('voice_stt_server_enabled') && 
           (!!process.env.OPENAI_API_KEY || !!process.env.GOOGLE_CLOUD_API_KEY);
  }, []);

  const startBrowserSTT = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Browser STT not supported');
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    return new Promise<void>((resolve, reject) => {
      recognition.onstart = () => {
        debugLog('Browser STT started');
        setIsRecording(true);
        setSttMethod('browser');
        resolve();
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const fullTranscript = finalTranscript || interimTranscript;
        if (fullTranscript) {
          setTranscript(fullTranscript);
          debugLog('Browser STT transcript', { final: finalTranscript, interim: interimTranscript });
        }
      };

      recognition.onerror = (event: any) => {
        debugLog('Browser STT error', event.error);
        setIsRecording(false);
        setSttMethod('none');
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.onend = () => {
        debugLog('Browser STT ended');
        setIsRecording(false);
      };
    });
  }, []);

  const startServerSTT = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('MediaRecorder not supported');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        sampleRate: 44100,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.start(100);
    setIsRecording(true);
    setSttMethod('server');
    debugLog('Server STT recording started');
  }, []);

  const stopServerSTT = useCallback(async () => {
    return new Promise<void>((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve();
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);
        
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          
          reader.onloadend = async () => {
            try {
              const base64Audio = (reader.result as string).split(',')[1];
              
              debugLog('Sending audio to server STT...');
              const startTime = Date.now();
              
              const { data, error } = await supabase.functions.invoke('voice-to-text', {
                body: { audio: base64Audio }
              });
              
              const duration = Date.now() - startTime;
              
              if (error) {
                throw new Error(error.message || 'Server STT failed');
              }

              const transcription = data?.text || '';
              setTranscript(transcription);
              setIsProcessing(false);
              
              debugLog('Server STT completed', { 
                text: transcription, 
                duration: `${duration}ms`,
                provider: data?.provider || 'unknown'
              });
              
              // Telemetry
              console.log('[TELEMETRY] fallback_voice_succeeded', {
                method: 'server',
                duration_ms: duration,
                provider: data?.provider,
                textLength: transcription.length
              });
              
              resolve();
            } catch (error) {
              debugLog('Server STT error', error);
              setIsProcessing(false);
              
              console.log('[TELEMETRY] fallback_voice_failed', {
                method: 'server',
                error: error instanceof Error ? error.message : 'Unknown error'
              });
              
              toast.error('Failed to transcribe audio. Please try again.');
              resolve();
            }
          };
          
          reader.readAsDataURL(audioBlob);
        } catch (error) {
          debugLog('Audio processing error', error);
          setIsProcessing(false);
          resolve();
        }
      };

      mediaRecorderRef.current.stop();
      
      // Stop all tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    });
  }, []);

  const startRecording = useCallback(async () => {
    if (!isFeatureEnabled('fallback_voice_enabled')) {
      toast.error('Voice search is currently disabled');
      return;
    }

    try {
      // Log telemetry
      console.log('[TELEMETRY] fallback_voice_started', {
        browserSupported: isBrowserSTTSupported(),
        serverAvailable: isServerSTTAvailable(),
        userAgent: navigator.userAgent.substring(0, 50)
      });

      // Try browser STT first (preferred)
      if (isBrowserSTTSupported()) {
        debugLog('Using browser STT');
        await startBrowserSTT();
        toast.success('🎤 Listening... (Browser STT)');
      } else if (isServerSTTAvailable()) {
        debugLog('Falling back to server STT');
        await startServerSTT();
        toast.success('🎤 Recording... (Server STT)');
      } else {
        throw new Error('No STT method available');
      }
    } catch (error) {
      debugLog('STT start failed', error);
      console.log('[TELEMETRY] fallback_voice_failed', {
        method: sttMethod,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      if (error instanceof Error) {
        if (error.message.includes('not-allowed')) {
          toast.error('Microphone access denied. Please allow permissions.');
        } else {
          toast.error(`Voice recognition failed: ${error.message}`);
        }
      } else {
        toast.error('Voice recognition is not available');
      }
    }
  }, [isBrowserSTTSupported, isServerSTTAvailable, startBrowserSTT, startServerSTT, sttMethod]);

  const stopRecording = useCallback(async () => {
    if (sttMethod === 'browser' && recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    } else if (sttMethod === 'server') {
      await stopServerSTT();
    }
    
    setSttMethod('none');
  }, [sttMethod, stopServerSTT]);

  return {
    isRecording,
    isProcessing,
    transcript,
    setTranscript,
    startRecording,
    stopRecording,
    isBrowserSTTSupported,
    isServerSTTAvailable,
    sttMethod
  };
};