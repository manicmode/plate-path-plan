
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
      console.log('[Voice Recording] Starting recording process...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('[Voice Recording] Microphone access granted, stream:', stream);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('[Voice Recording] Data available, size:', event.data.size);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      console.log('[Voice Recording] Recording started successfully');
      toast.success('🎤 Recording started...');
    } catch (error) {
      console.error('[Voice Recording] Error starting recording:', error);
      
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
        console.log('[Voice Recording] Recording stopped, processing audio...');
        setIsRecording(false);
        setIsProcessing(true);

        try {
          console.log('[Voice Recording] Audio chunks collected:', audioChunksRef.current.length);
          const totalSize = audioChunksRef.current.reduce((total, chunk) => total + chunk.size, 0);
          console.log('[Voice Recording] Total audio size:', totalSize, 'bytes');
          
          if (totalSize === 0) {
            throw new Error('No audio data recorded');
          }

          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log('[Voice Recording] Audio blob created, size:', audioBlob.size, 'type:', audioBlob.type);
          
          // Convert to base64 for API call
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              console.log('[Voice Recording] FileReader completed, result length:', (reader.result as string).length);
              const base64Audio = (reader.result as string).split(',')[1];
              console.log('[Voice Recording] Base64 audio extracted, length:', base64Audio.length);
              
              // Call the voice-to-text edge function with enhanced error logging
              console.log('[Voice Recording] Sending audio to voice-to-text function...');
              
              const { data, error } = await supabase.functions.invoke('voice-to-text', {
                body: { audio: base64Audio }
              });
              
              console.log('[Voice Recording] Response from voice-to-text:', { data, error });

              if (error) {
                console.error('[Voice Recording] Supabase function error:', error);
                throw new Error(error.message || 'Failed to transcribe audio');
              }

              if (!data) {
                console.error('[Voice Recording] No data returned from function');
                throw new Error('No response data from transcription service');
              }

              const transcription = data.text || 'Could not transcribe audio';
              console.log('[Voice Recording] Transcription successful:', transcription);
              setTranscribedText(transcription);
              setIsProcessing(false);
              toast.success('🎯 Voice transcribed successfully!');
              resolve(transcription);
            } catch (error) {
              console.error('[Voice Recording] Error in transcription process:', error);
              setIsProcessing(false);
              toast.error('Failed to transcribe audio. Please try again.');
              resolve(null);
            }
          };
          
          reader.onerror = () => {
            console.error('[Voice Recording] FileReader error:', reader.error);
            setIsProcessing(false);
            toast.error('Failed to process audio recording.');
            resolve(null);
          };
          
          console.log('[Voice Recording] Starting FileReader...');
          reader.readAsDataURL(audioBlob);
        } catch (error) {
          console.error('[Voice Recording] Error processing audio blob:', error);
          setIsProcessing(false);
          toast.error('Failed to process audio recording.');
          resolve(null);
        }
      };

      console.log('[Voice Recording] Stopping MediaRecorder...');
      mediaRecorderRef.current.stop();
      
      // Stop all tracks
      if (mediaRecorderRef.current.stream) {
        const tracks = mediaRecorderRef.current.stream.getTracks();
        console.log('[Voice Recording] Stopping', tracks.length, 'audio tracks...');
        tracks.forEach(track => track.stop());
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
