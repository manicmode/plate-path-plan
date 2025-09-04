// Clean barcode handler implementation
import { analyzeBarcode } from '@/pipelines/barcodePipeline';
import { toast } from 'sonner';

export const createBarcodeHandler = (deps: {
  setIsLoadingBarcode: (loading: boolean) => void;
  setInputSource: (source: string) => void;
  setRecognizedFoods: (foods: any[]) => void;
  setVisionResults: (results: any) => void;
  setVoiceResults: (results: any) => void;
  setShowSummaryPanel: (show: boolean) => void;
  setSummaryItems: (items: any[]) => void;
  setReviewItems: (items: any[]) => void;
  setShowReviewScreen: (show: boolean) => void;
  setShowError: (show: boolean) => void;
  setErrorMessage: (msg: string) => void;
  setConfirmModalItems: (items: any[]) => void;
  setConfirmModalOpen: (open: boolean) => void;
  setShowBarcodeNotFound: (show: boolean) => void;
  setFailedBarcode: (code: string) => void;
  location: { pathname: string };
}) => async (barcode: string) => {
  try {
    deps.setIsLoadingBarcode(true);
    deps.setInputSource('barcode');
    console.log('[BARCODE][MODE]', { inputSource: 'barcode', route: deps.location?.pathname });

    // Complete state reset
    deps.setRecognizedFoods([]);
    deps.setVisionResults(null);
    deps.setVoiceResults(null);
    deps.setShowSummaryPanel(false);
    deps.setSummaryItems([]);
    deps.setReviewItems([]);
    deps.setShowReviewScreen(false);
    deps.setShowError(false);
    deps.setErrorMessage('');

    // Validate barcode format
    const cleanBarcode = barcode.trim().replace(/\s+/g, '');
    if (!/^\d{8,14}$/.test(cleanBarcode)) {
      console.warn('[BARCODE][EARLY_RETURN]', { reason: 'invalid_format', code: barcode });
      throw new Error('Invalid barcode format. Please check the barcode number.');
    }
    
    console.log('[BARCODE][LOOKUP:REQUEST]', { code: barcode, normalized: cleanBarcode });

    // Use working barcode pipeline
    const result = await analyzeBarcode({ code: cleanBarcode });
    
    if (!result.ok) {
      console.log('[BARCODE][LOOKUP:RESPONSE]', { ok: false, found: false, reason: result.reason });
      
      toast.info('Barcode not found. Would you like to add this product?', {
        description: "Try scanning again or enter manually",
        action: {
          label: "Enter Manually",
          onClick: () => {
            deps.setShowBarcodeNotFound(true);
            deps.setFailedBarcode(cleanBarcode);
          }
        }
      });
      
      return;
    }
    
    // Transform successful result
    const report = result.report;
    console.log('[BARCODE][LOOKUP:RESPONSE]', { ok: true, found: true, itemName: report?.productName });
    console.log('[BARCODE][MAP:ITEM]', { id: report?.productName, name: report?.productName, grams: 100 });
    
    const mappedItem = {
      id: Date.now().toString(),
      name: report.productName || 'Unknown Product',
      brand: report.brand || '',
      grams: 100,
      nutrition: {
        calories: report.nutrition?.calories || 0,
        protein: report.nutrition?.protein || 0,
        carbs: report.nutrition?.carbs || 0,
        fat: report.nutrition?.fat || 0,
        fiber: report.nutrition?.fiber || 0,
        sugar: report.nutrition?.sugar || 0,
        sodium: report.nutrition?.sodium || 0,
        perGram: {
          calories: (report.nutrition?.calories || 0) / 100,
          protein: (report.nutrition?.protein || 0) / 100,
          carbs: (report.nutrition?.carbs || 0) / 100,
          fat: (report.nutrition?.fat || 0) / 100,
          fiber: (report.nutrition?.fiber || 0) / 100,
          sugar: (report.nutrition?.sugar || 0) / 100,
          sodium: (report.nutrition?.sodium || 0) / 100
        }
      },
      source: 'barcode',
      sourceData: {
        barcode: cleanBarcode,
        originalProduct: report
      },
      __hydrated: true
    };

    console.log('[BARCODE][OPEN_CONFIRM]', { id: mappedItem.id, name: mappedItem.name, via: 'confirm-card' });
    
    // Open confirmation modal
    deps.setConfirmModalItems([mappedItem]);
    deps.setConfirmModalOpen(true);

  } catch (error) {
    console.error('[BARCODE][ERROR]', error);
    
    toast.error('Network error during barcode lookup', {
      description: 'Please try again or enter manually',
      action: {
        label: "Enter Manually",
        onClick: () => {
          deps.setShowBarcodeNotFound(true);
          deps.setFailedBarcode(barcode);
        }
      }
    });
  } finally {
    deps.setIsLoadingBarcode(false);
  }
};