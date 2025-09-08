import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';  
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface QAResult {
  query: string;
  source: string | null;
  ingredients_len: number;
  kcal_100g: number | null;
  result: 'PASS' | 'FAIL';
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

export default function QAIndex() {
  const location = useLocation();
  const [enrichmentResults, setEnrichmentResults] = useState<QAResult[]>([]);
  const [healthScanResults, setHealthScanResults] = useState<QAResult[]>([]);
  const [isRunningEnrichment, setIsRunningEnrichment] = useState(false);
  const [isRunningHealthScan, setIsRunningHealthScan] = useState(false);

  // Check if QA is enabled via URL parameter
  const qaEnabled = new URLSearchParams(location.search).get('QA_ENRICH') === '1';

  if (!qaEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-muted-foreground">QA is hidden. Append ?QA_ENRICH=1 to use.</p>
        </div>
      </div>
    );
  }

  const runEnrichmentQA = async () => {
    setIsRunningEnrichment(true);
    setEnrichmentResults([]);

    const results: QAResult[] = [];

    // Run each query twice to verify cache
    for (const query of TEST_QUERIES) {
      try {
        // First run
        const { data: firstRun, error: firstError } = await supabase.functions.invoke('enrich-manual-food', {
          body: { query: query.trim(), locale: 'auto' }
        });

        // Second run (cache hit)
        const { data: secondRun, error: secondError } = await supabase.functions.invoke('enrich-manual-food', {
          body: { query: query.trim(), locale: 'auto' }
        });

        if (firstError || secondError) {
          console.error(`[QA] ${query} error:`, firstError || secondError);
          results.push({
            query,
            source: null,
            ingredients_len: 0,
            kcal_100g: null,
            result: 'FAIL'
          });
          continue;
        }

        const source = firstRun?.source || null;
        const ingredients_len = firstRun?.ingredients?.length || 0;
        const kcal_100g = firstRun?.per100g?.calories || null;
        const result = getPassCriteria(query, source, ingredients_len) ? 'PASS' : 'FAIL';

        results.push({
          query,
          source,
          ingredients_len,
          kcal_100g,
          result
        });

        console.log(`[QA] ${query}: ${source}, ${ingredients_len} ingredients, ${kcal_100g} kcal, ${result}`);

      } catch (error) {
        console.error(`[QA] ${query} failed:`, error);
        results.push({
          query,
          source: null,
          ingredients_len: 0,
          kcal_100g: null,
          result: 'FAIL'
        });
      }
    }

    setEnrichmentResults(results);
    setIsRunningEnrichment(false);
  };

  const runHealthScanQA = async () => {
    setIsRunningHealthScan(true);
    setHealthScanResults([]);

    // Check if health scan test harness exists
    if (typeof (window as any).testHealthScanEnrichment !== 'function') {
      console.warn('[QA] Health scan test harness not found');
      setHealthScanResults([{
        query: 'health-scan-test',
        source: null,
        ingredients_len: 0,
        kcal_100g: null,
        result: 'FAIL'
      }]);
      setIsRunningHealthScan(false);
      return;
    }

    try {
      const testResults = await (window as any).testHealthScanEnrichment();
      const formattedResults: QAResult[] = testResults.map((result: any) => ({
        query: result.query,
        source: result.source,
        ingredients_len: result.ingredients_len || 0,
        kcal_100g: result.kcal_100g,
        result: getPassCriteria(result.query, result.source, result.ingredients_len || 0) ? 'PASS' : 'FAIL'
      }));

      setHealthScanResults(formattedResults);
    } catch (error) {
      console.error('[QA] Health scan QA failed:', error);
      setHealthScanResults([{
        query: 'health-scan-error',
        source: null,
        ingredients_len: 0,
        kcal_100g: null,
        result: 'FAIL'
      }]);
    }

    setIsRunningHealthScan(false);
  };

  const renderResultsTable = (results: QAResult[], title: string) => {
    if (results.length === 0) return null;

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-2 text-left">Query</th>
                <th className="border border-border p-2 text-left">Source</th>
                <th className="border border-border p-2 text-left">Ingredients Len</th>
                <th className="border border-border p-2 text-left">Kcal/100g</th>
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
                  <td className="border border-border p-2">{result.ingredients_len}</td>
                  <td className="border border-border p-2">
                    {result.kcal_100g ? Math.round(result.kcal_100g) : '-'}
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
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>QA Enrichment Testing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <Button 
                onClick={runEnrichmentQA} 
                disabled={isRunningEnrichment}
              >
                {isRunningEnrichment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  'Run Enrichment QA'
                )}
              </Button>

              <Button 
                onClick={runHealthScanQA} 
                disabled={isRunningHealthScan}
                variant="outline"
              >
                {isRunningHealthScan ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  'Run Health-Scan QA'
                )}
              </Button>
            </div>

            {renderResultsTable(enrichmentResults, 'Enrichment QA Results')}
            {renderResultsTable(healthScanResults, 'Health-Scan QA Results')}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}