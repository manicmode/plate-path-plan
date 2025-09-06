import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useManualFoodEnrichment } from '@/hooks/useManualFoodEnrichment';
import { supabase } from '@/integrations/supabase/client';
import { DirectEnrichmentTest } from './DirectEnrichmentTest';

const TEST_QUERIES = [
  'club sandwich',
  'club sandwich on wheat', 
  'yakisoba',
  'aloo gobi',
  'pollo con rajas'
];

interface TestResult {
  query: string;
  status: 'pending' | 'success' | 'error';
  source?: string;
  ingredientsCount?: number;
  cached?: boolean;
  error?: string;
}

interface CacheEntry {
  query: string;
  source: string;
  ing_len: number;
  created_at: string;
}

export function EnrichmentQAComponent() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { enrich, loading } = useManualFoodEnrichment();

  const runSanityCheck = async () => {
    try {
      const { data, error } = await supabase
        .from('food_enrichment_cache')
        .select(`
          query,
          source,
          response_data,
          created_at
        `)
        .ilike('query', '%club%')
        .or('query.ilike.%yakis%,query.ilike.%aloo%,query.ilike.%pollo%')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const entries: CacheEntry[] = (data || []).map((entry: any) => ({
        query: entry.query,
        source: entry.source,
        ing_len: entry.response_data?.ingredients?.length || 0,
        created_at: new Date(entry.created_at).toLocaleString()
      }));

      setCacheEntries(entries);
    } catch (error) {
      console.error('DB sanity check failed:', error);
    }
  };

  const testSingleQuery = async (query: string, isRetry = false): Promise<TestResult> => {
    console.log(`[QA] Testing "${query}" (retry: ${isRetry})`);
    
    try {
      const result = await enrich(query);
      
      if (!result) {
        return {
          query,
          status: 'error',
          error: 'No enrichment result'
        };
      }

      const ingredientsCount = result.ingredients?.length || 0;
      
      return {
        query,
        status: 'success',
        source: result.source,
        ingredientsCount,
        cached: isRetry // Second run should be cached
      };
    } catch (error) {
      return {
        query,
        status: 'error',
        error: error.message
      };
    }
  };

  const runFullTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      // Run sanity check first
      await runSanityCheck();
      
      // Test each query twice (first for cache miss, second for cache hit)
      const allResults: TestResult[] = [];
      
      for (const query of TEST_QUERIES) {
        // First run (should be cache miss or hit)
        console.log(`[QA] First run for: ${query}`);
        const firstResult = await testSingleQuery(query, false);
        allResults.push({ ...firstResult, query: `${query} (1st)` });
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Second run (should be cache hit)
        console.log(`[QA] Second run for: ${query}`);
        const secondResult = await testSingleQuery(query, true);
        allResults.push({ ...secondResult, query: `${query} (2nd)` });
      }
      
      setTestResults(allResults);
    } catch (error) {
      console.error('QA test failed:', error);
    } finally {
      setIsRunning(false);
    }
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
    <div className="space-y-6">
      <DirectEnrichmentTest />
      
      <Card>
        <CardHeader>
          <CardTitle>Food Enrichment QA Testing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={runFullTest} 
              disabled={isRunning || loading}
              variant="default"
            >
              {isRunning ? 'Running Tests...' : 'Run Full QA Test'}
            </Button>
            <Button 
              onClick={runSanityCheck} 
              variant="outline"
            >
              DB Sanity Check
            </Button>
          </div>

          {testResults.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Test Results:</h4>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <Badge className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                    <span className="font-mono text-sm">{result.query}</span>
                    {result.source && (
                      <Badge className={getSourceColor(result.source)}>
                        {result.source}
                      </Badge>
                    )}
                    {result.ingredientsCount !== undefined && (
                      <Badge variant="outline">
                        {result.ingredientsCount} ingredients
                      </Badge>
                    )}
                    {result.cached && (
                      <Badge variant="secondary">CACHED</Badge>
                    )}
                    {result.error && (
                      <span className="text-red-600 text-sm">{result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {cacheEntries.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Cache Entries:</h4>
              <div className="space-y-1 text-sm font-mono">
                {cacheEntries.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <span className="truncate flex-1">{entry.query}</span>
                    <Badge className={getSourceColor(entry.source)}>
                      {entry.source}
                    </Badge>
                    <Badge variant="outline">
                      {entry.ing_len} ing
                    </Badge>
                    <span className="text-xs text-gray-500">{entry.created_at}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Expected behavior:</strong></p>
            <p>• Club sandwich queries → NUTRITIONIX source, &gt;5 ingredients</p>
            <p>• Other queries → EDAMAM/ESTIMATED, ingredients present</p>
            <p>• First run: [ENRICH][CACHE:miss] → [ENRICH][HIT]</p>
            <p>• Second run: [ENRICH][CACHE:hit]</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}