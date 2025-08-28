import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Mic } from 'lucide-react';
import { goToHealthAnalysis } from '@/lib/nav';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { StickyHeader } from '@/components/ui/sticky-header';

interface VoiceSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductSelected: (product: any) => void;
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'done' | 'error' | 'permission';

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  open,
  onOpenChange,
  onProductSelected
}) => {
  const navigate = useNavigate();
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Suggestion chips for quick searches
  const suggestionChips = ['Greek yogurt', 'Chicken breast', 'Kind bar', 'Apple', 'Protein shake'];

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
      setState('error');
      setError('Speech recognition unsupported');
      return;
    }

    // Check permissions first
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
        if (result.state === 'denied') {
          setState('permission');
          return;
        }
      }).catch(() => {
        // Permissions API not supported, continue anyway
      });
    }

    try {
      const rec = new WSR();
      recognitionRef.current = rec;
      
      rec.lang = 'en-US';
      rec.continuous = false;
      rec.interimResults = false;

      // Set up 7-second timeout for no speech
      timeoutRef.current = setTimeout(() => {
        setState('error');
        setError("Didn't catch that");
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            console.warn('Error stopping recognition:', e);
          }
        }
      }, 7000);

      rec.onstart = () => {
        setState('listening');
      };

      rec.onerror = (e: any) => {
        clearTimeout(timeoutRef.current!);
        console.warn('Speech recognition error:', e.error);
        
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          setState('permission');
        } else if (e.error === 'no-speech') {
          setState('error');
          setError("Didn't catch that");
        } else {
          setState('error');
          setError('Could not access microphone');
        }
      };

      rec.onresult = (e: any) => {
        clearTimeout(timeoutRef.current!);
        setState('processing');
        const result = e.results?.[0]?.[0];
        const text = result?.transcript?.trim();
        const conf = result?.confidence ?? 0;
        
        if (text) {
          setTimeout(() => {
            handleTranscriptAccepted(text, conf);
            setState('done');
          }, 500);
        } else {
          setState('error');
          setError('No speech detected');
        }
      };

      // Wire all terminal events to ensure we reach a final state
      rec.onnomatch = () => {
        clearTimeout(timeoutRef.current!);
        setState('error');
        setError("Didn't catch that");
      };

      rec.onaudioend = () => {
        clearTimeout(timeoutRef.current!);
        if (state === 'listening') {
          setState('processing');
        }
      };

      rec.onsoundend = () => {
        clearTimeout(timeoutRef.current!);
      };

      rec.onend = () => {
        clearTimeout(timeoutRef.current!);
        if (state === 'listening') {
          setState('error');
          setError("Didn't catch that");
        }
      };

      rec.start();
    } catch (err) {
      clearTimeout(timeoutRef.current!);
      setState('error');
      setError('Could not start microphone');
    }
  }, [handleTranscriptAccepted, state]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Error stopping recognition:', e);
      } finally {
        recognitionRef.current = null;
      }
    }
    setState('idle');
  }, []);

  // Handle mic button click
  const handleMicClick = useCallback(() => {
    if (state === 'listening') {
      stopListening();
    } else if (state === 'idle' || state === 'error') {
      setError(null);
      startListening();
    }
  }, [state, startListening, stopListening]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setState('idle');
      setError(null);
    } else {
      // Clean up recognition and timers when modal closes
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn('Error stopping recognition on close:', e);
        } finally {
          recognitionRef.current = null;
        }
      }
    }
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn('Error stopping recognition on unmount:', e);
        }
      }
    };
  }, []);

  const getStateText = () => {
    switch (state) {
      case 'listening': return 'Listening…';
      case 'processing': return 'Analyzing…';
      case 'permission': return 'Microphone access needed';
      case 'error': return error || 'Try again';
      case 'done': return 'Redirecting…';
      default: return 'Tap to speak';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 m-0 bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 border-0 rounded-none [&>button]:hidden">
        <div className="flex flex-col h-full">
          {/* Sticky Header */}
          <StickyHeader className="bg-gradient-to-b from-black/30 to-transparent border-0">
            <div className="flex items-center justify-between px-6 py-4">
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
          </StickyHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full px-6 py-8">
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
                      disabled={state === 'processing' || state === 'done'}
                      className={cn(
                        'mx-auto mb-6 h-32 w-32 rounded-full grid place-items-center text-white',
                        'bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all duration-300',
                        state === 'listening' && 'animate-pulse ring-8 ring-emerald-500/30 shadow-2xl shadow-emerald-500/60 bg-gradient-to-br from-emerald-400 to-emerald-600',
                        state === 'processing' && 'animate-spin bg-blue-500',
                        state === 'error' && 'bg-red-500 hover:bg-red-600',
                        state === 'done' && 'bg-green-500'
                      )}
                      aria-label="Tap to speak"
                    >
                      <Mic className="h-10 w-10" />
                    </button>

                    <p className="text-white text-xl font-medium mb-6">
                      {getStateText()}
                    </p>

                    {(error && state === 'error') && (
                      <div className="text-center mb-4">
                        <p className="text-red-300 text-lg mb-3">{error}</p>
                        <Button
                          onClick={() => {
                            setError(null);
                            startListening();
                          }}
                          className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                          variant="outline"
                        >
                          Retry
                        </Button>
                      </div>
                    )}

                    {/* Suggestion chips - only show when idle */}
                    {state === 'idle' && (
                      <div className="mt-6 space-y-4">
                        <p className="text-white/70 text-sm">Or try these suggestions:</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {suggestionChips.map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/90 text-sm transition-colors"
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
        </div>
      </DialogContent>
    </Dialog>
  );
};