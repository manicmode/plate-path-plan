import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { X, Mic, Search, Edit3 } from 'lucide-react';
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

  const { 
    isRecording, 
    isProcessing,
    transcript,
    startRecording, 
    stopRecording, 
    isBrowserSTTSupported,
    isServerSTTAvailable
  } = useProgressiveVoiceSTT();

  // Update editable transcript when new transcript comes in
  useEffect(() => {
    if (transcript) {
      setEditableTranscript(transcript);
    }
  }, [transcript]);

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
      await startRecording();
    }
  };

  const handleSearch = async () => {
    const query = editableTranscript.trim();
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
      
      // Log telemetry
      logFallbackEvents.resultsReceived(
        results.length, 
        results.length > 0, 
        latency, 
        results[0]?.confidence
      );
      
    } catch (error) {
      console.error('❌ [VoiceSearch] Search failed:', error);
    } finally {
      setIsSearching(false);
    }
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
                        <p className="text-lg mb-2">Voice not supported</p>
                        <p className="text-sm">This device doesn't support voice input</p>
                      </div>
                    ) : (
                      <>
                        <Button
                          onClick={handleVoiceToggle}
                          disabled={isProcessing}
                          size="lg"
                          className={`rounded-full w-24 h-24 mb-4 ${
                            isRecording 
                              ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          <Mic className={`h-8 w-8 ${isRecording ? 'animate-bounce' : ''}`} />
                        </Button>
                        
                        <p className="text-white text-lg mb-2">
                          {isRecording ? 'Listening...' : 'Tap to speak'}
                        </p>
                        
                        {isProcessing && (
                          <p className="text-blue-300 text-sm">Processing audio...</p>
                        )}
                        
                        <p className="text-white/70 text-sm">
                          Say something like "Greek yogurt" or "Chicken breast"
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Transcript Editor */}
                {editableTranscript && (
                  <Card className="bg-green-900/20 border-green-400/30 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Edit3 className="h-4 w-4 text-green-400" />
                        <h3 className="text-green-300 font-medium">Edit transcript if needed:</h3>
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
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
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
            <p className="text-center text-gray-400 text-sm">
              Powered by {isBrowserSTTSupported() ? 'browser' : 'server'} speech recognition
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};