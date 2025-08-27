import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Known working barcode for testing
const TEST_BARCODE = '7622201129132'; // Example Oreo barcode

export default function BarcodeSmokeTest() {
  const navigate = useNavigate();
  const [barcode, setBarcode] = useState(TEST_BARCODE);
  const [isRunning, setIsRunning] = useState(false);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [legacyMapped, setLegacyMapped] = useState<any>(null);

  const runBarcodeTest = async () => {
    setIsRunning(true);
    setRawResponse(null);
    setLegacyMapped(null);

    try {
      console.log(`[SMOKE] Testing barcode: ${barcode}`);
      
      const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
        body: { mode: 'barcode', barcode, source: 'debug' }
      });

      if (error) {
        console.error('[SMOKE] Error:', error);
        setRawResponse({ error: error.message });
        return;
      }

      console.log('[SMOKE] Raw response:', data);
      setRawResponse(data);

      // Map to legacy format
      if (data && data.ok && data.product) {
        const mapped = {
          productName: data.product.productName || data.product.title || data.product.name || 'Unknown',
          healthScore: data.product.health?.score || null,
          healthFlags: data.product.health?.flags || [],
          nutrition: data.product.nutrition || null,
          ingredientsText: data.product.ingredientsText || data.product.ingredients?.raw || null,
          brand: data.product.brand || data.product.brands || null,
          barcode: barcode
        };
        
        setLegacyMapped(mapped);
      } else {
        setLegacyMapped({ error: 'No product found or failed' });
      }

    } catch (error) {
      console.error('[SMOKE] Exception:', error);
      setRawResponse({ exception: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/debug')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Debug
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Barcode Smoke Test</h1>
          <p className="text-muted-foreground">Test barcode pipeline without analyzer code</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Barcode Pipeline</CardTitle>
          <CardDescription>
            Tests the enhanced-health-scanner function with mode:'barcode' - no analyzer logic involved
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Enter barcode (8, 12, 13, or 14 digits)"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="font-mono"
            />
            <Button 
              onClick={runBarcodeTest}
              disabled={isRunning || !barcode.trim()}
              className="gap-2"
            >
              <PlayCircle className="h-4 w-4" />
              {isRunning ? 'Testing...' : 'Run Pipeline'}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Pre-filled with: <code className="bg-muted px-1 rounded">{TEST_BARCODE}</code> (known working barcode)
          </div>
        </CardContent>
      </Card>

      {rawResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Raw JSON Response
              <Badge variant={rawResponse.ok ? 'default' : 'destructive'}>
                {rawResponse.ok ? 'SUCCESS' : 'FAILED'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-60">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {legacyMapped && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Legacy Mapped Object
              <Badge variant={legacyMapped.productName ? 'default' : 'destructive'}>
                {legacyMapped.productName ? 'MAPPED' : 'FAILED'}
              </Badge>
            </CardTitle>
            <CardDescription>
              How the client should map this response for the health report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <strong>Product Name:</strong> {legacyMapped.productName || 'N/A'}
              </div>
              <div>
                <strong>Health Score:</strong> {legacyMapped.healthScore || 'N/A'}
              </div>
              <div>
                <strong>Brand:</strong> {legacyMapped.brand || 'N/A'}
              </div>
              <div>
                <strong>Ingredients:</strong> {legacyMapped.ingredientsText ? 'Available' : 'N/A'}
              </div>
              <div>
                <strong>Nutrition:</strong> {legacyMapped.nutrition ? 'Available' : 'N/A'}
              </div>
              
              <details className="mt-4">
                <summary className="cursor-pointer font-medium">Full mapped object</summary>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-60 mt-2">
                  {JSON.stringify(legacyMapped, null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}