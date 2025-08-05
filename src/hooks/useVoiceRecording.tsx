
import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  isProcessing: boolean;
  recordingDuration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  transcribedText: string | null;
  isVoiceRecordingSupported: () => boolean;
}

export const useVoiceRecording = (): UseVoiceRecordingReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if voice recording is supported
  const isVoiceRecordingSupported = useCallback(() => {
    // Check for secure context (HTTPS required for microphone access)
    if (!window.isSecureContext) {
      console.warn('Voice recording requires HTTPS');
      return false;
    }

    // Check for getUserMedia support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('getUserMedia not supported');
      return false;
    }

    // Check for MediaRecorder support
    if (!window.MediaRecorder) {
      console.warn('MediaRecorder not supported');
      return false;
    }

    return true;
  }, []);

  // Timer effect to track recording duration
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingDuration(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    // Check browser compatibility first
    if (!isVoiceRecordingSupported()) {
      toast.error('Voice recording is not supported in this browser or requires HTTPS');
      return;
    }

    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('Microphone access granted, creating MediaRecorder...');
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
      toast.success('🎤 Recording started...');
    } catch (error) {
      console.error('Error starting recording:', error);
      
      // Provide detailed error messages based on error type
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          toast.error('Microphone access denied. Please allow microphone permissions and try again.');
        } else if (error.name === 'NotFoundError') {
          toast.error('No microphone found. Please connect a microphone and try again.');
        } else if (error.name === 'NotReadableError') {
          toast.error('Microphone is being used by another application. Please close other apps and try again.');
        } else if (error.name === 'OverconstrainedError') {
          toast.error('Microphone settings are incompatible. Please try again.');
        } else {
          toast.error(`Microphone error: ${error.message}`);
        }
      } else {
        toast.error('Could not access microphone. Please check permissions.');
      }
    }
  }, [isVoiceRecordingSupported]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convert to base64 for API call
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            
            try {
              // Call Supabase function for voice-to-text transcription
              // TODO: Verify and test the Supabase voice-to-text edge function
              const { data, error } = await supabase.functions.invoke('voice-to-text', {
                body: { audio: base64Audio }
              });

              if (error) {
                throw new Error(error.message || 'Failed to transcribe audio');
              }

              const transcription = data.text || 'Could not transcribe audio';
              setTranscribedText(transcription);
              setIsProcessing(false);
              toast.success('🎯 Voice transcribed successfully!');
              resolve(transcription);
            } catch (error) {
              console.error('Error transcribing audio:', error);
              setIsProcessing(false);
              toast.error('Failed to transcribe audio. Please try again.');
              resolve(null);
            }
          };
          
          reader.readAsDataURL(audioBlob);
        } catch (error) {
          console.error('Error processing audio:', error);
          setIsProcessing(false);
          toast.error('Failed to process audio recording.');
          resolve(null);
        }
      };

      mediaRecorderRef.current.stop();
      
      // Stop all tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    });
  }, [isRecording]);

  // TODO: Whitelist the voice recording activity in security validation
  
  return {
    isRecording,
    isProcessing,
    recordingDuration,
    startRecording,
    stopRecording,
    transcribedText,
    isVoiceRecordingSupported,
  };
};
