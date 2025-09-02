import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Upload, Check, X, Sparkles, Mic, MicOff, Edit3, ScanBarcode, FileText, Save, Clock, Droplets, Pill } from 'lucide-react';
import { useNutrition } from '@/contexts/NutritionContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { mapToLogFood } from '@/features/logging/utils/barcodeToLogFood';
import { useAuth } from '@/contexts/auth';
import { SavedSetsSheet } from '@/components/camera/SavedSetsSheet';
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
import { parseOCRServing } from '@/lib/nutrition/parsers/ocrServing';
import { buildLogPrefill } from '@/lib/health/logPrefill';
import { callOCRFunctionWithDataUrl } from '@/lib/ocrClient';
import { toDisplayableImageUrl } from '@/lib/ui/imageUrl';

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
import { analyzePhotoForLyfV1 } from '@/lyf_v1_frozen';
import { looksFoodish } from '@/lyf_v1_frozen/filters';
import { mapVisionNameToFood } from '@/lyf_v1_frozen/mapToNutrition';
import { FF } from '@/featureFlags';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';
import { ANALYSIS_TIMEOUT_MS } from '@/config/timeouts';
import { normalizeServing, getServingDebugInfo } from '@/utils/servingNormalization';
import { DebugPanel } from '@/components/camera/DebugPanel';
import { ActivityLoggingSection } from '@/components/logging/ActivityLoggingSection';
// Import smoke tests for development
import '@/utils/smokeTests';
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
  serving?: string;
  image?: string | null;
  imageUrl?: string | null; // ✅ canonical image property
  ingredientsText?: string;
  ingredientsAvailable?: boolean;
  // Additional data for flag detection
  allergens?: string[];
  additives?: string[];
  categories?: string[];
  _provider?: string;
  voiceContext?: {
    originalText: string;
    itemIndex: number;
    totalItems: number;
    isVoiceInput: boolean;
  };
  requiresPortionConfirmation?: boolean;
  // Portion scaling context
  basePer100?: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    sodium_mg: number;
  } | null;
  portionGrams?: number | null;
  factor?: number;
}

interface VisionApiResponse {
  labels: Array<{ description: string; score: number }>;
  foodLabels: Array<{ description: string; score: number }>;
  nutritionData: any;
  textDetected: string;
  objects: Array<{ name: string; score: number }>;
  error?: boolean;
  message?: string;
}

interface FoodItem {
  name: string;
  quantity?: string;
  preparation?: string;
}

interface VoiceApiResponse {
  success: boolean;
  items?: FoodItem[];
  originalText: string;
  errorType?: string;
  errorMessage?: string;
  suggestions?: string[];
  detectedItems?: string[];
  error?: string;
  model_used?: string;
  fallback_used?: boolean;
}

// Helper functions for UI formatting
function titleCase(s: string){ 
  return s.replace(/\b\w/g, m => m.toUpperCase()) 
}

function guessDefaultGrams(name: string){
  // keep existing heuristic (e.g., 85g protein, 100g veg)
  return /salmon|chicken|beef/i.test(name) ? 120 : /asparagus|tomato|lettuce/i.test(name) ? 80 : 100
}

const CameraPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use the scroll-to-top hook
  useScrollToTop();
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
  const [visionResults, setVisionResults] = useState<VisionApiResponse | null>(null);
  const [voiceResults, setVoiceResults] = useState<VoiceApiResponse | null>(null);
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
  const [activeTab, setActiveTab] = useState<'main' | 'saved' | 'recent'>('main');
  const [showSavedSetsSheet, setShowSavedSetsSheet] = useState(false);
  
  // Saved foods refetch function
  const [refetchSavedFoods, setRefetchSavedFoods] = useState<(() => Promise<void>) | null>(null);
  
  // Processing state moved from duplicate declaration below
  const [isProcessingFood, setIsProcessingFood] = useState(false);
  
  // Nutrition capture states
  const [currentMode, setCurrentMode] = useState<'photo' | 'voice' | 'manual' | 'barcode' | 'nutrition-capture' | 'confirm'>('photo');
  const [nutritionCaptureData, setNutritionCaptureData] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { addFood } = useNutrition();
  const { isRecording, isProcessing: isVoiceProcessing, recordingDuration, startRecording, stopRecording } = useVoiceRecording();
  const { playFoodLogConfirm } = useSound();
  const { user } = useAuth();
  
  // Add loading timeout hook for global timeout management
  const { hasTimedOut, showRecovery, retry, forceSkip } = useLoadingTimeout(
    isAnalyzing || isMultiAILoading || isProcessingFood,
    {
      timeoutMs: ANALYSIS_TIMEOUT_MS,
      onTimeout: () => {
        console.error('⏰ Global loading timeout reached');
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        setErrorType('timeout');
        setErrorMessage('Analysis timed out. Please try again or use manual entry.');
        setShowError(true);
      }
    }
  );

  // Effect to handle reset from navigation
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('reset') === 'true') {
      setActiveTab('main');
      // Clean up the URL by removing the reset parameter
      navigate('/camera', { replace: true });
    }
  }, [location.search, navigate]);

