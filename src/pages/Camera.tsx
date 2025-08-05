import { useState, useRef, useEffect } from 'react';
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

import { safeGetJSON } from '@/lib/safeStorage';

import { validateImageFile, getImageDimensions } from '@/utils/imageValidation';
import { useNavigate, useLocation } from 'react-router-dom';
import { ReviewItemsScreen, ReviewItem } from '@/components/camera/ReviewItemsScreen';
import { SummaryReviewPanel, SummaryItem } from '@/components/camera/SummaryReviewPanel';
import { FinalMealSummary } from '@/components/camera/FinalMealSummary';
import { TransitionScreen } from '@/components/camera/TransitionScreen';
import FoodConfirmationCard from '@/components/FoodConfirmationCard';
import { BarcodeNotFoundModal } from '@/components/camera/BarcodeNotFoundModal';
import { SavedFoodsTab } from '@/components/camera/SavedFoodsTab';
import { RecentFoodsTab } from '@/components/camera/RecentFoodsTab';
// Debug components removed for clean production build
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
  calories?: number;
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
  
  // Manual entry states
  const [showManualBarcodeEntry, setShowManualBarcodeEntry] = useState(false);
  const [showManualFoodEntry, setShowManualFoodEntry] = useState(false);
  
  // Final meal summary states
  const [showFinalMealSummary, setShowFinalMealSummary] = useState(false);
  const [confirmedMealItems, setConfirmedMealItems] = useState<Array<{
    id: string;
    name: string;
    portion: string;
    calories?: number;
    foodData: any;
  }>>([]);
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState<'main' | 'saved' | 'recent'>('main');
  
  // Saved foods refetch function
  const [refetchSavedFoods, setRefetchSavedFoods] = useState<(() => Promise<void>) | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { addFood } = useNutrition();
  const { isRecording, isProcessing: isVoiceProcessing, recordingDuration, startRecording, stopRecording } = useVoiceRecording();
  const { playFoodLogConfirm } = useSound();
  const { user } = useAuth();

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
    
    try {
      // STEP 1: Check if this looks like a barcode FIRST
      setProcessingStep('Analyzing image type...');
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
      
      // STEP 2: Only reach here if NOT a barcode - proceed with food detection
      console.log('=== FOOD DETECTION PATH ===');
      console.log('Image does not appear to be a barcode, proceeding with food detection...');
      
      // If not a barcode, proceed with normal food recognition
      const imageBase64 = convertToBase64(selectedImage);
      
      setProcessingStep('Compressing image...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UX
      
      setProcessingStep('Sending to Vision API...');
      console.log('Calling Supabase function vision-label-reader...');
      
      // Set up 25-second timeout using Promise.race
      const functionCallPromise = supabase.functions.invoke('vision-label-reader', {
        body: { imageBase64 }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.log('25-second timeout reached, aborting request');
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          reject(new Error('Analysis timed out after 25 seconds'));
        }, 25000);
      });

      // Race between function call and timeout
      const { data, error } = await Promise.race([
        functionCallPromise,
        timeoutPromise
      ]) as any;

      console.log('Function result received');

      // Check if the request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        console.log('Request was aborted');
        toast.error('Analysis timed out');
        return;
      }

      if (error) {
        console.error('Supabase function error:', error);
        
        if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
          toast.error('Analysis timed out - please try again');
        } else {
          toast.error(`Analysis failed: ${error.message || 'Unknown error'}`);
        }
        return;
      }

      if (!data) {
        console.error('No data returned from vision API');
        toast.error('No data returned from analysis. Please try again.');
        return;
      }

      if (data.error) {
        console.error('Vision API returned error:', data.message);
        toast.error(`Analysis failed: ${data.message}`);
        return;
      }

      console.log('Processing Vision API results...');
      setVisionResults(data);

      // Step 2: Parse food items with OpenAI
      setProcessingStep('Extracting food items...');
      
      console.log("📸 Sending to parse-food-items edge function...");
      console.log("🔍 Vision data being sent:", JSON.stringify(data, null, 2));
      
      try {
        const parseResponse = await supabase.functions.invoke('parse-food-items', {
          body: { 
            visionResults: data,
            imageDataUrl: `data:image/jpeg;base64,${imageBase64}`  // Include image data for vision fallback
          }
        });

        if (parseResponse.error || parseResponse.data?.error) {
          console.error('Food parsing error:', parseResponse.error || parseResponse.data?.message);
          // Fallback to original logic
          const processedFoods = await processNutritionData('photo', data);
          if (processedFoods.length > 0) {
            setRecognizedFoods(processedFoods);
            setInputSource('photo');
            setShowConfirmation(true);
            toast.success(`Detected ${processedFoods.length} food item(s)!`);
          } else {
            toast.error('The image couldn\'t be clearly identified. Please try another photo or use the manual entry.');
          }
          return;
        }

        // Handle new response format with metadata
        const responseData = parseResponse.data;
        let parsedItems: Array<{name: string, portion: string, confidence?: string, method?: string, calories?: number}>;
        let analysisMetadata: any = {};
        
        if (responseData.items && responseData.analysis) {
          // New format with metadata
          parsedItems = responseData.items;
          analysisMetadata = responseData.analysis;
          console.log('🍲 Cooked meal analysis result:', analysisMetadata);
          console.log('📊 Detection method:', analysisMetadata.detectionMethod);
          console.log('🔄 Complex dish fallback used:', analysisMetadata.useComplexDishFallback);
        } else if (Array.isArray(responseData)) {
          // Legacy format (array only)
          parsedItems = responseData;
          console.log('📋 Using legacy response format');
        } else {
          throw new Error('Invalid response format');
        }
        
        console.log('✅ Parsed food items:', parsedItems);

        // Validate parsed items
        if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
          console.log('No valid food items parsed, falling back to original logic');
          const processedFoods = await processNutritionData('photo', data);
          if (processedFoods.length > 0) {
            setRecognizedFoods(processedFoods);
            setInputSource('photo');
            setShowConfirmation(true);
            toast.success(`Detected ${processedFoods.length} food item(s)!`);
          } else {
            toast.error('The image couldn\'t be clearly identified. Please try another photo or use the manual entry.');
          }
          return;
        }

        // Step 3: Show Summary Review Panel (New Flow) - items not selected by default
        const summaryItems: SummaryItem[] = parsedItems.map((item, index) => ({
          id: `item-${index}`,
          name: item.name || 'Unknown Food',
          portion: item.portion || '1 serving',
          calories: item.calories,
          selected: false,
          isAIInferred: (item as any).isAIInferred || false  // Pass through AI inferred flag, cast to any for flexibility
        }));

        console.log('Created summary items:', summaryItems);
        setSummaryItems(summaryItems);
        setShowSummaryPanel(true);
        setInputSource('photo');
        
        toast.success(`Found ${parsedItems.length} food item(s) - please review and confirm!`);

      } catch (parseError) {
        console.error('Food parsing failed:', parseError);
        // Fallback to original logic
        const processedFoods = await processNutritionData('photo', data);
        if (processedFoods.length > 0) {
          setRecognizedFoods(processedFoods);
          setInputSource('photo');
          setShowConfirmation(true);
          toast.success(`Detected ${processedFoods.length} food item(s)!`);
        } else {
          toast.error('The image couldn\'t be clearly identified. Please try another photo or use the manual entry.');
        }
      }
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      
      if (error.message?.includes('timed out') || error.message?.includes('timeout')) {
        console.log('Request timed out');
        toast.error('Analysis timed out - please try again');
      } else if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        console.log('Request was aborted due to timeout');
        toast.error('Analysis timed out');
      } else {
        toast.error(`Analysis failed: ${error instanceof Error ? error.message : 'Please try again'}`);
      }
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
    
    // Try branded product matching first
    try {
      console.log('🏷️ STEP 1: Attempting branded product matching...');
      
      if (barcode) {
        debugLog.barcodeDetected = true;
        console.log(`✅ BARCODE DETECTED: ${barcode}`);
      } else {
        console.log('❌ NO BARCODE DETECTED');
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
        console.log('  ✅ Response received successfully');
        console.log(`  📊 Found: ${brandedResult.found}`);
        console.log(`  🎯 Confidence: ${brandedResult.confidence}%`);
        console.log(`  📍 Source: ${brandedResult.source}`);
        console.log(`  🏪 Product: ${brandedResult.productName || 'N/A'}`);
        console.log(`  🏢 Brand: ${brandedResult.brandName || 'N/A'}`);
        console.log(`  🔍 Debug Info:`, brandedResult.debugInfo);

        // Use branded nutrition if confidence is high enough (≥90%)
        if (brandedResult.found && brandedResult.confidence >= 90) {
          debugLog.brandedProductMatched = true;
          debugLog.finalConfidence = brandedResult.confidence;
          debugLog.success = true;
          
          console.log('✅ BRANDED MATCH SUCCESS - Using branded nutrition data');
          console.log(`🎯 Final confidence: ${brandedResult.confidence}%`);
          console.log('🏆 BRANDED NUTRITION DATA:', brandedResult.nutrition);
          
          return {
            ...brandedResult.nutrition,
            isBranded: true,
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
          debugLog.fallbackUsed = true;
          debugLog.errors.push(`Branded confidence ${brandedResult.confidence}% below 90% threshold`);
          console.log(`⚠️ BRANDED MATCH INSUFFICIENT - Confidence ${brandedResult.confidence}% below 90% threshold`);
          console.log('🔄 Proceeding to generic fallback...');
        }
      } else {
        debugLog.errors.push(`Branded API error: ${brandedResponse.error?.message || 'Unknown error'}`);
        console.log('❌ BRANDED PRODUCT API ERROR:', brandedResponse.error);
      }
    } catch (error) {
      debugLog.errors.push(`Branded matching exception: ${error.message}`);
      console.error('❌ BRANDED PRODUCT MATCHING EXCEPTION:', error);
    }

    // Fallback to generic nutrition estimation
    debugLog.fallbackUsed = true;
    debugLog.finalConfidence = 50; // Lower confidence for generic estimates
    
    console.log('🔄 Using generic nutrition fallback...');
    
    // Return generic nutrition estimates
    return {
      calories: 200,
      protein: 10,
      carbs: 30,
      fat: 8,
      fiber: 3,
      sugar: 5,
      sodium: 300,
      isBranded: false,
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
    if (isRecording) {
      setProcessingStep('Processing...');
      const transcribedText = await stopRecording();
      if (transcribedText) {
        setVoiceText(transcribedText);
        setShowVoiceEntry(true);
        setInputSource('voice');
        resetErrorState();
      }
      setProcessingStep('');
    } else {
      await startRecording();
      resetErrorState();
    }
  };

  const processVoiceEntry = async () => {
    if (!voiceText.trim()) {
      showErrorState('NO_INPUT', 'No voice input detected. Please try recording again.', [
        'Make sure to speak clearly into the microphone',
        'Try recording in a quieter environment'
      ]);
      return;
    }

    setIsProcessingVoice(true);
    setProcessingStep('Processing...');
    
    try {
      setProcessingStep('Analyzing...');
      const result = await sendToLogVoice(voiceText);

      if (!result.success) {
        // Handle structured error response from edge function
        console.error('❌ Voice processing failed. Result:', result);
        const errorData = result.message ? JSON.parse(result.message) : {};
        console.error('❌ Parsed error data:', errorData);
        
        // Create detailed error message for debugging
        let debugMessage = errorData.errorMessage || result.error || 'Failed to process voice input';
        
        // Add debug info if available
        if (errorData.debugInfo) {
          debugMessage += `\n\nDebug Info:\n- Error Type: ${errorData.debugInfo.errorType}\n- Error Name: ${errorData.debugInfo.errorName}\n- Error Message: ${errorData.debugInfo.errorMessage}`;
        }
        
        // Add original text for reference
        if (voiceText) {
          debugMessage += `\n\nOriginal Text: "${voiceText}"`;
        }
        
        showErrorState(
          errorData.errorType || 'UNKNOWN_ERROR',
          debugMessage,
          errorData.suggestions || ['Please try again with more specific descriptions']
        );
        return;
      }

      setProcessingStep('Preparing...');
      // Parse the structured response from the updated edge function
      const voiceApiResponse: VoiceApiResponse = JSON.parse(result.message);

      console.log('Voice API Response:', voiceApiResponse);
      setVoiceResults(voiceApiResponse);

      // Handle multiple food items from voice input
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
            id: `voice-item-${index}`,
            name: displayName,
            portion: item.quantity || '1 serving',
            calories: item.calories,
            selected: true
          };
        });
        
        // Use unified pending items flow
        setPendingItems(voiceSummaryItems);
        setCurrentItemIndex(0);
        setShowVoiceEntry(false);
        resetErrorState();
        
        // Process the first item
        processCurrentItem(voiceSummaryItems, 0);
      } else {
        showErrorState('NO_FOOD_DETECTED', 'Could not identify any food items from your voice input.', [
          'Try mentioning specific food names',
          'Include quantities or portions in your description'
        ]);
      }
      
    } catch (error) {
      console.error('❌ Exception in voice processing:', error);
      
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
    }
  };

  const processManualEntry = async () => {
    if (!manualEditText.trim()) {
      toast.error('Please enter some food information');
      return;
    }

    setIsProcessingVoice(true);
    setProcessingStep('Processing');

    try {
      setProcessingStep('Analyzing...');
      console.log('🔍 Manual Log Debug - Starting analysis for text:', manualEditText);
      const result = await sendToLogVoice(manualEditText);

      console.log('🔍 Manual Log Debug - sendToLogVoice result:', result);

      if (!result.success) {
        const errorData = result.message ? JSON.parse(result.message) : {};
        console.error('🔍 Manual Log Debug - Analysis failed:', errorData);
        
        // Show specific error messages based on error type
        let errorMessage = errorData.errorMessage || result.error || 'Failed to process manual input';
        let suggestions = errorData.suggestions || ['Please try again with more specific descriptions'];
        
        // Check for specific OpenAI API issues
        if (errorData.errorType === 'HTTP_ERROR' && errorData.details) {
          if (errorData.details.includes('API key') || errorData.details.includes('401')) {
            errorMessage = 'AI analysis service is not properly configured';
            suggestions = ['The OpenAI API key may not be set up correctly', 'Please contact support'];
          } else if (errorData.details.includes('timeout') || errorData.details.includes('504')) {
            errorMessage = 'AI analysis service timed out';
            suggestions = ['The request took too long to process', 'Try again with a simpler description'];
          }
        }
        
        showErrorState(
          errorData.errorType || 'ANALYSIS_ERROR',
          errorMessage,
          suggestions
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
            calories: item.calories,
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

  
  // Handler for manual entry from summary panel
  const handleManualEntryFromSummary = () => {
    setShowSummaryPanel(false);
    // Don't reset the selectedImage - keep it visible for reference
    setShowManualFoodEntry(true);
  };

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
      calories: item.calories,
      selected: true
    }));
    
    // Store all selected items for sequential processing
    setPendingItems(summaryItems);
    setCurrentItemIndex(0);
    
    // Process the first item
    processCurrentItem(summaryItems, 0);
  };

  const processCurrentItem = async (items: SummaryItem[], index: number) => {
    if (index >= items.length) {
      // All items processed - show final meal summary instead of logging immediately
      console.log('🎉 All items processed, showing final meal summary');
      setShowFinalMealSummary(true);
      return;
    }

    const currentItem = items[index];
    const nutrition = await estimateNutritionFromLabel(currentItem.name);
    
    const foodItem = {
      id: currentItem.id,
      name: currentItem.name,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      fiber: nutrition.fiber,
      sugar: nutrition.sugar,
      sodium: nutrition.sodium,
      confidence: 85, // Estimated confidence for detected items
      image: selectedImage // Use the original photo as reference
    };

    console.log(`Processing item ${index + 1} of ${items.length}:`, foodItem);
    
    // Use the existing FoodConfirmationCard flow
    setRecognizedFoods([foodItem]);
    setShowConfirmation(true);
    setInputSource('photo');
    
    if (items.length > 1) {
      toast.success(`Confirming item ${index + 1} of ${items.length}: ${currentItem.name}`);
    } else {
      toast.success('Food item ready for confirmation!');
    }
  };

  const handleTransitionComplete = () => {
    setShowTransition(false);
    // Immediately show the confirmation dialog to eliminate any gap
    setShowConfirmation(true);
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
    console.log('🍽️ === FOOD CONFIRMATION DEBUG START ===');
    console.log('📊 Food item being confirmed:', foodItem);
    console.log('🏷️ Branded info:', foodItem.brandInfo || 'N/A');
    console.log('🔍 Debug log:', foodItem.debugLog || 'N/A');
    
    const confirmationDebug = {
      step: 'food_confirmation',
      foodName: foodItem.name,
      hasBrandedInfo: !!foodItem.brandInfo,
      hasDebugLog: !!foodItem.debugLog,
      nutritionValues: {
        calories: foodItem.calories,
        protein: foodItem.protein,
        carbs: foodItem.carbs,
        fat: foodItem.fat
      },
      saveToDatabase: false,
      saveToContext: false,
      errors: [] as string[]
    };

    try {
      // Store the confirmed item for final meal logging instead of logging immediately
      const currentPendingItem = pendingItems[currentItemIndex];
      const confirmedItem = {
        id: currentPendingItem.id,
        name: foodItem.name,
        portion: foodItem.serving || 'Estimated portion',
        calories: foodItem.calories,
        foodData: foodItem
      };
      
      setConfirmedMealItems(prev => [...prev, confirmedItem]);
      console.log('✅ ITEM STORED FOR FINAL MEAL LOGGING:', confirmedItem);
      
      // Check if there are more pending items to process
      if (pendingItems.length > 0 && currentItemIndex < pendingItems.length - 1) {
        const nextIndex = currentItemIndex + 1;
        setCurrentItemIndex(nextIndex);
        setShowConfirmation(false); // Close current confirmation
        
        console.log(`🔄 PROCEEDING TO NEXT ITEM: ${nextIndex + 1} of ${pendingItems.length}`);
        
        // Show transition screen between items if multiple items
        if (pendingItems.length > 1) {
          setShowTransition(true);
        } else {
          setTimeout(() => {
            processCurrentItem(pendingItems, nextIndex);
          }, 300);
        }
      } else {
        // All items processed, close confirmation and trigger final summary
        console.log(`🎉 ALL ITEMS CONFIRMED - Showing final meal summary`);
        setShowConfirmation(false);
        processCurrentItem(pendingItems, pendingItems.length); // Trigger final summary
      }
      
    } catch (error) {
      confirmationDebug.errors.push(`Confirmation exception: ${error.message}`);
      console.error('❌ CONFIRMATION EXCEPTION:', error);
      toast.error('Failed to confirm food item');
      return;
    }
  };

  // Final meal logging handlers
  const handleLogEntireMeal = async () => {
    try {
      console.log('🍽️ === LOGGING ENTIRE MEAL ===');
      console.log('📊 Confirmed items to log:', confirmedMealItems);
      
      // Log all confirmed items to database
      for (const item of confirmedMealItems) {
        const foodItem = item.foodData;
        
        // Add to nutrition context
        addFood(foodItem);
        
        // Save to Supabase
        const { data, error } = await supabase
          .from('nutrition_logs')
          .insert({
            user_id: user?.id,
            food_name: foodItem.name,
            calories: foodItem.calories,
            protein: foodItem.protein,
            carbs: foodItem.carbs,
            fat: foodItem.fat,
            fiber: foodItem.fiber,
            sugar: foodItem.sugar,
            sodium: foodItem.sodium,
            confidence: foodItem.confidence,
            serving_size: foodItem.serving || 'Estimated portion',
            source: 'vision_api',
            image_url: selectedImage || null,
          })
          .select();

        if (error) {
          console.error('❌ DATABASE SAVE FAILED for item:', item.name, error);
          toast.error(`Failed to save ${item.name}`);
          return;
        }
        
        // Score the meal quality
        await scoreMealAfterInsert(data, error);
      }
      
      // Refresh saved foods list
      if (refetchSavedFoods) {
        await refetchSavedFoods();
      }
      
      // Play success sound
      playFoodLogConfirm();
      
      // Show success message
      toast.success('Meal Logged! ✅');
      
      // Reset state and navigate
      setShowFinalMealSummary(false);
      setConfirmedMealItems([]);
      resetState();
      navigate('/home');
      
    } catch (error) {
      console.error('❌ MEAL LOGGING EXCEPTION:', error);
      toast.error('Failed to log meal');
    }
  };

  const handleEditItemFromSummary = (itemId: string) => {
    // Find the item in confirmed items
    const itemIndex = confirmedMealItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    
    // Find the corresponding pending item
    const pendingIndex = pendingItems.findIndex(item => item.id === itemId);
    if (pendingIndex === -1) return;
    
    // Remove from confirmed items (will be re-added when user confirms again)
    setConfirmedMealItems(prev => prev.filter(item => item.id !== itemId));
    
    // Close final summary and show confirmation for this specific item
    setShowFinalMealSummary(false);
    setCurrentItemIndex(pendingIndex);
    setShowConfirmation(true);
  };

  const handleCloseFinalSummary = () => {
    setShowFinalMealSummary(false);
    setConfirmedMealItems([]);
    setPendingItems([]);
    setCurrentItemIndex(0);
    resetState();
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
    
    // Reset final meal summary state
    setShowFinalMealSummary(false);
    setConfirmedMealItems([]);
    
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

      {/* Main Camera UI */}
      {activeTab === 'main' && !selectedImage && !showConfirmation && !showError && !showManualEdit && (
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
      {selectedImage && !showConfirmation && !showSummaryPanel && !showTransition && pendingItems.length === 0 && !isAnalyzing && inputSource !== 'barcode' && (
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
        onClose={() => {
          setShowConfirmation(false);
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
        totalItems={pendingItems.length}
      />

      {/* Summary Review Panel - Only for food detection, never for barcodes */}
      {inputSource !== 'barcode' && (
        <SummaryReviewPanel
          isOpen={showSummaryPanel}
          onClose={() => setShowSummaryPanel(false)}
          onNext={handleSummaryNext}
          onManualEntry={handleManualEntryFromSummary}
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
          onClose={() => setShowReviewScreen(false)}
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
        onSave={(foodData) => {
          setRecognizedFoods([foodData]);
          setShowConfirmation(true);
          setInputSource('manual');
          setShowManualFoodEntry(false);
        }}
        initialBarcode={failedBarcode}
      />

      {/* Final Meal Summary Modal */}
      <FinalMealSummary
        isOpen={showFinalMealSummary}
        onClose={handleCloseFinalSummary}
        onLogMeal={handleLogEntireMeal}
        onEditItem={handleEditItemFromSummary}
        items={confirmedMealItems}
      />

      {/* Debug components removed - clean production interface */}
      
    </div>
  );
};

export default CameraPage;
