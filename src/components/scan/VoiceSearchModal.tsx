import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { X, Mic, Search, Edit3, Loader2 } from 'lucide-react';
import { searchFoodByName, CanonicalSearchResult, searchResultToLegacyProduct } from '@/lib/foodSearch';
import { SearchResultsList } from '../health-check/SearchResultsList';
import { logFallbackEvents } from '@/lib/healthScanTelemetry';
import { toast } from 'sonner';
import { goToHealthAnalysis } from '@/lib/nav';
import { useNavigate } from 'react-router-dom';

interface VoiceSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductSelected: (product: any) => void;
}

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  open,
  onOpenChange,
  onProductSelected
}) => {
  const navigate = useNavigate();
  const [editableTranscript, setEditableTranscript] = useState('');
  const [searchResults, setSearchResults] = useState<CanonicalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'error'>('idle');
  const recognitionRef = useRef<any>(null);

  // Suggestion chips for quick searches
  const suggestionChips = ['Greek yogurt', 'Chicken breast', 'Kind bar'];

  // Check if Speech Recognition API is supported (including webkitSpeechRecognition)
  const isBrowserSTTSupported = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SR && window.isSecureContext;
  }, []);

  // Check route guard exception for voice on scanner routes
  const isVoiceAllowedHere = useCallback(() => {
    const params = new URLSearchParams(location.search);
    const forceVoice = params.get('modal') === 'voice';
    const isScannerRoute = /^\/(scan|health-scan|barcode|photo)/i.test(location.pathname);
    return forceVoice || !isScannerRoute;
  }, []);

  // Start listening with Speech Recognition API
  const startListening = useCallback(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceState('error');
      return;
    }

    if (!isVoiceAllowedHere()) {
      setVoiceState('error');
      toast.error('Voice search not allowed on this route');
      return;
    }

    try {
      const recognition = new SR();
      recognitionRef.current = recognition;
      
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;
      recognition.continuous = false;

      recognition.onstart = () => setVoiceState('listening');
      recognition.onerror = (e: any) => {
        setVoiceState('idle');
        if (e.error === 'not-allowed') {
          setVoiceState('error');
        } else {
          toast.error(`Voice recognition error: ${e.error}`);
        }
      };
      recognition.onend = () => {
        if (voiceState !== 'processing') {
          setVoiceState('idle');
        }
      };
      recognition.onresult = (evt: any) => {
        const text = evt.results?.[0]?.[0]?.transcript?.trim();
        if (!text) {
          setVoiceState('idle');
          return;
        }
        handleTranscript(text);
      };

      recognition.start();
    } catch (e) {
      setVoiceState('error');
      toast.error('Failed to start voice recognition');
    }
  }, [voiceState, isVoiceAllowedHere]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setVoiceState('idle');
  }, []);

  // Handle transcript from speech recognition
  const handleTranscript = useCallback(async (text: string) => {
    setVoiceState('processing');
    setEditableTranscript(text);
    
    try {
      const results = await searchFoodByName(text);
      
      if (results.length === 0) {
        setVoiceState('idle');
        toast.error('No foods found. Try being more specific.');
        return;
      }
      
      // Check for high confidence match
      const topResult = results[0];
      if (topResult && topResult.confidence && topResult.confidence >= 0.82) {
        const legacyProduct = searchResultToLegacyProduct(topResult);
        onProductSelected(legacyProduct);
        onOpenChange(false);
        return;
      }
      
      // Show results list for user selection
      setSearchResults(results);
      setShowResults(true);
      setVoiceState('idle');
      
    } catch (error) {
      setVoiceState('error');
      toast.error('Search failed. Please try again.');
    }
  }, [onProductSelected, onOpenChange]);

  // Handle voice toggle (start/stop)
  const handleVoiceToggle = useCallback(() => {
    if (voiceState === 'listening') {
      stopListening();
    } else if (voiceState === 'idle') {
      startListening();
    }
  }, [voiceState, startListening, stopListening]);

  // Handle suggestion chip clicks
  const handleSuggestionClick = useCallback(async (suggestion: string) => {
    setEditableTranscript(suggestion);
    await handleTranscript(suggestion);
  }, [handleTranscript]);

  // Handle manual search
  const handleManualSearch = useCallback(async () => {
    const query = editableTranscript.trim();
    if (!query) return;
    
    await handleTranscript(query);
  }, [editableTranscript, handleTranscript]);

  // Handle result selection
  const handleResultSelect = useCallback((result: CanonicalSearchResult) => {
    // Transform to legacy product format
    const legacyProduct = searchResultToLegacyProduct(result);
    
    // Log telemetry
    logFallbackEvents.resultSelected(
      result.source,
      result.confidence,
      !!result.caloriesPer100g
    );
    
    onProductSelected(legacyProduct);
    onOpenChange(false);
  }, [onProductSelected, onOpenChange]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setEditableTranscript('');
      setSearchResults([]);
      setShowResults(false);
      setVoiceState('idle');
    } else {
      // Clean up recognition when modal closes
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    }
  }, [open]);

  const canRecord = isBrowserSTTSupported();

  // MicButton component with breathing animation
  const MicButton = ({ state, onTap }: { state: 'idle' | 'listening' | 'processing', onTap: () => void }) => {
    const getButtonClass = () => {
      switch (state) {
        case 'listening':
          return 'bg-red-600 hover:bg-red-700 animate-pulse shadow-lg shadow-red-500/50';
        case 'processing':
          return 'bg-blue-600 hover:bg-blue-700';
        default:
          return 'bg-green-600 hover:bg-green-700';
      }
    };

    const getContent = () => {
      if (state === 'processing') {
        return <Loader2 className="h-8 w-8 animate-spin text-white" />;
      }
      return <Mic className={`h-8 w-8 text-white ${state === 'listening' ? 'animate-bounce' : ''}`} />;
    };

    return (
      <div className="relative">
        <Button
          onClick={onTap}
          disabled={state === 'processing'}
          size="lg"
          className={`rounded-full w-24 h-24 mb-4 transition-all duration-300 ${getButtonClass()}`}
        >
          {getContent()}
        </Button>
        {state === 'listening' && (
          <>
            <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping opacity-30"></div>
            <div className="absolute inset-2 rounded-full border-2 border-red-400 animate-pulse opacity-50"></div>
          </>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-screen h-screen max-w-none max-h-none p-0 m-0 bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 border-0 rounded-none [&>button]:hidden"
      >
        <div className="flex flex-col h-full pt-[env(safe-area-inset-top)]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-gradient-to-b from-black/30 to-transparent">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
            
            <h2 className="text-white text-xl font-semibold">Voice Search</h2>
            
            <div className="w-10" /> {/* Spacer */}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 space-y-6">
            {!showResults ? (
              <>
                {/* Voice Recording Card */}
                <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    {!canRecord ? (
                      <div className="text-white/70">
                        <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg mb-2">Voice search isn't supported</p>
                        <p className="text-sm mb-4">Try the native app or type instead</p>
                        <Button
                          onClick={() => setShowResults(false)}
                          variant="outline"
                          className="text-white border-white/30 hover:bg-white/10"
                        >
                          Use keyboard instead
                        </Button>
                      </div>
                    ) : voiceState === 'error' ? (
                      <div className="text-white/70">
                        <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg mb-2">Microphone access needed</p>
                        <p className="text-sm mb-4">Enable microphone in Settings → Safari → Microphone</p>
                        <Button
                          onClick={() => setVoiceState('idle')}
                          variant="outline"
                          className="text-white border-white/30 hover:bg-white/10"
                        >
                          Try again
                        </Button>
                      </div>
                    ) : (
                      <>
                        <MicButton state={voiceState} onTap={handleVoiceToggle} />
                        
                        <p className="text-white text-lg mb-2">
                          {voiceState === 'listening' ? 'Listening...' : 
                           voiceState === 'processing' ? 'Analyzing...' : 'Tap to speak'}
                        </p>
                        
                        {voiceState === 'idle' && (
                          <p className="text-white/70 text-sm mb-4">
                            Or try these suggestions:
                          </p>
                        )}

                        {/* Suggestion chips */}
                        {voiceState === 'idle' && (
                          <div className="flex flex-wrap gap-2 justify-center">
                            {suggestionChips.map((suggestion) => (
                              <Button
                                key={suggestion}
                                onClick={() => handleSuggestionClick(suggestion)}
                                variant="outline"
                                size="sm"
                                className="text-white border-white/30 hover:bg-white/10 text-xs"
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Transcript Editor */}
                {editableTranscript && (
                  <Card className="bg-green-900/20 border-green-400/30 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="flex items-center space-x-2 text-green-300">
                          You said: <span className="font-medium">"{editableTranscript}"</span>
                          <Edit3 className="h-3 w-3 cursor-pointer" />
                        </div>
                      </div>
                      
                      <Input
                        value={editableTranscript}
                        onChange={(e) => setEditableTranscript(e.target.value)}
                        className="bg-white/10 border-white/20 text-white mb-4"
                        placeholder="Edit the text here..."
                      />
                      
                      <Button
                        onClick={handleManualSearch}
                        disabled={!editableTranscript.trim() || voiceState === 'processing'}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {voiceState === 'processing' ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
                            Search Foods
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              // Search Results
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white text-lg font-medium">Search Results</h3>
                  <Button
                    onClick={() => setShowResults(false)}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </div>
                
                <SearchResultsList
                  results={searchResults}
                  onSelect={handleResultSelect}
                  isLoading={isSearching}
                  query={editableTranscript}
                />
              </div>
            )}
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