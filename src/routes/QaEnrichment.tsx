import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useManualFoodEnrichment } from '@/hooks/useManualFoodEnrichment';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    testEnrichment?: () => Promise<void>;
    clearQACache?: () => Promise<void>;
  }
}

interface QAResult {
  query: string;
  source: string | null;
  confidence: number | null;
  ingredients_len: number;
  kcal_100g: number | null;
  ms: number;
  cacheHit?: boolean;
  result: 'PASS' | 'FAIL' | 'PENDING';
}

const TEST_QUERIES = [
  'club sandwich',
  'club sandwich on wheat', 
  'yakisoba',
  'aloo gobi',
  'pollo con rajas'
];

const getPassCriteria = (query: string, source: string | null, ingredients_len: number) => {
  if (query.includes('club sandwich')) {
    return source === 'NUTRITIONIX' && ingredients_len >= 5;
  }
  if (query === 'yakisoba' || query === 'aloo gobi') {
    return ingredients_len >= 2;
  }
  if (query === 'pollo con rajas') {
    return ['EDAMAM', 'ESTIMATED', 'NUTRITIONIX'].includes(source || '') && ingredients_len >= 3;
  }
  return false;
};

export default function QaEnrichment() {
  const location = useLocation();
  const [directResults, setDirectResults] = useState<QAResult[]>([]);
  const [hookResults, setHookResults] = useState<QAResult[]>([]);
  const [isRunningDirect, setIsRunningDirect] = useState(false);
  const [isRunningHook, setIsRunningHook] = useState(false);
  const { enrich } = useManualFoodEnrichment();

  // Check if QA is enabled
  const enabled = new URLSearchParams(location.search).has('QA_ENRICH') || 
                  localStorage.getItem('QA_ENRICH') === '1';

  // Enable QA if query param is present
  useEffect(() => {
    if (new URLSearchParams(location.search).has('QA_ENRICH')) {
      localStorage.setItem('QA_ENRICH', '1');
      console.log('[QA] Enabled via query parameter');
    }
  }, [location.search]);

  // Expose console helper
  useEffect(() => {
    (window as any).testEnrichment = runDirectTests;
    
    // Re-enable the window.clearQACache() helper
    const QA_KEYS = ['club sandwich','club sandwich on wheat','yakisoba','aloo gobi','pollo con rajas'];
    
    (window as any).clearQACache = async () => {
      try {
        console.log('[QA] Clearing enrichment cache…');
        const { error } = await supabase.from('food_enrichment_cache').delete().in('query', QA_KEYS);
        if (error) {
          console.error('[QA] Clear cache failed', error);
        } else {
          console.log('[QA] Done.');
        }
      } catch (e) {
        console.error('[QA] Clear cache failed', e);
      }
    };
    
    return () => {
      delete (window as any).testEnrichment;
      delete (window as any).clearQACache;
    };
  }, []);

  if (!enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Oops! Page not found</h1>
          <p className="text-muted-foreground mb-4">The page you're looking for doesn't exist.</p>
          <Button onClick={() => window.location.href = '/'}>Return to Home</Button>
        </div>
      </div>
    );
  }

  const runDirectTests = async () => {
    setIsRunningDirect(true);
    setDirectResults([]);

    const testResults: QAResult[] = [];

    for (const query of TEST_QUERIES) {
      try {
        console.log(`[QA][DIRECT] Testing: "${query}"`);
        
        const start = performance.now();
        
        // Call edge function directly with cache bust for QA
        const { data, error } = await supabase.functions.invoke('enrich-manual-food?bust=1', {
          body: { query: query.trim(), locale: 'auto' }
        });
        
        const ms = Math.round(performance.now() - start);
        
        if (error) {
          console.error(`[QA][DIRECT] ${query} error:`, error);
          testResults.push({
            query,
            source: null,
            confidence: null,
            ingredients_len: 0,
            kcal_100g: null,
            ms,
            cacheHit: false,
            result: 'FAIL'
          });
          continue;
        }

        const enriched = data;
        const source = enriched?.source || null;
        const confidence = enriched?.confidence || null;
        const ingredients_len = enriched?.ingredients?.length || 0;
        const kcal_100g = enriched?.per100g?.calories || null;
        const cacheHit = (enriched as any)?.cached === true;
        
        const pass_fail = getPassCriteria(query, source, ingredients_len) ? 'PASS' : 'FAIL';
        
        testResults.push({
          query,
          source,
          confidence,
          ingredients_len,
          kcal_100g,
          ms,
          cacheHit,
          result: pass_fail
        });
        
        console.log(`[QA][DIRECT] ${query}: ${source}, ${ingredients_len} ingredients, ${pass_fail}, ${ms}ms, cached=${cacheHit}`);
        
      } catch (error) {
        console.error(`[QA][DIRECT] ${query} failed:`, error);
        testResults.push({
          query,
          source: null,
          confidence: null,
          ingredients_len: 0,
          kcal_100g: null,
          ms: 0,
          cacheHit: false,
          result: 'FAIL'
        });
      }
    }

    setDirectResults(testResults);
    setIsRunningDirect(false);
  };

  const runHookTests = async () => {
    setIsRunningHook(true);
    setHookResults([]);

    const testResults: QAResult[] = [];

    for (const query of TEST_QUERIES) {
      try {
        console.log(`[QA][HOOK] Testing: "${query}"`);
        
        const start = performance.now();
        const enriched = await enrich(query);
        const ms = Math.round(performance.now() - start);
        
        const source = enriched?.source || null;
        const confidence = enriched?.confidence || null;
        const ingredients_len = enriched?.ingredients?.length || 0;
        const kcal_100g = enriched?.per100g?.calories || null;
        const cacheHit = (enriched as any)?.cached === true;
        
        const pass_fail = getPassCriteria(query, source, ingredients_len) ? 'PASS' : 'FAIL';
        
        testResults.push({
          query,
          source,
          confidence,
          ingredients_len,
          kcal_100g,
          ms,
          cacheHit,
          result: pass_fail
        });
        
        console.log(`[QA][HOOK] ${query}: ${source}, ${ingredients_len} ingredients, ${pass_fail}, ${ms}ms, cached=${cacheHit}`);
        
      } catch (error) {
        console.error(`[QA][HOOK] ${query} failed:`, error);
        testResults.push({
          query,
          source: null,
          confidence: null,
          ingredients_len: 0,
          kcal_100g: null,
          ms: 0,
          cacheHit: false,
          result: 'FAIL'
        });
      }
    }

    setHookResults(testResults);
    setIsRunningHook(false);
  };

  const renderResultsTable = (results: QAResult[], title: string) => {
    const overallStatus = results.length > 0 && results.every(r => r.result === 'PASS') ? 'PASS' : 'FAIL';
    
    return (
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          {results.length > 0 && (
            <Badge 
              variant={overallStatus === 'PASS' ? 'default' : 'destructive'}
              className="text-sm"
            >
              {overallStatus === 'PASS' ? (
                <><CheckCircle className="w-4 h-4 mr-1" />Overall: PASS</>
              ) : (
                <><XCircle className="w-4 h-4 mr-1" />Overall: FAIL</>
              )}
            </Badge>
          )}
        </div>
        
        {results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-2 text-left">Query</th>
                  <th className="border border-border p-2 text-left">Source</th>
                  <th className="border border-border p-2 text-left">Confidence</th>
                  <th className="border border-border p-2 text-left">Ingredients</th>
                  <th className="border border-border p-2 text-left">Kcal/100g</th>
                  <th className="border border-border p-2 text-left">Time (ms)</th>
                  <th className="border border-border p-2 text-left">Cache</th>
                  <th className="border border-border p-2 text-left">Result</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="hover:bg-muted/50">
                    <td className="border border-border p-2 font-medium">{result.query}</td>
                    <td className="border border-border p-2">
                      {result.source ? (
                        <Badge variant="outline" className="text-xs">
                          {result.source}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="border border-border p-2">
                      {result.confidence ? `${Math.round(result.confidence * 100)}%` : '-'}
                    </td>
                    <td className="border border-border p-2">{result.ingredients_len}</td>
                    <td className="border border-border p-2">
                      {result.kcal_100g ? Math.round(result.kcal_100g) : '-'}
                    </td>
                    <td className="border border-border p-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {result.ms}ms
                      </span>
                    </td>
                    <td className="border border-border p-2">
                      {result.cacheHit ? (
                        <Badge variant="secondary" className="text-xs">HIT</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">MISS</Badge>
                      )}
                    </td>
                    <td className="border border-border p-2">
                      <Badge 
                        variant={result.result === 'PASS' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {result.result === 'PASS' ? (
                          <><CheckCircle className="w-3 h-3 mr-1" />PASS</>
                        ) : (
                          <><XCircle className="w-3 h-3 mr-1" />FAIL</>
                        )}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              QA Enrichment Testing
              <Badge variant="outline" className="text-sm">
                Dev Only - Production Hidden
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <Button 
                onClick={runDirectTests} 
                disabled={isRunningDirect}
                className="min-w-[150px]"
              >
                {isRunningDirect ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running Direct...
                  </>
                ) : (
                  'Run Direct Tests'
                )}
              </Button>

              <Button 
                onClick={runHookTests} 
                disabled={isRunningHook}
                variant="outline"
                className="min-w-[150px]"
              >
                {isRunningHook ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running Hook...
                  </>
                ) : (
                  'Run Hook Tests'
                )}
              </Button>
              
              <Button 
                onClick={() => window.clearQACache?.()}
                variant="secondary"
                className="min-w-[120px]"
              >
                Clear QA Cache
              </Button>
            </div>

            <div className="mb-4 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Test Queries & PASS Criteria:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Club sandwich variants → source = NUTRITIONIX and ingredients ≥ 5</li>
                <li>• Yakisoba / Aloo gobi → ingredients ≥ 2</li>
                <li>• Pollo con rajas → source ∈ (EDAMAM, ESTIMATED, NUTRITIONIX) and ingredients ≥ 3</li>
              </ul>
            </div>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold mb-2 text-blue-800">Access Instructions:</h4>
              <ul className="text-sm space-y-1 text-blue-700">
                <li>• Navigate to <code>/?QA_ENRICH=1</code> to enable QA mode</li>
                <li>• Then go to <code>/qa</code> to access this page</li>
                <li>• Console helper: <code>window.testEnrichment()</code></li>
                <li>• Clear access: <code>localStorage.removeItem('QA_ENRICH')</code></li>
              </ul>
            </div>

            {renderResultsTable(directResults, 'Direct Edge Function Tests')}
            {renderResultsTable(hookResults, 'React Hook Tests')}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}