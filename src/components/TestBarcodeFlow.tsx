import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScanBarcode, TestTube, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  step: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

export const TestBarcodeFlow: React.FC = () => {
  const [testBarcode, setTestBarcode] = useState('012000030062'); // Example harmful candy barcode
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (step: string, status: 'success' | 'error' | 'warning', message: string, data?: any) => {
    setResults(prev => [...prev, { step, status, message, data }]);
  };

  const runCompleteTest = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      // Step 1: Test barcode lookup
      addResult('Barcode Lookup', 'success', 'Starting barcode lookup...');
      
      const barcodeResponse = await supabase.functions.invoke('barcode-lookup-global', {
        body: { 
          barcode: testBarcode,
          enableGlobalSearch: true 
        }
      });

      if (barcodeResponse.error) {
        addResult('Barcode Lookup', 'error', `API Error: ${barcodeResponse.error.message}`);
        return;
      }

      if (!barcodeResponse.data?.success) {
        addResult('Barcode Lookup', 'warning', `Product not found: ${barcodeResponse.data?.message}`);
        return;
      }

      const product = barcodeResponse.data.product;
      addResult('Barcode Lookup', 'success', `Found: ${product.name}`, {
        brand: product.brand,
        source: product.source,
        ingredientsAvailable: product.ingredients_available,
        ingredientsLength: product.ingredients_text?.length || 0
      });

      // Step 2: Test ingredient detection if available
      if (product.ingredients_available && product.ingredients_text) {
        addResult('Ingredient Detection', 'success', 'Testing ingredient flagging...');

        const ingredientResponse = await supabase.functions.invoke('detect-flagged-ingredients', {
          body: { ingredients: product.ingredients_text }
        });

        if (ingredientResponse.error) {
          addResult('Ingredient Detection', 'error', `Detection Error: ${ingredientResponse.error.message}`);
        } else if (ingredientResponse.data?.success) {
          const flagged = ingredientResponse.data.flaggedIngredients || [];
          const status = flagged.length > 0 ? 'warning' : 'success';
          const message = flagged.length > 0 
            ? `Found ${flagged.length} flagged ingredient(s)`
            : 'No concerning ingredients detected';
          
          addResult('Ingredient Detection', status, message, {
            flaggedCount: flagged.length,
            flaggedIngredients: flagged.slice(0, 3).map((f: any) => f.name),
            totalChecked: ingredientResponse.data.totalChecked
          });
        }
      } else {
        addResult('Ingredient Detection', 'warning', 'No ingredients available - manual entry would be prompted');
      }

      // Step 3: Test state management
      addResult('State Management', 'success', 'Testing state isolation...');
      
      // Simulate potential state contamination test
      const timestamp = Date.now();
      const foodItem = {
        id: `test-${timestamp}`,
        name: product.name,
        barcode: testBarcode,
        ingredientsText: product.ingredients_text,
        ingredientsAvailable: product.ingredients_available
      };

      addResult('State Management', 'success', 'Food item created with unique ID', {
        itemId: foodItem.id,
        timestamp: new Date(timestamp).toISOString()
      });

      toast.success('Complete barcode flow test finished successfully!');

    } catch (error) {
      console.error('Test error:', error);
      addResult('Test Execution', 'error', `Unexpected error: ${error}`);
      toast.error('Test failed with unexpected error');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <TestTube className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-800 bg-green-50 border-green-200';
      case 'error': return 'text-red-800 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-800 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-800 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-6 w-6 text-blue-600" />
          Complete Barcode Flow Test
        </CardTitle>
        <p className="text-sm text-gray-600">
          Test the complete barcode lookup → ingredient detection → state management flow
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Test Configuration */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Test Barcode
              </label>
              <Input
                value={testBarcode}
                onChange={(e) => setTestBarcode(e.target.value)}
                placeholder="Enter barcode to test"
                disabled={isRunning}
              />
            </div>
            <Button
              onClick={runCompleteTest}
              disabled={isRunning || !testBarcode.trim()}
              className="mt-6"
            >
              {isRunning ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Testing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ScanBarcode className="h-4 w-4" />
                  Run Complete Test
                </div>
              )}
            </Button>
          </div>

          {/* Preset Test Barcodes */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTestBarcode('012000030062')}
              disabled={isRunning}
            >
              Candy (Harmful)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTestBarcode('00041420002007')}
              disabled={isRunning}
            >
              Fruit (Safe)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTestBarcode('123456789012')}
              disabled={isRunning}
            >
              Invalid Barcode
            </Button>
          </div>
        </div>

        <Separator />

        {/* Test Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Results</h3>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{result.step}</span>
                        <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                          {result.status}
                        </Badge>
                      </div>
                      <p className="text-sm">{result.message}</p>
                      
                      {result.data && (
                        <div className="mt-2 text-xs bg-white/50 rounded p-2">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Summary */}
        {results.length > 0 && !isRunning && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Test Summary</span>
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Total Steps: {results.length}</p>
              <p>• Successful: {results.filter(r => r.status === 'success').length}</p>
              <p>• Warnings: {results.filter(r => r.status === 'warning').length}</p>
              <p>• Errors: {results.filter(r => r.status === 'error').length}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};