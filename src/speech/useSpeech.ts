import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FF } from '@/featureFlags';

type SpeechState = 'idle' | 'recording' | 'transcribing' | 'done' | 'error';

interface SpeechError {
  type: 'permission' | 'unsupported' | 'network' | 'unknown';
  message: string;
}

interface UseSpeechResult {
  state: SpeechState;
  text: string;
  error: SpeechError | null;
  isSupported: boolean;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useSpeech(): UseSpeechResult {
  const [state, setState] = useState<SpeechState>('idle');
  const [text, setText] = useState('');
  const [error, setError] = useState<SpeechError | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Check if browser STT is available
  const browserSTTSupported = typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const isSupported = browserSTTSupported || FF.FEATURE_SERVER_STT;

  const reset = useCallback(() => {
    setState('idle');
    setText('');
    setError(null);
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startBrowserSTT = useCallback(async () => {
    if (!browserSTTSupported || !FF.FEATURE_BROWSER_STT) {
      throw new Error('Browser STT not supported or disabled');
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognitionRef.current = recognition;
    
    return new Promise<string>((resolve, reject) => {
      recognition.onstart = () => {
        console.log('[SPEECH] Browser STT started');
        setState('recording');
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('[SPEECH] Browser STT result:', transcript);
        setText(transcript);
        setState('done');
        resolve(transcript);
      };
      
      recognition.onerror = (event: any) => {
        console.error('[SPEECH] Browser STT error:', event.error);
        let errorType: SpeechError['type'] = 'unknown';
        let message = 'Speech recognition failed';
        
        switch (event.error) {
          case 'not-allowed':
            errorType = 'permission';
            message = 'Microphone permission denied. Please enable in browser settings.';
            break;
          case 'no-speech':
            message = 'No speech detected. Please try again.';
            break;
          case 'network':
            errorType = 'network';
            message = 'Network error. Please check your connection.';
            break;
        }
        
        const error: SpeechError = { type: errorType, message };
        setError(error);
        setState('error');
        reject(error);
      };
      
      recognition.onend = () => {
        recognitionRef.current = null;
      };
      
      recognition.start();
    });
  }, [browserSTTSupported]);

  const startServerSTT = useCallback(async () => {
    if (!FF.FEATURE_SERVER_STT) {
      throw new Error('Server STT disabled');
    }

    try {
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      setState('recording');
      
      return new Promise<string>((resolve, reject) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          try {
            setState('transcribing');
            
            const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
            
            // Convert to base64
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]); // Remove data:audio/webm;base64, prefix
              };
              reader.readAsDataURL(audioBlob);
            });
            
            console.log('[SPEECH] Sending to server STT, size:', audioBlob.size);
            
            // Send to Supabase function
            const { data, error } = await supabase.functions.invoke('stt-whisper', {
              body: { audio: base64 }
            });
            
            if (error) {
              throw new Error(`Server STT error: ${error.message}`);
            }
            
            if (data.error) {
              throw new Error(data.error);
            }
            
            const transcript = data.text || '';
            console.log('[SPEECH] Server STT result:', transcript);
            
            setText(transcript);
            setState('done');
            resolve(transcript);
            
          } catch (error) {
            console.error('[SPEECH] Server STT error:', error);
            const speechError: SpeechError = {
              type: 'network',
              message: error instanceof Error ? error.message : 'Server transcription failed'
            };
            setError(speechError);
            setState('error');
            reject(speechError);
          } finally {
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
              streamRef.current = null;
            }
          }
        };
        
        mediaRecorder.start();
      });
      
    } catch (error) {
      console.error('[SPEECH] Media access error:', error);
      const speechError: SpeechError = {
        type: 'permission',
        message: 'Microphone access denied. Please enable in browser settings.'
      };
      setError(speechError);
      setState('error');
      throw speechError;
    }
  }, []);

  const start = useCallback(async () => {
    reset();
    
    try {
      // Try browser STT first if available and enabled
      if (browserSTTSupported && FF.FEATURE_BROWSER_STT) {
        try {
          await startBrowserSTT();
          return;
        } catch (error) {
          console.warn('[SPEECH] Browser STT failed, falling back to server STT:', error);
        }
      }
      
      // Fall back to server STT
      if (FF.FEATURE_SERVER_STT) {
        await startServerSTT();
      } else {
        throw new Error('No speech recognition method available');
      }
      
    } catch (error) {
      console.error('[SPEECH] Start failed:', error);
      if (!(error instanceof Error && error.message.includes('type:'))) {
        setError({
          type: 'unknown',
          message: error instanceof Error ? error.message : 'Speech recognition failed'
        });
        setState('error');
      }
    }
  }, [browserSTTSupported, startBrowserSTT, startServerSTT, reset]);

  return {
    state,
    text,
    error,
    isSupported,
    start,
    stop,
    reset
  };
}