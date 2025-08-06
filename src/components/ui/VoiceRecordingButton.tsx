import React from 'react';
import { Button } from './button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { toast } from 'sonner';

interface VoiceRecordingButtonProps {
  onVoiceResult: (text: string) => void;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  disabled?: boolean;
}

export const VoiceRecordingButton: React.FC<VoiceRecordingButtonProps> = ({
  onVoiceResult,
  className = "",
  variant = "outline",
  disabled = false
}) => {
  const {
    isRecording,
    isProcessing,
    recordingDuration,
    startRecording,
    stopRecording,
    isVoiceRecordingSupported
  } = useVoiceRecording();

  // Debug logging for the component lifecycle
  const debugLog = (step: string, data?: any) => {
    console.log(`🎤 [VoiceButton] ${step}:`, data);
  };

  const handleVoiceRecording = async () => {
    debugLog('Voice button clicked', { isRecording, isProcessing, disabled });
    
    if (disabled || isProcessing) {
      debugLog('Button disabled or processing, ignoring click');
      return;
    }

    if (!isVoiceRecordingSupported()) {
      debugLog('Voice recording not supported');
      toast.error('Voice recording is not supported on this device or browser');
      return;
    }

    try {
      if (isRecording) {
        debugLog('Stopping recording...');
        toast.info('Processing your voice...');
        const transcribedText = await stopRecording();
        debugLog('Recording stopped, transcribed text received', { text: transcribedText });
        
        if (transcribedText && transcribedText.trim()) {
          debugLog('Calling onVoiceResult with transcribed text');
          onVoiceResult(transcribedText.trim());
          toast.success(`Recognized: "${transcribedText}"`);
        } else {
          debugLog('No transcribed text received');
          toast.error('Could not understand your voice. Please try again.');
        }
      } else {
        debugLog('Starting recording...');
        await startRecording();
        toast.info('Listening... Speak now!');
      }
    } catch (error) {
      debugLog('Voice recording error', error);
      console.error('Voice recording error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Permission denied') || error.message.includes('NotAllowedError')) {
          toast.error('Microphone access denied. Please allow microphone access and try again.');
        } else if (error.message.includes('not supported')) {
          toast.error('Voice recording is not supported on this device or browser.');
        } else {
          toast.error('Voice recording failed. Please try again.');
        }
      } else {
        toast.error('Voice recording failed. Please try again.');
      }
    }
  };

  const getButtonContent = () => {
    if (isProcessing) {
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      );
    }
    
    if (isRecording) {
      return (
        <>
          <MicOff className="w-4 h-4 mr-2 text-red-500" />
          Stop Recording ({recordingDuration}s)
        </>
      );
    }
    
    return (
      <>
        <Mic className="w-4 h-4 mr-2" />
        🎤 Speak Product Name
      </>
    );
  };

  const getButtonClassName = () => {
    let baseClass = `w-full transition-all duration-200 ${className}`;
    
    if (isRecording) {
      baseClass += " border-red-300 text-red-600 hover:bg-red-50 animate-pulse";
    } else if (variant === "outline") {
      baseClass += " border-blue-300 text-blue-600 hover:bg-blue-50";
    }
    
    return baseClass;
  };

  // Check if voice recording is supported on mount
  React.useEffect(() => {
    debugLog('VoiceRecordingButton mounted', { 
      supported: isVoiceRecordingSupported(),
      userAgent: navigator.userAgent 
    });
  }, []);

  return (
    <Button
      variant={variant}
      className={getButtonClassName()}
      onClick={handleVoiceRecording}
      disabled={disabled || isProcessing || !isVoiceRecordingSupported()}
    >
      {getButtonContent()}
    </Button>
  );
};