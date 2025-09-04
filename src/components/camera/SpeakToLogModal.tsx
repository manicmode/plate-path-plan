import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, X, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { submitTextLookup } from '@/lib/food/textLookup';

interface SpeakToLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResults: (items: any[]) => void;
}

export const SpeakToLogModal: React.FC<SpeakToLogModalProps> = ({
  isOpen,
  onClose,
  onResults
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart;
          } else {
            interimTranscript += transcriptPart;
          }
        }
        
        setTranscript(finalTranscript + interimTranscript);
      };
      
      recognition.onerror = (event: any) => {
        console.error('[SPEECH] Recognition error:', event.error);
        toast.error('Speech recognition error. Please try again.');
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  const startRecording = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsRecording(true);
        setTranscript('');
        toast.success('Started listening... Speak your food items now.');
      } else {
        toast.error('Speech recognition not supported in this browser');
      }
      
      // Clean up stream
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('[SPEECH] Microphone access error:', error);
      toast.error('Microphone access denied. Please enable microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSubmit = async () => {
    const cleanTranscript = transcript.trim();
    if (!cleanTranscript) {
      toast.error('Please speak something first');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('[SPEECH] Processing transcript:', cleanTranscript);
      
      // Use unified text lookup
      const { items } = await submitTextLookup(cleanTranscript, { source: 'speech' });

      if (!items || items.length === 0) {
        toast.error('No food items recognized. Please try speaking more clearly.');
        return;
      }

      console.log(`[SPEECH] Found ${items.length} food items`);
      toast.success(`Found ${items.length} food item${items.length > 1 ? 's' : ''} from your speech!`);

      // Pass results to parent for confirmation flow
      onResults(items);
      onClose();
      
    } catch (error) {
      console.error('[SPEECH] Processing error:', error);
      toast.error('Failed to process speech. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    setTranscript('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Mic className="h-5 w-5 text-emerald-500" />
            Speak to Log Food
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Recording Controls */}
          <div className="flex flex-col items-center space-y-4">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`w-20 h-20 rounded-full ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-emerald-500 hover:bg-emerald-600'
              } text-white shadow-lg hover:shadow-xl transition-all duration-200`}
            >
              {isRecording ? (
                <MicOff className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {isRecording 
                ? "Listening... Tap to stop" 
                : "Tap to start recording"}
            </p>
            
            {isRecording && (
              <div className="flex items-center gap-2 text-red-500">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm">Recording...</span>
              </div>
            )}
          </div>

          {/* Transcript Display */}
          {transcript && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                What you said:
              </label>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border min-h-[60px]">
                <p className="text-sm text-gray-900 dark:text-white">
                  {transcript || 'Your speech will appear here...'}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!transcript.trim() || isProcessing}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  <span>Find Food</span>
                </div>
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <p>Say things like:</p>
            <p className="italic">"Apple, banana, and greek yogurt"</p>
            <p className="italic">"Two eggs and whole wheat toast"</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};