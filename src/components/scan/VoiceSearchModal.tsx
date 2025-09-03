import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Mic, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StickyHeader } from '@/components/ui/sticky-header';
import { toast } from 'sonner';

interface VoiceSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductSelected: (product: any) => void;
}

type VoiceStatus = 'idle' | 'listening' | 'processing' | 'done' | 'error' | 'permission';

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  open,
  onOpenChange,
  onProductSelected
}) => {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const noSpeechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processingWatchdogRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Safe setState to prevent updates after unmount
  const safeSetStatus = useCallback((newStatus: VoiceStatus) => {
    if (mountedRef.current) {
      console.log(`[VOICE][state] ${status} → ${newStatus}`);
      setStatus(newStatus);
    }
  }, [status]);

  const safeSetError = useCallback((errorMsg: string | null) => {
    if (mountedRef.current) {
      setError(errorMsg);
    }
  }, []);

  // Suggestion chips for quick searches
  const suggestionChips = ['Greek yogurt', 'Chicken breast', 'Kind bar', 'Apple', 'Protein shake'];

  // Check if Speech Recognition API is supported
  const isBrowserSTTSupported = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SR && window.isSecureContext;
  }, []);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (noSpeechTimeoutRef.current) {
      clearTimeout(noSpeechTimeoutRef.current);
      noSpeechTimeoutRef.current = null;
    }
    if (processingWatchdogRef.current) {
      clearTimeout(processingWatchdogRef.current);
      processingWatchdogRef.current = null;
    }
  }, []);

  // Stop recognition safely
  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('[VOICE] Error stopping recognition:', e);
      } finally {
        recognitionRef.current = null;
      }
    }
  }, []);

  // Handle suggestion chip clicks - dispatch custom event for search
  const handleSuggestionClick = useCallback((text: string) => {
    console.log(`[VOICE] Suggestion clicked: ${text}`);
    console.log('[VOICE] Routing to Search Modal');
    const detail = { source: 'voice', initialQuery: text };
    window.dispatchEvent(new CustomEvent('scan:open-search', { detail }));
    onOpenChange(false);
  }, [onOpenChange]);

  // Handle transcript result - route to Search Modal for user selection
  const handleTranscriptAccepted = useCallback((text: string, confidence?: number) => {
    console.log(`[VOICE] Transcript accepted: "${text}" (confidence: ${confidence})`);
    console.info('[HEALTH][VOICE] transcript', { text });
    safeSetStatus('processing');
    
    // Start processing watchdog (8s timeout)
    processingWatchdogRef.current = setTimeout(() => {
      if (mountedRef.current && status === 'processing') {
        console.warn('[VOICE] Processing watchdog timeout');
        toast.error('Slow network—try again or use manual entry');
        safeSetStatus('idle');
      }
    }, 8000);

    // Simulate brief processing delay for user feedback
    setTimeout(() => {
      if (!mountedRef.current) return;
      
      clearTimers();
      
      // Dispatch custom event to open search modal
      console.log('[VOICE] Routing to Search Modal');
      const detail = { source: 'voice', initialQuery: text };
      window.dispatchEvent(new CustomEvent('scan:open-search', { detail }));
      safeSetStatus('done');
      onOpenChange(false);
    }, 500);
  }, [onOpenChange, safeSetStatus, clearTimers, status]);

  // Start listening with Speech Recognition API
  const startListening = useCallback(() => {
    console.log('[VOICE] Starting listening...');
    console.info('[HEALTH][VOICE] start');
    safeSetError(null);
    clearTimers();

    // Check for Speech Recognition support
    const WSR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!WSR) {
      console.warn('[VOICE] Speech recognition not supported');
      safeSetStatus('error');
      safeSetError('Speech recognition unsupported');
      return;
    }

    // Check permissions first
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
        if (result.state === 'denied') {
          console.warn('[VOICE] Microphone permission denied');
          safeSetStatus('permission');
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

      // Set up 7-second no-speech timeout
      noSpeechTimeoutRef.current = setTimeout(() => {
        console.warn('[VOICE] No speech timeout (7s)');
        stopRecognition();
        safeSetStatus('error');
        safeSetError("Didn't catch that");
      }, 7000);

      rec.onstart = () => {
        console.log('[VOICE] Recognition started');
        safeSetStatus('listening');
      };

      rec.onerror = (e: any) => {
        console.warn('[VOICE] Recognition error:', e.error);
        console.error('[HEALTH][VOICE] err', e);
        clearTimers();
        stopRecognition();
        
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          safeSetStatus('permission');
        } else if (e.error === 'no-speech') {
          safeSetStatus('error');
          safeSetError("Didn't catch that");
        } else {
          safeSetStatus('error');
          safeSetError('Could not access microphone');
        }
      };

      rec.onresult = (e: any) => {
        console.log('[VOICE] Recognition result received');
        clearTimers();
        stopRecognition();
        
        const result = e.results?.[0]?.[0];
        const text = result?.transcript?.trim();
        const conf = result?.confidence ?? 0;
        
        if (text) {
          handleTranscriptAccepted(text, conf);
        } else {
          safeSetStatus('error');
          safeSetError('No speech detected');
        }
      };

      // Wire all terminal events to ensure we reach a final state
      rec.onnomatch = () => {
        console.warn('[VOICE] No match');
        clearTimers();
        stopRecognition();
        safeSetStatus('error');
        safeSetError("Didn't catch that");
      };

      rec.onaudioend = () => {
        console.log('[VOICE] Audio ended');
        // Don't change state here, let other handlers deal with it
      };

      rec.onsoundend = () => {
        console.log('[VOICE] Sound ended');
        // Don't change state here, let other handlers deal with it
      };

      rec.onend = () => {
        console.log('[VOICE] Recognition ended');
        clearTimers();
        // Only set error if we're still listening (no result received)
        if (status === 'listening') {
          safeSetStatus('error');
          safeSetError("Didn't catch that");
        }
      };

      rec.start();
      console.log('[VOICE] Recognition start requested');
    } catch (err) {
      console.error('[VOICE] Failed to start recognition:', err);
      clearTimers();
      safeSetStatus('error');
      safeSetError('Could not start microphone');
    }
  }, [handleTranscriptAccepted, safeSetStatus, safeSetError, clearTimers, stopRecognition, status]);

  // Stop listening
  const stopListening = useCallback(() => {
    console.log('[VOICE] Stopping listening...');
    console.info('[HEALTH][VOICE] stop');
    clearTimers();
    stopRecognition();
    safeSetStatus('idle');
  }, [clearTimers, stopRecognition, safeSetStatus]);

  // Handle mic button click
  const handleMicClick = useCallback(() => {
    console.log(`[VOICE] Mic clicked, current status: ${status}`);
    if (status === 'listening') {
      stopListening();
    } else if (status === 'idle' || status === 'error') {
      safeSetError(null);
      startListening();
    }
  }, [status, startListening, stopListening, safeSetError]);

  // Handle retry after error
  const handleRetry = useCallback(() => {
    console.log('[VOICE] Retry clicked');
    safeSetError(null);
    safeSetStatus('idle');
    setTimeout(() => startListening(), 100);
  }, [startListening, safeSetError, safeSetStatus]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      console.log('[VOICE] Modal opened');
      mountedRef.current = true;
      setStatus('idle');
      setError(null);
    } else {
      console.log('[VOICE] Modal closed');
      // Clean up recognition and timers when modal closes
      clearTimers();
      stopRecognition();
      mountedRef.current = false;
    }
  }, [open, clearTimers, stopRecognition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[VOICE] Component unmounting');
      mountedRef.current = false;
      clearTimers();
      stopRecognition();
    };
  }, [clearTimers, stopRecognition]);

  const getStatusText = () => {
    switch (status) {
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
                     <p className="text-sm mb-4">Try manual entry instead</p>
                      <Button
                        onClick={() => {
                          onOpenChange(false);
                        }}
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                        variant="outline"
                      >
                        Manual Entry
                      </Button>
                   </div>
                 ) : status === 'permission' ? (
                   /* Permission State */
                   <div className="text-white/70">
                     <Mic className="h-16 w-16 mx-auto mb-6 opacity-50" />
                     <p className="text-xl font-medium mb-4">Microphone access needed</p>
                     <div className="text-sm text-white/60 space-y-3 mb-6">
                       <p>Enable microphone in <strong>Settings → Safari → Microphone</strong> (or PWA app settings), then return here.</p>
                     </div>
                     <Button
                       onClick={() => setStatus('idle')}
                       className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                       variant="outline"
                     >
                       Try again
                     </Button>
                   </div>
                 ) : (
                   /* Normal Voice State */
                   <>
                     {/* Mic Button with breathing animation and glow */}
                     <button
                       onClick={handleMicClick}
                       disabled={status === 'processing' || status === 'done'}
                       className={cn(
                         'mx-auto mb-6 h-32 w-32 rounded-full grid place-items-center text-white',
                         'bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all duration-300',
                         status === 'listening' && 'animate-pulse ring-8 ring-emerald-400/40 shadow-2xl shadow-emerald-500/60 bg-gradient-to-br from-emerald-400 to-emerald-600',
                         status === 'processing' && 'animate-spin bg-blue-500',
                         status === 'error' && 'bg-red-500 hover:bg-red-600',
                         status === 'done' && 'bg-green-500'
                       )}
                       aria-label="Tap to speak"
                     >
                       <Mic className="h-10 w-10" />
                     </button>

                     <p className="text-white text-xl font-medium mb-6">
                       {getStatusText()}
                     </p>

                     {(error && status === 'error') && (
                       <div className="text-center mb-4">
                         <p className="text-red-300 text-lg mb-3">{error}</p>
                         <Button
                           onClick={handleRetry}
                           className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                           variant="outline"
                         >
                           <RotateCcw className="h-4 w-4 mr-2" />
                           Retry
                         </Button>
                       </div>
                     )}

                     {/* Suggestion chips - only show when idle */}
                     {status === 'idle' && (
                       <div className="mt-6 space-y-4">
                         <p className="text-white/70 text-sm">Or try these suggestions:</p>
                         <div className="flex flex-wrap gap-2 justify-center max-w-sm mx-auto">
                           {suggestionChips.map((suggestion) => (
                             <button
                               key={suggestion}
                               onClick={() => handleSuggestionClick(suggestion)}
                               className="px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 text-white/90 text-sm transition-all duration-200 hover:scale-105 active:scale-95"
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