import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Mic } from 'lucide-react';
import { goToHealthAnalysis } from '@/lib/nav';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface VoiceSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductSelected: (product: any) => void;
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'permission';

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  open,
  onOpenChange,
  onProductSelected
}) => {
  const navigate = useNavigate();
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Suggestion chips for quick searches
  const suggestionChips = ['Greek yogurt', 'Chicken breast', 'Kind bar'];

  // Check if Speech Recognition API is supported
  const isBrowserSTTSupported = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SR && window.isSecureContext;
  }, []);

  // Handle suggestion chip clicks - route directly to Health Analysis
  const handleSuggestionClick = useCallback((text: string) => {
    goToHealthAnalysis(navigate, { source: 'manual', name: text });
    onOpenChange(false);
  }, [navigate, onOpenChange]);

  // Handle transcript result - route to Health Analysis or Manual Entry based on confidence
  const handleTranscriptAccepted = useCallback((text: string, confidence?: number) => {
    // High confidence - go straight to Health Analysis
    if ((confidence ?? 0) >= 0.82) {
      goToHealthAnalysis(navigate, { source: 'manual', name: text });
      onOpenChange(false);
    } else {
      // Low confidence - go to Manual Entry with query pre-filled
      navigate(`/scan?modal=manual&query=${encodeURIComponent(text)}`);
      onOpenChange(false);
    }
  }, [navigate, onOpenChange]);

  // Start listening with Speech Recognition API
  const startListening = useCallback(() => {
    setError(null);

    // Check for Speech Recognition support
    const WSR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!WSR) {
      setError('Speech recognition unsupported');
      return;
    }

    try {
      const rec = new WSR();
      recognitionRef.current = rec;
      
      rec.lang = 'en-US';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => setState('listening');

      rec.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          setState('permission');
        } else {
          setError('Could not access microphone');
          setState('idle');
        }
      };

      rec.onresult = (e: any) => {
        setState('processing');
        const result = e.results?.[0]?.[0];
        const text = result?.transcript?.trim();
        const conf = result?.confidence ?? 0;
        
        if (text) {
          handleTranscriptAccepted(text, conf);
        } else {
          setState('idle');
          setError('No speech detected');
        }
      };

      rec.onend = () => {
        if (state === 'listening') {
          setState('idle');
        }
      };

      rec.start();
    } catch (err) {
      setError('Could not start microphone');
      setState('idle');
    }
  }, [handleTranscriptAccepted, state]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setState('idle');
  }, []);

  // Handle mic button click
  const handleMicClick = useCallback(() => {
    if (state === 'listening') {
      stopListening();
    } else if (state === 'idle') {
      startListening();
    }
  }, [state, startListening, stopListening]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setState('idle');
      setError(null);
    } else {
      // Clean up recognition when modal closes
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    }
  }, [open]);

  const getStateText = () => {
    switch (state) {
      case 'listening': return 'Listening…';
      case 'processing': return 'Analyzing…';
      case 'permission': return 'Microphone access needed';
      default: return 'Tap to speak';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 m-0 bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 border-0 rounded-none [&>button]:hidden">
        <div className="flex flex-col h-full pt-[env(safe-area-inset-top)]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-gradient-to-b from-black/30 to-transparent">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </Button>
            
            <h2 className="text-white text-xl font-semibold">Voice Search</h2>
            
            <div className="w-10" />
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="w-full max-w-md">
              {/* Main Voice Card */}
              <div className="mx-4 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl p-8 text-center">
                
                {!isBrowserSTTSupported() ? (
                  /* Unsupported State */
                  <div className="text-white/70">
                    <Mic className="h-16 w-16 mx-auto mb-6 opacity-50" />
                    <p className="text-xl font-medium mb-2">Speech recognition unsupported</p>
                    <p className="text-sm mb-4">Try the native app or manual entry instead</p>
                  </div>
                ) : state === 'permission' ? (
                  /* Permission State */
                  <div className="text-white/70">
                    <Mic className="h-16 w-16 mx-auto mb-6 opacity-50" />
                    <p className="text-xl font-medium mb-4">Microphone access needed</p>
                    <div className="text-sm text-white/60 space-y-3 mb-6">
                      <p>Enable microphone in <strong>Settings → Safari → Microphone</strong>, then return here.</p>
                    </div>
                    <Button
                      onClick={() => setState('idle')}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                      variant="outline"
                    >
                      Try again
                    </Button>
                  </div>
                ) : (
                  /* Normal Voice State */
                  <>
                    {/* Mic Button with breathing animation */}
                    <button
                      onClick={handleMicClick}
                      disabled={state === 'processing'}
                      className={cn(
                        'mx-auto mb-6 h-32 w-32 rounded-full grid place-items-center text-white',
                        'bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all duration-300',
                        state === 'listening' && 'animate-pulse ring-8 ring-emerald-500/30 shadow-lg shadow-emerald-500/50',
                        state === 'processing' && 'animate-spin bg-blue-500'
                      )}
                      aria-label="Tap to speak"
                    >
                      <Mic className="h-10 w-10" />
                    </button>

                    <p className="text-white text-xl font-medium mb-6">
                      {getStateText()}
                    </p>

                    {error && (
                      <p className="text-red-300 text-sm mb-4">{error}</p>
                    )}

                    {/* Suggestion chips - only show when idle */}
                    {state === 'idle' && (
                      <div className="mt-6 space-y-4">
                        <p className="text-white/70 text-sm">Or try these suggestions:</p>
                        <div className="flex flex-wrap gap-3 justify-center">
                          {suggestionChips.map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/90 text-sm transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 pt-3 bg-gradient-to-t from-black/40 to-transparent">
            <p className="text-center text-gray-500 text-xs">
              Powered by browser speech recognition
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};