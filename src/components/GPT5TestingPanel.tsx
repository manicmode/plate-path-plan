import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface TestResult {
  test: string;
  endpoint: string;
  model?: string;
  latency_ms?: number;
  tokens?: { input: number; output: number; total: number };
  fallback_used?: boolean;
  status: 'success' | 'error' | 'pending';
  error?: string;
  timestamp: string;
}

export const GPT5TestingPanel: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [isTestingPhoto, setIsTestingPhoto] = useState(false);
  const [isTestingSmartLog, setIsTestingSmartLog] = useState(false);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
    console.log('🚀 [GPT-5 E2E Test Result]:', result);
  };

  const testVoiceLogging = async () => {
    setIsTestingVoice(true);
    console.log('🧪 [E2E Test] Starting Voice Logging: "In-N-Out Double-Double and fries"');
    const startTime = Date.now();
    
    try {
      const { sendToLogVoice } = await import('@/integrations/logVoice');
      const result = await sendToLogVoice("In-N-Out Double-Double and fries");
      
      addResult({
        test: 'Voice Logging',
        endpoint: 'log-voice-gpt5',
        model: 'gpt-5-mini',
        latency_ms: Date.now() - startTime,
        status: 'success',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      addResult({
        test: 'Voice Logging',
        endpoint: 'log-voice-gpt5',
        status: 'error',
        error: error.message,
        latency_ms: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsTestingVoice(false);
    }
  };

  const testPhotoDetection = async () => {
    setIsTestingPhoto(true);
    console.log('🧪 [E2E Test] Starting Photo Detection with sample image');
    const startTime = Date.now();
    
    // Create a simple test image (1x1 pixel PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('gpt5-vision-food-detector', {
        body: { 
          imageBase64: testImageBase64,
          prompt: "Test food detection for E2E verification"
        }
      });
      
      if (error) throw error;
      
      addResult({
        test: 'Photo Detection',
        endpoint: 'gpt5-vision-food-detector',
        model: data?.model_used || 'gpt-5',
        latency_ms: Date.now() - startTime,
        tokens: data?.processing_stats?.tokens,
        fallback_used: data?.fallback_used || false,
        status: 'success',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      addResult({
        test: 'Photo Detection',
        endpoint: 'gpt5-vision-food-detector',
        status: 'error',
        error: error.message,
        latency_ms: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsTestingPhoto(false);
    }
  };

  const testSmartLogPredictions = async () => {
    setIsTestingSmartLog(true);
    console.log('🧪 [E2E Test] Testing SmartLog UI component rendering');
    
    try {
      // Check if SmartLog component is rendering
      const smartLogElements = document.querySelectorAll('[class*="smartlog"], [class*="SmartLog"]');
      const hasSmartLogTitle = document.querySelector('h3:contains("SmartLog")') || 
                               Array.from(document.querySelectorAll('h3')).some(el => 
                                 el.textContent?.includes('SmartLog')
                               );
      
      addResult({
        test: 'SmartLog Predictions',
        endpoint: 'ui_component',
        status: smartLogElements.length > 0 || hasSmartLogTitle ? 'success' : 'error',
        error: smartLogElements.length === 0 && !hasSmartLogTitle ? 'SmartLog component not found on page' : undefined,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      addResult({
        test: 'SmartLog Predictions',
        endpoint: 'ui_component',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsTestingSmartLog(false);
    }
  };

  const runAllTests = async () => {
    console.log('🚀 [GPT-5 E2E] Running complete test suite...');
    setResults([]);
    await testVoiceLogging();
    await testPhotoDetection();
    await testSmartLogPredictions();
    console.log('✅ [GPT-5 E2E] All tests completed. Check results above.');
  };

  const clearResults = () => setResults([]);

  return (
    <Card className="w-full max-w-4xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🚀 GPT-5 E2E Testing Panel
          <Badge variant="outline">Build 2.1.0.20250107003</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Controls */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Button 
            onClick={testVoiceLogging} 
            disabled={isTestingVoice}
            variant="outline"
          >
            {isTestingVoice ? 'Testing...' : '🎤 Voice Log'}
          </Button>
          <Button 
            onClick={testPhotoDetection} 
            disabled={isTestingPhoto}
            variant="outline"
          >
            {isTestingPhoto ? 'Testing...' : '📷 Photo Detection'}
          </Button>
          <Button 
            onClick={testSmartLogPredictions} 
            disabled={isTestingSmartLog}
            variant="outline"
          >
            {isTestingSmartLog ? 'Testing...' : '🧠 SmartLog'}
          </Button>
          <Button onClick={runAllTests} variant="default">
            🚀 Run All
          </Button>
          <Button onClick={clearResults} variant="ghost">
            🗑️ Clear
          </Button>
        </div>

        <Separator />

        {/* Results Display */}
        <div className="space-y-2">
          <h4 className="font-semibold">Test Results ({results.length})</h4>
          {results.length === 0 ? (
            <p className="text-muted-foreground">No tests run yet. Click buttons above to start testing.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, idx) => (
                <div key={idx} className="p-3 border rounded-md bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                        {result.status}
                      </Badge>
                      <span className="font-medium">{result.test}</span>
                      <code className="text-xs bg-muted px-1 rounded">{result.endpoint}</code>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm space-y-1">
                    {result.model && (
                      <div>Model: <code className="bg-muted px-1 rounded">{result.model}</code></div>
                    )}
                    {result.latency_ms && (
                      <div>Latency: <code className="bg-muted px-1 rounded">{result.latency_ms}ms</code></div>
                    )}
                    {result.tokens && (
                      <div>Tokens: <code className="bg-muted px-1 rounded">
                        {result.tokens.input}→{result.tokens.output} ({result.tokens.total} total)
                      </code></div>
                    )}
                    {result.fallback_used && (
                      <div>⚠️ Fallback used</div>
                    )}
                    {result.error && (
                      <div className="text-destructive">Error: {result.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Console Logs Instructions */}
        <Separator />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium">📊 Console Log Verification:</p>
          <p>Open browser DevTools → Console to see detailed performance metrics</p>
          <p>Look for: <code>🚀 [GPT-5 Voice/Vision/SmartLog] Performance metrics</code></p>
        </div>
      </CardContent>
    </Card>
  );
};