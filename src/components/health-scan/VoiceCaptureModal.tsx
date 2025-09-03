import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Mic, RotateCcw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProgressiveVoiceSTT } from '@/hooks/useProgressiveVoiceSTT';
import { toast } from 'sonner';

interface VoiceCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transcript: string) => void;
}

export function VoiceCaptureModal({ isOpen, onClose, onSubmit }: VoiceCaptureModalProps) {
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const {
    isRecording,
    isProcessing,
    transcript,
    setTranscript,
    startRecording,
    stopRecording,
    isBrowserSTTSupported,
    isServerSTTAvailable
  } = useProgressiveVoiceSTT();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      console.info('[HEALTH][VOICE] open');
      setTranscript('');
      setPermissionDenied(false);
    }
  }, [isOpen, setTranscript]);

  const handleStartRecording = async () => {
    console.info('[HEALTH][VOICE] start');
    setPermissionDenied(false);
    
    try {
      await startRecording();
    } catch (error) {
      console.error('[HEALTH][VOICE] err', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not-allowed') || error.message.includes('permission')) {
          setPermissionDenied(true);
        } else {
          toast.error(`Recording failed: ${error.message}`);
        }
      } else {
        toast.error('Failed to start recording');
      }
    }
  };

  const handleStopRecording = async () => {
    console.info('[HEALTH][VOICE] stop');
    try {
      await stopRecording();
    } catch (error) {
      console.error('[HEALTH][VOICE] err', error);
      toast.error('Failed to stop recording');
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  const handleUseTranscript = () => {
    if (transcript.trim()) {
      onSubmit(transcript.trim());
    }
  };

  const handleRetry = () => {
    setTranscript('');
    setPermissionDenied(false);
    handleStartRecording();
  };

  const handleClose = () => {
    if (isRecording) {
      handleStopRecording();
    }
    setTranscript('');
    setPermissionDenied(false);
    onClose();
  };

  const getStatusText = () => {
    if (permissionDenied) return 'Microphone access needed';
    if (isRecording) return 'Listening... speak now';
    if (isProcessing) return 'Processing your speech...';
    if (transcript) return 'Transcript ready';
    return 'Tap to speak';
  };

  const getMicButtonColor = () => {
    if (permissionDenied) return 'bg-red-500 hover:bg-red-600';
    if (isRecording) return 'bg-green-500 animate-pulse ring-8 ring-green-400/40 shadow-2xl shadow-green-500/60';
    if (isProcessing) return 'bg-blue-500 animate-spin';
    if (transcript) return 'bg-emerald-500 hover:bg-emerald-600';
    return 'bg-primary hover:bg-primary/90';
  };

  // Check if any STT method is available
  const isSTTAvailable = isBrowserSTTSupported() || isServerSTTAvailable();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border border-white/10 text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Speak to Analyze</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {!isSTTAvailable ? (
          /* STT not available */
          <div className="text-center py-8">
            <Mic className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Voice recognition unavailable</h3>
            <p className="text-white/70 mb-4">Try manual entry instead</p>
            <Button onClick={handleClose} variant="outline" className="border-white/30 text-white hover:bg-white/10">
              Use Manual Entry
            </Button>
          </div>
        ) : permissionDenied ? (
          /* Permission denied state */
          <div className="text-center py-8">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-medium mb-2">Microphone access needed</h3>
            <p className="text-white/70 text-sm mb-4">
              Enable microphone in your browser settings and try again
            </p>
            <div className="flex gap-3">
              <Button onClick={handleRetry} variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button onClick={handleClose} variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          /* Normal voice capture state */
          <div className="space-y-6">
            {/* Large mic button */}
            <div className="text-center">
              <button
                onClick={handleMicClick}
                disabled={isProcessing}
                className={cn(
                  'w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl transition-all duration-300 active:scale-95 mx-auto mb-4',
                  getMicButtonColor()
                )}
              >
                <Mic className="w-8 h-8" />
              </button>
              
              <p className="text-lg font-medium">{getStatusText()}</p>
              
              {/* Live waveform effect */}
              {isRecording && (
                <div className="flex items-center justify-center gap-1 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-green-400 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 20 + 10}px`,
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Transcript preview */}
            {transcript && (
              <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                <h3 className="text-sm font-medium text-white/70 mb-2">Heard:</h3>
                <p className="text-white">{transcript}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              {transcript ? (
                <>
                  <Button
                    onClick={handleUseTranscript}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    Use Transcript
                  </Button>
                  <Button
                    onClick={handleRetry}
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
              )}
            </div>

            {/* Help text */}
            <p className="text-center text-white/60 text-sm">
              Say something like: "salmon with asparagus and lemon"
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}