import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { X, Mic, RotateCcw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StickyHeader } from '@/components/ui/sticky-header';
import { toast } from 'sonner';
import { searchFoodByName, CanonicalSearchResult } from '@/lib/foodSearch';
import { SearchResultsList } from '@/components/health-check/SearchResultsList';
import { handleSearchPick } from '@/shared/search-to-analysis';
import { isFeatureEnabled } from '@/lib/featureFlags';

interface UnifiedVoiceSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setAnalysisData: (data: any) => void;
  setStep: (step: string) => void;
}

type VoiceStatus = 'idle' | 'listening' | 'processing' | 'done' | 'error' | 'permission' | 'searching';

export const UnifiedVoiceSearchModal: React.FC<UnifiedVoiceSearchModalProps> = ({
  open,
  onOpenChange,
  setAnalysisData,
  setStep
}) => {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [searchResults, setSearchResults] = useState<CanonicalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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

  // Handle search for voice transcript
  const handleSearch = useCallback(async (query: string) => {
    if (!isFeatureEnabled('fallback_text_enabled')) {
      safeSetError('Search is currently disabled');
      return;
    }
    
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    safeSetStatus('searching');
    safeSetError(null);
    
    try {
      console.log(`[VOICE→SEARCH] Searching for: "${trimmed}"`);
      const results = await searchFoodByName(trimmed);
      console.log(`[VOICE→SEARCH] Found ${results.length} results`);
      
      setSearchResults(results);
      
      if (results.length === 0) {
        safeSetError('No results found. Try a different search term.');
      }
    } catch (error) {
      console.error('[VOICE→SEARCH] Search failed:', error);
      safeSetError('Search failed. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
      if (status === 'searching') {
        safeSetStatus('done');
      }
    }
  }, [safeSetStatus, safeSetError, status]);

  // Handle result selection - use unified pipeline
  const handleResultSelect = useCallback(async (result: CanonicalSearchResult) => {
    console.log(`[VOICE→SELECT] Selected: ${result.name}`);
    
    onOpenChange(false); // Close modal immediately for better UX
    
    // Use unified analysis pipeline - identical to manual entry
    handleSearchPick({
      item: result,
      source: 'voice',
      setAnalysisData,
      setStep,
      onError: (error) => {
        console.error('[VOICE→ANALYSIS] Failed:', error);
        toast.error(error?.message ?? 'Could not analyze selected item');
      },
    });
  }, [setAnalysisData, setStep, onOpenChange]);

  // Handle transcript result - search for products
  const handleTranscriptAccepted = useCallback((text: string, confidence?: number) => {
    console.log(`[VOICE] Transcript accepted: "${text}" (confidence: ${confidence})`);
    setTranscript(text);
    
    // Start search immediately
    handleSearch(text);
  }, [handleSearch]);

  // Start listening with Speech Recognition API
  const startListening = useCallback(() => {
    console.log('[VOICE] Starting listening...');
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

      rec.onnomatch = () => {
        console.warn('[VOICE] No match');
        clearTimers();
        stopRecognition();
        safeSetStatus('error');
        safeSetError("Didn't catch that");
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
      setSearchResults([]);
      setTranscript('');
      startListening();
    }
  }, [status, startListening, stopListening, safeSetError]);

  // Handle retry after error
  const handleRetry = useCallback(() => {
    console.log('[VOICE] Retry clicked');
    safeSetError(null);
    safeSetStatus('idle');
    setSearchResults([]);
    setTranscript('');
    setTimeout(() => startListening(), 100);
  }, [startListening, safeSetError, safeSetStatus]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      console.log('[VOICE] Modal opened');
      mountedRef.current = true;
      setStatus('idle');
      setError(null);
      setTranscript('');
      setSearchResults([]);
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
      case 'processing': return 'Processing…';
      case 'searching': return 'Searching…';
      case 'permission': return 'Microphone access needed';
      case 'error': return error || 'Try again';
      case 'done': return transcript || 'Search results';
      default: return 'Tap to speak';
    }
  };

  const showResults = transcript && (searchResults.length > 0 || status === 'done');

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

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-8">
              {!isBrowserSTTSupported() ? (
                /* Unsupported State */
                <div className="text-center text-white/70">
                  <Mic className="h-16 w-16 mx-auto mb-6 opacity-50" />
                  <p className="text-xl font-medium mb-2">Speech recognition unsupported</p>
                  <p className="text-sm mb-4">Your browser doesn't support voice input</p>
                </div>
              ) : status === 'permission' ? (
                /* Permission State */
                <div className="text-center text-white/70">
                  <Mic className="h-16 w-16 mx-auto mb-6 opacity-50" />
                  <p className="text-xl font-medium mb-4">Microphone access needed</p>
                  <div className="text-sm text-white/60 space-y-3 mb-6">
                    <p>Enable microphone in your browser settings, then try again.</p>
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
                <div className="max-w-md mx-auto">
                  {/* Voice Card */}
                  <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl p-8 text-center mb-6">
                    {/* Mic Button */}
                    <button
                      onClick={handleMicClick}
                      disabled={status === 'processing' || status === 'searching'}
                      className={cn(
                        'mx-auto mb-6 h-32 w-32 rounded-full grid place-items-center text-white',
                        'bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all duration-300',
                        status === 'listening' && 'animate-pulse ring-8 ring-emerald-400/40 shadow-2xl shadow-emerald-500/60 bg-gradient-to-br from-emerald-400 to-emerald-600',
                        (status === 'processing' || status === 'searching') && 'animate-spin bg-blue-500',
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

                    {/* Transcript Display */}
                    {transcript && (
                      <Card className="bg-white/10 border-white/20 mb-4">
                        <CardContent className="p-4">
                          <p className="text-white text-sm">
                            <strong>You said:</strong> "{transcript}"
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Error State */}
                    {(error && status === 'error') && (
                      <div className="text-center mb-4">
                        <p className="text-red-300 text-lg mb-3">{error}</p>
                        <Button
                          onClick={handleRetry}
                          className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                          variant="outline"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Try Again
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Search Results */}
                  {showResults && (
                    <div className="space-y-4">
                      <h3 className="text-white text-lg font-medium">Search Results</h3>
                      <SearchResultsList 
                        results={searchResults}
                        onSelect={handleResultSelect}
                        isLoading={isSearching}
                        query={transcript}
                      />
                    </div>
                  )}
                </div>
              )}
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