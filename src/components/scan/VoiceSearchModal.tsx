import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { X, Mic, Search, Edit3, Loader2 } from 'lucide-react';
import { useProgressiveVoiceSTT } from '@/hooks/useProgressiveVoiceSTT';
import { searchFoodByName, CanonicalSearchResult, searchResultToLegacyProduct } from '@/lib/foodSearch';
import { SearchResultsList } from '../health-check/SearchResultsList';
import { logFallbackEvents } from '@/lib/healthScanTelemetry';

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
  const [editableTranscript, setEditableTranscript] = useState('');
  const [searchResults, setSearchResults] = useState<CanonicalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'error'>('idle');

  const { 
    isRecording, 
    isProcessing,
    transcript,
    startRecording, 
    stopRecording, 
    isBrowserSTTSupported,
    isServerSTTAvailable
  } = useProgressiveVoiceSTT({ allowOnScannerRoutes: true });

  // Suggestion chips for quick searches
  const suggestionChips = ['Greek yogurt', 'Chicken breast', 'Kind bar'];

  // Update editable transcript and auto-search when new transcript comes in
  useEffect(() => {
    if (transcript) {
      setEditableTranscript(transcript);
      
      // Auto-search if we have a confident transcript
      if (transcript.trim().length > 2) {
        const searchQuery = transcript.trim();
        performSearch(searchQuery);
      }
    }
  }, [transcript]);

  // Update voice state based on recording/processing
  useEffect(() => {
    if (isRecording) {
      setVoiceState('listening');
    } else if (isProcessing) {
      setVoiceState('processing');
    } else {
      setVoiceState('idle');
    }
  }, [isRecording, isProcessing]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setEditableTranscript('');
      setSearchResults([]);
      setShowResults(false);
    }
  }, [open]);

  const handleVoiceToggle = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      try {
        await startRecording();
      } catch (error) {
        setVoiceState('error');
      }
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setEditableTranscript(suggestion);
    await performSearch(suggestion);
  };

  const performSearch = async (query: string) => {
    if (!query) return;

    setIsSearching(true);
    
    try {
      console.log('🔍 [VoiceSearch] Searching for:', query);
      
      // Log telemetry
      logFallbackEvents.searchStarted('voice', query.length);
      const startTime = Date.now();
      
      const results = await searchFoodByName(query);
      const latency = Date.now() - startTime;
      
      setSearchResults(results);
      setShowResults(true);
      setVoiceState('idle');
      
      // Log telemetry
      logFallbackEvents.resultsReceived(
        results.length, 
        results.length > 0, 
        latency, 
        results[0]?.confidence
      );
      
    } catch (error) {
      console.error('❌ [VoiceSearch] Search failed:', error);
      setVoiceState('error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async () => {
    const query = editableTranscript.trim();
    await performSearch(query);
  };

  const handleResultSelect = async (result: CanonicalSearchResult) => {
    console.log('✅ [VoiceSearch] User selected:', result);
    
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
  };

  const canRecord = isBrowserSTTSupported() || isServerSTTAvailable();

  // MicButton component with animations
  const MicButton = ({ state, onTap }: { state: 'idle' | 'listening' | 'processing', onTap: () => void }) => {
    const getButtonClass = () => {
      switch (state) {
        case 'listening':
          return 'bg-red-600 hover:bg-red-700 animate-pulse';
        case 'processing':
          return 'bg-blue-600 hover:bg-blue-700';
        default:
          return 'bg-green-600 hover:bg-green-700';
      }
    };

    const getContent = () => {
      if (state === 'processing') {
        return <Loader2 className="h-8 w-8 animate-spin" />;
      }
      return <Mic className={`h-8 w-8 ${state === 'listening' ? 'animate-bounce' : ''}`} />;
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
          <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping opacity-20"></div>
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
                        onClick={handleSearch}
                        disabled={!editableTranscript.trim() || isSearching}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Searching...
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
              Powered by {isBrowserSTTSupported() ? 'browser' : 'server'} speech recognition
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};