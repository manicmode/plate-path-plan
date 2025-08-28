import { useState } from 'react';
import { useVoiceRecording } from './useVoiceRecording';
import { sendToLogVoice } from '@/integrations/logVoice';
import { toast } from 'sonner';
import { USE_SERVER_STT } from '@/lib/flags';

interface UseSpeechToLogProps {
  onFoodDetected: (food: any) => void;
  onError?: (error: string) => void;
}

interface FoodItem {
  name: string;
  quantity?: string;
  preparation?: string;
}

export const useSpeechToLog = ({ onFoodDetected, onError }: UseSpeechToLogProps) => {
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  
  const {
    isRecording,
    isProcessing,
    recordingDuration,
    startRecording,
    stopRecording,
    isVoiceRecordingSupported
  } = useVoiceRecording();

  // Debug logging for speech-to-log flow
  const debugLog = (step: string, data?: any) => {
    console.log(`🗣️ [SpeechToLog] ${step}:`, data);
  };

  const handleVoiceRecording = async () => {
    debugLog('Voice recording triggered', { isRecording, isProcessing });
    
    // Guard server STT calls behind feature flag
    if (!USE_SERVER_STT) {
      const errorMsg = 'Server STT is disabled. Use web speech recognition instead.';
      debugLog('Server STT disabled');
      toast.error(errorMsg);
      onError?.(errorMsg);
      return;
    }
    
    if (!isVoiceRecordingSupported()) {
      const errorMsg = 'Voice recording is not supported on this device or browser';
      debugLog('Voice not supported');
      toast.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      if (isRecording) {
        debugLog('Stopping recording and processing...');
        setIsProcessingVoice(true);
        toast.info('Processing your voice...');
        
        const transcribedText = await stopRecording();
        debugLog('Transcription completed', { text: transcribedText });
        
        if (transcribedText && transcribedText.trim()) {
          setVoiceText(transcribedText);
          await processVoiceText(transcribedText);
        } else {
          const errorMsg = 'Could not understand your voice. Please try again.';
          debugLog('No transcribed text');
          toast.error(errorMsg);
          onError?.(errorMsg);
        }
      } else {
        debugLog('Starting voice recording...');
        await startRecording();
        toast.info('Listening... Speak now!');
      }
    } catch (error) {
      debugLog('Voice recording error', error);
      let errorMsg = 'Voice recording failed. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Permission denied') || error.message.includes('NotAllowedError')) {
          errorMsg = 'Microphone access denied. Please allow microphone access and try again.';
        } else if (error.message.includes('not supported')) {
          errorMsg = 'Voice recording is not supported on this device or browser.';
        }
      }
      
      toast.error(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const processVoiceText = async (text: string) => {
    debugLog('Processing voice text with log-voice function', { text });
    
    try {
      const result = await sendToLogVoice(text);
      debugLog('Log-voice result received', { success: result.success, result });

      if (!result.success) {
        const errorMsg = result.error || 'Failed to process voice input';
        debugLog('Log-voice failed', { error: errorMsg });
        toast.error(errorMsg);
        onError?.(errorMsg);
        return;
      }

      // Get the successful response items directly
      const voiceApiResponse = result;
      debugLog('Voice API response parsed', { items: voiceApiResponse.items?.length });

      if (voiceApiResponse.items && voiceApiResponse.items.length > 0) {
        toast.success(`Found ${voiceApiResponse.items.length} food item(s) from: "${text}"`);
        
        // Process each food item
        voiceApiResponse.items.forEach((item: FoodItem, index: number) => {
          debugLog('Processing food item', { index, item });
          
          let displayName = item.name;
          if (item.preparation) {
            displayName = `${item.preparation} ${item.name}`;
          }
          
          const foodData = {
            id: `voice-item-${index}`,
            name: displayName,
            portion: item.quantity || '1 serving',
            source: 'voice',
            originalText: text,
            rawItem: item
          };
          
          debugLog('Calling onFoodDetected with food data', { foodData });
          onFoodDetected(foodData);
        });
      } else {
        const errorMsg = 'Could not identify any food items from your voice input.';
        debugLog('No food items detected');
        toast.error(errorMsg);
        onError?.(errorMsg);
      }
    } catch (error) {
      debugLog('Voice processing error', error);
      const errorMsg = 'Failed to process voice input. Please try again.';
      toast.error(errorMsg);
      onError?.(errorMsg);
    }
  };

  return {
    isRecording,
    isProcessing: isProcessing || isProcessingVoice,
    recordingDuration,
    voiceText,
    isVoiceRecordingSupported,
    handleVoiceRecording
  };
};