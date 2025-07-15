import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TestTube, Activity, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  id: string;
  timestamp: string;
  barcode: string;
  status: 'success' | 'error' | 'timeout';
  responseTime: number;
  result?: any;
  error?: string;
}

export const BarcodeTestDashboard: React.FC = () => {
  const [testBarcode, setTestBarcode] = useState('012000030062');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runDiagnosticTest = async () => {
    setIsRunning(true);
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    const [scannedIngredients, setScannedIngredients] = useState<string>('');    
    const newResult: TestResult = {
      id: requestId,
      timestamp: new Date().toISOString(),
      barcode: testBarcode,
      status: 'error',
      responseTime: 0
    };

    try {
      console.log('=== DIAGNOSTIC TEST START ===');
      console.log('Test ID:', requestId);
      console.log('Testing barcode:', testBarcode);

      // Test function connectivity with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT: Function did not respond within 10 seconds')), 10000)
      );

      const functionCall = supabase.functions.invoke('barcode-lookup-global', {
        body: { 
          barcode: testBarcode,
          enableGlobalSearch: true,
          requestId,
          diagnostic: true
        }
      });

      const response = await Promise.race([functionCall, timeoutPromise]) as any;
      const responseTime = Date.now() - startTime;

      console.log('=== DIAGNOSTIC TEST COMPLETE ===');
      console.log('Response time:', responseTime, 'ms');
      console.log('Response:', response);

      newResult.responseTime = responseTime;
      
      if (response.error) {
        newResult.status = 'error';
        newResult.error = response.error.message || 'Unknown error';
        toast.error(`Test failed: ${newResult.error}`);
     } else if (response.data?.success && response.data.product) {
  const product = response.data.product;
  newResult.status = 'success';
  newResult.result = {
    name: product.product_name || 'Unnamed product',
    brand: product.brands || '',
    source: 'Open Food Facts'
  };

  // Save ingredients text for flagging
  setScannedIngredients(product.ingredients_text || '');

  toast.success(
    `Found: ${product.product_name || 'Unnamed product'}`
  );
const flagged = ['aspartame', 'high fructose corn syrup', 'monosodium glutamate', 'red 40'];
const lowerCaseIngredients = product.ingredients_text?.toLowerCase() || '';

const warnings = flagged.filter(flag =>
  lowerCaseIngredients.includes(flag)
);

if (warnings.length > 0) {
  toast.error(`⚠️ Contains: ${warnings.join(', ')}`);
} else {
  toast.success('✅ No flagged ingredients found');
}
        
} else {

        newResult.status = 'error';
        newResult.error = response.data?.message || 'Product not found';
        toast.warning(`Product not found: ${newResult.error}`);
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      newResult.responseTime = responseTime;
      
      if (error.message.includes('TIMEOUT')) {
        newResult.status = 'timeout';
        newResult.error = 'Function timeout - likely not deployed or not responding';
        toast.error('Function timeout detected!');
      } else {
        newResult.status = 'error';
        newResult.error = error.message || 'Unknown error';
        toast.error(`Test error: ${newResult.error}`);
      }
      
      console.error('=== DIAGNOSTIC TEST ERROR ===', error);
    }

    setResults(prev => [newResult, ...prev.slice(0, 4)]); // Keep last 5 results
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'timeout': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <TestTube className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50 text-green-800';
      case 'timeout': return 'border-orange-200 bg-orange-50 text-orange-800';
      case 'error': return 'border-red-200 bg-red-50 text-red-800';
      default: return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-600" />
          Barcode Function Diagnostic Dashboard
        </CardTitle>
        <p className="text-sm text-gray-600">
          Test the barcode-lookup-global function deployment and execution
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              value={testBarcode}
              onChange={(e) => setTestBarcode(e.target.value)}
              placeholder="Enter barcode to test"
              disabled={isRunning}
            />
          </div>
          <Button
            onClick={runDiagnosticTest}
            disabled={isRunning || !testBarcode.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunning ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Testing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Run Diagnostic Test
              </div>
            )}
          </Button>
        </div>

        {/* Quick Test Buttons */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setTestBarcode('012000030062')}>
            Candy Test
          </Button>
          <Button size="sm" variant="outline" onClick={() => setTestBarcode('00041420002007')}>
            Fruit Test
          </Button>
          <Button size="sm" variant="outline" onClick={() => setTestBarcode('123456789012')}>
            Invalid Test
          </Button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Results</h3>
            <div className="space-y-3">
              {results.map((result) => (
                <div
                  key={result.id}
                  className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Barcode: {result.barcode}</span>
                          <Badge variant="outline">{result.status}</Badge>
                          <Badge variant="secondary">{result.responseTime}ms</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {result.error && (
                    <div className="mt-3 p-2 bg-white/50 rounded text-sm">
                      <span className="font-medium text-red-700">Error: </span>
                      {result.error}
                    </div>
                  )}
                  
                  {result.result && (
                    <div className="mt-3 p-2 bg-white/50 rounded text-sm">
                      <span className="font-medium text-green-700">Found: </span>
                      {result.result.name} ({result.result.source})
                      {result.result.brand && ` - ${result.result.brand}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Summary */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-2">Diagnostic Checklist:</p>
            <div className="space-y-1">
              <p>✅ Function logs will show in Supabase Functions dashboard</p>
              <p>✅ Timeout detection for deployment issues</p>
              <p>✅ Response time monitoring for performance</p>
              <p>✅ Unique request IDs to prevent cached responses</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};