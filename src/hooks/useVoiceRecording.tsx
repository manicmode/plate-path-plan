
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

  // Phase 1: Enhanced debug logging
  const debugLog = (step: string, data?: any) => {
    console.log(`🎤 [VoiceRecording] ${step}:`, data);
  };

  // Check if voice recording is supported
  const isVoiceRecordingSupported = useCallback(() => {
    // Check for secure context (HTTPS required for microphone access)
    if (!window.isSecureContext) {
      debugLog('Voice recording requires HTTPS', { isSecureContext: window.isSecureContext });
      return false;
    }

    // Check for getUserMedia support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      debugLog('getUserMedia not supported', { mediaDevices: !!navigator.mediaDevices, getUserMedia: !!navigator.mediaDevices?.getUserMedia });
      return false;
    }

    // Check for MediaRecorder support
    if (!window.MediaRecorder) {
      debugLog('MediaRecorder not supported', { MediaRecorder: !!window.MediaRecorder });
      return false;
    }

    debugLog('Voice recording fully supported');
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
    debugLog('Starting recording process...');
    
    // Check browser compatibility first
    if (!isVoiceRecordingSupported()) {
      debugLog('Voice recording not supported');
      toast.error('Voice recording is not supported in this browser or requires HTTPS');
      return;
    }

    try {
      debugLog('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      debugLog('Microphone access granted', { 
        streamActive: stream.active, 
        audioTracks: stream.getAudioTracks().length,
        streamId: stream.id 
      });
      
    // Allow voice on scanner routes when specifically in voice modal context
    const params = new URLSearchParams(location.search);
    const forceVoice = params.get('modal') === 'voice';
    const isScannerRoute = /^\/(scan|health-scan|barcode|photo)/i.test(location.pathname);
    const allowVoiceHere = forceVoice || !isScannerRoute;
    
    if (!allowVoiceHere) {
      debugLog('Voice blocked on scanner route');
      throw new Error('Voice recording disabled on scanner routes');
    }

    // AUDIT: Guard against MediaRecorder on iOS WebKit
    const isIOSWebKit =
      /AppleWebKit/.test(navigator.userAgent) &&
      (/iP(hone|ad|od)/.test(navigator.userAgent) || ('ontouchend' in document));
    if (isIOSWebKit) {
      debugLog('Skipping MediaRecorder on iOS WebKit to avoid recording indicator');
      throw new Error('MediaRecorder disabled on iOS WebKit to prevent recording indicator');
    }

    // AUDIT: Instrumentation for MediaRecorder creation
    console.warn('[AUDIT][MR][create]', {
      file: 'useVoiceRecording.tsx',
      hasVideo: !!stream.getVideoTracks().length,
      hasAudio: !!stream.getAudioTracks().length
    });

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    (mediaRecorder as any).__voyageTag = 'useVoiceRecording.tsx';
    mediaRecorder.addEventListener('start', () => console.warn('[AUDIT][MR][start]', (mediaRecorder as any).__voyageTag));
    mediaRecorder.addEventListener('stop',  () => console.warn('[AUDIT][MR][stop]',  (mediaRecorder as any).__voyageTag));
    
    mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        debugLog('Audio data chunk received', { size: event.data.size, type: event.data.type });
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      debugLog('Recording started successfully', { state: mediaRecorder.state });
      toast.success('🎤 Recording started...');
    } catch (error) {
      debugLog('Error starting recording', error);
      
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
        debugLog('Recording stopped, processing audio...');
        setIsRecording(false);
        setIsProcessing(true);

        try {
          debugLog('Audio chunks collected', { count: audioChunksRef.current.length });
          const totalSize = audioChunksRef.current.reduce((total, chunk) => total + chunk.size, 0);
          debugLog('Total audio size', { bytes: totalSize });
          
          if (totalSize === 0) {
            throw new Error('No audio data recorded');
          }

          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          debugLog('Audio blob created', { size: audioBlob.size, type: audioBlob.type });
          
          // Convert to base64 for API call
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              debugLog('FileReader completed', { resultLength: (reader.result as string).length });
              const base64Audio = (reader.result as string).split(',')[1];
              debugLog('Base64 audio extracted', { length: base64Audio.length });
              
              // Call the voice-to-text edge function with enhanced error logging
              debugLog('Sending audio to voice-to-text function...');
              
              const { data, error } = await supabase.functions.invoke('voice-to-text', {
                body: { audio: base64Audio }
              });
              
              debugLog('Voice-to-text response received', { hasData: !!data, hasError: !!error });

              if (error) {
                debugLog('Supabase function error', error);
                throw new Error(error.message || 'Failed to transcribe audio');
              }

              if (!data) {
                debugLog('No data returned from function');
                throw new Error('No response data from transcription service');
              }

              const transcription = data.text || 'Could not transcribe audio';
              debugLog('Transcription successful', { text: transcription, length: transcription.length });
              setTranscribedText(transcription);
              setIsProcessing(false);
              toast.success('🎯 Voice transcribed successfully!');
              resolve(transcription);
            } catch (error) {
              debugLog('Error in transcription process', error);
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
      // AUDIT: Ensure MediaRecorder is properly stopped before tracks
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        debugLog('Error stopping MediaRecorder', e);
      }
      
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
