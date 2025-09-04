// Clean barcode handler for Camera.tsx
import { analyzeBarcode } from '@/pipelines/barcodePipeline';
import { toast } from 'sonner';

export const createCleanBarcodeHandler = (
  setters: {
    setIsLoadingBarcode: (loading: boolean) => void;
    setConfirmModalItems: (items: any[]) => void;
    setConfirmModalOpen: (open: boolean) => void;
    setShowBarcodeNotFound: (show: boolean) => void;
    setFailedBarcode: (code: string) => void;
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
  },
  location: { pathname: string }
) => {
  return async (barcode: string) => {
    try {
      setters.setIsLoadingBarcode(true);
      setters.setInputSource('barcode');
      console.log('[BARCODE][MODE]', { inputSource: 'barcode', route: location?.pathname });
      console.log('=== BARCODE LOOKUP START ===');

      // CRITICAL: Complete state reset
      setters.setRecognizedFoods([]);
      setters.setVisionResults(null);
      setters.setVoiceResults(null);
      setters.setShowSummaryPanel(false);
      setters.setSummaryItems([]);
      setters.setReviewItems([]);
      setters.setShowReviewScreen(false);
      setters.setShowError(false);
      setters.setErrorMessage('');

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
        console.warn('[BARCODE][EARLY_RETURN]', { reason: result.reason, code: cleanBarcode });
        
        const msg = result.reason === 'not_found' && /^\d{8}$/.test(cleanBarcode)
          ? 'This 8-digit code is not in database. Try another side or enter manually.'
          : 'Barcode not found. Would you like to add this product?';
        
        toast.info(msg, {
          description: "Try scanning again or enter manually",
          action: {
            label: "Enter Manually",
            onClick: () => {
              setters.setShowBarcodeNotFound(true);
              setters.setFailedBarcode(cleanBarcode);
            }
          }
        });
        
        setters.setIsLoadingBarcode(false);
        return;
      }
      
      // Transform successful result to confirmation modal format
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
          perGram: report.nutrition?.perGram || {
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
      setters.setConfirmModalItems([mappedItem]);
      setters.setConfirmModalOpen(true);
      setters.setIsLoadingBarcode(false);

    } catch (error) {
      console.error('[BARCODE][ERROR]', error);
      console.warn('[BARCODE][EARLY_RETURN]', { reason: 'network_error', code: barcode });
      
      toast.error('Network error during barcode lookup', {
        description: 'Please try again or enter manually',
        action: {
          label: "Enter Manually",
          onClick: () => {
            setters.setShowBarcodeNotFound(true);
            setters.setFailedBarcode(barcode);
          }
        }
      });
      
      setters.setIsLoadingBarcode(false);
    }
  };
};