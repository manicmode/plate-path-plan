import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Upload, Check, X, Sparkles, Mic, MicOff, Edit3, ScanBarcode, FileText, Save, Clock, Droplets, Pill } from 'lucide-react';
import { useNutrition } from '@/contexts/NutritionContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { sendToLogVoice } from '@/integrations/logVoice';
import imageCompression from 'browser-image-compression';
import { useSound } from '@/hooks/useSound';
import { ProcessingStatus } from '@/components/camera/ProcessingStatus';
import { BarcodeScanner } from '@/components/camera/BarcodeScanner';
import { ManualBarcodeEntry } from '@/components/camera/ManualBarcodeEntry';
import { ManualFoodEntry } from '@/components/camera/ManualFoodEntry';
import { useRecentBarcodes } from '@/hooks/useRecentBarcodes';
import { useBarcodeHistory } from '@/hooks/useBarcodeHistory';
import { useMealScoring } from '@/hooks/useMealScoring';
import { useNutritionPersistence } from '@/hooks/useNutritionPersistence';
import { normalizeNutrition, generateDisplayTitle } from '@/utils/servingNormalization';

import { safeGetJSON } from '@/lib/safeStorage';

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
// Import smoke tests for development
import '@/utils/smokeTests';
import jsQR from 'jsqr';

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
  voiceContext?: {
    originalText: string;
    itemIndex: number;
    totalItems: number;
    isVoiceInput: boolean;
  };
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
}

const CameraPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use the scroll-to-top hook
  useScrollToTop();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
  
  // Atomic handoff: Watch reviewItems and only open modal when data is ready
  useEffect(() => {
    console.log('🔍 [Camera] ReviewItems effect:', { reviewItemsLength: reviewItems.length, showReviewScreen });
    if (reviewItems.length > 0 && !showReviewScreen) {
      console.log('🔍 [Camera] Opening review screen with', reviewItems.length, 'items');
      setShowReviewScreen(true);
    }
  // Safe review screen close handler
  const handleReviewScreenClose = () => {
    console.log('🔍 [Camera] Review screen closing');
    setShowReviewScreen(false);
    setReviewItems([]);
  };
  
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
  
  // Saved foods refetch function
  const [refetchSavedFoods, setRefetchSavedFoods] = useState<(() => Promise<void>) | null>(null);
  
  // Processing state moved from duplicate declaration below
  const [isProcessingFood, setIsProcessingFood] = useState(false);
  
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
      timeoutMs: 15000,
      onTimeout: () => {
        console.error('⏰ Global loading timeout reached');
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        setErrorType('timeout');
        setErrorMessage('Operation timed out. Please try again.');
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

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Helper function to compress image if needed
  const compressImageIfNeeded = async (file: File): Promise<string> => {
    const fileSizeMB = file.size / (1024 * 1024);
    
    console.log('Original image size:', fileSizeMB.toFixed(2), 'MB');
    
    if (fileSizeMB <= 1) {
      // Image is already under 1MB, convert directly to base64
      console.log('Image is under 1MB, no compression needed');
      return await fileToBase64(file);
    }

    console.log('Compressing image from', fileSizeMB.toFixed(2), 'MB to under 1MB...');
    
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
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
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        resolve(code ? code.data : null);
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

  const analyzeImage = async () => {
    if (!selectedImage) {
      console.error('No selected image to analyze');
      toast.error('No image selected');
      return;
    }

    console.log('=== Starting image analysis ===');
    setIsAnalyzing(true);
    setProcessingStep('Validating image...');
    
    // Create AbortController for this request
    abortControllerRef.current = new AbortController();
    
    // Add 15-second global timeout with comprehensive error handling
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('TIMEOUT: Image analysis took too long (15s limit)'));
      }, 15000);
    });
    
    try {
      // STEP 1: Check if this looks like a barcode FIRST
      setProcessingStep('Analyzing image type...');
      
      // Wrap analysis in Promise.race with timeout
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
        
        // STEP 2: Only reach here if NOT a barcode - proceed with multi-AI food detection
        console.log('=== GPT FOOD DETECTION PATH ===');
        console.log('Image does not appear to be a barcode, proceeding with GPT food detection...');
        
        // If not a barcode, proceed with multi-AI food recognition
        const imageBase64 = convertToBase64(selectedImage);
        
        setProcessingStep('Initializing GPT food vision...');
        setIsMultiAILoading(true);
        setShowMultiAIDetection(true);
        
        try {
          console.log('Calling GPT food detection...');
          setProcessingStep('Analyzing with GPT Vision...');
          
          // Call the new multi-AI detection system with abort signal
          const detectionResults = await detectFoodsFromAllSources(imageBase64, abortControllerRef.current?.signal);
          
          console.log('GPT detection results:', detectionResults);
          
          // Enhance results with calorie estimates
          setProcessingStep('Estimating nutrition...');
          const enhancedResults = await Promise.all(
            detectionResults.map(async (item) => {
              try {
                // Get nutrition estimate for each food item
                const nutrition = await estimateNutritionFromLabel(item.name);
                
                return {
                  ...item,
                  calories: nutrition?.calories || 100, // Fallback to 100 kcal
                  portion: '1 serving', // Default portion
                  isEstimate: !nutrition?.isBranded || nutrition?.calories === undefined
                };
              } catch (error) {
                console.error(`Failed to get nutrition for ${item.name}:`, error);
                return {
                  ...item,
                  calories: 100, // Fallback
                  portion: '1 serving',
                  isEstimate: true
                };
              }
            })
          );
          
          setMultiAIResults(enhancedResults);
          
          if (enhancedResults.length > 0) {
            toast.success(`Found ${enhancedResults.length} food item(s) with GPT Vision!`);
          } else {
            toast.warning('No food items detected with sufficient confidence. Try a clearer photo or manual entry.');
          }
          
        } catch (error) {
          console.error('GPT food detection failed:', error);
          toast.error('Food detection failed. Please try again or use manual entry.');
          setShowMultiAIDetection(false);
        } finally {
          setIsMultiAILoading(false);
        }
      })();
      
      // Race analysis with timeout
      await Promise.race([analysisPromise, timeoutPromise]);
      
    } catch (error) {
      console.error('=== IMAGE ANALYSIS FAILED ===', error);
      
      if (error.name === 'AbortError') {
        console.log('Analysis was cancelled');
        toast.info('Analysis cancelled');
        return;
      }
      
      // Handle timeout errors specifically
      if (error.message?.includes('TIMEOUT')) {
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
        return;
      }
      
      // Generic fallback with error display
      setErrorType('analysis');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to analyze image');
      setShowError(true);
      toast.error('Failed to analyze image. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setProcessingStep('');
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
      fallbackUsed: false,
      finalConfidence: 0,
      errors: [] as string[],
      success: false
    };

    console.log('🍎 === NUTRITION ESTIMATION DEBUG START ===');
    console.log('📊 Initial parameters:', { foodName, hasOcrText: !!ocrText, hasBarcode: !!barcode, barcode });
    
    // Strategy: Prefer generic USDA data unless barcode scan or exact branded match
    try {
      console.log('🔄 STEP 1: Trying generic USDA/GPT estimation first...');
      
      const { data: genericData, error: genericError } = await supabase.functions.invoke('gpt-nutrition-estimator', {
        body: { foodName: foodName }
      });

      if (genericData && !genericError && genericData.nutrition) {
        console.log('✅ GENERIC NUTRITION SUCCESS:');
        console.log(`  🎯 Confidence: ${genericData.nutrition.confidence}%`);
        console.log('  🧪 Nutrition data:', genericData.nutrition);
        
        // Store generic result for potential use
        const genericResult = {
          ...genericData.nutrition,
          isBranded: false,
          source: 'usda-gpt-estimation',
          confidence: (genericData.nutrition.confidence || 85) / 100,
          debugLog
        };

        // Only check branded if we have a barcode OR generic confidence is low
        if (barcode || (genericData.nutrition.confidence || 85) < 70) {
          console.log('🏷️ STEP 2: Checking branded products...');
          
          if (barcode) {
            debugLog.barcodeDetected = true;
            console.log(`✅ BARCODE DETECTED: ${barcode} - Prioritizing branded match`);
          } else {
            console.log('⚠️ Low generic confidence - Checking branded as fallback');
          }
          
          const brandedResponse = await supabase.functions.invoke('match-branded-product', {
            body: {
              productName: foodName,
              ocrText: ocrText,
              barcode: barcode
            }
          });

          if (brandedResponse.data && !brandedResponse.error) {
            const brandedResult = brandedResponse.data;
            debugLog.brandedMatchConfidence = brandedResult.confidence;
            debugLog.brandedSource = brandedResult.source;
            
            console.log('🏷️ BRANDED PRODUCT MATCH RESULT:');
            console.log(`  📊 Found: ${brandedResult.found}`);
            console.log(`  🎯 Confidence: ${brandedResult.confidence}%`);
            console.log(`  📍 Source: ${brandedResult.source}`);
            console.log(`  🏪 Product: ${brandedResult.productName || 'N/A'}`);
            console.log(`  🏢 Brand: ${brandedResult.brandName || 'N/A'}`);

            // Use branded if: 1) Barcode scan with match, 2) High confidence exact match with no good generic
            const shouldUseBranded = (barcode && brandedResult.found && brandedResult.confidence >= 80) ||
                                   (!barcode && brandedResult.found && brandedResult.confidence >= 95 && (genericData.nutrition.confidence || 85) < 70);

            if (shouldUseBranded) {
              debugLog.brandedProductMatched = true;
              debugLog.finalConfidence = brandedResult.confidence;
              debugLog.success = true;
              
              console.log('✅ USING BRANDED MATCH - High confidence or barcode scan');
              console.log(`🎯 Final confidence: ${brandedResult.confidence}%`);
              
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
            } else {
              console.log(`⚠️ PREFERRING GENERIC - Branded confidence ${brandedResult.confidence}% not sufficient for non-barcode match`);
            }
          } else {
            debugLog.errors.push(`Branded API error: ${brandedResponse.error?.message || 'Unknown error'}`);
            console.log('❌ BRANDED PRODUCT API ERROR:', brandedResponse.error);
          }
        } else {
          console.log('✅ USING GENERIC DATA - Good confidence and no barcode');
        }

        // Return generic result
        debugLog.fallbackUsed = false;
        debugLog.finalConfidence = genericData.nutrition.confidence || 85;
        debugLog.success = true;
        
        return genericResult;
      } else {
        debugLog.errors.push(`Generic nutrition API error: ${genericError?.message || 'No data returned'}`);
        console.log('❌ GENERIC NUTRITION API ERROR:', genericError);
      }
    } catch (error) {
      debugLog.errors.push(`Generic nutrition exception: ${error.message}`);
      console.error('❌ GENERIC NUTRITION EXCEPTION:', error);
    }

    // Final fallback if both generic and branded failed
    console.log('🔄 STEP 3: Both primary methods failed, using fallback estimation...');
    
    // Generate basic nutrition estimate based on food name
    const fallbackNutrition = {
      calories: 150,
      protein: 8,
      carbs: 20,
      fat: 5,
      fiber: 3,
      sugar: 5,
      sodium: 200,
      saturated_fat: 2,
      source: 'fallback-estimate',
      confidence: 0.4
    };
    
    debugLog.fallbackUsed = true;
    debugLog.finalConfidence = 40;
    debugLog.success = true;
    debugLog.errors.push('Using fallback nutrition estimate');
    
    console.log('⚠️ USING FALLBACK NUTRITION ESTIMATE');
    
    return {
      ...fallbackNutrition,
      isBranded: false,
      debugLog
    };

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

      // Get global search setting (defaults to true for best user experience)
      const enableGlobalSearch = safeGetJSON('global_barcode_search', true);
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
      
      // Generate unique request ID to prevent stale responses
      const requestId = crypto.randomUUID();
      console.log('Function call params:', { barcode: cleanBarcode, enableGlobalSearch, requestId });
      
      // Reduced timeout for faster fallback to manual entry
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Function call timeout after 8 seconds')), 8000)
      );
      
      const functionCall = supabase.functions.invoke('barcode-lookup-global', {
        body: { 
          barcode: cleanBarcode,
          enableGlobalSearch,
          requestId
        }
      });
      
      const response = await Promise.race([functionCall, timeoutPromise]) as any;
      
      console.log('=== FUNCTION RESPONSE ===');
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      console.log('Response error:', response.error);
      console.log('Response received for request ID:', requestId);

      // Enhanced error handling for 404 and deployment issues
      if (response.error) {
        console.error('=== BARCODE LOOKUP API ERROR ===', response.error);
        
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
        
        if (response.error.message?.includes('timeout') || 
            response.error.message?.includes('Timeout') ||
            response.error.message === 'Function call timeout after 8 seconds') {
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
        }
        
        throw new Error(response.error.message || 'Failed to lookup barcode. Please try manual entry.');
      }

      if (!response.data?.success) {
        console.log('=== BARCODE LOOKUP FAILED ===', response.data?.message);
        
        // Show barcode not found modal for better UX
        setFailedBarcode(cleanBarcode);
        setShowBarcodeNotFound(true);
        return;
      }

      const product = response.data.product;
      console.log('=== BARCODE LOOKUP SUCCESS ===');
      console.log('Product found:', product);
      console.log('Product source:', product.source);
      console.log('Product region:', product.region);
      console.log('Ingredients available:', product.ingredients_available);
      console.log('Ingredients text length:', product.ingredients_text?.length || 0);

      // Create food item from barcode data
      const foodItem = {
        id: `barcode-${cleanBarcode}-${Date.now()}`, // Unique ID with barcode
        name: product.brand ? `${product.brand} ${product.name}` : product.name,
        calories: product.nutrition.calories,
        protein: product.nutrition.protein,
        carbs: product.nutrition.carbs,
        fat: product.nutrition.fat,
        fiber: product.nutrition.fiber,
        sugar: product.nutrition.sugar,
        sodium: product.nutrition.sodium,
        image: product.image,
        confidence: 95, // High confidence for barcode scans
        timestamp: new Date(),
        confirmed: false,
        barcode: cleanBarcode, // Include barcode for tracking
        ingredientsText: product.ingredients_text,
        ingredientsAvailable: product.ingredients_available
      };

      // STEP 1: Log ingredient availability for UI handling
      if (product.ingredients_available && product.ingredients_text) {
        console.log('=== INGREDIENT DETECTION AVAILABLE ===');
        console.log('Ingredients will be checked in FoodConfirmationCard component');
        console.log('Ingredients text length:', product.ingredients_text.length);
      } else {
        console.log('=== NO INGREDIENTS AVAILABLE ===');
        console.log('Manual ingredient entry will be prompted in FoodConfirmationCard');
      }

      // Add to recent barcodes  
      addRecentBarcode({
        barcode: cleanBarcode,
        productName: foodItem.name,
        nutrition: product.nutrition
      });

      // Add to barcode history with enhanced metadata
      addToHistory({
        barcode: cleanBarcode,
        productName: product.name,
        brand: product.brand,
        nutrition: product.nutrition,
        image: product.image,
        source: product.source,
        region: product.region
      });

      // Set up for confirmation with ingredient status
      setRecognizedFoods([foodItem]);
      setShowConfirmation(true);
      
      // Ensure we're in barcode mode to prevent food UI from showing
      setInputSource('barcode');

      // Product info is already displayed in the confirmation popup, no need for success toast
      console.log('=== BARCODE CONFIRMATION READY ===');

    } catch (error) {
      console.error('=== BARCODE LOOKUP ERROR ===', error);
      
      // Enhanced error messaging with fallback options
      const errorMessage = error instanceof Error ? error.message : 'Failed to lookup product';
      
      // Show user-friendly error with manual entry option
      toast.error(errorMessage, {
        action: {
          label: 'Enter Manually',
          onClick: () => {
            setFailedBarcode(barcode);
            setShowBarcodeNotFound(true);
          }
        },
        duration: 8000
      });
      
      // Automatically show manual entry modal for service unavailable errors
      if (errorMessage.includes('temporarily unavailable') || errorMessage.includes('404')) {
        setFailedBarcode(barcode);
        setShowBarcodeNotFound(true);
      }
      
      throw error; // Re-throw so calling function can handle appropriately
    } finally {
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
      
      while (retryCount <= maxRetries) {
        try {
          result = await sendToLogVoice(voiceText);
          
          // If successful, break out of retry loop
          if (result.success) break;
          
          // Check if we should retry based on error type
          const errorData = result.message ? JSON.parse(result.message) : {};
          const shouldRetry = retryCount < maxRetries && (
            errorData.errorType === 'HTTP_ERROR' || 
            result.error?.includes('401') || 
            result.error?.includes('429') || 
            result.error?.includes('5')
          );
          
          if (!shouldRetry) break;
          
          // Exponential backoff: 1s, 2s
          const backoffMs = Math.pow(2, retryCount) * 1000;
          console.log(`🔄 [Camera] Retrying voice request in ${backoffMs}ms (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          retryCount++;
          
        } catch (error) {
          if (retryCount >= maxRetries) throw error;
          retryCount++;
          const backoffMs = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }

      if (!result.success) {
        // After retries failed, try fallback to log-voice function
        console.log('🔄 [Camera] Primary GPT-5 failed, attempting fallback to log-voice...');
        try {
          const fallbackResponse = await fetch('https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/log-voice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`
            },
            body: JSON.stringify({ text: voiceText })
          });
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            result = {
              success: true,
              message: JSON.stringify({
                success: true,
                items: fallbackData.items || [],
                originalText: fallbackData.originalText || voiceText,
                model_used: 'gpt-4o (fallback)',
                fallback_used: true
              })
            };
            console.log('✅ [Camera] Fallback to log-voice succeeded');
          }
        } catch (fallbackError) {
          console.error('❌ [Camera] Fallback also failed:', fallbackError);
        }
      }

      if (!result.success) {
        // Handle structured error response from edge function
        console.error('❌ [Camera] Voice processing failed after retries. Result:', result);
        const errorData = result.message ? JSON.parse(result.message) : {};
        console.error('❌ [Camera] Parsed error data:', errorData);
        
        showErrorState(
          errorData.errorType || 'UNKNOWN_ERROR',
          errorData.errorMessage || result.error || 'Failed to process voice input',
          errorData.suggestions || ['Please try again with more specific descriptions']
        );
        return;
      }

      setProcessingStep('Preparing...');
      // Parse the structured response from the updated edge function
      const voiceApiResponse: VoiceApiResponse = JSON.parse(result.message);

      console.log('🎤 [Camera] Voice API Response parsed:', voiceApiResponse);
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
            selected: true,
            // Store original voice data for nutrition scaling
            voiceData: {
              originalName: item.name,
              quantity: item.quantity,
              preparation: item.preparation
            }
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

    setIsProcessingVoice(true);
    setIsManualAnalyzing(true);
    setShowVoiceAnalyzing(true); // Show "Analyzing Manual Input..." overlay
    setProcessingStep('Analyzing manual input...');
    setShowManualEdit(false); // Hide the manual edit form

    try {
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

      console.log('🔍 Manual Entry - sendToLogVoice result:', result);

      if (!result.success) {
        const errorData = result.message ? JSON.parse(result.message) : {};
        console.error('🔍 Manual Entry - Analysis failed:', errorData);
        
        showErrorState(
          errorData.errorType || 'ANALYSIS_ERROR',
          errorData.errorMessage || result.error || 'Failed to process manual input',
          errorData.suggestions || ['Please try again with more specific descriptions']
        );
        return;
      }

      setProcessingStep('Preparing...');
      const voiceApiResponse: VoiceApiResponse = JSON.parse(result.message);
      setVoiceResults(voiceApiResponse);

      // Handle multiple food items from manual input
      if (voiceApiResponse.items && voiceApiResponse.items.length > 0) {
        // Show transcribed text
        toast.success(`Found ${voiceApiResponse.items.length} food item(s) from: "${voiceApiResponse.originalText}"`);
        
        // Convert voice items to summary items for unified processing
        const voiceSummaryItems: SummaryItem[] = voiceApiResponse.items.map((item, index) => {
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
        const { data, error } = await supabase
          .from('nutrition_logs')
          .insert({
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
          })
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
      playFoodLogConfirm();
      
      toast.success(`Added ${recognizedFoods.length} food item(s) to your log!`);
      resetState();
      resetState();

      // Refresh saved foods list
      if (refetchSavedFoods) {
        await refetchSavedFoods();
      }

      // Play success sound
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

  // Enhanced handler with atomic state management
  const handleReviewNext = async (selectedItems: ReviewItem[]) => {
    console.log('🔍 [Camera] handleReviewNext called with', selectedItems.length, 'items');
    
    // Close review screen first
    setShowReviewScreen(false);
    // Clear review items to prevent reopening
    setReviewItems([]);
    
    if (selectedItems.length === 0) {
      toast.error('No items selected to confirm');
      return;
    }

    console.log('Processing selected items for sequential confirmation:', selectedItems);
    
    // Convert ReviewItem to SummaryItem
    const summaryItems: SummaryItem[] = selectedItems.map(item => ({
      id: item.id,
      name: item.name,
      portion: item.portion,
      selected: true
    }));
    
    // Store all selected items for sequential processing
    setPendingItems(summaryItems);
    setCurrentItemIndex(0);
    
    // Process the first item
    processCurrentItem(summaryItems, 0);
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
    
    // Log successful individual nutrition estimation
    console.log(`✅ [NUTRITION SUCCESS] ${currentItem.name}: ${nutrition.calories} cal, ${nutrition.protein}g protein, ${nutrition.carbs}g carbs, ${nutrition.fat}g fat | Source: ${nutrition.source || nutritionSource}`);

    // Get the base serving information from the nutrition data
    const baseServingLabel = nutrition.serving_size || nutrition.serving_label || '100g'; // Default to 100g if no serving info
    const voiceQuantity = (currentItem as any).voiceData?.quantity;
    
    let foodItem;
    
    try {
      // Normalize nutrition based on serving and user quantity
      const normalizedNutrition = normalizeNutrition(
        {
          calories: nutrition.calories || 0,
          protein: nutrition.protein || 0,
          carbs: nutrition.carbs || 0,
          fat: nutrition.fat || 0,
          fiber: nutrition.fiber || 0,
          sugar: nutrition.sugar || 0,
          sodium: nutrition.sodium || 0,
          saturated_fat: nutrition.saturated_fat || (nutrition.fat * 0.3)
        },
        baseServingLabel,
        voiceQuantity
      );

      // Generate display title with proper quantity and unit
      const displayName = generateDisplayTitle(
        currentItem.name,
        normalizedNutrition.finalQuantity,
        normalizedNutrition.finalUnit,
        !voiceQuantity // isEstimated if no voice quantity provided
      );

      // Log serving normalization debug info
      console.log('🔍 [SERVING NORMALIZATION]', {
        foodName: currentItem.name,
        baseServingLabel: normalizedNutrition.servingInfo.baseServingLabel,
        baseServingQuantity: normalizedNutrition.servingInfo.baseServingQuantity,
        baseServingUnit: normalizedNutrition.servingInfo.baseServingUnit,
        userQuantity: voiceQuantity,
        parsedUserQuantity: normalizedNutrition.finalQuantity,
        perUnitCalories: normalizedNutrition.perUnitCalories,
        scalingFactor: normalizedNutrition.scalingFactor,
        finalCalories: normalizedNutrition.calories,
        calculation: `${normalizedNutrition.perUnitCalories.toFixed(1)} × ${normalizedNutrition.finalQuantity} = ${normalizedNutrition.calories}`
      });

      foodItem = {
        id: currentItem.id,
        name: displayName,
        calories: normalizedNutrition.calories,
        protein: normalizedNutrition.protein,
        carbs: normalizedNutrition.carbs,
        fat: normalizedNutrition.fat,
        fiber: normalizedNutrition.fiber,
        sugar: normalizedNutrition.sugar,
        sodium: normalizedNutrition.sodium,
        confidence: Math.round((nutrition.confidence || confidence) * 100) / 100,
        source: nutrition.source || nutritionSource,
        image: selectedImage,
        // Store original and normalized data for debug purposes
        quantity: voiceQuantity || currentItem.portion,
        parsedQuantity: normalizedNutrition.finalQuantity,
        isEstimated: !voiceQuantity,
        // Serving normalization debug data
        baseServingLabel: normalizedNutrition.servingInfo.baseServingLabel,
        baseServingQuantity: normalizedNutrition.servingInfo.baseServingQuantity,
        baseServingUnit: normalizedNutrition.servingInfo.baseServingUnit,
        perUnitCalories: normalizedNutrition.perUnitCalories,
        scalingFactor: normalizedNutrition.scalingFactor
      };
    } catch (normalizationError) {
      console.error('🚨 [SERVING NORMALIZATION ERROR]', normalizationError);
      
      // Fallback to simple scaling if normalization fails
      const fallbackQuantity = parseFloat(voiceQuantity?.match(/(\d+(?:\.\d+)?)/)?.[1] || '1');
      const scaledCalories = Math.round((nutrition.calories || 0) * fallbackQuantity);
      
      console.log('🔄 [FALLBACK SCALING]', {
        foodName: currentItem.name,
        fallbackQuantity,
        baseCalories: nutrition.calories,
        scaledCalories
      });

      foodItem = {
        id: currentItem.id,
        name: `${fallbackQuantity > 1 ? `${fallbackQuantity} ` : ''}${currentItem.name}${!voiceQuantity ? ' (estimated)' : ''}`,
        calories: scaledCalories,
        protein: Math.round((nutrition.protein || 0) * fallbackQuantity * 10) / 10,
        carbs: Math.round((nutrition.carbs || 0) * fallbackQuantity * 10) / 10,
        fat: Math.round((nutrition.fat || 0) * fallbackQuantity * 10) / 10,
        fiber: Math.round((nutrition.fiber || 0) * fallbackQuantity * 10) / 10,
        sugar: Math.round((nutrition.sugar || 0) * fallbackQuantity * 10) / 10,
        sodium: Math.round((nutrition.sodium || 0) * fallbackQuantity),
        confidence: Math.round((nutrition.confidence || confidence) * 100) / 100,
        source: nutrition.source || nutritionSource,
        image: selectedImage,
        quantity: voiceQuantity || currentItem.portion,
        parsedQuantity: fallbackQuantity,
        isEstimated: !voiceQuantity,
        // Fallback data
        baseServingLabel: baseServingLabel,
        baseServingQuantity: 1,
        baseServingUnit: 'serving',
        perUnitCalories: nutrition.calories || 0,
        scalingFactor: fallbackQuantity
      };
    }

    console.log(`Processing item ${index + 1} of ${items.length}:`, foodItem);
    
    // Set food data first, then show confirmation to prevent empty flash
    setRecognizedFoods([foodItem]);
    setInputSource('photo');
    
    // Small delay to ensure smooth transition without main UI flashing
    setTimeout(() => {
      setShowConfirmation(true);
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
    
    // Safe cleanup: Only clear review items when fully closing, not during transitions
    if (!pendingItems.length && !showConfirmation) {
      console.log('🔍 [Camera] Safe cleanup - clearing review state');
      setShowReviewScreen(false);
      setReviewItems([]);
    }
    
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Log Your Food</h1>
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
                      setShowBarcodeScanner(true);
                      setInputSource('barcode');
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
                    onClick={() => setActiveTab('saved')}
                    className="h-24 w-full gradient-primary flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
                    size="lg"
                  >
                    <Save className="h-6 w-6" />
                    <span className="text-sm font-medium">Saved Logs</span>
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


      {/* Multi-AI Food Detection Results */}
      {showMultiAIDetection && (
        <div className="animate-slide-up mb-0 !mb-0">
          <MultiAIFoodDetection
            detectedFoods={multiAIResults}
            isLoading={isMultiAILoading}
            onConfirm={handleMultiAIConfirm}
            onCancel={handleMultiAICancel}
            onAddManually={() => setShowManualFoodEntry(true)}
            onAddToResults={handleAddToMultiAIResults}
          />
        </div>
      )}

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

      {/* Photo Analysis Card - Only show for food images, not barcodes */}
      {selectedImage && !showConfirmation && !showSummaryPanel && !showTransition && pendingItems.length === 0 && !isAnalyzing && inputSource !== 'barcode' && !showMultiAIDetection && (
        <Card className="animate-slide-up mb-0 !mb-0">
          <CardHeader>
            <CardTitle>Analyze Your Meal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <img
                src={selectedImage}
                alt="Selected meal"
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
            
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

            {/* Bottom row: Analyze Food (full width) */}
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
                  Analyze Food
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
          onClose={handleReviewScreenClose}
          onNext={handleReviewNext}
          items={reviewItems}
        />
      )}

      {/* Enhanced Status Card */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 mb-0 !mb-0">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-green-800 dark:text-green-200">
                Enhanced AI Food Logging
              </h4>
              <p className="text-xs text-green-700 dark:text-green-300">
                Improved with image validation, better error handling, and enhanced user feedback.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onBarcodeDetected={handleBarcodeDetected}
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
          setShowBarcodeScanner(true);
        }}
      />

      {/* Manual Barcode Entry Modal */}
      {showManualBarcodeEntry && (
        <ManualBarcodeEntry
          onBarcodeEntered={handleBarcodeDetected}
          onCancel={() => setShowManualBarcodeEntry(false)}
          isProcessing={isAnalyzing}
        />
      )}

      {/* Manual Food Entry Modal */}
      <ManualFoodEntry
        isOpen={showManualFoodEntry}
        onClose={() => setShowManualFoodEntry(false)}
      />

      {/* Debug components removed - clean production interface */}
      
    </div>
  );
};

export default CameraPage;
