import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Search, Mic, Package, Zap, CheckCircle, XCircle } from 'lucide-react';
import { searchFoodByName, CanonicalSearchResult, searchResultToLegacyProduct } from '@/lib/foodSearch';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const qaScenarios = [
  { query: 'vanilla almond granola', expectedBrand: 'Any', expectedType: 'granola' },
  { query: 'coca cola zero', expectedBrand: 'Coca-Cola', expectedType: 'soda' },
  { query: 'greek yogurt', expectedBrand: 'Any', expectedType: 'yogurt' },
  { query: 'trader joes almond butter', expectedBrand: 'Trader Joe\'s', expectedType: 'nut butter' },
  { query: 'cheerios cereal', expectedBrand: 'General Mills', expectedType: 'cereal' },
  { query: 'organic quinoa', expectedBrand: 'Any', expectedType: 'grain' }
];

export default function HealthScanFallbacks() {
  const [textQuery, setTextQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CanonicalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<CanonicalSearchResult | null>(null);
  const [legacyPayload, setLegacyPayload] = useState<any>(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [qaResults, setQaResults] = useState<Array<{
    query: string;
    passed: boolean;
    result?: CanonicalSearchResult;
    error?: string;
  }>>([]);
  
  const { 
    isRecording, 
    isProcessing, 
    startRecording, 
    stopRecording, 
    transcribedText,
    isVoiceRecordingSupported 
  } = useVoiceRecording();
  
  const navigate = useNavigate();

  React.useEffect(() => {
    if (transcribedText) {
      setVoiceTranscript(transcribedText);
    }
  }, [transcribedText]);

  const handleTextSearch = async () => {
    if (!textQuery.trim()) return;
    
    setIsSearching(true);
    setSelectedResult(null);
    setLegacyPayload(null);
    
    try {
      console.log('[TELEMETRY] fallback_search_started', { 
        type: 'manual',
        queryLength: textQuery.length 
      });
      
      const results = await searchFoodByName(textQuery);
      setSearchResults(results);
      
      console.log('[TELEMETRY] fallback_results_received', {
        count: results.length,
        hasResults: results.length > 0,
        topConfidence: results[0]?.confidence || 0
      });
      
    } catch (error) {
      console.error('Search failed:', error);
      toast.error(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultSelect = (result: CanonicalSearchResult) => {
    setSelectedResult(result);
    const legacy = searchResultToLegacyProduct(result);
    setLegacyPayload(legacy);
    
    console.log('[TELEMETRY] fallback_result_selected', {
      source: result.source,
      confidence: result.confidence,
      hasNutrition: !!result.caloriesPer100g
    });
  };

  const handleVoiceTest = async () => {
    if (!isFeatureEnabled('fallback_voice_enabled')) {
      toast.error('Voice fallback is disabled');
      return;
    }
    
    console.log('[TELEMETRY] fallback_voice_started', {
      supported: isVoiceRecordingSupported(),
      serverSTT: isFeatureEnabled('voice_stt_server_enabled')
    });
    
    if (isRecording) {
      const result = await stopRecording();
      if (result) {
        setVoiceTranscript(result);
        toast.success('Voice transcribed: ' + result);
      }
    } else {
      await startRecording();
    }
  };

  const runQATests = async () => {
    const results = [];
    
    for (const scenario of qaScenarios) {
      try {
        console.log(`🧪 Testing: "${scenario.query}"`);
        const searchResults = await searchFoodByName(scenario.query, { maxResults: 3 });
        
        if (searchResults.length === 0) {
          results.push({
            query: scenario.query,
            passed: false,
            error: 'No results found'
          });
          continue;
        }
        
        const topResult = searchResults[0];
        const passed = topResult.confidence && topResult.confidence > 0.3;
        
        results.push({
          query: scenario.query,
          passed,
          result: topResult,
          error: passed ? undefined : `Low confidence: ${topResult.confidence}`
        });
        
      } catch (error) {
        results.push({
          query: scenario.query,
          passed: false,
          error: error instanceof Error ? error.message : 'Search failed'
        });
      }
    }
    
    setQaResults(results);
    const passedCount = results.filter(r => r.passed).length;
    toast.success(`QA Complete: ${passedCount}/${results.length} scenarios passed`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Button
            onClick={() => navigate('/debug')}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Health Scan Fallbacks Debug</h1>
            <p className="text-gray-300">Test and debug manual text & voice search flows</p>
          </div>
        </div>

        <Tabs defaultValue="text-search" className="space-y-6">
          <TabsList className="bg-black/40 border-white/20">
            <TabsTrigger value="text-search">Text Search</TabsTrigger>
            <TabsTrigger value="voice-test">Voice Test</TabsTrigger>
            <TabsTrigger value="qa-scenarios">QA Scenarios</TabsTrigger>
          </TabsList>

          {/* Text Search Tab */}
          <TabsContent value="text-search" className="space-y-6">
            <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Search className="w-5 h-5 mr-2" />
                  Food Search Test
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-3">
                  <Input
                    value={textQuery}
                    onChange={(e) => setTextQuery(e.target.value)}
                    placeholder="Enter food name (e.g., 'vanilla almond granola')"
                    className="flex-1 bg-white/10 border-white/20 text-white"
                    onKeyPress={(e) => e.key === 'Enter' && handleTextSearch()}
                  />
                  <Button
                    onClick={handleTextSearch}
                    disabled={isSearching || !textQuery.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>

                {/* Feature Flag Status */}
                <div className="flex space-x-4 text-sm">
                  <Badge variant={isFeatureEnabled('fallback_text_enabled') ? 'default' : 'secondary'}>
                    Text: {isFeatureEnabled('fallback_text_enabled') ? 'ON' : 'OFF'}
                  </Badge>
                  <Badge variant={isFeatureEnabled('fallback_voice_enabled') ? 'default' : 'secondary'}>
                    Voice: {isFeatureEnabled('fallback_voice_enabled') ? 'ON' : 'OFF'}
                  </Badge>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-white font-medium">
                      Found {searchResults.length} results:
                    </h3>
                    {searchResults.map((result, index) => (
                      <div
                        key={`${result.source}-${result.id}-${index}`}
                        className={`p-3 rounded border cursor-pointer transition-all ${
                          selectedResult?.id === result.id
                            ? 'border-blue-400 bg-blue-900/20'
                            : 'border-gray-600 hover:border-gray-500 bg-white/5'
                        }`}
                        onClick={() => handleResultSelect(result)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-white font-medium">{result.name}</h4>
                            <div className="flex items-center space-x-3 text-sm text-gray-300">
                              {result.brand && <span>Brand: {result.brand}</span>}
                              {result.caloriesPer100g && <span>{result.caloriesPer100g} cal/100g</span>}
                              <Badge variant="outline" className="text-xs">
                                {result.source.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-mono text-sm">
                              {Math.round((result.confidence || 0) * 100)}%
                            </div>
                            <div className="w-20 bg-gray-700 rounded-full h-2 mt-1">
                              <div 
                                className="bg-blue-400 rounded-full h-2 transition-all"
                                style={{ width: `${Math.round((result.confidence || 0) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legacy Payload Display */}
            {legacyPayload && (
              <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Health Report Payload
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-green-300 text-xs bg-black/40 p-4 rounded overflow-auto">
                    {JSON.stringify(legacyPayload, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Voice Test Tab */}
          <TabsContent value="voice-test" className="space-y-6">
            <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Mic className="w-5 h-5 mr-2" />
                  Voice Recognition Test
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={handleVoiceTest}
                    disabled={isProcessing || !isVoiceRecordingSupported()}
                    variant={isRecording ? "destructive" : "default"}
                    className={isRecording ? 'animate-pulse' : ''}
                  >
                    <Mic className={`w-4 h-4 mr-2 ${isRecording ? 'animate-bounce' : ''}`} />
                    {isRecording ? 'Stop Recording' : isProcessing ? 'Processing...' : 'Start Recording'}
                  </Button>
                  
                  <div className="text-sm text-gray-300">
                    STT Method: {isFeatureEnabled('voice_stt_server_enabled') ? 'Server' : 'Browser'}
                  </div>
                </div>

                {voiceTranscript && (
                  <div className="p-4 bg-green-900/20 border border-green-400/30 rounded">
                    <h4 className="text-green-300 font-medium mb-2">Transcript:</h4>
                    <p className="text-white">{voiceTranscript}</p>
                    <Button
                      onClick={() => {
                        setTextQuery(voiceTranscript);
                        handleTextSearch();
                      }}
                      className="mt-3 bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      Search This Transcript
                    </Button>
                  </div>
                )}

                <div className="text-sm text-gray-400">
                  <p>Supported: {isVoiceRecordingSupported() ? '✅' : '❌'}</p>
                  <p>Secure Context: {window.isSecureContext ? '✅' : '❌'}</p>
                  <p>MediaRecorder: {window.MediaRecorder ? '✅' : '❌'}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* QA Scenarios Tab */}
          <TabsContent value="qa-scenarios" className="space-y-6">
            <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  QA Test Scenarios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={runQATests}
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={isSearching}
                >
                  Run All QA Scenarios
                </Button>

                {qaResults.length > 0 && (
                  <div className="space-y-3">
                    {qaResults.map((result, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded border ${
                          result.passed 
                            ? 'border-green-400/30 bg-green-900/20' 
                            : 'border-red-400/30 bg-red-900/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              {result.passed ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                              <span className="text-white font-medium">"{result.query}"</span>
                            </div>
                            {result.result && (
                              <div className="text-sm text-gray-300 ml-6">
                                Found: {result.result.name}
                                {result.result.brand && ` (${result.result.brand})`}
                              </div>
                            )}
                            {result.error && (
                              <div className="text-sm text-red-300 ml-6">
                                Error: {result.error}
                              </div>
                            )}
                          </div>
                          {result.result?.confidence && (
                            <div className="text-right">
                              <div className="text-white font-mono text-sm">
                                {Math.round(result.result.confidence * 100)}%
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}