import { useState } from 'react';
import { LogFood } from '@/features/logging/utils/barcodeToLogFood';
import { extractServingGramsFromText } from '@/lib/nutrition/parsers/nutritionFactsParser';

interface BarcodeProduct {
  name: string;
  servingGrams?: number;
  barcode: string;
  imageUrl?: string;
  // ... other product fields
}

export function useBarcodeCapture() {
  const [needsNutritionFacts, setNeedsNutritionFacts] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<BarcodeProduct | null>(null);

  const handleBarcodeSuccess = async (barcode: string, productData?: any): Promise<any> => {
    try {
      // Step 1: Look up UPC/barcode
      console.log('[BARCODE_CAPTURE] Looking up barcode:', barcode);
      
      // Import the mapToLogFood function
      const { mapToLogFood } = await import('@/features/logging/utils/barcodeToLogFood');
      const logProduct = mapToLogFood(barcode, productData);
      
      if (!logProduct) {
        throw new Error('Product not found');
      }

      // Check if product has serving size in grams
      const hasServingSize = logProduct.servingGrams && 
                           logProduct.servingGrams > 0 &&
                           logProduct.calories && 
                           logProduct.calories > 0;
      
      if (hasServingSize) {
        console.log('[BARCODE_CAPTURE] Product has serving info, proceeding directly');
        return { 
          success: true, 
          product: logProduct,
          needsNutritionCapture: false 
        };
      } else {
        console.log('[BARCODE_CAPTURE] No serving info, requires Nutrition Facts capture');
        setCurrentProduct({
          name: logProduct.name,
          barcode: logProduct.barcode,
          imageUrl: logProduct.imageUrl
        });
        setNeedsNutritionFacts(true);
        return {
          success: true,
          product: logProduct,
          needsNutritionCapture: true
        };
      }
    } catch (error) {
      console.error('[BARCODE_CAPTURE] Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        needsNutritionCapture: false
      };
    }
  };

  const handleNutritionFactsSuccess = async (grams: number) => {
    if (!currentProduct) {
      throw new Error('No current product for nutrition facts');
    }

    console.log('[BARCODE_CAPTURE] Nutrition Facts success:', { grams });
    
    // Update product with serving size and return
    const updatedProduct = {
      ...currentProduct,
      servingGrams: grams
    };
    
    // Reset state
    setNeedsNutritionFacts(false);
    setCurrentProduct(null);
    
    return {
      success: true,
      product: updatedProduct,
      needsNutritionCapture: false
    };
  };

  const handleNutritionFactsCancel = () => {
    setNeedsNutritionFacts(false);
    setCurrentProduct(null);
  };

  return {
    needsNutritionFacts,
    currentProduct,
    handleBarcodeSuccess,
    handleNutritionFactsSuccess,
    handleNutritionFactsCancel
  };
}
