import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  query: string;
  status: 'pending' | 'success' | 'error';
  source?: string;
  confidence?: number;
  ingredientsCount?: number;
  perServingGrams?: number;
  error?: string;
  cached?: boolean;
}

const TEST_QUERIES = [
  'club sandwich',
  'club sandwich on wheat', 
  'yakisoba',
  'aloo gobi',
  'pollo con rajas'
];

export function DirectEnrichmentTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const testDirectEnrichment = async (query: string): Promise<TestResult> => {
    console.log(`[QA][DIRECT] Testing "${query}"`);
    
    try {
      const { data, error } = await supabase.functions.invoke('enrich-manual-food', {
        body: { query: query.trim(), locale: 'auto' }
      });

      if (error) {
        console.error(`[QA][DIRECT] Error for "${query}":`, error);
        return {
          query,
          status: 'error',
          error: error.message || 'Unknown error'
        };
      }

      if (!data) {
        return {
          query,
          status: 'error',
          error: 'No data returned'
        };
      }

      const result: TestResult = {
        query,
        status: 'success',
        source: data.source,
        confidence: data.confidence,
        ingredientsCount: data.ingredients?.length || 0,
        perServingGrams: data.perServing?.serving_grams
      };

      console.log(`[QA][DIRECT] Result for "${query}":`, result);
      return result;

    } catch (error) {
      console.error(`[QA][DIRECT] Exception for "${query}":`, error);
      return {
        query,
        status: 'error',
        error: error.message || 'Exception occurred'
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);
    
    // Enable feature flag
    try {
      localStorage.setItem('FEATURE_ENRICH_MANUAL_FOOD', 'true');
      console.log('[QA] Feature flag enabled for testing');
    } catch (e) {
      console.warn('[QA] Could not set feature flag:', e);
    }

    const allResults: TestResult[] = [];

    for (const query of TEST_QUERIES) {
      // First run
      const firstResult = await testDirectEnrichment(query);
      allResults.push({ ...firstResult, query: `${query} (1st)` });
      setResults([...allResults]);

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Second run (should be cached)
      const secondResult = await testDirectEnrichment(query);
      allResults.push({ ...secondResult, query: `${query} (2nd)`, cached: true });
      setResults([...allResults]);

      // Small delay between different queries
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
    console.log('[QA] All tests complete');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceColor = (source?: string) => {
    switch (source) {
      case 'NUTRITIONIX': return 'bg-blue-100 text-blue-800';
      case 'EDAMAM': return 'bg-purple-100 text-purple-800';
      case 'FDC': return 'bg-orange-100 text-orange-800';
      case 'ESTIMATED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Direct Enrichment Testing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runAllTests} 
          disabled={isRunning}
          variant="default"
        >
          {isRunning ? 'Running Tests...' : 'Run Direct Tests'}
        </Button>

        {results.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Results:</h4>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded text-sm">
                  <Badge className={getStatusColor(result.status)}>
                    {result.status}
                  </Badge>
                  <span className="font-mono">{result.query}</span>
                  {result.source && (
                    <Badge className={getSourceColor(result.source)}>
                      {result.source}
                    </Badge>
                  )}
                  {result.confidence !== undefined && (
                    <Badge variant="outline">
                      {Math.round(result.confidence * 100)}%
                    </Badge>
                  )}
                  {result.ingredientsCount !== undefined && (
                    <Badge variant="outline">
                      {result.ingredientsCount} ing
                    </Badge>
                  )}
                  {result.perServingGrams && (
                    <Badge variant="outline">
                      {result.perServingGrams}g
                    </Badge>
                  )}
                  {result.cached && (
                    <Badge variant="secondary">CACHED</Badge>
                  )}
                  {result.error && (
                    <span className="text-red-600 text-xs">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Expected:</strong></p>
          <p>• Club sandwich → NUTRITIONIX, &gt;5 ingredients</p>
          <p>• Others → EDAMAM/ESTIMATED with ingredients</p>
          <p>• Check console for [ENRICH][HIT] and [ENRICH][CACHE:hit] logs</p>
        </div>
      </CardContent>
    </Card>
  );
}