const CONFIRM_FIX_REV = "2025-08-31T13:36Z-r7";

  // Handle prefill data from Health Report
  useEffect(() => {
    const prefill = (location.state as any)?.logPrefill;
    if (!prefill || prefill.source !== 'health-report') return;
    
    const rawImg = prefill?.item?.image ?? prefill?.item?.imageUrl ?? "";
    const imageKind = /^https?:\/\//i.test(rawImg) ? "http" : "none";
    console.log("[PREFILL][ARRIVE]", {
      rev: CONFIRM_FIX_REV,
      keys: Object.keys(prefill?.item || {}),
      imageKind,
      url: rawImg?.slice(0, 120) || "none",
    });
    
    if (prefill.item.imageUrl) {
      console.log('[CAMERA][PREFILL][image]', { 
        length: prefill.item.imageUrl.length, 
        head: prefill.item.imageUrl.slice(0, 60) + '...' 
      });
    }
    
    console.debug('[CAMERA][PREFILL]', {
      itemName: prefill.item.itemName,
      portionGrams: prefill.item.portionGrams,
      hasIngredients: !!prefill.item.ingredientsText,
      source: prefill.source
    });
    
    // Map prefill data to RecognizedFood format
    const serving = prefill.item.portionGrams ? `${prefill.item.portionGrams}g` : 'Unknown serving';
    
    console.log('[CAMERA][PREFILL]', { hasImage: !!prefill.item.imageUrl, len: prefill.item.imageUrl?.length ?? 0 });
    
    const img = imageKind === "http" ? rawImg : null;

    const base100 = prefill.item.nutrientsPer100 ?? null;
    const scaled = prefill.item.nutrientsScaled;
    const factor = scaled.factor ?? (prefill.item.portionGrams ? prefill.item.portionGrams / 100 : 1);

    const prefillFood: RecognizedFood = {
      name: prefill.item.itemName,
      // Show per-portion numbers for full slider:
      calories: scaled.calories,
      protein: scaled.protein_g,
      carbs: scaled.carbs_g,
      fat: scaled.fat_g,
      fiber: scaled.fiber_g,
      sugar: scaled.sugar_g,
      sodium: scaled.sodium_mg,
      // slider/scaling context:
      basePer100: base100,       // used to scale when slider moves
      portionGrams: prefill.item.portionGrams,
      factor,                    // grams/100 for 100% slider
      confidence: 95,
      serving: serving,
      image: img,       // primary
      imageUrl: img,    // compatibility for any reader
      ingredientsText: prefill.item.ingredientsText,
      ingredientsAvailable: !!prefill.item.ingredientsText,
      allergens: prefill.item.allergens,
      additives: prefill.item.additives,
      categories: prefill.item.categories,
      _provider: 'health-report',
      // Pass the flag the UI can use
      requiresPortionConfirmation: prefill.item.requiresConfirmation
    };
    
    // Open confirm modal with prefilled data
    setRecognizedFoods([prefillFood]);
    setShowConfirmation(true);
    setInputSource('photo'); // Use photo source for UI display
    
    // Clear the router state so back/forward doesn't re-trigger
    navigate('.', { replace: true, state: null });
  }, [location.state, navigate]);

  // Detect "nutrition-capture" mode on entry
  useEffect(() => {
    const mode = (location.state as any)?.mode;
    const productData = (location.state as any)?.productData;

    if (mode === 'nutrition-capture' && productData) {
      console.log('[CAMERA][NUTRITION_CAPTURE]', 'Starting NF capture flow');
      setCurrentMode('nutrition-capture');
      setNutritionCaptureData(productData);
    }
  }, [location.state]);
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('reset') === 'true') {
      setActiveTab('main');
      // Clean up the URL by removing the reset parameter
      navigate('/camera', { replace: true });
    }
  }, [location.search, navigate]);

  // Auto-dismiss error when analysis succeeds
  useEffect(() => {
    if (recognizedFoods.length > 0 || reviewItems.length > 0) {
      setShowError(false);
    }
  }, [recognizedFoods.length, reviewItems.length]);

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Helper function to compress image with quality guard
  const compressImageIfNeeded = async (file: File): Promise<string> => {
    const fileSizeMB = file.size / (1024 * 1024);
    
    console.log('Original image size:', fileSizeMB.toFixed(2), 'MB');
    
    // Get image dimensions for orientation handling
    const dimensions = await getImageDimensions(file);
    console.log('Original dimensions:', dimensions);
    
    const longestSide = Math.max(dimensions.width, dimensions.height);
    
    if (fileSizeMB <= 1 && longestSide >= 1280 && longestSide <= 1600) {
      // Image is already optimal, convert directly to base64
      console.log('Image is optimal, no compression needed');
      return await fileToBase64(file);
    }

    console.log('Compressing image with quality guard...');
    
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: longestSide < 1280 ? 1280 : Math.min(longestSide, 1600),
        initialQuality: 0.85, // Use 0.80-0.85 quality range
        useWebWorker: true,
        preserveExif: true, // Preserve orientation
      };

      const compressedFile = await imageCompression(file, options);
      const compressedSizeMB = compressedFile.size / (1024 * 1024);
      
      console.log('Compressed image size:', compressedSizeMB.toFixed(2), 'MB');
      
      return await fileToBase64(compressedFile);
    } catch (error) {
      console.error('Error compressing image:', error);
      toast.error('Failed to compress image. Using original size.');
      return await fileToBase64(file);
    }
  };

  const processNutritionData = async (source: 'photo' | 'voice' | 'manual', data: VisionApiResponse | VoiceApiResponse): Promise<RecognizedFood[]> => {
    const foods: RecognizedFood[] = [];
    const CONFIDENCE_THRESHOLD = 40; // 40% confidence threshold
    
    if (source === 'voice' && 'items' in data) {
      // Process voice API response (legacy support)
      const voiceData = data as VoiceApiResponse;
      if (voiceData.success && voiceData.items) {
        // Legacy support - this should not be used in the new multi-item flow
        voiceData.items.forEach(item => {
          foods.push({
            name: `${item.name} (Voice Input)`,
            calories: 200, // Default values for legacy support
            protein: 10,
            carbs: 30,
            fat: 8,
            fiber: 3,
            sugar: 5,
            sodium: 300,
            confidence: 80,
            serving: item.quantity || 'Voice estimated portion',
          });
        });
      }
    } else if (source === 'photo' && 'labels' in data) {
      // Process vision API response with confidence filtering
      const visionData = data as VisionApiResponse;
      
      // Check if we have any high-confidence food labels
      const highConfidenceFoodLabels = visionData.foodLabels.filter(label => 
        (label.score * 100) >= CONFIDENCE_THRESHOLD
      );
      
      // If no high-confidence food labels found, don't process any results
      if (highConfidenceFoodLabels.length === 0) {
        console.log('No high-confidence food detection found. Highest confidence:', 
          Math.max(...visionData.foodLabels.map(l => l.score * 100), 0).toFixed(1) + '%'
        );
        return []; // Return empty array to trigger warning message
      }
      
      if (visionData.nutritionData && Object.keys(visionData.nutritionData).length > 0) {
        const mainLabel = visionData.foodLabels[0];
        const confidence = Math.round((mainLabel?.score || 0.5) * 100);
        
        // Only add if confidence meets threshold
        if (confidence >= CONFIDENCE_THRESHOLD) {
          foods.push({
            name: mainLabel.description,
            calories: visionData.nutritionData.calories || 0,
            protein: visionData.nutritionData.protein || 0,
            carbs: visionData.nutritionData.carbs || 0,
            fat: visionData.nutritionData.fat || 0,
            fiber: visionData.nutritionData.fiber || 0,
            sugar: visionData.nutritionData.sugar || 0,
            sodium: visionData.nutritionData.sodium || 0,
            confidence: confidence,
            serving: 'As labeled',
          });
        }
      } else {
        // For each high-confidence food label, use async nutrition estimation
        for (const label of highConfidenceFoodLabels) {
          const estimatedNutrition = await estimateNutritionFromLabel(
            label.description, 
            visionData.textDetected, 
            // Extract potential barcode from objects if any
            visionData.objects.find(obj => obj.name.match(/\d{8,}/))?.name
          );
          foods.push({
            name: label.description,
            calories: estimatedNutrition.calories,
            protein: estimatedNutrition.protein,
            carbs: estimatedNutrition.carbs,
            fat: estimatedNutrition.fat,
            fiber: estimatedNutrition.fiber,
            sugar: estimatedNutrition.sugar,
            sodium: estimatedNutrition.sodium,
            confidence: Math.round(label.score * 100),
            serving: 'Estimated portion',
          });
        }
      }
    }

    return foods.slice(0, 3);
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('Image selected:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate the image file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    if (validation.warning) {
      setValidationWarning(validation.warning);
      toast.warning(validation.warning);
    }

    try {
      // Compress image if needed and convert to base64
      const imageBase64 = await compressImageIfNeeded(file);
      const imageDataUrl = `data:${file.type};base64,${imageBase64}`;
      
      console.log('Image processed successfully');
      setSelectedImage(imageDataUrl);
      setShowVoiceEntry(false);
      setVoiceText('');
      setVisionResults(null);
      setVoiceResults(null);
      setInputSource('photo');
      resetErrorState();
      setValidationWarning(null);
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image. Please try again.');
    }
  };

  const convertToBase64 = (imageDataUrl: string): string => {
    return imageDataUrl.split(',')[1];
  };

  // Barcode detection utilities
  const detectBarcode = async (imageDataUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // jsQR removed - barcode scanning now handled by ZXing in HealthScannerInterface
        console.log('[Camera] QR detection removed - using ZXing barcode scanner instead');
        resolve(null); // Always return null since QR scanning is disabled
      };
      img.onerror = () => resolve(null);
      img.src = imageDataUrl;
    });
  };

  const isLikelyBarcode = (imageDataUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(false);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Analyze image characteristics
        let blackWhitePixels = 0;
        let totalPixels = data.length / 4;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;
          
          // Count pixels that are distinctly black or white
          if (brightness < 50 || brightness > 200) {
            blackWhitePixels++;
          }
        }
        
        const blackWhiteRatio = blackWhitePixels / totalPixels;
        
        // If more than 60% of pixels are black or white, likely a barcode
        resolve(blackWhiteRatio > 0.6);
      };
      img.onerror = () => resolve(false);
      img.src = imageDataUrl;
    });
  };

  const processBarcodeData = async (barcodeData: string) => {
    try {
      console.log('=== PROCESSING BARCODE DATA ===');
      await handleBarcodeDetected(barcodeData);
      console.log('=== BARCODE PROCESSING COMPLETE ===');
    } catch (error) {
      console.error('=== BARCODE PROCESSING ERROR ===', error);
      toast.error("We couldn't read the barcode. Please try a clearer image or enter the code manually.");
      throw error; // Re-throw to ensure calling function handles it properly
    } finally {
      setIsAnalyzing(false);
      setProcessingStep('');
    }
  };

  // Nutrition capture completion handler
  const completeNutritionCapture = async (nfImageDataUrl: string) => {
    try {
      setIsAnalyzing(true);
      setProcessingStep('Extracting nutrition facts...');

      console.log('[CAMERA][NUTRITION_CAPTURE][START]', 'OCR processing nutrition facts image');
      
      // Ensure we DO NOT pass nfImageDataUrl into prefill - log once
      console.log('[PREFILL][GUARD]', {
        rev: CONFIRM_FIX_REV, 
        droppedBase64: true, 
        length: nfImageDataUrl?.length || 0
      });

      // Extract text from nutrition facts image using OCR
      const ocrResult = await callOCRFunctionWithDataUrl(nfImageDataUrl);
      const ocrText = ocrResult.summary?.text_joined || '';

      console.log('[CAMERA][NUTRITION_CAPTURE][OCR_TEXT]', { textLength: ocrText.length });

      // Parse serving grams from OCR text
      const ocr = parseOCRServing(ocrText);
      const grams = ocr?.grams ?? null;

      console.log('[CAMERA][NUTRITION_CAPTURE][OCR]', { 
        grams, 
        confidence: ocr?.confidence,
        source: ocr?.source,
        extractedText: ocr?.extractedText 
      });

      const pd = nutritionCaptureData || {};
      const name = pd.name || 'Unknown Product';

      const prefill = buildLogPrefill(
        name,
        pd.brand,
        undefined,                      // NEVER pass base64 - removed nfImageDataUrl
        pd.ingredientsText,
        [], [], [],
        {
          calories: 0, fat_g: 0, carbs_g: 0,
          sugar_g: 0, fiber_g: 0, protein_g: 0, sodium_mg: 0,
        },
        grams,
        true  // requiresConfirmation if grams is null
      );

      console.log('[PREFILL][GUARD]', {
        rev: CONFIRM_FIX_REV, 
        droppedBase64: true, 
        length: nfImageDataUrl?.length || 0 
      });

      console.log('[CAMERA][NUTRITION_CAPTURE][PREFILL]', {
        grams,
        requiresConfirmation: prefill.item.requiresConfirmation,
        hasImage: !!nfImageDataUrl
      });

      // Reuse existing confirm flow by passing logPrefill back into this route
      navigate('.', { replace: true, state: { logPrefill: prefill } });

      // Reset mode state
      setCurrentMode('photo');
      setNutritionCaptureData(null);
      setSelectedImage(null);

    } catch (e) {
      console.error('[CAMERA][NUTRITION_CAPTURE][ERROR]', e);
      toast.error('Failed to process nutrition facts. Please try again or enter manually.');
      // Keep user in capture mode; they can retake the photo
    } finally {
      setIsAnalyzing(false);
      setProcessingStep('');
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) {
      console.error('No selected image to analyze');
      toast.error('No image selected');
      return;
    }

    // Handle nutrition-capture mode separately
    if (currentMode === 'nutrition-capture') {
      return completeNutritionCapture(selectedImage);
    }

    console.log('=== Starting image analysis ===');
    setIsAnalyzing(true);
    setProcessingStep('Validating image...');
    
    // Create AbortController for this request
    abortControllerRef.current = new AbortController();
    
    // Generate unique request ID and setup abort controller
    const requestId = crypto.randomUUID();
    setAnalysisRequestId(requestId);
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    const timeoutId = setTimeout(() => {
      console.warn('⏰ Analysis timeout reached, aborting request');
      controller.abort('timeout');
    }, ANALYSIS_TIMEOUT_MS);
    
    try {
      // STEP 1: Check if this looks like a barcode FIRST
      setProcessingStep('Analyzing your photo… this can take up to ~35s for complex images.');
      
      // Wrap analysis with abort controller
      const analysisPromise = (async () => {
        const isBarcode = await isLikelyBarcode(selectedImage);
        
        if (isBarcode) {
          console.log('=== BARCODE DETECTION PATH ===');
          console.log('Image appears to be a barcode, attempting to decode...');
          setProcessingStep('Detecting barcode...');
          setInputSource('barcode');
          
          const barcodeData = await detectBarcode(selectedImage);
          
          if (barcodeData) {
            console.log('Barcode successfully decoded:', barcodeData);
            setProcessingStep('Processing barcode...');
            
            // Process the barcode using existing barcode lookup logic
            await processBarcodeData(barcodeData);
            
            // CRITICAL: Hard return here - no food detection allowed
            console.log('=== BARCODE PATH COMPLETE - STOPPING HERE ===');
            return;
          } else {
            // Barcode detection failed, show fallback message and STOP
            console.log('=== BARCODE DECODING FAILED - STOPPING HERE ===');
            toast.error("We couldn't read the barcode. Please try a clearer image or enter the code manually.");
            
            // CRITICAL: Hard return here - no food detection fallback
            return;
          }
        }
        
        // STEP 2: Only reach here if NOT a barcode - proceed with detection router
        console.log('=== DETECTION ROUTER PATH ===');
        console.log('Image does not appear to be a barcode, proceeding with detection...');
        
        // Use the unified detection router
        const imageBase64 = convertToBase64(selectedImage);
        setProcessingStep('Detecting food items...');
        setIsAnalyzing(true);
        
        try {
          const { getDetectMode, detectWithGpt, detectWithVision, detectWithLyfV1Vision } = await import('@/lib/detect/router');
          
          const mode = getDetectMode();
          console.info('[DETECT][mode]', mode);
          
          let items = [];
          
          switch (mode) {
            case 'GPT_ONLY':
              items = await detectWithGpt(imageBase64);
              break;
              
            case 'GPT_FIRST':
              try {
                items = await detectWithGpt(imageBase64);
                if (!items?.length) {
                  console.warn('[DETECT] GPT empty, fallback to Vision');
                  console.info('[REPORT][V2][GPT_FAIL] Vision Fallback');
                  items = await detectWithVision(imageBase64);
                }
              } catch (e) {
                console.warn('[DETECT] GPT error, fallback', e);
                console.info('[REPORT][V2][GPT_FAIL] Vision Fallback');
                items = await detectWithVision(imageBase64);
              }
              break;
              
            case 'VISION_ONLY':
            default:
              items = await detectWithLyfV1Vision(imageBase64);
              break;
          }
          
          console.log('[CAMERA][DETECT] items_detected=', items.length, { mode });
          
          if (items.length === 0) {
            // No foods detected - show toast and don't render any legacy panel
            toast.error('No foods detected. Try a clearer photo or add manually.');
            setIsAnalyzing(false);
            return;
          }

          // Transform to ReviewItem format for the new UI
          const reviewItems: ReviewItem[] = items.map((item: any, index: number) => ({
            id: `detect-${index}`,
            name: item.name,
            portion: `${item.grams}g`,
            selected: true,
            grams: item.grams,
            canonicalName: item.name,
            needsDetails: false,
            mapped: true
          }));

          console.log('[CAMERA][DETECT] Generated review items:', reviewItems.length);
          console.info('[REVIEW][mode]', mode, 'count=', reviewItems.length);
          
          // Open review screen with atomic handoff
          setReviewItems(reviewItems);
          setShowReviewScreen(true);
          setInputSource('photo'); // Flag for detection source
        } catch (error) {
          console.error('Detection failed:', error);
          toast.error('Food detection failed. Please try again or use manual entry.');
        } finally {
          setIsAnalyzing(false);
        }
      })();
      
      // Await analysis with abort controller
      await analysisPromise;
      
    } catch (error) {
      console.error('=== IMAGE ANALYSIS FAILED ===', error);
      
      const isAborted = error.name === 'AbortError' || controller.signal.aborted;
      const isTimeout = isAborted && error.message === 'timeout';
      
      // Only show error if this is still the current request
      if (analysisRequestId === requestId) {
        if (isTimeout) {
          console.error('⏰ Analysis timeout reached');
          setErrorType('timeout');
          setErrorMessage('Image analysis timed out. This may be due to slow internet or high server load.');
          setErrorSuggestions([
            'Try a clearer, smaller image',
            'Check your internet connection',
            'Retry in a few moments',
            'Try manual food entry instead'
          ]);
          setShowError(true);
          toast.error('Analysis timed out. Please try again or use manual entry.');
        } else if (isAborted) {
          console.log('Analysis was cancelled');
          toast.info('Analysis cancelled');
        } else {
          // Generic fallback with error display
          setErrorType('analysis');
          setErrorMessage(error instanceof Error ? error.message : 'Failed to analyze image');
          setShowError(true);
          toast.error('Failed to analyze image. Please try again.');
        }
      }
    } finally {
      clearTimeout(timeoutId);
      setIsAnalyzing(false);
      setProcessingStep('');
      if (analysisRequestId === requestId) {
        setAnalysisRequestId(null);
      }
      abortControllerRef.current = null;
    }
  };

  // Enhanced nutrition estimation with comprehensive debug logging
  const estimateNutritionFromLabel = async (foodName: string, ocrText?: string, barcode?: string) => {
    const debugLog = {
      step: 'nutrition_estimation',
      foodName,
      hasOcrText: !!ocrText,
      hasBarcode: !!barcode,
      barcode,
      barcodeDetected: false,
      brandedProductMatched: false,
      brandedMatchConfidence: 0,
      brandedSource: null,
      genericConfidence: 0,
      sourceChosen: 'unknown',
      reason: 'no_decision_made',
      fallbackUsed: false,
      finalConfidence: 0,
      errors: [] as string[],
      success: false
  };

    console.log('🍎 === NUTRITION ESTIMATION DEBUG START ===');
    console.log('📊 Initial parameters:', { foodName, hasOcrText: !!ocrText, hasBarcode: !!barcode, barcode });
    
    // Step 1: Get both branded and generic data in parallel
    let brandedResult = null;
    let genericResult = null;
    
    try {
      console.log('🔄 STEP 1: Getting both branded and generic nutrition data...');
      
      if (barcode) {
        debugLog.barcodeDetected = true;
        console.log(`✅ BARCODE DETECTED: ${barcode}`);
      } else {
        console.log('❌ NO BARCODE DETECTED');
      }
      
      // Run both lookups in parallel
      const [brandedResponse, genericResponse] = await Promise.allSettled([
        supabase.functions.invoke('match-branded-product', {
          body: {
            productName: foodName,
            ocrText: ocrText,
            barcode: barcode
          }
        }),
        supabase.functions.invoke('gpt-nutrition-estimator', {
          body: { foodName: foodName }
        })
      ]);

      // Process branded response
      if (brandedResponse.status === 'fulfilled' && brandedResponse.value.data && !brandedResponse.value.error) {
        brandedResult = brandedResponse.value.data;
        debugLog.brandedMatchConfidence = brandedResult.confidence;
        debugLog.brandedSource = brandedResult.source;
        
        console.log('🏷️ BRANDED PRODUCT MATCH RESULT:');
        console.log('  ✅ Response received successfully');
        console.log(`  📊 Found: ${brandedResult.found}`);
        console.log(`  🎯 Confidence: ${brandedResult.confidence}%`);
        console.log(`  📍 Source: ${brandedResult.source}`);
        console.log(`  🏪 Product: ${brandedResult.productName || 'N/A'}`);
        console.log(`  🏢 Brand: ${brandedResult.brandName || 'N/A'}`);
      } else {
        debugLog.errors.push(`Branded API error: ${brandedResponse.status === 'fulfilled' ? brandedResponse.value.error?.message : brandedResponse.reason || 'Unknown error'}`);
        console.log('❌ BRANDED PRODUCT API ERROR:', brandedResponse.status === 'fulfilled' ? brandedResponse.value.error : brandedResponse.reason);
      }

      // Process generic response
      if (genericResponse.status === 'fulfilled' && genericResponse.value.data && !genericResponse.value.error) {
        genericResult = genericResponse.value.data;
        debugLog.genericConfidence = genericResult.nutrition?.confidence || 85;
        
        console.log('🧠 GENERIC NUTRITION RESULT:');
        console.log('  ✅ Response received successfully');
        console.log(`  🎯 Confidence: ${debugLog.genericConfidence}%`);
        console.log('  🧪 Nutrition data:', genericResult.nutrition);
      } else {
        debugLog.errors.push(`Generic API error: ${genericResponse.status === 'fulfilled' ? genericResponse.value.error?.message : genericResponse.reason || 'Unknown error'}`);
        console.log('❌ GENERIC NUTRITION API ERROR:', genericResponse.status === 'fulfilled' ? genericResponse.value.error : genericResponse.reason);
      }

      // Step 2: Choose the best source based on the new logic
      console.log('🤔 STEP 2: Choosing best nutrition source...');
      
      const hasBarcode = !!barcode;
      const brandedConfidence = brandedResult?.confidence || 0;
      const genericConfidence = debugLog.genericConfidence || 0;
      const brandedFound = brandedResult?.found || false;
      const genericFound = !!genericResult?.nutrition;
      
      // Check for name token conflicts (prevent "MILKY WAY eggs" type issues)
      const hasNameConflict = brandedResult?.productName && foodName ? 
        !brandedResult.productName.toLowerCase().split(' ').some(token => 
          foodName.toLowerCase().split(' ').includes(token)
        ) : false;

      console.log('📊 DECISION FACTORS:');
      console.log(`  🏷️ Has barcode: ${hasBarcode}`);
      console.log(`  📈 Branded confidence: ${brandedConfidence}%`);
      console.log(`  📈 Generic confidence: ${genericConfidence}%`);
      console.log(`  ✅ Branded found: ${brandedFound}`);
      console.log(`  ✅ Generic found: ${genericFound}`);
      console.log(`  ⚠️ Name conflict: ${hasNameConflict}`);
      console.log(`  🔤 Food name: "${foodName}"`);
      console.log(`  🏪 Branded name: "${brandedResult?.productName || 'N/A'}"`);

      let chosenSource = null;
      let reason = '';

      // Decision logic: Prefer GENERIC unless specific conditions are met
      if (hasBarcode && brandedFound && brandedConfidence >= 95) {
        // Use branded if we have a barcode and high confidence
        chosenSource = 'branded';
        reason = 'barcode_high_confidence';
      } else if (hasNameConflict) {
        // Never use branded if there's a name conflict
        chosenSource = 'generic';
        reason = 'name_conflict_avoid_branded';
      } else if (!genericFound && brandedFound && brandedConfidence >= 90) {
        // Use branded only if generic failed and branded is decent
        chosenSource = 'branded';
        reason = 'generic_failed_branded_available';
      } else if (genericFound && brandedFound && genericConfidence < 70 && brandedConfidence >= 95) {
        // Use branded only if generic confidence is low AND branded is very high AND no conflicts
        chosenSource = 'branded';
        reason = 'low_generic_high_branded';
      } else if (genericFound) {
        // Default: prefer generic
        chosenSource = 'generic';
        reason = 'prefer_generic';
      } else if (brandedFound) {
        // Last resort: use branded if available
        chosenSource = 'branded';
        reason = 'last_resort_branded';
      }

      debugLog.sourceChosen = chosenSource || 'none';
      debugLog.reason = reason;

      console.log(`🎯 DECISION: Using ${chosenSource} source (${reason})`);

      // Return the chosen result
      if (chosenSource === 'branded' && brandedResult) {
        debugLog.brandedProductMatched = true;
        debugLog.finalConfidence = brandedResult.confidence;
        debugLog.success = true;
        
        console.log('✅ RETURNING BRANDED NUTRITION DATA');
        console.log('🏆 BRANDED NUTRITION DATA:', brandedResult.nutrition);
        
        return {
          ...brandedResult.nutrition,
          isBranded: true,
          source: 'branded-database',
          confidence: brandedResult.confidence / 100,
          brandInfo: {
            productName: brandedResult.productName,
            brandName: brandedResult.brandName,
            productId: brandedResult.productId,
            confidence: brandedResult.confidence,
            source: brandedResult.source
          },
          debugLog
        };
      } else if (chosenSource === 'generic' && genericResult) {
        debugLog.finalConfidence = genericResult.nutrition.confidence || 85;
        debugLog.success = true;
        
        console.log('✅ RETURNING GENERIC NUTRITION DATA');
        console.log('🧪 GENERIC NUTRITION DATA:', genericResult.nutrition);
        
        return {
          calories: genericResult.nutrition.calories,
          protein: genericResult.nutrition.protein,
          carbs: genericResult.nutrition.carbs,
          fat: genericResult.nutrition.fat,
          fiber: genericResult.nutrition.fiber,
          sugar: genericResult.nutrition.sugar,
          sodium: genericResult.nutrition.sodium,
          saturated_fat: genericResult.nutrition.saturated_fat,
          isBranded: false,
          source: 'usda-gpt-estimation',
          confidence: (genericResult.nutrition.confidence || 85) / 100,
          debugLog
        };
      }

    } catch (error) {
      debugLog.errors.push(`Nutrition estimation exception: ${error.message}`);
      console.error('❌ NUTRITION ESTIMATION EXCEPTION:', error);
    }

    // Fallback to database lookups (stubbed for now)
    console.log('🔄 STEP 3: Attempting database lookups...');
    // TODO: Implement Open Food Facts / USDA lookups
    debugLog.errors.push('Database lookups not yet implemented');
    
    // Final fallback to hardcoded values
    debugLog.fallbackUsed = true;
    debugLog.finalConfidence = 40; // Low confidence for hardcoded estimates
    
    console.log('⚠️ FINAL FALLBACK: Using hardcoded generic values...');
    
    // Return generic nutrition estimates with realistic variation
    const baseCalories = Math.round(120 + Math.random() * 80); // 120-200 range
    return {
      calories: baseCalories,
      protein: Math.round(baseCalories * 0.1 + Math.random() * 5), // 0.1-0.15 ratio
      carbs: Math.round(baseCalories * 0.4 + Math.random() * 10), // 0.4-0.5 ratio  
      fat: Math.round(baseCalories * 0.2 / 9 + Math.random() * 3), // 0.2-0.25 ratio
      fiber: Math.round(2 + Math.random() * 3), // 2-5g range
      sugar: Math.round(3 + Math.random() * 7), // 3-10g range
      sodium: Math.round(200 + Math.random() * 200), // 200-400mg range
      saturated_fat: Math.round(1 + Math.random() * 2), // 1-3g range
      isBranded: false,
      source: 'hardcoded-fallback',
      confidence: 0.4,
      debugLog
    };
  };

  // Barcode lookup function - Enhanced with ingredient detection
  const handleBarcodeDetected = async (barcode: string) => {
    try {
      setIsLoadingBarcode(true);
      setInputSource('barcode');
      console.log('=== BARCODE LOOKUP START ===');
      console.log('Barcode detected:', barcode);

      // Fire-and-forget health ping for dev logging (ignore failures)
      try {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhanced-health-scanner`, {
          method: 'POST', 
          mode: 'cors', 
          credentials: 'omit',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ ping: true, source: 'log' })
        }).catch(() => { /* ignore */ });
      } catch { /* ignore */ }

      // CRITICAL: Complete state reset to prevent contamination
      setRecognizedFoods([]);
      setVisionResults(null);
      setVoiceResults(null);
      setShowSummaryPanel(false);
      setSummaryItems([]);
      setReviewItems([]);
      setShowReviewScreen(false);
      setShowError(false);
      setErrorMessage('');

      // Validate barcode format
      const cleanBarcode = barcode.trim().replace(/\s+/g, '');
      if (!/^\d{8,14}$/.test(cleanBarcode)) {
        throw new Error('Invalid barcode format. Please check the barcode number.');
      }

// Global barcode search is intentionally forced OFF for now.
// Runtime is hardcoded to false; the profile toggle is ignored until rollout.
const enableGlobalSearch = false;
console.log('Global search enabled:', enableGlobalSearch);

      console.log('=== STEP 1: FUNCTION HEALTH CHECK ===');
      
      // Test function deployment with health check
      try {
        const healthResponse = await supabase.functions.invoke('barcode-lookup-global', {
          body: { health: true }
        });
        console.log('Health check response:', healthResponse);
      } catch (healthError) {
        console.error('Health check failed:', healthError);
        if (healthError.message?.includes('404') || healthError.message?.includes('not found')) {
          toast.error("Service temporarily unavailable", {
            description: "Please enter product manually below",
            action: {
              label: "Enter Manually",
              onClick: () => {
                setShowBarcodeNotFound(true);
                setFailedBarcode(cleanBarcode);
              }
            }
          });
          setIsLoadingBarcode(false);
          return;
        }
      }
      
      console.log('=== STEP 2: CALLING BARCODE LOOKUP FUNCTION ===');
      
      // Create timeout controller
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      
      let hit = false;
      let status: string | number = 'error';
      
      try {
        const response = await supabase.functions.invoke('enhanced-health-scanner', {
          body: { mode: 'barcode', barcode: cleanBarcode, source: 'log' }
        });
        
        status = response.error ? response.error.status || 'error' : 200;
        hit = !!response.data?.ok && !!response.data.product;
        
        if (response.error) {
          console.error('=== FUNCTION INVOCATION ERROR ===');
          console.error('Error object:', response.error);
          
          // Handle specific error types with immediate fallback to manual entry
          if (response.error.message?.includes('404') || 
              response.error.message?.includes('Not Found') ||
              response.error.message?.includes('FunctionsError')) {
            console.error('Function deployment issue detected - 404 error');
            
            toast.error("Service temporarily unavailable", {
              description: "Enter product details manually",
              action: {
                label: "Enter Manually",
                onClick: () => {
                  setShowBarcodeNotFound(true);
                  setFailedBarcode(cleanBarcode);
                }
              }
            });
            
            setShowBarcodeNotFound(true);
            setFailedBarcode(cleanBarcode);
            return;
          }
          
          throw new Error(response.error.message || 'Failed to lookup barcode');
        }

        const data = response.data;
        console.log('=== LOOKUP SUCCESS ===');
        console.log('Response data:', data);
        
        // Handle enhanced-health-scanner response structure
        if (!data?.ok || !data.product) {
          const reason = data?.reason || 'unknown';
          console.log('=== BARCODE LOOKUP FAILED ===', reason);
          
          // Add logging for failed barcode lookup
          console.log('[LOG] off_result', { status: 404, hit: false });
          
          const msg = reason === 'off_miss' && /^\d{8}$/.test(cleanBarcode)
            ? 'This 8-digit code is not in OpenFoodFacts. Try another side or enter manually.'
            : 'Barcode not found in database. Would you like to add this product?';
          
          toast.info(msg, {
            description: "Try scanning again or enter manually",
            action: {
              label: "Add Product",
              onClick: () => {
                setShowBarcodeNotFound(true);
                setFailedBarcode(cleanBarcode);
              }
            }
          });
          
          setShowBarcodeNotFound(true);
          setFailedBarcode(cleanBarcode);
          return;
        }

        // Use null-safe mapper to handle varied response shapes
        console.log('=== PROCESSING FOOD DATA ===');
        
        // Log successful OFF result 
        console.log('[LOG] off_result', { status: 200, hit: true });

        try {
          // Map the response using robust nutrition handling
          const mapped = mapToLogFood(cleanBarcode, data);
          const p = data.product as LogProduct; // Keep for ingredients/health data
          
          // Transform to RecognizedFood format with mapped nutrition
          const recognizedFood: RecognizedFood = {
            name: mapped.name,
            calories: mapped.calories || 0,
            protein: mapped.protein_g || 0,
            carbs: mapped.carbs_g || 0,
            fat: mapped.fat_g || 0,
            fiber: mapped.fiber_g || 0,
            sugar: mapped.sugar_g || 0,
            sodium: mapped.sodium_mg || 0,
            confidence: 95,
            serving: mapped.servingGrams ? `Per serving (${mapped.servingGrams}g)` : 'Per 100g',
            // Use mapped ingredients data (now properly extracted from OFF response)
            ingredientsText: mapped.ingredientsText,
            ingredientsAvailable: !!mapped.ingredientsText,
            // Store image data for modal
            image: mapped.imageUrl || p?.imageUrl,
            // Pass through additional flag detection data
            allergens: mapped.allergens,
            additives: mapped.additives,
            categories: mapped.categories,
            _provider: mapped._provider
          };

          // Add telemetry logging
          console.debug('[SCAN][NORMALIZE]', { 
            name: mapped.name, 
            hasIngredients: !!mapped.ingredientsText,
            allergens: mapped.allergens?.length || 0,
            additives: mapped.additives?.length || 0
          });

          // Add forensics logging
          console.log('[LOG] confirm_open', {
            name: mapped.name,
            barcode: cleanBarcode,
            hasIngredients: !!mapped.ingredientsText,
            allergens: mapped.allergens?.length || 0,
            additives: mapped.additives?.length || 0,
            score: p?.health?.score
          });

          console.log('=== SETTING RECOGNIZED FOOD ===', recognizedFood);
          setRecognizedFoods([recognizedFood]);
          setShowConfirmation(true);
          addRecentBarcode({
            barcode: cleanBarcode,
            productName: recognizedFood.name,
            nutrition: {
              calories: recognizedFood.calories,
              protein: recognizedFood.protein,
              carbs: recognizedFood.carbs,
              fat: recognizedFood.fat,
              fiber: recognizedFood.fiber,
              sugar: recognizedFood.sugar,
              sodium: recognizedFood.sodium
            }
          });
          addToHistory({
            barcode: cleanBarcode,
            productName: mapped.name,
            brand: mapped.brand || '',
            source: 'barcode_lookup',
            nutrition: {
              calories: recognizedFood.calories,
              protein: recognizedFood.protein,
              carbs: recognizedFood.carbs,
              fat: recognizedFood.fat,
              fiber: recognizedFood.fiber,
              sugar: recognizedFood.sugar,
              sodium: recognizedFood.sodium
            }
          });
          
        } catch (nutritionProcessingError) {
          console.error('=== NUTRITION PROCESSING ERROR ===', nutritionProcessingError);
          
          // Always try to open confirm modal with fallback data, even on nutrition processing error
          const mapped = mapToLogFood('', null);
          const fallbackFood: RecognizedFood = {
            name: mapped.name,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            confidence: 10,
            serving: 'Unknown serving',
            ingredientsText: undefined,
            ingredientsAvailable: false
          };

          console.log('[LOG] confirm_open', {
            name: mapped.name,
            barcode: cleanBarcode,
            hasIngredients: false,
            flags: [],
            score: 0,
            fallback: true,
            processingError: true
          });

          console.log('=== SETTING FALLBACK RECOGNIZED FOOD (PROCESSING ERROR) ===', fallbackFood);
          setRecognizedFoods([fallbackFood]);
          setShowConfirmation(true);
          addRecentBarcode({
            barcode: cleanBarcode,
            productName: fallbackFood.name,
            nutrition: {
              calories: fallbackFood.calories,
              protein: fallbackFood.protein,
              carbs: fallbackFood.carbs,
              fat: fallbackFood.fat,
              fiber: fallbackFood.fiber,
              sugar: fallbackFood.sugar,
              sodium: fallbackFood.sodium
            }
          });
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          status = 'timeout';
          console.error('Function timeout detected');
          
          toast.error("Request timed out", {
            description: "Try manual entry instead",
            action: {
              label: "Enter Manually", 
              onClick: () => {
                setShowBarcodeNotFound(true);
                setFailedBarcode(cleanBarcode);
              }
            }
          });
          
          setShowBarcodeNotFound(true);
          setFailedBarcode(cleanBarcode);
          return;
        } else {
          status = 'error';
        }
        console.error('=== BARCODE LOOKUP ERROR ===', error);
        
        // Always try to open confirm modal with fallback data, even on error
        try {
          const mapped = mapToLogFood('', null);
          const fallbackFood: RecognizedFood = {
            name: mapped.name,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            confidence: 10,
            serving: 'Unknown serving',
            ingredientsText: undefined,
            ingredientsAvailable: false
          };

          console.log('[LOG] confirm_open', {
            name: mapped.name,
            barcode: cleanBarcode,
            hasIngredients: false,
            flags: [],
            score: 0,
            fallback: true
           });

           console.log('=== SETTING FALLBACK RECOGNIZED FOOD ===', fallbackFood);
           setRecognizedFoods([fallbackFood]);
           setShowConfirmation(true);
           addRecentBarcode({
             barcode: cleanBarcode,
             productName: fallbackFood.name,
             nutrition: {
               calories: fallbackFood.calories,
               protein: fallbackFood.protein,
               carbs: fallbackFood.carbs,
               fat: fallbackFood.fat,
               fiber: fallbackFood.fiber,
               sugar: fallbackFood.sugar,
               sodium: fallbackFood.sodium
             }
           });
         } catch (fallbackError) {
           console.error('=== FALLBACK MODAL ERROR ===', fallbackError);
           toast.error("Barcode lookup failed", {
             description: "Please enter manually",
             action: {
               label: "Enter Manually",
               onClick: () => {
                 setShowBarcodeNotFound(true);
                 setFailedBarcode(cleanBarcode);
               }
             }
           });
           
          setShowBarcodeNotFound(true);
          setFailedBarcode(cleanBarcode);
        }
      } finally {
        clearTimeout(timeout);
        console.log('[LOG] off_result', { status, hit });
        setIsLoadingBarcode(false);
      }
    } catch (outerError) {
      console.error('=== OUTER BARCODE ERROR ===', outerError);
      setIsLoadingBarcode(false);
    }
  };

  const handleVoiceRecording = async () => {
    console.log('🎤 [Camera] Voice recording triggered', { isRecording, isProcessingVoice });
    
    if (isRecording) {
      setProcessingStep('Processing...');
      console.log('🎤 [Camera] Stopping recording...');
      const transcribedText = await stopRecording();
      console.log('🎤 [Camera] Transcription result:', transcribedText);
      
      if (transcribedText) {
        setVoiceText(transcribedText);
        setShowVoiceEntry(true);
        setInputSource('voice');
        resetErrorState();
        console.log('🎤 [Camera] Voice entry UI shown');
      }
      setProcessingStep('');
    } else {
      console.log('🎤 [Camera] Starting recording...');
      await startRecording();
      resetErrorState();
    }
  };

  const processVoiceEntry = async () => {
    console.log('🎤 [Camera] Processing voice entry:', { voiceText, length: voiceText?.length });
    
    if (!voiceText.trim()) {
      console.log('🎤 [Camera] No voice text to process');
      showErrorState('NO_INPUT', 'No voice input detected. Please try recording again.', [
        'Make sure to speak clearly into the microphone',
        'Try recording in a quieter environment'
      ]);
      return;
    }

    // Show voice analyzing overlay to prevent main camera options from showing
    setIsManualAnalyzing(false);
    setShowVoiceAnalyzing(true);
    setIsProcessingVoice(true);
    setProcessingStep('Analyzing voice input...');
    
    try {
      console.log('🎤 [Camera] Sending to log-voice-gpt5 function:', voiceText);
      
      // Add retry logic for 401/429/5xx errors
      let retryCount = 0;
      const maxRetries = 2;
      let result;
      
      // Wrap the primary call and parse in try/catch, and compute three booleans
      const primaryResp = await sendToLogVoice(voiceText); // existing function
      let primaryJson: any = null;

      try {
        primaryJson = primaryResp?.raw || null;
      } catch (e) {
        primaryJson = null;
        console.error('GPT-5 primary JSON parse failed:', e);
      }

      const primaryHttpOk = !!primaryResp?.ok; // Use the actual HTTP response ok status
      const primaryJsonOk = primaryJson && typeof primaryJson === "object";

      const primaryHasItems = Array.isArray(primaryJson?.items) && primaryJson.items.length > 0;

      console.info("[GPT5 Decision]", { primaryHttpOk, primaryJsonOk, primaryHasItems });

      // Pick source once and log accurately
      let chosen: any;

      if (!primaryHttpOk || !primaryJsonOk || !primaryHasItems) {
        console.warn("🔄 [Camera] Primary GPT-5 failed, attempting fallback...", { primaryHttpOk, primaryJsonOk, primaryHasItems });
        
        const fallbackResponse = await fetch('https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/log-voice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`
          },
          body: JSON.stringify({ text: voiceText })
        });
        
        const fb = fallbackResponse.ok ? await fallbackResponse.json() : null;
        // ensure a consistent shape
        chosen = {
          ...fb,
          success: fb?.success === true || (Array.isArray(fb?.items) && fb.items.length > 0),
          items: fb?.items || [],
          originalText: fb?.originalText || voiceText,
          model_used: fb?.model_used ?? 'gpt-4o (fallback)',
          fallback_used: true,
        };
      } else {
        console.info("✅ Primary GPT-5 succeeded. Skipping fallback.");
        chosen = {
          success: true,
          items: primaryJson.items,
          model_used: primaryJson.model_used ?? "gpt-5",
          fallback_used: false,
          originalText: voiceText,
          preprocessedText: primaryJson.preprocessedText ?? voiceText.toLowerCase(),
        };
      }

      // Check final result success
      if (!chosen?.success && (!chosen?.items || chosen.items.length === 0)) {
        // Handle structured error response from edge function
        console.error('❌ [Camera] Voice processing failed after retries. Result:', chosen);
        
        showErrorState(
          'UNKNOWN_ERROR',
          'Failed to process voice input',
          ['Please try again with more specific descriptions']
        );
        return;
      }

      setProcessingStep('Preparing...');
      // Use chosen directly instead of parsing result.message again
      const voiceApiResponse: VoiceApiResponse = chosen;

      console.log('🎤 [Camera] Voice API Response parsed:', {
        ...voiceApiResponse,
        model_used: voiceApiResponse.model_used || 'unknown',
        fallback_used: voiceApiResponse.fallback_used || false
      });
      setVoiceResults(voiceApiResponse);

      // Handle multiple food items from voice input
      if (voiceApiResponse.items && voiceApiResponse.items.length > 0) {
        // Show transcribed text
        toast.success(`Found ${voiceApiResponse.items.length} food item(s) from: "${voiceApiResponse.originalText}"`);
        console.log('🎤 [Camera] Processing', voiceApiResponse.items.length, 'food items');
        
        // Convert voice items to summary items for unified processing
        const voiceSummaryItems: SummaryItem[] = voiceApiResponse.items.map((item, index) => {
          // Create display name with quantity and preparation
          let displayName = item.name;
          if (item.preparation) {
            displayName = `${item.preparation} ${item.name}`;
          }
          
          return {
            id: `voice-item-${index}`,
            name: displayName,
            portion: item.quantity || '1 serving',
            selected: true
          };
        });
        
        console.log('🎤 [Camera] Summary items created:', voiceSummaryItems);
        
        // Use unified pending items flow
        setPendingItems(voiceSummaryItems);
        setCurrentItemIndex(0);
        setShowVoiceEntry(false);
        resetErrorState();
        
        // Process the first item
        console.log('🎤 [Camera] Processing first item...');
        processCurrentItem(voiceSummaryItems, 0);
      } else {
        console.log('🎤 [Camera] No food items detected in voice response');
        showErrorState('NO_FOOD_DETECTED', 'Could not identify any food items from your voice input.', [
          'Try mentioning specific food names',
          'Include quantities or portions in your description'
        ]);
      }
      
    } catch (error) {
      console.error('❌ [Camera] Exception in voice processing:', error);
      
      // Create detailed error message for debugging
      let debugMessage = 'Failed to process voice input. Please try again.';
      
      if (error instanceof Error) {
        debugMessage += `\n\nTechnical Details:\n- Error: ${error.name}\n- Message: ${error.message}`;
      }
      
      if (voiceText) {
        debugMessage += `\n\nOriginal Text: "${voiceText}"`;
      }
      
      showErrorState('SYSTEM_ERROR', debugMessage, [
        'Check your internet connection',
        'Try again in a moment',
        'Contact support if this persists'
      ]);
    } finally {
      setIsProcessingVoice(false);
      setProcessingStep('');
      // Note: setShowVoiceAnalyzing(false) is now handled by FoodConfirmationCard to prevent UI flash
    }
  };

  const processManualEntry = async () => {
    if (!manualEditText.trim()) {
      toast.error('Please enter some food information');
      return;
    }


    // Tiny fallback parser for simple inputs
    function parseSimpleList(text: string) {
      // handles "2 eggs, 1 avocado" or "two eggs and one avocado"
      const map: Record<string, number> = { one:1, two:2, three:3, four:4, five:5 };
      return text
        .toLowerCase()
        .replace(/ and /g, ", ")
        .split(",")
        .map(s => s.trim())
        .map(s => {
          const m = s.match(/^(\d+|one|two|three|four|five)\s+(.+)$/i);
          if (!m) return null;
          const qty = map[m[1]] ?? Number(m[1]) ?? 1;
          const name = m[2].trim();
          return { name, quantity: String(qty), preparation: "" };
        })
        .filter(Boolean);
    }

    setIsProcessingVoice(true);
    setIsManualAnalyzing(true);
    setShowVoiceAnalyzing(true); // Show "Analyzing Manual Input..." overlay
    setProcessingStep('Analyzing manual input...');
    setShowManualEdit(false); // Hide the manual edit form

    try {
      console.info("[ManualEntry][Submit]", { text: manualEditText });
      console.log('🔍 Manual Entry - Starting analysis for text:', manualEditText);
      
      // Add retry logic similar to voice processing
      let retryCount = 0;
      const maxRetries = 2;
      let result;
      
      while (retryCount <= maxRetries) {
        try {
          result = await sendToLogVoice(manualEditText);
          
          if (result.success) break;
          
          const errorData = result.message ? JSON.parse(result.message) : {};
          const shouldRetry = retryCount < maxRetries && (
            errorData.errorType === 'HTTP_ERROR' || 
            result.error?.includes('401') || 
            result.error?.includes('429') || 
            result.error?.includes('5')
          );
          
          if (!shouldRetry) break;
          
          const backoffMs = Math.pow(2, retryCount) * 1000;
          console.log(`🔄 [Manual] Retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          retryCount++;
          
        } catch (error) {
          if (retryCount >= maxRetries) throw error;
          retryCount++;
        }
      }

      console.info("[ManualEntry][Result]", { 
        ok: result.ok, 
        status: result.status, 
        success: result.success, 
        itemsLen: result.items?.length 
      });

      // Check for success: both success flag and items present
      const isSuccess = result.success === true && result.items?.length > 0;

      if (!isSuccess) {
        // Try fallback parser if AI failed but server responded
        if (result.ok === true && result.items?.length === 0) {
          const fallbackItems = parseSimpleList(manualEditText);
          if (fallbackItems.length >= 1) {
            toast.success("Using quick parse while AI thinks.");
            console.info("[ManualEntry][UsingItems]", fallbackItems);
            
            // Convert fallback items to the same format as voice results
            const voiceSummaryItems = fallbackItems.map((item, index) => {
              let displayName = item.name;
              if (item.preparation) {
                displayName = `${item.preparation} ${item.name}`;
              }
              
              return {
                id: `manual-fallback-${index}`,
                name: displayName,
                portion: item.quantity || '1 serving',
                selected: true
              };
            });
            
            // Use unified pending items flow
            setPendingItems(voiceSummaryItems);
            setCurrentItemIndex(0);
            setShowManualEdit(false);
            resetErrorState();
            
            // Process the first item
            processCurrentItem(voiceSummaryItems, 0);
            return;
          }
        }
        
        // Original error handling
        let errorMessage = 'Failed to process manual input';
        
        if (result.ok === true && result.items?.length === 0) {
          errorMessage = "No items detected. Try '2 eggs and 1 avocado' format.";
        } else if (result.ok === false) {
          errorMessage = `Server error ${result.status}`;
        }
        
        showErrorState(
          'ANALYSIS_ERROR',
          errorMessage,
          ['Please try again with more specific descriptions']
        );
        return;
      }

      setProcessingStep('Preparing...');
      setVoiceResults(result);

      // Handle multiple food items from manual input
      if (result.items && result.items.length > 0) {
        // Show transcribed text
        toast.success(`Found ${result.items.length} food item(s) from: "${result.originalText}"`);
        
        console.info("[ManualEntry][UsingItems]", result.items);
        // Convert voice items to summary items for unified processing
        const voiceSummaryItems: SummaryItem[] = result.items.map((item, index) => {
          // Create display name with quantity and preparation
          let displayName = item.name;
          if (item.preparation) {
            displayName = `${item.preparation} ${item.name}`;
          }
          
          return {
            id: `manual-item-${index}`,
            name: displayName,
            portion: item.quantity || '1 serving',
            selected: true
          };
        });
        
        // Use unified pending items flow
        setPendingItems(voiceSummaryItems);
        setCurrentItemIndex(0);
        setShowManualEdit(false);
        resetErrorState();
        
        // Process the first item
        processCurrentItem(voiceSummaryItems, 0);
      } else {
        showErrorState('NO_FOOD_DETECTED', 'Could not identify any food items from your input.', [
          'Try mentioning specific food names',
          'Include quantities or portions in your description'
        ]);
      }
    } catch (error) {
      console.error('Error processing manual input:', error);
      showErrorState('SYSTEM_ERROR', 'Failed to process manual input. Please try again.', [
        'Check your internet connection',
        'Try again in a moment'
      ]);
    } finally {
      setIsProcessingVoice(false);
      setProcessingStep('');
    }
  };

  const showErrorState = (type: string, message: string, suggestions: string[]) => {
    setErrorType(type);
    setErrorMessage(message);
    setErrorSuggestions(suggestions);
    setShowError(true);
    setShowVoiceEntry(false);
    setShowVoiceAnalyzing(false);
    setShowConfirmation(false);
  };

  const resetErrorState = () => {
    setShowError(false);
    setErrorType('');
    setErrorMessage('');
    setErrorSuggestions([]);
    setIsLoadingBarcode(false); // Reset barcode loading state
  };

  const handleTabFoodSelect = (food: any) => {
    setRecognizedFoods([food]);
    setShowConfirmation(true);
    setActiveTab('main');
  };

  const handleTabBarcodeSelect = (barcode: string) => {
    handleBarcodeDetected(barcode);
    setActiveTab('main');
  };

  const handleRetryVoice = () => {
    resetErrorState();
    setShowVoiceEntry(true);
  };

  
  // Store detected food data for multi-AI confirmation flow
  const [multiAIDetectedData, setMultiAIDetectedData] = useState<Map<string, {name: string; confidence: number; sources: string[]; calories?: number; portion?: string; isEstimate?: boolean}>>(new Map());

  const handleMultiAIConfirm = async (selectedFoods: Array<{name: string; confidence: number; sources: string[]; calories?: number; portion?: string; isEstimate?: boolean}>) => {
    console.log('=== MULTI-AI CONFIRMATION ===');
    console.log('Selected foods:', selectedFoods);
    
    setShowMultiAIDetection(false);
    
    if (selectedFoods.length === 0) {
      console.log('No foods selected, returning to main camera view');
      return;
    }
    
    // Store the detected food data for later retrieval during confirmation - SYNCHRONOUSLY
    const foodDataMap = new Map();
    selectedFoods.forEach((food, index) => {
      const sanitizedFood = {
        ...food,
        calories: food.calories ? Math.round(food.calories) : undefined,
        confidence: Math.round(food.confidence || 85)
      };
      foodDataMap.set(`multi-ai-${index}`, sanitizedFood);
    });
    
    // Set the data immediately to prevent race conditions
    setMultiAIDetectedData(foodDataMap);
    console.log('✅ Multi-AI data stored:', foodDataMap);
    
    // Convert selected foods to SummaryItem format for sequential confirmation flow
    const summaryItems: SummaryItem[] = selectedFoods.map((food, index) => ({
      id: `multi-ai-${index}`,
      name: food.name,
      portion: food.portion || '1 serving',
      selected: true // All selected foods should be processed
    }));
    
    console.log('Starting sequential confirmation flow for:', summaryItems.length, 'items');
    
    // Set up the sequential confirmation flow
    setPendingItems(summaryItems);
    setCurrentItemIndex(0);
    setInputSource('photo');
    
    // Show transition screen if multiple items, otherwise go directly to first confirmation
    if (summaryItems.length > 1) {
      setShowTransition(true);
    } else {
      // For single item, go directly to confirmation
      processCurrentItem(summaryItems, 0);
    }
  };

  // Handler for adding manually entered food to multi-AI results
  const handleAddToMultiAIResults = (food: {name: string; confidence: number; sources: string[]; calories?: number; portion?: string; isEstimate?: boolean}) => {
    setMultiAIResults(prev => [...prev, food]);
  };

  const handleMultiAICancel = () => {
    setShowMultiAIDetection(false);
    setMultiAIResults([]);
    setIsMultiAILoading(false);
    resetState();
  };

  const handleEditManually = () => {
    resetErrorState();
    setManualEditText(voiceText || '');
    setShowManualEdit(true);
  };

  const confirmFoods = async () => {
    try {
      // Add foods to context and mark as confirmed
      for (const food of recognizedFoods) {
        addFood({
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          fiber: food.fiber,
          sugar: food.sugar,
          sodium: food.sodium,
          confidence: food.confidence,
          image: selectedImage || undefined,
        });

        // Persist to Supabase nutrition_logs table
        const payload = {
          user_id: user?.id,
          food_name: food.name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          fiber: food.fiber,
          sugar: food.sugar,
          sodium: food.sodium,
          confidence: food.confidence,
          serving_size: food.serving,
          source: inputSource === 'voice' ? 'voice' : inputSource === 'manual' ? 'manual' : 'vision_api',
          image_url: selectedImage || null,
        };


        const { data, error } = await supabase
          .from('nutrition_logs')
          .insert(payload)
          .select();

        if (error) {
          console.error('Error saving to Supabase:', error);
          // Don't throw error to avoid disrupting UX, but log it
        } else {
          // Score the meal quality
          await scoreMealAfterInsert(data, error);
        }
      }

      // Refresh saved foods list
      if (refetchSavedFoods) {
        await refetchSavedFoods();
      }

      // Play success sound
      SoundGate.markConfirm();
      playFoodLogConfirm();
      
      toast.success(`Added ${recognizedFoods.length} food item(s) to your log!`);
      resetState();
      resetState();

      // Refresh saved foods list
      if (refetchSavedFoods) {
        await refetchSavedFoods();
      }

      // Play success sound
      SoundGate.markConfirm();
      playFoodLogConfirm();
      
      toast.success(`Added ${recognizedFoods.length} food item(s) to your log!`);
      resetState();
    } catch (error) {
      console.error('Error confirming foods:', error);
      toast.error('Failed to save some items. Please try again.');
    }
  };

  const [pendingItems, setPendingItems] = useState<SummaryItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  // New handler for Summary Review Panel
  const handleSummaryNext = async (selectedItems: SummaryItem[]) => {
    setShowSummaryPanel(false);
    
    if (selectedItems.length === 0) {
      toast.error('No items selected to confirm');
      return;
    }

    console.log('Processing selected items for sequential confirmation:', selectedItems);
    
    // Store all selected items for sequential processing
    setPendingItems(selectedItems);
    setCurrentItemIndex(0);
    
    // Always show transition before starting confirmation flow
    setShowTransition(true);
  };

  // Legacy handler for backward compatibility  
  const handleReviewNext = async (selectedItems: ReviewItem[]) => {
    setShowReviewScreen(false);
    
    if (import.meta.env.DEV) {
      console.info('[LYF] confirm_open selected=' + selectedItems.length);
    }
    
    if (selectedItems.length === 0) {
      toast.error('No items selected to confirm');
      return;
    }

    console.log('Processing selected items for sequential confirmation:', selectedItems);
    
    try {
      // Convert ReviewItems to RecognizedFood format for confirmation
      const foods: RecognizedFood[] = [];
      
      for (const item of selectedItems) {
        // Try to map to nutrition if not already mapped
        let nutritionData = null;
        if (item.mapped) {
          // Item was already successfully mapped during detection
          nutritionData = await mapVisionNameToFood(item.name);
        } else {
          // Try to map the user's edited name
          nutritionData = await mapVisionNameToFood(item.name);
        }
        
        if (nutritionData) {
          const grams = parseInt(item.portion.replace('g', '')) || 100;
          foods.push({
            name: nutritionData.name,
            calories: Math.round((grams / 100) * (nutritionData.caloriesPer100g || 200)),
            protein: Math.round((grams / 100) * 20),
            carbs: Math.round((grams / 100) * 25),
            fat: Math.round((grams / 100) * 10),
            fiber: Math.round((grams / 100) * 3),
            sugar: Math.round((grams / 100) * 5),
            sodium: Math.round((grams / 100) * 300),
            confidence: 85,
            serving: item.portion,
            _provider: 'ensemble-v1'
          });
        } else {
          // Create a placeholder entry for items that couldn't be mapped
          const grams = parseInt(item.portion.replace('g', '')) || 100;
          foods.push({
            name: item.name,
            calories: Math.round(grams * 2), // Rough estimate: 2 cal/gram
            protein: Math.round(grams * 0.15),
            carbs: Math.round(grams * 0.2),
            fat: Math.round(grams * 0.08),
            fiber: Math.round(grams * 0.02),
            sugar: Math.round(grams * 0.05),
            sodium: Math.round(grams * 3),
            confidence: 50, // Low confidence for unmapped items
            serving: item.portion,
            _provider: 'ensemble-v1-unmapped'
          });
        }
      }
      
      if (foods.length > 0) {
        setRecognizedFoods(foods);
        setShowConfirmation(true);
        setInputSource('photo');
      } else {
        toast.error('Unable to process any selected items. Please try manual entry.');
      }
      
    } catch (error) {
      console.error('Error processing review items:', error);
      toast.error('Error processing items. Please try again.');
    }
  };

  const handleReviewClose = () => {
    setShowReviewScreen(false);
    setReviewItems([]);
    console.info('[LYF][ui] review_closed');
    
    // Clear detection state and return - do NOT trigger legacy modal
    setIsAnalyzing(false);
  };

  const processCurrentItem = async (items: SummaryItem[], index: number) => {
    console.log('🔄 Processing item:', index + 1, 'of', items.length);
    
    // Reset processing state when starting new item
    setIsProcessingFood(false);
    
    // Clear previous food data to prevent old data from showing briefly
    setRecognizedFoods([]);
    
    if (index >= items.length) {
      // All items processed
      setPendingItems([]);
      setCurrentItemIndex(0);
      toast.success(`All ${items.length} food items logged successfully!`);
      navigate('/home');
      return;
    }

    const currentItem = items[index];
    console.log('🔄 Processing item:', currentItem.name, 'Index:', index);
    
    // Add debug logging for nutrition tracking
    console.log('🧪 [DEBUG] Processing nutrition for:', currentItem.name);
    
    // Defensive check: ensure multiAIDetectedData is populated
    if (multiAIDetectedData.size === 0 && currentItem.id.startsWith('multi-ai-')) {
      console.warn('⚠️ Multi-AI data not ready, retrying in 100ms...');
      setTimeout(() => processCurrentItem(items, index), 100);
      return;
    }
    
    // Check if we have stored multi-AI data for this item
    const storedFoodData = multiAIDetectedData.get(currentItem.id);
    
    let nutrition;
    let confidence = 85; // Default confidence
    let nutritionSource = 'unknown';
    
    // ALWAYS call individual GPT estimation for each food item
    console.log('📊 [FIX] Calling individual GPT nutrition estimation for:', currentItem.name);
    nutrition = await estimateNutritionFromLabel(currentItem.name);
    
    // Extract source and confidence from nutrition result
    if (nutrition && nutrition.source) {
      nutritionSource = nutrition.source;
      confidence = Math.round((nutrition.confidence || 0.85) * 100);
    } else {
      nutritionSource = 'estimation-failed';
      confidence = 40;
    }
    
    // Validate that we got valid nutrition data
    if (!nutrition || typeof nutrition.calories !== 'number') {
      console.warn('⚠️ Individual nutrition estimation failed for:', currentItem.name);
      
      // Only use stored data as absolute fallback
      if (storedFoodData) {
        console.log('🔄 Using stored multi-AI data as fallback for:', currentItem.name);
        nutrition = {
          calories: Math.round(storedFoodData.calories || 150),
          protein: Math.round((storedFoodData.calories * 0.15) || 5),
          carbs: Math.round((storedFoodData.calories * 0.5) || 20),
          fat: Math.round((storedFoodData.calories * 0.3 / 9) || 3),
          fiber: 3,
          sugar: 5,
          sodium: 200,
          saturated_fat: Math.round((storedFoodData.calories * 0.3 / 9 * 0.3) || 1),
          source: 'multi-ai-fallback',
          confidence: 0.6
        };
        nutritionSource = 'multi-ai-fallback';
        confidence = 60;
      }
    }
    
    // Add debug logging for nutrition source tracking
    console.log('🧪 [DEBUG] Nutrition source for', currentItem.name + ':', nutritionSource);
    console.log('🧪 [DEBUG] Final nutrition values:', nutrition);
    
    // Validate nutrition data has all required fields
    if (!nutrition || typeof nutrition.calories !== 'number') {
      console.error('❌ Invalid nutrition data for:', currentItem.name, nutrition);
      toast.error(`Invalid nutrition data for ${currentItem.name}`);
      return;
    }
    
    // Detect identical nutrition values as a safeguard
    const identicalValuesCheck = (nutrition: any, itemName: string) => {
      const checkKey = `${nutrition.calories}-${nutrition.protein}-${nutrition.carbs}-${nutrition.fat}`;
      const existingItemsJson = sessionStorage.getItem('nutritionFingerprints') || '{}';
      const existingItems = JSON.parse(existingItemsJson);
      
      if (existingItems[checkKey] && existingItems[checkKey] !== itemName) {
        console.warn('🚨 [IDENTICAL VALUES DETECTED]', itemName, 'has identical nutrition to', existingItems[checkKey]);
        console.warn('🚨 Values:', checkKey);
        toast.error(`⚠️ ${itemName} shows identical nutrition to ${existingItems[checkKey]} - verify accuracy!`);
      } else {
        existingItems[checkKey] = itemName;
        sessionStorage.setItem('nutritionFingerprints', JSON.stringify(existingItems));
      }
    };
    
    // Run the identical values check
    identicalValuesCheck(nutrition, currentItem.name);
    
    // Apply serving normalization
    const baseNutrition = {
      calories: nutrition.calories,
      protein: nutrition.protein || 0,
      carbs: nutrition.carbs || 0,
      fat: nutrition.fat || 0,
      fiber: nutrition.fiber || 0,
      sugar: nutrition.sugar || 0,
      sodium: nutrition.sodium || 0,
      saturated_fat: nutrition.saturated_fat || nutrition.fat * 0.3
    };

    const itemQuantity = (currentItem as any).quantity || (currentItem as any).portion || '1';
    
    // Check if this is an egg item for per-unit override
    const normalizedName = currentItem.name.toLowerCase().replace(/s$/, '');
    const isEggItem = normalizedName.includes('egg');
    const selectedSize = isEggItem ? ((currentItem as any).eggSize || 'large') : undefined;
    
    const normalized = normalizeServing(
      currentItem.name,
      itemQuantity,
      baseNutrition,
      nutrition.serving_size,
      selectedSize
    );

    // Get debug info for the panel
    const debugInfo = getServingDebugInfo(
      currentItem.name,
      itemQuantity,
      baseNutrition,
      nutrition.serving_size,
      nutrition.debugLog?.sourceChosen,
      nutrition.debugLog?.reason,
      selectedSize
    );

    // Log successful individual nutrition estimation with normalized values
    console.log(`✅ [NUTRITION SUCCESS] ${normalized.titleText}: ${normalized.finalCalories} cal | Source: ${nutrition.source || nutritionSource}`);
    console.log('🔧 [SERVING DEBUG]', debugInfo);

    const foodItem = {
      id: currentItem.id,
      name: normalized.titleText.replace(/\s+/g, ' '), // Ensure single spacing
      displayName: currentItem.name, // Keep original for processing
      quantity: itemQuantity, // Keep original quantity
      calories: Math.round(normalized.finalCalories),
      protein: Math.round(normalized.nutrition.protein * 10) / 10,
      carbs: Math.round(normalized.nutrition.carbs * 10) / 10,
      fat: Math.round(normalized.nutrition.fat * 10) / 10,
      fiber: Math.round(normalized.nutrition.fiber * 10) / 10,
      sugar: Math.round(normalized.nutrition.sugar * 10) / 10,
      sodium: Math.round(normalized.nutrition.sodium),
      saturated_fat: Math.round((normalized.nutrition.saturated_fat || 0) * 10) / 10,
      confidence: Math.round((nutrition.confidence || confidence) * 100) / 100,
      source: nutrition.source || nutritionSource,
      image: selectedImage,
      // Add serving normalization debug info
      servingDebug: debugInfo
    };

    console.log(`Processing item ${index + 1} of ${items.length}:`, foodItem);
    
    // Set food data first, then show confirmation to prevent empty flash
    setRecognizedFoods([foodItem]);
    setInputSource('photo');
    
    // Small delay to ensure smooth transition without main UI flashing
    setTimeout(() => {
      setShowConfirmation(true);
      
      // Dev logging for confirm open
      if (import.meta.env.DEV) {
        console.info('[LYF] confirm_open selected=' + items.length)
      }
      
      // Note: setShowVoiceAnalyzing(false) is now handled by FoodConfirmationCard after modal is rendered
    }, 50);
    
    if (items.length > 1) {
      toast.success(`Confirming item ${index + 1} of ${items.length}: ${currentItem.name}`);
    } else {
      toast.success('Food item ready for confirmation!');
    }
  };

  const handleTransitionComplete = () => {
    setShowTransition(false);
    // Show processing overlay to prevent main UI from showing during item transition
    setShowProcessingNextItem(true);
    // Reset processing state when transitioning to next item
    setIsProcessingFood(false);
    // Let processCurrentItem handle showing confirmation when data is ready
    processCurrentItem(pendingItems, currentItemIndex);
  };

  const handleSkipFood = () => {
    console.log(`Skipping item ${currentItemIndex + 1} of ${pendingItems.length}`);
    
    // Check if there are more pending items to process
    if (pendingItems.length > 0 && currentItemIndex < pendingItems.length - 1) {
      const nextIndex = currentItemIndex + 1;
      setCurrentItemIndex(nextIndex);
      setShowConfirmation(false);
      
      // Show transition screen between items if multiple items
      if (pendingItems.length > 1) {
        setShowTransition(true);
      } else {
        setTimeout(() => {
          processCurrentItem(pendingItems, nextIndex);
        }, 300);
      }
    } else {
      // All items processed, reset state and navigate
      const totalItems = pendingItems.length || 1;
      const skippedCount = currentItemIndex + 1;
      toast.success(`Completed review: ${totalItems - skippedCount} logged, ${skippedCount} skipped`);
      resetState();
      navigate('/home');
    }
  };

  const handleCancelAll = () => {
    console.info('[ConfirmFlow] Cancel All pressed');
    // Clear pending items / selections
    setPendingItems([]);
    setCurrentItemIndex(0);
    setRecognizedFoods([]);
    // Reset any in-progress state
    setIsProcessingVoice(false);
    setIsProcessingFood(false);
    setIsManualAnalyzing(false);
    // Close dialog
    setShowConfirmation(false);
    setShowReviewScreen(false);
    setShowSummaryPanel(false);
    setShowTransition(false);
    toast.success('Logging canceled');
    resetState();
  };

  const handleConfirmFood = async (foodItem: any) => {
    // Prevent double-processing
    if (isProcessingFood) {
      console.log('⚠️ Already processing food, ignoring duplicate request');
      return;
    }
    
    console.log('🍽️ === FOOD CONFIRMATION DEBUG START ===');
    console.log('📊 Food item being confirmed:', JSON.stringify(foodItem, null, 2));
    console.log('🔍 Current user:', user?.id || 'No user');
    console.log('🔍 Has saveFood function:', typeof saveFood);
    
    // Set processing state to prevent button from becoming clickable
    setIsProcessingFood(true);
    
    // Add 12-second timeout wrapper for the entire save operation
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('SAVE_TIMEOUT: Food saving took too long (12s limit)'));
      }, 12000);
    });
    
    if (!foodItem) {
      console.error('🚨 No food item provided to handleConfirmFood');
      toast.error('No food item to save');
      setIsProcessingFood(false);
      return;
    }

    if (!user?.id) {
      console.error('🚨 No authenticated user found');
      toast.error('User not authenticated');
      setIsProcessingFood(false);
      return;
    }

    // Enhanced validation and sanitization
    try {
      const validateAndSanitize = (item: any) => {
        // Validate required fields
        if (!item.name && !item.food_name) {
          throw new Error('Food name is required');
        }

        const foodName = item.name || item.food_name;
        if (typeof foodName !== 'string' || foodName.trim() === '') {
          throw new Error('Valid food name is required');
        }

        // Sanitize numeric values with enhanced validation
        const calories = Math.round(Number(item.calories) || 0);
        if (calories < 0 || calories > 5000) {
          throw new Error(`Invalid calories value: ${calories}`);
        }

        return {
          ...item,
          name: foodName.trim(),
          food_name: foodName.trim(),
          calories,
          protein: Math.round((Number(item.protein) || 0) * 10) / 10,
          carbs: Math.round((Number(item.carbs) || 0) * 10) / 10,
          fat: Math.round((Number(item.fat) || 0) * 10) / 10,
          fiber: Math.round((Number(item.fiber) || 0) * 10) / 10,
          sugar: Math.round((Number(item.sugar) || 0) * 10) / 10,
          sodium: Math.round(Number(item.sodium) || 0),
          saturated_fat: Math.round((Number(item.saturated_fat) || Number(item.fat) * 0.3 || 0) * 10) / 10,
          confidence: Math.round(Number(item.confidence) || 85),
          source: 'gpt',
          serving_size: item.serving || item.serving_size || 'Estimated portion',
          image_url: selectedImage || null,
          confirmed: true,
          timestamp: new Date()
        };
      };

      const sanitizedFoodItem = validateAndSanitize(foodItem);
      console.log('✅ Food data validation passed');
      console.log('🧮 Sanitized food data:', JSON.stringify(sanitizedFoodItem, null, 2));

      // Race save operation with timeout
      const savePromise = (async () => {
        // Attempt to save using the persistence hook
        console.log('💾 Attempting to save food via useNutritionPersistence...');
        const savedFoodId = await saveFood(sanitizedFoodItem);
        
        if (!savedFoodId) {
          console.error('❌ PERSISTENCE HOOK FAILED: saveFood returned null/undefined');
          throw new Error('Food save operation failed - no ID returned');
        }
        
        console.log('✅ FOOD SAVED SUCCESSFULLY via useNutritionPersistence:', savedFoodId);
        
        // Add to nutrition context
        try {
          addFood(sanitizedFoodItem);
          console.log('✅ CONTEXT UPDATE SUCCESS - Food added to nutrition context');
        } catch (contextError) {
          console.warn('⚠️ Context update failed (non-critical):', contextError);
          // Don't fail the whole operation for context errors
        }
        
        // Refresh saved foods list
        try {
          if (refetchSavedFoods) {
            await refetchSavedFoods();
          }
        } catch (refetchError) {
          console.warn('⚠️ Refetch failed (non-critical):', refetchError);
          // Don't fail the whole operation for refetch errors
        }

        return savedFoodId;
      })();
      
      await Promise.race([savePromise, timeoutPromise]);

      // Success notification
      toast.success(`✅ ${sanitizedFoodItem.name} logged successfully!`);
      
      } catch (error) {
      console.error('🚨 CRITICAL ERROR in handleConfirmFood:', error);
      
      // Handle timeout errors specifically
      if (error.message?.includes('SAVE_TIMEOUT')) {
        toast.error('Food saving timed out. Please check your internet connection and try again.');
      } else {
        // Comprehensive error logging
        const errorContext = {
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : 'No stack trace',
          foodItem: JSON.stringify(foodItem, null, 2),
          userId: user?.id,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent.substring(0, 100),
          selectedImage: selectedImage ? 'present' : 'none'
        };
        
        console.error('🚨 Error context:', errorContext);
        
        // User-friendly error message
        const userMessage = error instanceof Error ? 
          `Failed to save food: ${error.message}` : 
          'Failed to save food item - please try again';
          
        toast.error(userMessage);
      }
      
      return;
    } finally {
      // CRITICAL: Always reset processing state to prevent permanent freeze
      setIsProcessingFood(false);
    }

    console.log('🍽️ === FOOD CONFIRMATION SUCCESS ===');
    console.log('✅ Food item successfully confirmed and logged via GPT + useNutritionPersistence');

    // Check if there are more pending items to process
    if (pendingItems.length > 0 && currentItemIndex < pendingItems.length - 1) {
      const nextIndex = currentItemIndex + 1;
      setCurrentItemIndex(nextIndex);
      setShowConfirmation(false); // Close current confirmation
      
      console.log(`🔄 PROCEEDING TO NEXT ITEM: ${nextIndex + 1} of ${pendingItems.length}`);
      
      // Show transition screen between items if multiple items
      if (pendingItems.length > 1) {
        setShowTransition(true);
        // Reset processing state immediately since next item will handle its own processing
        setIsProcessingFood(false);
      } else {
        // Reset processing state for single item flow
        setIsProcessingFood(false);
        setTimeout(() => {
          processCurrentItem(pendingItems, nextIndex);
        }, 300);
      }
    } else {
      // All items processed, reset state and navigate
      const totalItems = pendingItems.length || 1;
      console.log(`🎉 ALL ITEMS PROCESSED - Total logged: ${totalItems}`);
      
      // Clear state immediately to prevent old data showing during navigation
      setRecognizedFoods([]); // Clear food data
      setShowConfirmation(false); // Close modal first
      setIsProcessingFood(false); // Reset processing state when completely done
      
      // Play success sound only once at the very end
      SoundGate.markConfirm();
      playFoodLogConfirm();
      
      toast.success(`Successfully logged ${totalItems} food item${totalItems > 1 ? 's' : ''}!`);
      resetState();
      navigate('/home');
    }
  };

  // Test mode debug summary - shows comprehensive validation results
  const showDebugSummary = () => {
    console.log('🧪 === TEST MODE DEBUG SUMMARY ===');
    console.log('🔍 Full Pipeline Analysis Report:');
    
    if (visionResults) {
      console.log('👁️ VISION RESULTS:');
      console.log('  📸 Food Labels Found:', visionResults.foodLabels?.length || 0);
      console.log('  🏷️ OCR Text Detected:', !!visionResults.textDetected);
      console.log('  📦 Objects Detected:', visionResults.objects?.length || 0);
      console.log('  🔤 Full OCR Text:', visionResults.textDetected || 'None');
    }
    
    if (reviewItems && reviewItems.length > 0) {
      console.log('📋 PARSED ITEMS:');
      reviewItems.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name} (${item.portion}) - Selected: ${item.selected}`);
      });
    }
    
    console.log('🧪 Test mode validation complete - check individual debug logs above for detailed pipeline analysis');
    toast.success('Debug summary generated - check console for detailed logs');
  };

  const resetState = () => {
    setSelectedImage(null);
    setRecognizedFoods([]);
    setShowConfirmation(false);
    setShowVoiceEntry(false);
    setShowVoiceAnalyzing(false);
    setIsManualAnalyzing(false);
    setShowProcessingNextItem(false);
    setShowManualEdit(false);
    setIsAnalyzing(false);
    setVoiceText('');
    setManualEditText('');
    setVisionResults(null);
    setVoiceResults(null);
    setInputSource('photo'); // Always reset to photo mode
    setProcessingStep('');
    setShowReviewScreen(false);
    setReviewItems([]);
    setSelectedFoodItem(null);
    
    // Reset barcode-related state
    setIsLoadingBarcode(false);
    setShowBarcodeScanner(false);
    
    // Reset summary panel state
    setShowSummaryPanel(false);
    setSummaryItems([]);
    setShowTransition(false);
    
    // Reset multi-AI detection state
    setShowMultiAIDetection(false);
    setMultiAIResults([]);
    setIsMultiAILoading(false);
    setMultiAIDetectedData(new Map());
    
    resetErrorState();
    setValidationWarning(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    console.log('=== STATE RESET COMPLETE ===');
  };

  // Format recording duration for display
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Clean up AbortController on component unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // iOS Safari dynamic viewport fix
  // iOS viewport height fix
  useEffect(() => {
    const setVh = () => {
      // iOS Safari dynamic viewport fix
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  const handleRetryPhoto = () => {
    resetErrorState();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRetryAnalysis = () => {
    if (selectedImage) {
      analyzeImage();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 mt-8">Log Your Food</h1>
      </div>

      {/* Processing Status */}
      <ProcessingStatus 
        isProcessing={isAnalyzing || isVoiceProcessing || !!processingStep}
        processingStep={processingStep}
        showTimeout={isAnalyzing}
      />

      {/* Validation Warning */}
      {validationWarning && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 mb-0 !mb-0">
          <CardContent className="p-4">
            <p className="text-yellow-800 dark:text-yellow-200">{validationWarning}</p>
          </CardContent>
        </Card>
      )}

      {/* Voice Entry Card */}
      {showVoiceEntry && (
        <Card className="animate-slide-up mb-0 !mb-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-blue-600" />
              Voice Input Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">You said:</p>
              <p className="font-medium">{voiceText}</p>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={processVoiceEntry}
                disabled={isProcessingVoice || !!processingStep}
                className="flex-1 gradient-primary min-w-[120px]"
              >
                {isProcessingVoice || processingStep ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Processing...
                  </div>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
              
              <Button variant="outline" onClick={() => setShowVoiceEntry(false)} className="flex-1 min-w-[80px]">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice Analyzing Overlay */}
      {showVoiceAnalyzing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-center justify-center">
                <Sparkles className="h-5 w-5 text-blue-600 animate-pulse" />
                {isManualAnalyzing ? 'Analyzing Manual Input...' : 'Analyzing Voice Input...'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Processing your request:</p>
                <p className="font-medium text-sm italic">"{isManualAnalyzing ? manualEditText : voiceText}"</p>
              </div>
              
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                <p className="text-gray-600 dark:text-gray-300">
                  {processingStep || 'Analyzing food items...'}
                </p>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This may take a few moments
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Processing Next Item Overlay */}
      {showProcessingNextItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-center justify-center">
                <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                Preparing Next Item
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                <p className="text-gray-600 dark:text-gray-300">
                  Loading food details...
                </p>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Just a moment while we prepare your next item
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Camera UI */}
      {activeTab === 'main' && !selectedImage && !showConfirmation && !showError && !showManualEdit && !showVoiceAnalyzing && !showProcessingNextItem && !showVoiceEntry && !showTransition && (
        <Card className="animate-slide-up mb-0 !mb-0">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Upload Photo Tab */}
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-24 w-full gradient-primary flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
                    size="lg"
                  >
                    <Upload className="h-6 w-6" />
                    <span className="text-sm font-medium">Upload Photo</span>
                  </Button>
                  
                  {/* Speak to Log Tab */}
                  <Button
                    onClick={handleVoiceRecording}
                    disabled={isVoiceProcessing || !!processingStep}
                    className={`h-24 w-full flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300 ${isRecording 
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                      : 'gradient-primary'
                    }`}
                    size="lg"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="h-6 w-6" />
                        <span className="text-sm font-medium">Stop Recording</span>
                      </>
                    ) : (isVoiceProcessing || processingStep) ? (
                      <>
                        <Sparkles className="h-6 w-6" />
                        <span className="text-sm font-medium">Processing...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-6 w-6" />
                        <span className="text-sm font-medium">Speak to Log</span>
                      </>
                    )}
                  </Button>
                  
                   {/* Scan Barcode Tab */}
                   <Button
                     onClick={() => {
                       setShowLogBarcodeScanner(true);
                       setInputSource('barcode');
                       setIsLoadingBarcode(false); // Reset loading state when opening scanner
                       resetErrorState();
                     }}
                     disabled={isLoadingBarcode}
                     className="h-24 w-full gradient-primary flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
                     size="lg"
                   >
                     {isLoadingBarcode ? (
                       <>
                         <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
                         <span className="text-sm font-medium">Looking up...</span>
                       </>
                     ) : (
                       <>
                         <ScanBarcode className="h-6 w-6" />
                         <span className="text-sm font-medium">Scan Barcode</span>
                       </>
                     )}
                   </Button>
                  
                  
                  {/* Manual Entry Tab */}
                  <Button
                    onClick={() => {
                      setShowManualEdit(true);
                      setInputSource('manual');
                      resetErrorState();
                    }}
                    className="h-24 w-full gradient-primary flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
                    size="lg"
                  >
                    <Edit3 className="h-6 w-6" />
                    <span className="text-sm font-medium">Manual Entry</span>
                  </Button>
                  
                  
                  {/* Saved Logs Tab */}
                  <Button
                    onClick={() => navigate('/saved-logs')}
                    className="h-24 w-full gradient-primary flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
                    size="lg"
                  >
                    <Save className="h-6 w-6" />
                    <span className="text-sm font-medium">Saved</span>
                  </Button>
                  
                  {/* Recent Logs Tab */}
                  <Button
                    onClick={() => setActiveTab('recent')}
                    className="h-24 w-full gradient-primary flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
                    size="lg"
                  >
                    <Clock className="h-6 w-6" />
                    <span className="text-sm font-medium">Recent Logs</span>
                  </Button>
                  
                  {/* Hydration Logs Tab */}
                  <Button
                    onClick={() => navigate('/hydration')}
                    className="h-24 w-full bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
                    size="lg"
                  >
                    <Droplets className="h-6 w-6" />
                    <span className="text-sm font-medium">Hydration Logs</span>
                  </Button>
                  
                  {/* Supplement Logs Tab */}
                  <Button
                    onClick={() => navigate('/supplements')}
                    className="h-24 w-full bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
                    size="lg"
                  >
                    <Pill className="h-6 w-6" />
                    <span className="text-sm font-medium">Supplement Logs</span>
                  </Button>
                </div>
                
                {isRecording && (
                  <div className="text-center">
                    <p className="text-sm text-red-600 font-medium animate-pulse">
                      🔴 Recording... Click button again to stop
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Foods Tab */}
      {activeTab === 'saved' && (
        <Card className="animate-slide-up mb-0 !mb-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Button 
                variant="ghost" 
                onClick={() => setActiveTab('main')}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back
              </Button>
            </div>
            <SavedFoodsTab 
              onFoodSelect={handleTabFoodSelect} 
              onRefetch={setRefetchSavedFoods}
            />
          </CardContent>
        </Card>
      )}

      {/* Recent Foods Tab */}
      {activeTab === 'recent' && (
        <Card className="animate-slide-up mb-0 !mb-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Button 
                variant="ghost" 
                onClick={() => setActiveTab('main')}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back
              </Button>
            </div>
            <RecentFoodsTab 
              onFoodSelect={handleTabFoodSelect} 
              onBarcodeSelect={handleTabBarcodeSelect} 
            />
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />


      {/* Multi-AI detection removed - using frozen v1 pipeline exclusively */}

      {/* Error Display Card */}
      {showError && (
        <Card className="animate-slide-up border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 mb-0 !mb-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <X className="h-5 w-5" />
              Unable to Process Input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-red-700 dark:text-red-300 font-medium">{errorMessage}</p>
              
              {errorSuggestions.length > 0 && (
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Try these suggestions:</p>
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                    {errorSuggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleRetryVoice} className="flex-1 gradient-primary">
                <Mic className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              <Button onClick={handleEditManually} variant="outline" className="flex-1">
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Manually
              </Button>
              
              <Button variant="outline" onClick={resetState} className="flex-1">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Edit Card */}
      {showManualEdit && (
        <Card className="animate-slide-up mb-0 !mb-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-green-600" />
              Manual Food Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Describe what you ate:
              </label>
              <Textarea
                value={manualEditText}
                onChange={(e) => setManualEditText(e.target.value)}
                placeholder="e.g., 1 cup white rice, 4 oz grilled chicken breast, 1 medium apple..."
                className="min-h-20"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Be specific with quantities and food names for better accuracy
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={processManualEntry}
                disabled={isProcessingVoice || !!processingStep}
                className="flex-1 gradient-primary min-w-[120px]"
              >
                {isProcessingVoice || processingStep ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Processing...
                  </div>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze Food
                  </>
                )}
              </Button>
              
              <Button variant="outline" onClick={() => setShowManualEdit(false)} className="flex-1 min-w-[80px]">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Analysis Card - Handle nutrition capture mode */}
      {selectedImage && !showConfirmation && !showSummaryPanel && !showTransition && pendingItems.length === 0 && !isAnalyzing && inputSource !== 'barcode' && !showMultiAIDetection && (
        <Card className="animate-slide-up mb-0 !mb-0">
          <CardHeader>
            <CardTitle>
              {currentMode === 'nutrition-capture' ? 'Nutrition Facts Capture' : 'Analyze Your Meal'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <img
                src={selectedImage}
                alt={currentMode === 'nutrition-capture' ? 'Nutrition Facts Label' : 'Selected meal'}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
            
            {currentMode === 'nutrition-capture' && (
              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  📊 We'll scan this nutrition facts label to extract serving size information for: <strong>{nutritionCaptureData?.name}</strong>
                </p>
              </div>
            )}
            
            {/* Top row: Cancel and Try Photo Again */}
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={resetState} 
                className="flex-1 min-w-[80px]"
                disabled={isAnalyzing}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleRetryPhoto} 
                className="flex-1 min-w-[80px]"
                disabled={isAnalyzing}
              >
                <Camera className="h-4 w-4 mr-2" />
                Try Photo Again
              </Button>
            </div>

            {/* Bottom row: Analyze Food/Extract Nutrition (full width) */}
            <Button
              onClick={analyzeImage}
              disabled={isAnalyzing}
              className="w-full gradient-primary"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  {processingStep || 'Analyzing...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {currentMode === 'nutrition-capture' ? 'Extract Nutrition Facts' : 'Analyze Food'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Food Confirmation Card */}
      <FoodConfirmationCard
        isOpen={showConfirmation}
        isProcessingFood={isProcessingFood}
        onClose={() => {
          setShowConfirmation(false);
          setIsProcessingFood(false); // Reset processing state when closing
          // Reset multi-item flow if needed
          if (pendingItems.length > 0) {
            setPendingItems([]);
            setCurrentItemIndex(0);
          }
          setShowTransition(false);
          // Return to the appropriate previous screen
          if (selectedImage && !showSummaryPanel) {
            // Return to camera analysis view
            setIsAnalyzing(false);
          } else if (summaryItems.length > 0) {
            // Return to summary panel if it was the previous screen
            setShowSummaryPanel(true);
          } else {
            // Reset to camera home
            resetState();
          }
        }}
        onConfirm={handleConfirmFood}
        onSkip={handleSkipFood}
        onCancelAll={handleCancelAll}
        foodItem={recognizedFoods[0] || null}
        showSkip={pendingItems.length > 1}
        currentIndex={currentItemIndex}
        onVoiceAnalyzingComplete={() => {
          setShowVoiceAnalyzing(false);
          setShowProcessingNextItem(false);
        }}
        totalItems={pendingItems.length}
      />

      {/* Summary Review Panel - Only for food detection, never for barcodes */}
      {inputSource !== 'barcode' && (
        <SummaryReviewPanel
          isOpen={showSummaryPanel}
          onClose={() => setShowSummaryPanel(false)}
          onNext={handleSummaryNext}
          items={summaryItems}
        />
      )}

      {/* Transition Screen - Only for food detection, never for barcodes */}
      {inputSource !== 'barcode' && (
        <TransitionScreen
          isOpen={showTransition}
          currentIndex={currentItemIndex}
          totalItems={pendingItems.length}
          itemName={pendingItems[currentItemIndex]?.name || ''}
          onComplete={handleTransitionComplete}
          duration={3500}
        />
      )}

      {/* Review Items Screen - Only for food detection, never for barcodes */}
      {inputSource !== 'barcode' && (
        <ReviewItemsScreen
          isOpen={showReviewScreen}
          onClose={handleReviewClose}
          onNext={handleReviewNext}
          items={reviewItems}
        />
      )}


      {/* Legacy BarcodeScanner removed - using LogBarcodeScannerModal only */}

      {/* Log Barcode Scanner Modal - Full Screen */}
      <LogBarcodeScannerModal
        open={showLogBarcodeScanner}
        onOpenChange={setShowLogBarcodeScanner}
        onBarcodeDetected={handleBarcodeDetected}
        onManualEntry={() => {
          setShowLogBarcodeScanner(false);
          setShowManualBarcodeEntry(true);
        }}
      />

      {/* Barcode Not Found Modal */}
      <BarcodeNotFoundModal
        isOpen={showBarcodeNotFound}
        onClose={() => setShowBarcodeNotFound(false)}
        barcode={failedBarcode}
        onManualEntry={() => {
          setShowBarcodeNotFound(false);
          setShowManualFoodEntry(true);
        }}
        onTryAgain={() => {
          setShowBarcodeNotFound(false);
          setShowLogBarcodeScanner(true);
        }}
      />

      {/* Manual Barcode Entry Modal */}
      <ManualBarcodeEntry
        open={showManualBarcodeEntry}
        onOpenChange={setShowManualBarcodeEntry}
        onBarcodeEntered={handleBarcodeDetected}
        onCancel={() => setShowManualBarcodeEntry(false)}
        isProcessing={isAnalyzing}
      />

      {/* Manual Food Entry Modal */}
      <ManualFoodEntry
        isOpen={showManualFoodEntry}
        onClose={() => setShowManualFoodEntry(false)}
      />

      {/* Debug Panel - Dev only */}
      <DebugPanel 
        isVisible={showConfirmation && (recognizedFoods[0] as any)?.servingDebug}
        debugInfo={(recognizedFoods[0] as any)?.servingDebug}
      />

      {/* Activity Logging Section - Exercise, Recovery, Habits */}
      <div className="mt-8">
        <ActivityLoggingSection />
      </div>

      {/* Saved Sets Sheet */}
      <SavedSetsSheet 
        isOpen={showSavedSetsSheet}
        onClose={() => setShowSavedSetsSheet(false)}
        onInsertSet={(items) => {
          // Convert saved set items to review items and show review screen
          const reviewItems = items.map(item => ({
            id: Math.random().toString(36).substr(2, 9),
            name: item.name,
            canonicalName: item.canonicalName,
            portion: `${item.grams}g`,
            selected: true,
            grams: item.grams,
            mapped: true
          }));
          
          setReviewItems(reviewItems);
          setShowReviewScreen(true);
        }}
      />
      
    </div>
  );
};
export default CameraPage;
