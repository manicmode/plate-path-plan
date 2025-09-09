import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Edit3, Search, AlertTriangle, Info, Plus, Tag, Hash } from 'lucide-react';
import { useProgressiveVoiceSTT } from '@/hooks/useProgressiveVoiceSTT';
import { logFallbackEvents } from '@/lib/healthScanTelemetry';
import { searchFoodByName, CanonicalSearchResult, searchResultToLegacyProduct } from '@/lib/foodSearch';
import { SearchResultsList } from './SearchResultsList';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import { handleSearchPick } from '@/shared/search-to-analysis';

type ModalState = 'scanner' | 'loading' | 'report' | 'fallback' | 'no_detection' | 'not_found' | 'candidates' | 'meal_detection' | 'meal_confirm';

interface ImprovedManualEntryProps {
  onProductSelected: (product: any) => void;
  onBack: () => void;
  // Optional props for unified analysis pipeline
  setAnalysisData?: (data: any) => void;
  setStep?: (step: string | ModalState) => void;
  // Optional initial query (e.g., from voice)
  initialQuery?: string;
}

export const ImprovedManualEntry: React.FC<ImprovedManualEntryProps> = ({
  onProductSelected,
  onBack,
  setAnalysisData,
  setStep,
  initialQuery
}) => {
  const [textQuery, setTextQuery] = useState(initialQuery || '');
  const [searchResults, setSearchResults] = useState<CanonicalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [netError, setNetError] = useState<{ message: string; code?: string } | null>(null);
  const [noResults, setNoResults] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [showVoiceEditor, setShowVoiceEditor] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
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
  
  const debouncedQuery = useDebounce(textQuery, 300);
  
  // Check for URL parameter prefill on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const manualParam = urlParams.get('manual');
    if (manualParam && !textQuery) {
      setTextQuery(decodeURIComponent(manualParam));
      // Clear the parameter from URL
      urlParams.delete('manual');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState(null, '', newUrl);
    }
  }, []);
  
  const placeholders = [
    "cheese burger",
    "greek yogurt", 
    "Trader Joe's chips",
    "coke zero"
  ];

  // Rotate placeholders every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('manual_entry_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (e) {
        console.warn('Failed to parse recent searches');
      }
    }
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Auto-search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      handleSearch(debouncedQuery);
    } else {
      setSearchResults([]);
      setNetError(null);
      setNoResults(false);
    }
  }, [debouncedQuery]);

  // Auto-search for initial query (e.g., from voice)
  useEffect(() => {
    if (initialQuery && initialQuery.trim().length >= 2) {
      handleSearch(initialQuery);
    }
  }, []); // Only run on mount

  // Handle voice transcription result
  useEffect(() => {
    if (transcript) {
      setVoiceTranscript(transcript);
      setShowVoiceEditor(true);
    }
  }, [transcript]);

  const saveRecentSearch = (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    
    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('manual_entry_recent_searches', JSON.stringify(updated));
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!isFeatureEnabled('fallback_text_enabled')) {
      setNetError({ message: 'Text search is currently disabled' });
      return;
    }
    
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setNetError(null);
    setNoResults(false);
    
    try {
      console.info('[TELEMETRY] manual_search: start', { q: trimmed, len: trimmed.length });
      
      // Log telemetry
      logFallbackEvents.searchStarted('text', trimmed.length);
      const startTime = Date.now();
      
      const results = await searchFoodByName(trimmed, { 
        maxResults: 10, 
        bypassGuard: true 
      });
      const ms = Date.now() - startTime;
      
      // Filter and ensure ≥3 suggestions when providers return data
      const filtered = results.filter(r => r.name.toLowerCase() !== trimmed.toLowerCase());
      
      console.info('[HEALTH][SEARCH] results', { q: trimmed, count: filtered.length, ms });
      
      setSearchResults(filtered);
      saveRecentSearch(trimmed);
      
      // Log telemetry
      logFallbackEvents.resultsReceived(
        filtered.length, 
        filtered.length > 0, 
        ms, 
        filtered[0]?.confidence
      );
      
      if (filtered.length === 0) {
        setNoResults(true);
      }
    } catch (error) {
      const ms = Date.now() - Date.now();
      const errorCode = (error as any)?.code || 'unknown';
      
      console.error('❌ [ImprovedManualEntry] Search failed:', error);
      console.info('[TELEMETRY] manual_search: error', { code: errorCode, ms });
      
      let errorMessage = 'Search service unavailable. Please try again in a moment.';
      
      if (errorCode === '401' || errorCode === '404') {
        errorMessage += ' (edge function not reachable)';
      }
      
      setNetError({ 
        message: errorMessage,
        code: errorCode 
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleResultSelect = async (result: CanonicalSearchResult) => {
    // Determine source based on context - voice if we have initialQuery, manual otherwise
    const source = initialQuery ? 'voice' : 'manual';
    console.log('[PARITY][TAP]', { source, itemName: result?.name });
    console.log('[PARITY][HANDLER]', { source, usingHandler: false });
    
    // Log diagnostic for search selection
    console.info('[HEALTH][SEARCH] open_report', { id: result.id, name: result.name });
    
    // Log telemetry
    logFallbackEvents.resultSelected(
      result.source,
      result.confidence,
      !!result.caloriesPer100g
    );
    
    // Always call onProductSelected to let parent handle modal opening
    const legacyProduct = searchResultToLegacyProduct(result);
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

  const generateQueryChips = (query: string) => {
    const chips = [];
    const tokens = query.toLowerCase().split(' ').filter(t => t.length > 1);
    
    // Cheeseburger suggestion for "cheese burger" pattern
    if (tokens.includes('cheese') && tokens.includes('burger') && !query.toLowerCase().includes('cheeseburger')) {
      chips.push({ label: 'Try "cheeseburger"', action: 'cheeseburger' });
    }
    
    if (tokens.length >= 2) {
      // Brand guesses
      const brands = ['trader joe\'s', 'organic', 'whole foods', 'kirkland'];
      const foundBrands = brands.filter(brand => !query.toLowerCase().includes(brand));
      if (foundBrands.length > 0) {
        chips.push({ label: `Add brand`, action: `${foundBrands[0]} ${query}` });
      }
      
      // Category hints
      const categories = { burger: 'beef', yogurt: 'greek', chips: 'kettle', soda: 'diet' };
      for (const [key, modifier] of Object.entries(categories)) {
        if (tokens.some(t => t.includes(key)) && !query.includes(modifier)) {
          chips.push({ label: `Add "${modifier}"`, action: `${modifier} ${query}` });
        }
      }
      
      // Plural/singular toggle
      const lastToken = tokens[tokens.length - 1];
      if (lastToken.endsWith('s') && lastToken.length > 3) {
        const singular = lastToken.slice(0, -1);
        chips.push({ label: 'Try singular', action: query.replace(lastToken, singular) });
      } else if (!lastToken.endsWith('s')) {
        chips.push({ label: 'Try plural', action: query.replace(lastToken, lastToken + 's') });
      }
    }
    
    return chips.slice(0, 4);
  };

  // Add temporary layout instrumentation
  useEffect(() => {
    console.warn('[LAYOUT][manual-entry] scrollWidth vs innerWidth', 
      document.scrollingElement?.scrollWidth, window.innerWidth);
  }, []);

  const queryChips = textQuery.trim().length >= 4 ? generateQueryChips(textQuery) : [];

  return (
    <div 
      className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-xl w-full max-w-full overflow-x-hidden"
      style={{ 
        height: "100dvh"
      }}
    >
      <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-rose-600/15 via-zinc-900/60 to-zinc-900/80 w-full max-w-full overflow-x-hidden">
        <div className="flex-1 flex flex-col min-h-0 w-full max-w-full overflow-x-hidden">
          {/* Header */}
          <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0 safe-top"
            style={{ paddingTop: `max(1rem, env(safe-area-inset-top))` }}>
            <Button
              onClick={onBack}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <h1 className="text-xl font-semibold text-white">Search Foods</h1>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Info className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 bg-zinc-800 border-zinc-700 z-[100]" align="end">
                <div className="text-sm text-zinc-300">
                  <p className="font-medium text-white mb-2">Search Tips</p>
                  <p>Add a brand name for better results, e.g., "Trader Joe's almond granola"</p>
                </div>
              </PopoverContent>
            </Popover>
          </header>

          {/* Content */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0 w-full max-w-full overflow-x-hidden"
            style={{ 
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain"
            }}>
            {/* Search Bar */}
            <div className="space-y-3">
              <div className="flex space-x-3">
                <Input
                  value={textQuery}
                  onChange={(e) => setTextQuery(e.target.value)}
                  placeholder={placeholders[placeholderIndex]}
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder-gray-400 text-base py-3 rounded-xl"
                />
                
                {isFeatureEnabled('fallback_voice_enabled') && (isBrowserSTTSupported() || isServerSTTAvailable()) && (
                  <Button
                    onClick={handleVoiceRecording}
                    variant={isRecording ? "destructive" : "default"}
                    size="icon"
                    className={`${
                      isRecording 
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                        : 'bg-green-600 hover:bg-green-700'
                    } w-12 h-12 rounded-xl`}
                    disabled={isProcessing}
                  >
                    <Edit3 className={`w-5 h-5 ${isRecording ? 'animate-bounce' : ''}`} />
                  </Button>
                )}
              </div>
              
              {/* Query Enhancement Chips */}
              {queryChips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {queryChips.map((chip, index) => (
                    <Button
                      key={index}
                      onClick={() => setTextQuery(chip.action)}
                      variant="outline"
                      size="sm"
                      className="text-xs border-white/20 text-gray-300 hover:bg-white/10 hover:text-white rounded-full"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {chip.label}
                    </Button>
                  ))}
                </div>
              )}
              
              {(isSearching || isProcessing) && (
                <div className="flex items-center justify-center text-gray-300">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-400 mr-2"></div>
                  {isProcessing ? 'Processing voice...' : 'Searching OpenFoodFacts...'}
                </div>
              )}
            </div>

            {/* Recent Searches */}
            {textQuery.trim().length === 0 && recentSearches.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                    <Search className="w-4 h-4 mr-2" />
                    Recent Searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((search, index) => (
                      <Button
                        key={index}
                        onClick={() => setTextQuery(search)}
                        variant="outline"
                        size="sm"
                        className="text-xs border-white/20 text-gray-300 hover:bg-white/10 hover:text-white rounded-full"
                      >
                        {search}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Voice Transcript Editor */}
            {showVoiceEditor && voiceTranscript && (
              <Card className="bg-green-900/20 border-green-400/30">
                <CardContent className="p-4">
                  <h3 className="text-base font-medium text-green-300 mb-3">
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

            {/* Network Error */}
            {netError && (
              <Card className="bg-red-900/20 border-red-400/30">
                <CardContent className="p-4 flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-300 font-medium">Search service unavailable</p>
                    <p className="text-red-400 text-sm mt-1">Please try again in a moment.</p>
                    {(netError.code === '401' || netError.code === '404') && (
                      <p className="text-red-500 text-xs mt-1">(edge function not reachable)</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search Results or Loading */}
            {textQuery.trim().length >= 2 && (
              <div className="w-full max-w-full overflow-x-hidden">
                <SearchResultsList
                  results={searchResults}
                  onSelect={handleResultSelect}
                  isLoading={isSearching}
                  query={textQuery}
                />
              </div>
            )}

            {/* No Results State */}
            {noResults && textQuery.trim().length >= 2 && !isSearching && (
              <Card className="bg-amber-900/20 border-amber-400/30">
                <CardContent className="p-4 text-center">
                  <div className="mb-4">
                    <Search className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                     <h3 className="text-base font-medium text-amber-300 mb-2">No Close Matches</h3>
                     <p className="text-amber-200 text-sm">Try a more specific term or add a brand name.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => setTextQuery(textQuery + ' organic')}
                      variant="outline"
                      size="sm"
                      className="text-xs border-amber-400/30 text-amber-300 hover:bg-amber-400/10"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      Add brand
                    </Button>
                    <Button
                      onClick={() => setTextQuery(textQuery + ' snack')}
                      variant="outline"
                      size="sm"
                      className="text-xs border-amber-400/30 text-amber-300 hover:bg-amber-400/10"
                    >
                      <Hash className="w-3 h-3 mr-1" />
                      Add type
                    </Button>
                    <Button
                      onClick={() => {
                        const singular = textQuery.endsWith('s') ? textQuery.slice(0, -1) : textQuery + 's';
                        setTextQuery(singular);
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs border-amber-400/30 text-amber-300 hover:bg-amber-400/10 col-span-2"
                    >
                      Try {textQuery.endsWith('s') ? 'singular' : 'plural'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};