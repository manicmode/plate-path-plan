import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Keyboard, Mic, Search, AlertTriangle } from 'lucide-react';
import { useProgressiveVoiceSTT } from '@/hooks/useProgressiveVoiceSTT';
import { logFallbackEvents } from '@/lib/healthScanTelemetry';
import { useViewportUnitsFix } from '@/hooks/useViewportUnitsFix';
import { searchFoodByName, CanonicalSearchResult, searchResultToLegacyProduct } from '@/lib/foodSearch';
import { SearchResultsList } from './SearchResultsList';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';

interface ImprovedManualEntryProps {
  onProductSelected: (product: any) => void;
  onBack: () => void;
}

export const ImprovedManualEntry: React.FC<ImprovedManualEntryProps> = ({
  onProductSelected,
  onBack
}) => {
  const [textQuery, setTextQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CanonicalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [showVoiceEditor, setShowVoiceEditor] = useState(false);
  
  const { 
    isRecording, 
    isProcessing,
    transcript,
    setTranscript,
    startRecording, 
    stopRecording, 
    isBrowserSTTSupported,
    isServerSTTAvailable,
    sttMethod
  } = useProgressiveVoiceSTT();
  
  const debouncedQuery = useDebounce(textQuery, 300);
  
  // Fix viewport units for iOS
  useViewportUnitsFix();

  // Auto-search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      handleSearch(debouncedQuery);
    } else {
      setSearchResults([]);
      setSearchError(null);
    }
  }, [debouncedQuery]);

  // Handle voice transcription result
  useEffect(() => {
    if (transcript) {
      setVoiceTranscript(transcript);
      setShowVoiceEditor(true);
    }
  }, [transcript]);

  const handleSearch = useCallback(async (query: string) => {
    if (!isFeatureEnabled('fallback_text_enabled')) {
      setSearchError('Text search is currently disabled');
      return;
    }
    
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    
    try {
      console.log('🔍 [ImprovedManualEntry] Searching for:', trimmed);
      
      // Log telemetry
      logFallbackEvents.searchStarted('text', trimmed.length);
      const startTime = Date.now();
      
      const results = await searchFoodByName(trimmed);
      const latency = Date.now() - startTime;
      
      setSearchResults(results);
      
      // Log telemetry
      logFallbackEvents.resultsReceived(
        results.length, 
        results.length > 0, 
        latency, 
        results[0]?.confidence
      );
      
      if (results.length === 0) {
        setSearchError('No matches found. Try adding a brand name or checking spelling.');
      }
    } catch (error) {
      console.error('❌ [ImprovedManualEntry] Search failed:', error);
      setSearchError(error instanceof Error ? error.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleResultSelect = async (result: CanonicalSearchResult) => {
    console.log('✅ [ImprovedManualEntry] User selected:', result);
    
    // Transform to legacy product format
    const legacyProduct = searchResultToLegacyProduct(result);
    
    // Log telemetry
    logFallbackEvents.resultSelected(
      result.source,
      result.confidence,
      !!result.caloriesPer100g
    );
    
    onProductSelected(legacyProduct);
  };

  const handleVoiceRecording = async () => {
    if (!isFeatureEnabled('fallback_voice_enabled')) {
      toast.error('Voice search is currently disabled');
      return;
    }
    
    console.log('[TELEMETRY] fallback_voice_started', {
      supported: isBrowserSTTSupported(),
      serverAvailable: isServerSTTAvailable(),
      userAgent: navigator.userAgent.substring(0, 50)
    });
    
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleVoiceSubmit = () => {
    if (voiceTranscript.trim()) {
      setTextQuery(voiceTranscript.trim());
      setShowVoiceEditor(false);
      handleSearch(voiceTranscript.trim());
    }
  };

  const quickSuggestions = [
    'Greek yogurt', 'Chicken breast', 'Quinoa', 'Salmon',
    'Avocado', 'Sweet potato', 'Almonds', 'Broccoli'
  ];

  return (
    <div
      className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900"
      style={{ 
        height: "min(100dvh, 100vh)",
        paddingBottom: "env(safe-area-inset-bottom)"
      }}
    >
      <div
        className="grid h-full"
        style={{ 
          gridTemplateRows: "auto 1fr auto",
          paddingTop: "max(env(safe-area-inset-top), 12px)"
        }}
      >
        {/* Header */}
        <header className="p-6 flex-shrink-0">
          <div className="flex items-center space-x-4 mb-6">
            <Button
              onClick={onBack}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Search Foods</h1>
              <p className="text-gray-300">Type or speak to find products</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main 
          className="overflow-y-auto min-h-0 px-6 space-y-6 flex-1"
          style={{ 
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain"
          }}
        >
          {/* Search Input */}
          <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex space-x-3">
                <div className="flex-1">
                  <Input
                    value={textQuery}
                    onChange={(e) => setTextQuery(e.target.value)}
                    placeholder="e.g., 'organic quinoa chips' or '123456789012'"
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400 text-lg py-3"
                  />
                </div>
                
                {isFeatureEnabled('fallback_voice_enabled') && (isBrowserSTTSupported() || isServerSTTAvailable()) && (
                  <Button
                    onClick={handleVoiceRecording}
                    variant={isRecording ? "destructive" : "default"}
                    size="icon"
                    className={`${
                      isRecording 
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                        : 'bg-green-600 hover:bg-green-700'
                    } w-12 h-12`}
                    disabled={isProcessing}
                  >
                    <Mic className={`w-5 h-5 ${isRecording ? 'animate-bounce' : ''}`} />
                  </Button>
                )}
              </div>
              
              {(isSearching || isProcessing) && (
                <div className="flex items-center justify-center mt-4 text-gray-300">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                  {isProcessing ? 'Processing voice...' : 'Searching...'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voice Transcript Editor */}
          {showVoiceEditor && voiceTranscript && (
            <Card className="bg-green-900/20 border-green-400/30 backdrop-blur-sm">
              <CardContent className="p-4">
                <h3 className="text-lg font-medium text-green-300 mb-3">
                  Voice Transcript - Edit if needed:
                </h3>
                <Input
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  className="bg-white/10 border-white/20 text-white mb-3"
                />
                <div className="flex space-x-3">
                  <Button
                    onClick={handleVoiceSubmit}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search This
                  </Button>
                  <Button
                    onClick={() => setShowVoiceEditor(false)}
                    variant="outline"
                    className="border-gray-600"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search Error */}
          {searchError && (
            <Card className="bg-red-900/20 border-red-400/30 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-300">{searchError}</p>
              </CardContent>
            </Card>
          )}

          {/* Search Results */}
          {(textQuery.trim().length >= 2 || searchResults.length > 0) && (
            <SearchResultsList
              results={searchResults}
              onSelect={handleResultSelect}
              isLoading={isSearching}
              query={textQuery}
            />
          )}

          {/* Quick Suggestions */}
          {textQuery.trim().length === 0 && searchResults.length === 0 && (
            <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
              <CardContent className="p-4">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                  <Keyboard className="w-5 h-5 mr-2 text-blue-400" />
                  Quick Suggestions
                </h3>
                
                <div className="grid grid-cols-2 gap-2">
                  {quickSuggestions.map((food) => (
                    <Button
                      key={food}
                      onClick={() => setTextQuery(food)}
                      variant="outline"
                      size="sm"
                      className="justify-start text-left border-gray-600 text-gray-300 hover:bg-gray-600/20 hover:text-white"
                    >
                      {food}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </main>

        {/* Footer */}
        <footer 
          className="flex-shrink-0 pt-3 bg-gradient-to-t from-black/40 to-transparent px-6"
          style={{ 
            paddingBottom: "max(env(safe-area-inset-bottom), 16px)"
          }}
        >
          <p className="text-center text-gray-400 text-sm">
            Search powered by OpenFoodFacts database
          </p>
        </footer>
      </div>
    </div>
  );
};