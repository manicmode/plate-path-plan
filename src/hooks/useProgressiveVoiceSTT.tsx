import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { useMicrophone, stopAllMedia } from '@/lib/media/useMediaDevices';

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

  // Use the new microphone hook for server STT
  const microphone = useMicrophone({
    sampleRate: 16000,
    echoCancellation: true,
    noiseSuppression: true
  });

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
    debugLog('Starting server STT with MediaRecorder');
    
    audioChunksRef.current = [];

    try {
      // Use the new microphone hook
      await microphone.start();
      
      if (!microphone.stream) {
        throw new Error('Failed to get microphone stream');
      }

      // Check MediaRecorder support
      if (!window.MediaRecorder || !MediaRecorder.isTypeSupported('audio/webm')) {
        throw new Error('MediaRecorder not supported');
      }

      const mediaRecorder = new MediaRecorder(microphone.stream, {
        mimeType: 'audio/webm'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          debugLog('Audio chunk recorded', { size: event.data.size });
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setSttMethod('server');
      
      debugLog('Server STT MediaRecorder started');

    } catch (error) {
      debugLog('Server STT failed to start', error);
      microphone.stop(); // Clean up microphone
      throw error;
    }
  }, [microphone]);

  const stopRecording = useCallback(async (): Promise<void> => {
    debugLog('Stopping recording', { method: sttMethod });

    if (sttMethod === 'browser' && recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      setSttMethod('none');
      return;
    }

    if (sttMethod === 'server' && mediaRecorderRef.current) {
      setIsProcessing(true);

      try {
        // Stop MediaRecorder first
        if (mediaRecorderRef.current.state === 'recording') {
          debugLog('Stopping MediaRecorder...');
          mediaRecorderRef.current.stop();
        }

        // Clean up microphone stream
        microphone.stop();

        // Process audio for transcription
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = async () => {
            debugLog('MediaRecorder stopped, processing audio...');
            
            if (audioChunksRef.current.length === 0) {
              debugLog('No audio chunks to process');
              setIsProcessing(false);
              return;
            }

            try {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              debugLog('Audio blob created', { size: audioBlob.size });

              if (audioBlob.size < 1000) {
                debugLog('Audio too short, skipping transcription');
                setIsProcessing(false);
                return;
              }

              // Call server STT
              const formData = new FormData();
              formData.append('audio', audioBlob, 'recording.webm');

              const { data, error } = await supabase.functions.invoke('voice-stt', {
                body: formData,
              });

              if (error) {
                debugLog('STT API error', error);
                toast.error(`Transcription failed: ${error.message}`);
              } else if (data?.transcript) {
                debugLog('STT success', { transcript: data.transcript });
                setTranscript(data.transcript);
              } else {
                debugLog('No transcript returned', data);
                toast.error('No speech detected. Please try again.');
              }

            } catch (error) {
              debugLog('Transcription processing error', error);
              toast.error('Failed to process audio recording');
            } finally {
              setIsProcessing(false);
              audioChunksRef.current = [];
            }
          };
        }
      } catch (error) {
        debugLog('Stop recording error', error);
        microphone.stop(); // Ensure cleanup
        setIsProcessing(false);
      } finally {
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setSttMethod('none');
      }
    }
  }, [sttMethod, microphone]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
      microphone.stop();
      setSttMethod('none');
      setIsRecording(false);
      setIsProcessing(false);
    };
  }, [microphone]);

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