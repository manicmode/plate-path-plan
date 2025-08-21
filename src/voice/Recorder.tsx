import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface RecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  disabled?: boolean;
  maxDuration?: number; // seconds
}

export const VoiceRecorder: React.FC<RecorderProps> = ({ 
  onRecordingComplete, 
  disabled = false, 
  maxDuration = 30 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const checkMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return permission.state === 'granted';
    } catch {
      // Fallback: try to access microphone directly
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch {
        return false;
      }
    }
  }, []);

  const startRecording = async () => {
    if (disabled || isRecording) return;

    setIsRequestingPermission(true);
    setPermissionError(null);

    try {
      const hasPermission = await checkMicrophonePermission();
      
      if (!hasPermission) {
        setPermissionError('Microphone access denied. Please allow microphone access and try again.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob, duration);
        cleanup();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      setIsRecording(true);
      setDuration(0);

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          // Auto-stop at max duration
          if (newDuration >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newDuration;
        });
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setPermissionError('Failed to start recording. Please check your microphone permissions.');
      cleanup();
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
  };

  const cleanup = () => {
    setIsRecording(false);
    setDuration(0);

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatDuration = (seconds: number): string => {
    return `${seconds}s`;
  };

  const getDurationColor = (): string => {
    if (duration >= maxDuration * 0.9) return 'text-red-500';
    if (duration >= maxDuration * 0.7) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {permissionError && (
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{permissionError}</AlertDescription>
        </Alert>
      )}

      <div className="relative">
        <Button
          onClick={handleClick}
          disabled={disabled || isRequestingPermission}
          size="lg"
          className={cn(
            'relative w-16 h-16 rounded-full transition-all duration-200',
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-primary hover:bg-primary/90',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isRequestingPermission ? (
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          ) : isRecording ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </Button>

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>

      {/* Duration and status */}
      <div className="text-center space-y-1">
        {isRecording ? (
          <>
            <p className={cn('text-sm font-mono', getDurationColor())}>
              {formatDuration(duration)} / {maxDuration}s
            </p>
            <p className="text-xs text-muted-foreground">Tap to stop recording</p>
          </>
        ) : isRequestingPermission ? (
          <p className="text-xs text-muted-foreground">Requesting microphone access...</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {permissionError ? 'Fix permissions and try again' : 'Tap to start recording'}
          </p>
        )}
      </div>
    </div>
  );
};