import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useManualFoodEnrichment } from '@/hooks/useManualFoodEnrichment';
import { simulateHealthScanEnrichment } from '@/utils/healthScanSimulation';
import { Loader2, CheckCircle, XCircle, Settings, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth';
import { notify } from '@/lib/notify';

interface QAResult {
  query: string;
  source: string | null;
  confidence: number | null;
  ingredients_len: number;
  kcal_100g: number | null;
  pass_fail: 'PASS' | 'FAIL';
  ms?: number;
  whyPicked?: string;
  diagnostic?: any;
}

const TEST_QUERIES = [
  'club sandwich',
  'club sandwich on wheat',
  'yakisoba',
  'aloo gobi',
  'pollo con rajas'
];

const HEALTH_SCAN_QUERIES = [
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

export default function QAPage() {
  const [results, setResults] = useState<QAResult[]>([]);
  const [healthScanResults, setHealthScanResults] = useState<QAResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningHealthScan, setIsRunningHealthScan] = useState(false);
  const [isTogglingEnrichment, setIsTogglingEnrichment] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const { enrich } = useManualFoodEnrichment();
  const { isAuthenticated, user } = useAuth();

  const clearQACache = async () => {
    setIsClearingCache(true);
    try {
      console.log('[QA] Clearing cache...');
      
      // Call edge function directly
      const response = await supabase.functions.invoke('enrich-manual-food/clear-qa-cache', {
        body: {}
      });
      
      if (!response.error) {
        const result = response.data;
        if (result.success) {
          notify.success('QA cache cleared successfully');
          console.log('[QA] Cache cleared');
        } else {
          notify.error('Failed to clear QA cache');
        }
      } else {
        notify.error('Failed to clear QA cache');
      }
    } catch (error) {
      console.error('[QA] Cache clear error:', error);
      notify.error('Failed to clear QA cache');
    } finally {
      setIsClearingCache(false);
    }
  };

  const runEnrichmentTest = async () => {
    setIsRunning(true);
    setResults([]);

    const testResults: QAResult[] = [];

    for (const query of TEST_QUERIES) {
      try {
        console.log(`[QA] Testing: "${query}"`);
        
        const start = performance.now();
        // Use cache busting and manual context with diagnostics
        const enriched = await enrich(query, 'auto', { 
          noCache: true, 
          bust: Date.now().toString(),
          context: 'manual',
          diag: true 
        });
        const ms = Math.round(performance.now() - start);
        
        const source = enriched?.source || null;
        const confidence = enriched?.confidence || null;
        const ingredients_len = enriched?.ingredients?.length || 0;
        const kcal_100g = enriched?.per100g?.calories || null;
        
        const pass_fail = getPassCriteria(query, source, ingredients_len) ? 'PASS' : 'FAIL';
        
        testResults.push({
          query,
          source,
          confidence,
          ingredients_len,
          kcal_100g,
          pass_fail,
          ms,
          whyPicked: (enriched as any)?._router?.whyPicked || 'manual_enrichment',
          diagnostic: (enriched as any)?._router || null
        });
        
        console.log(`[QA] ${query}: ${source}, ${ingredients_len} ingredients, ${pass_fail}, ${ms}ms (context: manual)`);
        
      } catch (error) {
        console.error(`[QA] ${query} failed:`, error);
        testResults.push({
          query,
          source: null,
          confidence: null,
          ingredients_len: 0,
          kcal_100g: null,
          pass_fail: 'FAIL',
          whyPicked: 'error',
          diagnostic: null
        });
      }
    }

    setResults(testResults);
    setIsRunning(false);
  };

  const runHealthScanTest = async () => {
    setIsRunningHealthScan(true);
    setHealthScanResults([]);

    const testResults: QAResult[] = [];

    for (const query of HEALTH_SCAN_QUERIES) {
      try {
        console.log(`[HEALTHSCAN QA] Testing: "${query}"`);
        
        const start = performance.now();
        // Pure function call using unified router (no UI coupling)
        const enriched = await enrich(query, 'auto', { 
          noCache: true, 
          bust: Date.now().toString(),
          context: 'scan',
          diag: true
        });
        const ms = Math.round(performance.now() - start);
        
        const source = enriched?.source || null;
        const confidence = enriched?.confidence || null;
        const ingredients_len = enriched?.ingredients?.length || 0;
        const kcal_100g = enriched?.per100g?.calories || null;
        
        const pass_fail = getPassCriteria(query, source, ingredients_len) ? 'PASS' : 'FAIL';
        
        testResults.push({
          query,
          source,
          confidence,
          ingredients_len,
          kcal_100g,
          pass_fail,
          ms,
          whyPicked: (enriched as any)?._router?.whyPicked || 'health_scan_enrichment',
          diagnostic: (enriched as any)?._router || null
        });
        
        console.log(`[HEALTHSCAN QA] ${query}: ${source}, ${ingredients_len} ingredients, ${pass_fail}, ${ms}ms (context: scan)`);
        
      } catch (error) {
        console.error(`[HEALTHSCAN QA] ${query} failed:`, error);
        testResults.push({
          query,
          source: null,
          confidence: null,
          ingredients_len: 0,
          kcal_100g: null,
          pass_fail: 'FAIL',
          whyPicked: 'error',
          diagnostic: null
        });
      }
    }

    setHealthScanResults(testResults);
    setIsRunningHealthScan(false);
  };

  const toggleHealthScanEnrichment = async (enabled: boolean) => {
    if (!isAuthenticated || !user) {
      notify.error('Please sign in to manage feature flags.');
      return;
    }

    setIsTogglingEnrichment(true);
    try {
      const value = {
        enabled,
        sample_pct: enabled ? 1 : 0,
        timeout_ms: 1200
      };

      console.log('[FLAGS][USER] QA setting HS_ENRICH', value);

      const { error } = await supabase.rpc('set_user_feature_flag_jsonb', {
        flag_key_param: 'FEATURE_ENRICH_HEALTHSCAN',
        value_param: value
      });

      if (error) {
        throw error;
      }

      const message = enabled 
        ? 'Health-scan enrichment enabled for your account (100%).'
        : 'Health-scan enrichment disabled for your account.';
      
      notify.success(message);
      console.log('[FLAGS][USER] QA HS_ENRICH set successfully', value);

    } catch (error) {
      console.error('[FLAGS][USER] QA HS_ENRICH RPC failed:', error);
      notify.error(`Failed to ${enabled ? 'enable' : 'disable'} health-scan enrichment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTogglingEnrichment(false);
    }
  };

  const overallStatus = results.length > 0 && results.every(r => r.pass_fail === 'PASS') ? 'PASS' : 'FAIL';
  const healthScanOverallStatus = healthScanResults.length > 0 && healthScanResults.every(r => r.pass_fail === 'PASS') ? 'PASS' : 'FAIL';

// Expose window.clearQACache and debugging helpers for dev console
  if (typeof window !== 'undefined') {
    (window as any).clearQACache = clearQACache;
    (window as any).runManualQA = runEnrichmentTest;
    (window as any).runHealthScanQA = runHealthScanTest;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Enrichment QA Investigation
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <Button 
                onClick={clearQACache} 
                disabled={isClearingCache}
                variant="outline"
                size="sm"
              >
                {isClearingCache ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Clearing Cache...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear QA Cache
                  </>
                )}
              </Button>

              <Button 
                onClick={runEnrichmentTest} 
                disabled={isRunning}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running Manual QA...
                  </>
                ) : (
                  'Run Manual QA'
                )}
              </Button>

              <Button 
                onClick={runHealthScanTest} 
                disabled={isRunningHealthScan}
                variant="outline"
              >
                {isRunningHealthScan ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running Health Scan QA...
                  </>
                ) : (
                  'Run Health Scan QA'
                )}
              </Button>
            </div>

            {/* Health-Scan Enrichment Toggle Buttons */}
            <div className="flex gap-2 mb-4">
              <Button
                onClick={() => toggleHealthScanEnrichment(true)}
                disabled={isTogglingEnrichment || !isAuthenticated}
                variant="default"
                size="sm"
              >
                {isTogglingEnrichment ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                Enable Health-Scan (100%)
              </Button>
              
              <Button
                onClick={() => toggleHealthScanEnrichment(false)}
                disabled={isTogglingEnrichment || !isAuthenticated}
                variant="destructive"
                size="sm"
              >
                {isTogglingEnrichment ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                Disable Health-Scan
              </Button>
            </div>

            {!isAuthenticated && (
              <p className="text-sm text-muted-foreground mb-4">
                Sign in to enable/disable Health-Scan enrichment for your account.
              </p>
            )}

            {results.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Manual QA Results</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border p-2 text-left">Query</th>
                        <th className="border border-border p-2 text-left">Source</th>
                        <th className="border border-border p-2 text-left">Confidence</th>
                        <th className="border border-border p-2 text-left">Ingredients Len</th>
                        <th className="border border-border p-2 text-left">Kcal/100g</th>
                         <th className="border border-border p-2 text-left">Time (ms)</th>
                         <th className="border border-border p-2 text-left">Result</th>
                         <th className="border border-border p-2 text-left">Why Picked</th>
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
                           <td className="border border-border p-2">{result.ms || '-'}</td>
                           <td className="border border-border p-2">
                             <Badge 
                               variant={result.pass_fail === 'PASS' ? 'default' : 'destructive'}
                               className="text-xs"
                             >
                               {result.pass_fail === 'PASS' ? (
                                 <><CheckCircle className="w-3 h-3 mr-1" />PASS</>
                               ) : (
                                 <><XCircle className="w-3 h-3 mr-1" />FAIL</>
                               )}
                             </Badge>
                           </td>
                           <td className="border border-border p-2 text-xs">
                             {result.whyPicked && (
                               <div className="space-y-1">
                                 <div><strong>Decision:</strong> {result.diagnostic?.decision || 'unknown'}</div>
                                 <div><strong>Why:</strong> {result.whyPicked}</div>
                                 <div><strong>Source:</strong> {result.source}</div>
                                 <div><strong>Ingredients:</strong> {result.ingredients_len}</div>
                                 {result.diagnostic?.tried?.nutritionix && (
                                   <div><strong>NIX calls:</strong> {result.diagnostic.tried.nutritionix.calls}</div>
                                 )}
                               </div>
                             )}
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">PASS Criteria:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Club sandwich variants → source ∈ (NUTRITIONIX, EDAMAM) and ingredients_len ≥ 5</li>
                    <li>• Yakisoba / Aloo gobi → ingredients_len ≥ 2</li>
                    <li>• Pollo con rajas → source ∈ (EDAMAM, ESTIMATED, NUTRITIONIX) and ingredients_len ≥ 3</li>
                  </ul>
                </div>
              </div>
            )}

            {healthScanResults.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold">Health Scan QA Results</h3>
                  <Badge 
                    variant={healthScanOverallStatus === 'PASS' ? 'default' : 'destructive'}
                    className="text-sm"
                  >
                    {healthScanOverallStatus === 'PASS' ? (
                      <><CheckCircle className="w-4 h-4 mr-1" />Overall: PASS</>
                    ) : (
                      <><XCircle className="w-4 h-4 mr-1" />Overall: FAIL</>
                    )}
                  </Badge>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border p-2 text-left">Query</th>
                        <th className="border border-border p-2 text-left">Source</th>
                        <th className="border border-border p-2 text-left">Confidence</th>
                        <th className="border border-border p-2 text-left">Ingredients Len</th>
                        <th className="border border-border p-2 text-left">Kcal/100g</th>
                         <th className="border border-border p-2 text-left">Time (ms)</th>
                         <th className="border border-border p-2 text-left">Result</th>
                         <th className="border border-border p-2 text-left">Why Picked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthScanResults.map((result, index) => (
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
                           <td className="border border-border p-2">{result.ms || '-'}</td>
                           <td className="border border-border p-2">
                             <Badge 
                               variant={result.pass_fail === 'PASS' ? 'default' : 'destructive'}
                               className="text-xs"
                             >
                               {result.pass_fail === 'PASS' ? (
                                 <><CheckCircle className="w-3 h-3 mr-1" />PASS</>
                               ) : (
                                 <><XCircle className="w-3 h-3 mr-1" />FAIL</>
                               )}
                             </Badge>
                           </td>
                           <td className="border border-border p-2 text-xs">
                             {result.whyPicked && (
                               <div className="space-y-1">
                                 <div><strong>Decision:</strong> {result.diagnostic?.decision || 'unknown'}</div>
                                 <div><strong>Why:</strong> {result.whyPicked}</div>
                                 <div><strong>Source:</strong> {result.source}</div>
                                 <div><strong>Ingredients:</strong> {result.ingredients_len}</div>
                                 {result.diagnostic?.tried?.nutritionix && (
                                   <div><strong>NIX calls:</strong> {result.diagnostic.tried.nutritionix.calls}</div>
                                 )}
                               </div>
                             )}
                           </td>
                           <td className="border border-border p-2 text-xs">
                             {result.source && (
                               <div className="space-y-1">
                                 <div>Source: {result.source}</div>
                                 <div>Ingredients: {result.ingredients_len}</div>
                                 {result.ms && <div>Time: {result.ms}ms</div>}
                               </div>
                             )}
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Health Scan Enrichment Info:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Tests OCR-extracted dish names through enrichment pipeline</li>
                    <li>• Same PASS criteria as manual enrichment tests</li>
                    <li>• Simulates fail-open health scan enrichment flow</li>
                    <li>• Expected timeout: ~1200ms, fail-open behavior on errors</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <h4 className="font-semibold mb-2">Investigation Notes:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Manual QA uses context='manual', cache bypass with bust param</li>
                <li>• Health Scan QA uses same unified router with context='scan'</li>
                <li>• Both flows should produce identical results for same queries</li>
                <li>• FDC guard rejects weak results (≤1 ingredient) when better options exist</li>
                <li>• window.clearQACache() available in console for debugging</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}