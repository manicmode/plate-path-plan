import React, { useState, useCallback } from 'react';
import { SharedBarcodeScanner } from '@/components/scan/SharedBarcodeScanner';
import { ConfirmAddFoodModal } from '@/components/scan/ConfirmAddFoodModal';
import { addFoodLog } from '@/lib/logs/addFoodLog';
import { supabase } from '@/integrations/supabase/client';
import { toastOnce } from '@/lib/toastOnce';

export default function ScanBarcodeScreen({ onClose }: { onClose: () => void }) {
  const [product, setProduct] = useState<any | null>(null);
  const [detected, setDetected] = useState<{ raw: string; type: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDetected = useCallback(async (code: { raw: string; type: string }) => {
    console.log('🔍 ScanBarcodeScreen: Barcode detected:', code);
    setDetected(code);
    setIsLoading(true);

    try {
      // Call enhanced-health-scanner with barcode mode
      const requestId = crypto.randomUUID();
      console.log(`[telemetry] ${requestId} off.lookup starting for barcode:`, code.raw);

      const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
        body: { 
          mode: 'barcode', 
          barcode: code.raw, 
          source: 'log',
          requestId 
        }
      });

      if (error) {
        console.error('Enhanced health scanner error:', error);
        throw new Error(error.message || 'Backend error');
      }

      const result = data;
      console.log('✅ Enhanced health scanner result:', result);

      if (result && result.productName && !result.fallback) {
        // Success - show confirm add modal
        setProduct(result);
        
        console.log(`[telemetry] ${requestId} off.lookup success:`, {
          hit: true,
          status: 200,
          brand: result.brand,
          name: result.productName
        });
      } else {
        // Fallback or no match
        console.log(`[telemetry] ${requestId} off.lookup failed:`, result?.reason || 'no_match');
        toastOnce('error', `No product found for barcode ${code.raw}. Try manual entry.`);
        onClose();
      }

    } catch (error) {
      console.error('❌ Barcode detection error:', error);
      toastOnce('error', 'Failed to lookup product - please try again');
    } finally {
      setIsLoading(false);
    }
  }, [onClose]);

  const handleAdd = useCallback(async (productData: any, serving: { amount: number; unit: string }) => {
    if (!product || !detected) return;

    try {
      console.log('🍽️ Adding food to log:', { productData, serving });
      const requestId = crypto.randomUUID();

      await addFoodLog({
        source: 'barcode',
        barcode: detected.raw,
        productName: productData.productName,
        brand: productData.brand,
        nutrients: productData.nutritionSummary,
        ingredients: productData.ingredients,
        serving,
        additives: productData.additives,
        allergens: productData.allergens,
        offId: productData.offId,
        nova: productData.nova
      });

      console.log(`[telemetry] ${requestId} log.added:`, {
        barcode: detected.raw,
        nutrients: !!productData.nutritionSummary
      });

      // Success - close and reset
      setProduct(null);
      setDetected(null);
      onClose();
      
    } catch (error) {
      console.error('❌ Failed to add food to log:', error);
      toastOnce('error', 'Failed to add food to log - please try again');
    }
  }, [product, detected, onClose]);

  const handleBack = useCallback(() => {
    setProduct(null);
    // Keep detected state to return to scanner
  }, []);

  const handleCancel = useCallback(() => {
    setProduct(null);
    setDetected(null);
    onClose();
  }, [onClose]);

  return (
    <>
      {!product && (
        <SharedBarcodeScanner
          context="log"
          allowManual
          onDetected={handleDetected}
          onCancel={handleCancel}
        />
      )}
      
      {product && (
        <ConfirmAddFoodModal
          isOpen={true}
          onClose={handleCancel}
          onConfirm={handleAdd}
          onBackToScanner={handleBack}
          productData={product}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
