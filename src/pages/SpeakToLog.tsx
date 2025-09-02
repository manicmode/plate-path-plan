import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import { useSpeech } from '@/speech/useSpeech';
import { sendToLogVoice } from '@/integrations/logVoice';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface FoodItem {
  name: string;
  quantity?: string;
  preparation?: string;
}

export default function SpeakToLog() {
  const navigate = useNavigate();
  const { state, text, error, isSupported, start, stop, reset } = useSpeech();
  const [isProcessingFood, setIsProcessingFood] = useState(false);
  const [parsedItems, setParsedItems] = useState<FoodItem[]>([]);

  const processFoodText = async (transcript: string) => {
    if (!transcript.trim()) return;

    setIsProcessingFood(true);
    try {
      const response = await sendToLogVoice(transcript);
      
      if (response.success && response.items) {
        setParsedItems(response.items);
        
        // Navigate to review with parsed items
        navigate('/camera', {
          state: {
            reviewItems: response.items.map(item => ({
              name: item.name,
              quantity: item.quantity || '1 serving',
              preparation: item.preparation,
              source: 'voice'
            }))
          }
        });
      } else {
        toast.error(response.error || 'Failed to parse food items');
      }
    } catch (error) {
      console.error('Food processing error:', error);
      toast.error('Failed to process voice input');
    } finally {
      setIsProcessingFood(false);
    }
  };

  // Auto-process when transcription is done
  useEffect(() => {
    if (state === 'done' && text.trim()) {
      processFoodText(text);
    }
  }, [state, text]);

  const handleMicClick = () => {
    if (state === 'recording') {
      stop();
    } else if (state === 'idle' || state === 'error') {
      start();
    }
  };

  const getStatusText = () => {
    switch (state) {
      case 'recording':
        return 'Listening... Speak now';
      case 'transcribing':
        return 'Processing speech...';
      case 'done':
        return `Heard: "${text}"`;
      case 'error':
        return error?.message || 'Speech recognition failed';
      default:
        return 'Tap the microphone to start speaking';
    }
  };

  const getStatusIcon = () => {
    switch (state) {
      case 'recording':
        return <Volume2 className="w-5 h-5 text-red-500 animate-pulse" />;
      case 'transcribing':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      default:
        return null;
    }
  };

  if (!isSupported) {
    return (
      <div className="container max-w-2xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Speech to Log</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Speech recognition is not supported on this device or browser.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Speak to Log Food</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Microphone Control */}
          <div className="text-center">
            <Button
              size="lg"
              variant={state === 'recording' ? 'destructive' : 'default'}
              onClick={handleMicClick}
              disabled={state === 'transcribing' || isProcessingFood}
              className="h-20 w-20 rounded-full"
            >
              {state === 'recording' ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </Button>
          </div>

          {/* Status Display */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              {getStatusIcon()}
              <span className="text-sm text-muted-foreground">
                {getStatusText()}
              </span>
            </div>
            
            {isProcessingFood && (
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Parsing food items...</span>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error.message}
                {error.type === 'permission' && (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={reset}
                    >
                      Try Again
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Parsed Items Preview */}
          {parsedItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Detected Items:</h3>
              <div className="space-y-1">
                {parsedItems.map((item, index) => (
                  <div key={index} className="text-sm bg-muted p-2 rounded">
                    <strong>{item.name}</strong>
                    {item.quantity && ` - ${item.quantity}`}
                    {item.preparation && ` (${item.preparation})`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Speak clearly and mention quantities when possible</p>
            <p>• Example: "Two slices of whole wheat bread with peanut butter"</p>
            <p>• Example: "One cup of Greek yogurt with berries"</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}