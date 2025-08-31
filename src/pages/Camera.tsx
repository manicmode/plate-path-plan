import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Upload, Check, X, Sparkles, Mic, MicOff, Edit3, ScanBarcode, FileText, Save, Clock, Droplets, Pill } from 'lucide-react';
import { useNutrition } from '@/contexts/NutritionContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { mapToLogFood } from '@/features/logging/utils/barcodeToLogFood';
import { useAuth } from '@/contexts/auth';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { sendToLogVoice } from '@/integrations/logVoice';
import imageCompression from 'browser-image-compression';
import { useSound } from '@/hooks/useSound';
import { SoundGate } from '@/lib/soundGate';
import { ProcessingStatus } from '@/components/camera/ProcessingStatus';
import { BarcodeScanner } from '@/components/camera/BarcodeScanner';
import { ManualBarcodeEntry } from '@/components/camera/ManualBarcodeEntry';
import { ManualFoodEntry } from '@/components/camera/ManualFoodEntry';
import { LogBarcodeScannerModal } from '@/components/camera/LogBarcodeScannerModal';
import { useRecentBarcodes } from '@/hooks/useRecentBarcodes';
import { useBarcodeHistory } from '@/hooks/useBarcodeHistory';
import { useMealScoring } from '@/hooks/useMealScoring';
import { useNutritionPersistence } from '@/hooks/useNutritionPersistence';
import extractServingGramsFromText, { NUTRIENT_OR_SERVING } from '../lib/ocr/nutritionFactsParser';
import inferCategory, { isBrand } from '../lib/category';
import fallbackServingGramsByCategory from '../lib/portionFallback';
import type { CaptureMode } from '../features/scanner/types';

import { safeGetJSON } from '@/lib/safeStorage';

import { LogProduct } from '@/lib/food/types';
import { validateImageFile, getImageDimensions } from '@/utils/imageValidation';
import { useNavigate, useLocation } from 'react-router-dom';
import { ReviewItemsScreen, ReviewItem } from '@/components/camera/ReviewItemsScreen';
import { SummaryReviewPanel, SummaryItem } from '@/components/camera/SummaryReviewPanel';
import { TransitionScreen } from '@/components/camera/TransitionScreen';
import FoodConfirmationCard from '@/components/FoodConfirmationCard';
import { BarcodeNotFoundModal } from '@/components/camera/BarcodeNotFoundModal';
import { SavedFoodsTab } from '@/components/camera/SavedFoodsTab';
import { RecentFoodsTab } from '@/components/camera/RecentFoodsTab';
import { MultiAIFoodDetection } from '@/components/camera/MultiAIFoodDetection';
import { detectFoodsFromAllSources } from '@/utils/multiFoodDetector';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';
import { ANALYSIS_TIMEOUT_MS } from '@/config/timeouts';
import { normalizeServing, getServingDebugInfo } from '@/utils/servingNormalization';
import { DebugPanel } from '@/components/camera/DebugPanel';
import { ActivityLoggingSection } from '@/components/logging/ActivityLoggingSection';

// jsQR removed - barcode scanning now handled by ZXing in HealthScannerInterface

interface RecognizedFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  confidence: number;
  serving: string;
  ingredientsText?: string;
  ingredientsAvailable?: boolean;
  image?: string;
  allergens?: string[];
  additives?: string[];
  categories?: string[];
  _provider?: string;
}

interface BarcodeDetectorResult {
  rawValue: string;
}

// Enhanced VoiceResults interface matching multi-AI response
interface VoiceResults {
  foods: Array<{
    name: string;
    confidence: number;
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
    };
    serving?: string;
  }>;
  confidence: number;
  provider: string;
}

interface VisionResults {
  foods: Array<{
    name: string;
    confidence: number;
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
    };
    serving?: string;
  }>;
  confidence: number;
  provider: string;
}

const CameraPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Use the scroll-to-top hook
  useScrollToTop();

  const [activeTab, setActiveTab] = useState<'main' | 'recent' | 'saved'>(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    return (tab === 'recent' || tab === 'saved') ? tab : 'main';
  });

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisRequestId, setAnalysisRequestId] = useState<string | null>(null);
  const [recognizedFoods, setRecognizedFoods] = useState<RecognizedFood[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showVoiceEntry, setShowVoiceEntry] = useState(false);
  const [showVoiceAnalyzing, setShowVoiceAnalyzing] = useState(false);
  const [isManualAnalyzing, setIsManualAnalyzing] = useState(false);
  const [showProcessingNextItem, setShowProcessingNextItem] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [visionResults, setVisionResults] = useState<VisionResults | null>(null);
  const [voiceResults, setVoiceResults] = useState<VoiceResults | null>(null);
  const [inputSource, setInputSource] = useState<'photo' | 'voice' | 'manual' | 'barcode'>('photo');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showLogBarcodeScanner, setShowLogBarcodeScanner] = useState(false);
  const [isLoadingBarcode, setIsLoadingBarcode] = useState(false);
  const [showBarcodeNotFound, setShowBarcodeNotFound] = useState(false);
  const [failedBarcode, setFailedBarcode] = useState('');
  const { addRecentBarcode } = useRecentBarcodes();
  const { addToHistory } = useBarcodeHistory();
  const { scoreMealAfterInsert } = useMealScoring();
  const { saveFood } = useNutritionPersistence();
  
  // Review Items Screen states
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [selectedFoodItem, setSelectedFoodItem] = useState<any>(null);
  
  // Summary Review Panel states
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  const [summaryItems, setSummaryItems] = useState<SummaryItem[]>([]);
  
  // Transition states
  const [showTransition, setShowTransition] = useState(false);
  
  // Error handling states
  const [showError, setShowError] = useState(false);
  const [errorType, setErrorType] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorSuggestions, setErrorSuggestions] = useState<string[]>([]);
  const [showManualEdit, setShowManualEdit] = useState(false);
  const [manualEditText, setManualEditText] = useState('');
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  
  // Multi-AI food detection states
  const [showMultiAIDetection, setShowMultiAIDetection] = useState(false);
  const [multiAIResults, setMultiAIResults] = useState<Array<{name: string; confidence: number; sources: string[]; calories?: number; portion?: string; isEstimate?: boolean}>>([]);
  const [isMultiAILoading, setIsMultiAILoading] = useState(false);
  
  // Manual entry states
  const [showManualBarcodeEntry, setShowManualBarcodeEntry] = useState(false);
  const [showManualFoodEntry, setShowManualFoodEntry] = useState(false);
  
  // Tab navigation state
  
  // Saved foods refetch function
  const [refetchSavedFoods, setRefetchSavedFoods] = useState<(() => Promise<void>) | null>(null);
  
  // Processing state moved from duplicate declaration below
  const [isProcessingFood, setIsProcessingFood] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { addFood } = useNutrition();
  const { isRecording, isProcessing: isVoiceProcessing, recordingDuration, startRecording, stopRecording } = useVoiceRecording();
  const { playFoodLogConfirm } = useSound();

  // Add nutrition facts capture state  
  const [captureMode, setCaptureMode] = useState<CaptureMode>('barcode');
  const [nutritionOverlay, setNutritionOverlay] = useState<string | null>(null);
  const [lastUPCData, setLastUPCData] = useState<any>(null);

  // Add loading timeout hook for global timeout management
  const { hasTimedOut, showRecovery, retry, forceSkip } = useLoadingTimeout(
    // isAnalyzing || isMultiAILoading || isProcessingFood,
    false, // simplified for now
    {
      timeoutMs: ANALYSIS_TIMEOUT_MS,
      onTimeout: () => {
        console.error('⏰ Global loading timeout reached');
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        // setErrorType('timeout');
        // setErrorMessage('Analysis timed out. Please try again or use manual entry.');
        // setShowError(true);
      }
    }
  );

  const setServing = useCallback((grams: number) => {
    console.log('[PORTION][RESOLVE] set serving grams:', grams);
    
    // Update the recognized food with the correct serving grams
    if (lastUPCData) {
      const updatedMapped = { ...lastUPCData, servingGrams: grams };
      
      const recognizedFood: RecognizedFood = {
        name: updatedMapped.name,
        calories: updatedMapped.calories || 0,
        protein: updatedMapped.protein_g || 0,
        carbs: updatedMapped.carbs_g || 0,
        fat: updatedMapped.fat_g || 0,
        fiber: updatedMapped.fiber_g || 0,
        sugar: updatedMapped.sugar_g || 0,
        sodium: updatedMapped.sodium_mg || 0,
        confidence: 95,
        serving: `Per serving (${grams}g)`,
        ingredientsText: updatedMapped.ingredientsText,
        ingredientsAvailable: !!updatedMapped.ingredientsText,
        image: updatedMapped.imageUrl,
        allergens: updatedMapped.allergens,
        additives: updatedMapped.additives,
        categories: updatedMapped.categories,
        _provider: updatedMapped._provider
      };

      // setRecognizedFoods([recognizedFood]);
      // setShowConfirmation(true);
      
      // addRecentBarcode({
      //   barcode: updatedMapped.barcode,
      //   productName: recognizedFood.name,
      //   nutrition: {
      //     calories: recognizedFood.calories,
      //     protein: recognizedFood.protein,
      //     carbs: recognizedFood.carbs,
      //     fat: recognizedFood.fat,
      //     fiber: recognizedFood.fiber,
      //     sugar: recognizedFood.sugar,
      //     sodium: recognizedFood.sodium
      //   }
      // });
    }
    
    setCaptureMode('barcode');
    setNutritionOverlay(null);
    setLastUPCData(null);
  }, [lastUPCData]);

  const captureNutritionImage = useCallback(async () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Capture current canvas content
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        // Convert blob to base64 for OCR
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          
          try {
            // Call OCR service
            const { data, error } = await supabase.functions.invoke('vision-ocr', {
              body: { 
                image: base64.split(',')[1], // Remove data:image prefix
                mode: 'nutrition_facts'
              }
            });

            if (error) {
              console.error('[PORTION][OCR] OCR error:', error);
              throw error;
            }

            const text = data?.text || '';
            console.log('[PORTION][OCR] raw text length=', text?.length);

            // Quick gate: only accept if text contains Nutrition or Serving
            if (!/\bnutrition\s*facts\b/i.test(text) && !/\bserving\s*size\b/i.test(text)) {
              console.log('[PORTION][OCR] validator: Nutrition/Serving keywords not found');
              toast("Invalid Image", {
                description: "Please capture an image that shows the Nutrition Facts panel with serving size information.",
              });
              return;
            }

            // Log top lines that match the interesting filter
            const lines = (text ?? '').split(/\r?\n/);
            const matched: string[] = [];
            for (const ln of lines) { 
              if (NUTRIENT_OR_SERVING.test(ln)) matched.push(ln.trim()); 
            }
            console.log('[PORTION][OCR] matched lines:', matched.slice(0, 5));

            const grams = extractServingGramsFromText(text ?? '');
            if (grams) {
              console.log('[PORTION][RESOLVE] rule=serving_parser grams=', grams);
              setServing(grams);
              return;
            }

            // Fallback by inferred category (avoid brand strings)
            const title = lastUPCData?.title || lastUPCData?.name;
            const ingredients = lastUPCData?.ingredientsText;
            const effectiveTitle = isBrand(title) ? '' : title;
            const cat = inferCategory({ title: effectiveTitle, ingredients });
            const fb = fallbackServingGramsByCategory(cat);
            console.log('[PORTION][RESOLVE] rule=fallback category=', cat, 'grams=', fb);
            setServing(fb);
            
          } catch (error) {
            console.error('[PORTION][OCR] Processing error:', error);
            toast("OCR Failed", {
              description: "Could not process the nutrition facts image. Please try again.",
            });
          }
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.8);
    } catch (error) {
      console.error('[PORTION][OCR] Capture error:', error);
    }
  }, [lastUPCData, setServing]);

  // Simplified barcode handler for demo
  const handleBarcodeDetected = useCallback(async (barcode: string) => {
    console.log('Barcode detected:', barcode);
    
    // Simulate UPC lookup
    const mockUPCData = {
      name: 'Test Product',
      title: 'Test Product Title',
      servingGrams: null, // This will trigger nutrition facts capture
      ingredientsText: 'Ingredients list...'
    };
    
    // Check if we have serving grams from the barcode lookup
    if (!mockUPCData.servingGrams) {
      console.log('[PORTION][BARCODE] No serving grams found, requesting nutrition facts capture');
      setLastUPCData({
        ...mockUPCData,
        barcode: barcode
      });
      setCaptureMode('nutrition');
      setNutritionOverlay('Photograph the Nutrition Facts panel. Make sure "Serving size" is visible.');
      return;
    }
    
    // Handle normal barcode processing if serving grams exist
    console.log('Processing barcode with serving grams:', mockUPCData.servingGrams);
  }, []);

  // Render nutrition facts capture overlay
  const renderNutritionCaptureOverlay = () => {
    if (captureMode !== 'nutrition') return null;

    return (
      <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md bg-background text-foreground">
          <CardHeader>
            <CardTitle className="text-center">Nutrition Facts Needed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm">
              {nutritionOverlay}
            </p>
            <div className="flex gap-3">
              <Button 
                onClick={captureNutritionImage}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capture
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setCaptureMode('barcode');
                  setNutritionOverlay(null);
                  setLastUPCData(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Camera view */}
      <div className="relative">
        <canvas 
          ref={canvasRef}
          className="w-full h-64 bg-gray-100 rounded-lg"
          width="640"
          height="480"
        />
        
        {/* Nutrition Facts Capture Overlay */}
        {renderNutritionCaptureOverlay()}
      </div>

      {/* Test button for barcode detection */}
      <div className="p-4">
        <Button onClick={() => handleBarcodeDetected('123456789012')}>
          Test Barcode Detection
        </Button>
      </div>

      {/* Activity Logging Section - Exercise, Recovery, Habits */}
      <div className="mt-8">
        <ActivityLoggingSection />
      </div>
    </div>
  );
};

export default CameraPage;
