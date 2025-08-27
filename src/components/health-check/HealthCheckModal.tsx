import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, Keyboard, Mic, Zap, AlertTriangle } from 'lucide-react';
import { HealthScannerInterface } from './HealthScannerInterface';
import { HealthAnalysisLoading } from './HealthAnalysisLoading';
import { HealthReportPopup } from './HealthReportPopup';
import { NoDetectionFallback } from './NoDetectionFallback';
import { ManualEntryFallback } from './ManualEntryFallback';
import { BrandedCandidatesList } from './BrandedCandidatesList';
import { MultiAIFoodDetection } from '@/components/camera/MultiAIFoodDetection';
import { ResultCard } from './ResultCard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { triggerDailyScoreCalculation } from '@/lib/dailyScoreUtils';
import { toLegacyFromEdge } from '@/lib/health/toLegacyFromEdge';
import { logScoreNorm } from '@/lib/health/extractScore';
import { isFeatureEnabled, isInRollout } from '@/lib/featureFlags';
import { detectFoodsFromAllSources } from '@/utils/multiFoodDetector';
import { logMealAsSet } from '@/utils/mealLogging';

// Robust score extractor (0–100)
function extractScore(raw: unknown): number | undefined {
  const candidate =
    raw && typeof raw === 'object' ? (raw as any).score ?? (raw as any).value ?? raw : raw;
  if (candidate == null) return undefined;
  const s = String(candidate).trim();

  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const num = Number(frac[1]), den = Number(frac[2] || 100);
    if (Number.isFinite(num) && Number.isFinite(den) && den > 0) {
      return Math.max(0, Math.min(100, (num / den) * 100));
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  const pct = n <= 1 ? n * 100 : n;           // accept 0–1 and 0–100
  return Math.max(0, Math.min(100, pct));     // clamp
}

interface HealthCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface HealthAnalysisResult {
  itemName: string;
  productName?: string; // alias for components reading productName
  title?: string;       // alias for components reading title
  healthScore: number;
  ingredientsText?: string; // Full ingredient list from product data
  ingredientFlags: Array<{
    ingredient: string;
    flag: string;
    severity: 'low' | 'medium' | 'high';
    reason?: string;
  }>;
  nutritionData: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  healthProfile: {
    isOrganic?: boolean;
    isGMO?: boolean;
    allergens?: string[];
    preservatives?: string[];
    additives?: string[];
  };
  personalizedWarnings: string[];
  suggestions: string[];
  overallRating: 'excellent' | 'good' | 'fair' | 'poor' | 'avoid';
}

type ModalState = 'scanner' | 'loading' | 'report' | 'fallback' | 'no_detection' | 'not_found' | 'candidates' | 'meal_detection' | 'meal_confirm';

export const HealthCheckModal: React.FC<HealthCheckModalProps> = ({
  isOpen,
  onClose
}) => {
  const [currentState, setCurrentState] = useState<ModalState>('scanner');
  const [analysisResult, setAnalysisResult] = useState<HealthAnalysisResult | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [mealFoods, setMealFoods] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [analysisType, setAnalysisType] = useState<'barcode' | 'image' | 'manual'>('image');
  const { toast } = useToast();
  const { user } = useAuth();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentState('scanner');
      setAnalysisResult(null);
      setCandidates([]);
      setMealFoods([]);
      setIsProcessing(false);
      setCaptureId(null);
      setLoadingMessage('');
    }
  }, [isOpen]);

  const handleImageCapture = async (imageData: string) => {
    console.log("🚀 HealthCheckModal.handleImageCapture called!");
    console.log("📥 Image data received:", imageData ? `${imageData.length} characters` : "NO DATA");
    console.log("👤 User ID:", user?.id || "NO USER");
    
    // Prevent concurrent analysis calls
    if (isProcessing) {
      console.log("⚠️ Analysis already in progress, ignoring request");
      return;
    }
    
    // Generate unique capture ID for correlation
    const currentCaptureId = crypto.randomUUID().substring(0, 8);
    setCaptureId(currentCaptureId);
    setIsProcessing(true);
    
    try {
      setCurrentState('loading');
      setLoadingMessage('Analyzing image...');
      
      // Check if image contains a barcode (appended from HealthScannerInterface)
      const barcodeMatch = imageData.match(/&barcode=(\d+)$/);
      const detectedBarcode = barcodeMatch ? barcodeMatch[1] : null;
      
      if (detectedBarcode) {
        console.log(`📊 Barcode detected in image [${currentCaptureId}]:`, detectedBarcode);
        setAnalysisType('barcode');
        setLoadingMessage('Processing barcode...');
        
        // Remove the barcode part from the image data
        const cleanImageData = imageData.replace(/&barcode=\d+$/, '');
        
        // Use unified barcode pipeline (same as Log flow)
        try {
          console.log(`🔄 Processing barcode [${currentCaptureId}]:`, detectedBarcode);
          console.log('[HS PIPELINE]', 'enhanced-health-scanner (unified)', { mode: 'barcode', barcode: detectedBarcode });
          
          const { data: result, error } = await supabase.functions.invoke('enhanced-health-scanner', {
            body: { mode: 'barcode', barcode: detectedBarcode, source: 'health-scan' }
          });
          
          if (error || !result?.ok) {
            console.log(`⚠️ No results from unified barcode pipeline [${currentCaptureId}], falling back to image analysis`);
            // If barcode lookup fails, continue with regular image analysis
            return handleImageCapture(cleanImageData);
          }
          
          // Use the tolerant adapter to normalize the data (same as Log flow)
          console.log(`[HS BARCODE] Raw result before adapter [${currentCaptureId}]:`, result);
          const legacy = toLegacyFromEdge(result);
          console.log(`[HS BARCODE] Legacy after adapter [${currentCaptureId}]:`, legacy);
          
          // Handle different statuses
          if (legacy.status === 'no_detection') {
            console.log(`[HS] No detection from barcode [${currentCaptureId}], showing no detection UI`);
            setCurrentState('no_detection');
            return;
          }
          
          if (legacy.status === 'not_found') {
            console.log(`[HS] Barcode not found [${currentCaptureId}], showing not found UI`);
            setCurrentState('not_found'); 
            return;
          }
          
          // Process barcode result and show report
          await processAndShowResult(legacy, result, currentCaptureId, 'barcode');
          return;
          
        } catch (barcodeError) {
          console.error(`❌ Barcode analysis failed [${currentCaptureId}]:`, barcodeError);
          // Continue with image analysis as fallback
          console.log(`🔄 Falling back to image analysis... [${currentCaptureId}]`);
        }
      }
      
      // If no barcode or barcode processing failed, proceed with image analysis
      setAnalysisType('image');
      
      console.log(`🖼️ About to call enhanced-health-scanner function [${currentCaptureId}]...`);
      
      // Clean image data if it contains a barcode parameter
      const cleanImageData = detectedBarcode ? 
        imageData.replace(/&barcode=\d+$/, '') : 
        imageData;
        
      // Use enhanced scanner with structured results
      const payload = {
        imageBase64: cleanImageData,
        mode: 'scan',
        detectedBarcode: detectedBarcode || null
      };
      
      // A) Prove analyzer gets full-frame image (DEV-only logs)
      const estimatedBytes = Math.floor(payload.imageBase64.length * 0.75); // base64 overhead
      console.debug(`[ANALYZE IMG] {bytes: ${payload.imageBase64.length}, estimatedImageBytes: ${estimatedBytes}}`);
      
      console.log(`📦 Enhanced scanner payload [${currentCaptureId}]:`, {
        mode: payload.mode,
        dataLength: payload.imageBase64?.length || 0,
        hasDetectedBarcode: !!detectedBarcode
      });
      
      let data, error;
      try {
        console.log(`🔄 Making enhanced-health-scanner call [${currentCaptureId}]...`);
        console.log('[HS PIPELINE]', 'enhanced-health-scanner', { mode: payload.mode });
        const result = await supabase.functions.invoke('enhanced-health-scanner', {
          body: payload
        });
        console.log(`✅ Enhanced Health Scanner Success [${currentCaptureId}]:`, result);
        
        data = result.data;
        error = result.error;
      } catch (funcError) {
        console.error(`❌ Enhanced Health Scanner Failed [${currentCaptureId}]:`, funcError);
        throw funcError;
      }

      if (error) {
        throw new Error(error.message || 'Failed to analyze image');
      }

      // Use the tolerant adapter to map edge response to legacy fields
      const legacy = toLegacyFromEdge(data);
      
      // Route based on detection kind
      await routeBasedOnKind(data, legacy, cleanImageData, currentCaptureId);
      
    } catch (error) {
      console.error(`💥 Image capture error [${currentCaptureId}]:`, error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze the image. Please try again.",
        variant: "destructive",
      });
      setCurrentState('fallback');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to detect if input is a barcode
  const isBarcode = (input: string): boolean => {
    const cleaned = input.trim().replace(/\s+/g, '');
    // Check if it's all digits and has a reasonable barcode length (8-14 digits)
    return /^\d{8,14}$/.test(cleaned);
  };

  const handleManualEntry = async (query: string, type: 'text' | 'voice') => {
    try {
      setCurrentState('loading');
      setAnalysisType('manual');
      
      const trimmedQuery = query.trim();
      console.log(`📝 Processing ${type} input:`, trimmedQuery);
      
      // Intelligent routing based on input content
      if (isBarcode(trimmedQuery)) {
        console.log('🏷️ Input detected as barcode, routing to enhanced-health-scanner');
        setLoadingMessage('Processing barcode...');
        
        const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
          body: { 
            mode: 'barcode', 
            barcode: trimmedQuery.replace(/\s+/g, ''), 
            source: 'health-scan-manual' 
          }
        });

        if (error || !data?.ok) {
          console.log('⚠️ Barcode lookup failed:', error);
          setCurrentState('not_found');
          return;
        }

        // Use the same adapter logic as successful barcode pipeline
        const legacy = toLegacyFromEdge(data);
        console.log('[HS MANUAL BARCODE] Legacy result:', legacy);
        
        // Handle different statuses
        if (legacy.status === 'no_detection') {
          console.log('[HS] Manual barcode: no detection');
          setCurrentState('no_detection');
          return;
        }
        
        if (legacy.status === 'not_found') {
          console.log('[HS] Manual barcode: not found');
          setCurrentState('not_found'); 
          return;
        }
        
        // Process successful barcode result (same logic as barcode capture)
        const itemName = legacy.productName || 'Unknown item';
        const rawScore = legacy.healthScore ?? data?.product?.health?.score ?? data?.health?.score;
        const scorePct = extractScore(rawScore);
        const score10 = scorePct == null ? null : scorePct / 10;
        
        const rawFlags = Array.isArray(legacy.healthFlags) ? legacy.healthFlags : [];
        const ingredientFlags = rawFlags.map((f: any) => ({
          ingredient: f.title || f.label || f.key || 'Ingredient',
          flag: f.description || f.label || '',
          severity: (/danger|high/i.test(f.severity) ? 'high' : /warn|med/i.test(f.severity) ? 'medium' : 'low') as 'low' | 'medium' | 'high',
        }));

        const analysisResult: HealthAnalysisResult = {
          itemName,
          productName: itemName,
          title: itemName,
          healthScore: score10 ?? 0,
          ingredientsText: legacy.ingredientsText,
          ingredientFlags,
          nutritionData: legacy.nutrition || {},
          healthProfile: {
            isOrganic: legacy.ingredientsText?.includes('organic') || false,
            isGMO: legacy.ingredientsText?.toLowerCase().includes('gmo') || false,
            allergens: legacy.ingredientsText ? 
              ['milk', 'eggs', 'fish', 'shellfish', 'nuts', 'peanuts', 'wheat', 'soy'].filter(allergen => 
                legacy.ingredientsText!.toLowerCase().includes(allergen)
              ) : [],
            preservatives: [],
            additives: []
          },
          personalizedWarnings: [],
          suggestions: ingredientFlags.filter(f => f.severity === 'medium').map(f => f.flag),
          overallRating: score10 == null ? 'avoid' : 
                        score10 >= 8 ? 'excellent' : 
                        score10 >= 6 ? 'good' : 
                        score10 >= 4 ? 'fair' : 
                        score10 >= 2 ? 'poor' : 'avoid'
        };

        setAnalysisResult(analysisResult);
        setCurrentState('report');
        
      } else {
        console.log('📝 Input detected as text/description, routing to GPT analyzer');
        setLoadingMessage(type === 'voice' ? 'Processing voice input...' : 'Analyzing food description...');
        
        const { data, error } = await supabase.functions.invoke('gpt-smart-food-analyzer', {
          body: {
            text: trimmedQuery,
            taskType: 'food_analysis',
            complexity: 'auto'
          }
        });

        if (error) {
          throw new Error(error.message || `Failed to analyze ${type} input`);
        }

        console.log('✅ GPT analyzer response:', data);
        
        if (!data.foods || data.foods.length === 0 || data.total_confidence < 0.3) {
          console.log('⚠️ GPT analysis returned low confidence or no foods');
          setCurrentState('no_detection');
          return;
        }

        // Transform GPT response to Health Analysis format
        const primaryFood = data.foods[0]; // Use the first/primary food item
        const itemName = primaryFood.name || trimmedQuery;
        
        // Convert nutrition to health score (simple heuristic)
        const calories = primaryFood.calories || 0;
        const protein = primaryFood.protein || 0;
        const fiber = primaryFood.fiber || 0;
        const sugar = primaryFood.sugar || 0;
        const sodium = primaryFood.sodium || 0;
        
        // Basic health scoring based on nutrition
        let healthScore = 5; // Start neutral
        if (fiber > 3) healthScore += 1;
        if (protein > 10) healthScore += 1;
        if (sugar > 15) healthScore -= 1;
        if (sodium > 400) healthScore -= 1;
        if (calories > 300) healthScore -= 0.5;
        healthScore = Math.max(1, Math.min(10, healthScore));

        const analysisResult: HealthAnalysisResult = {
          itemName,
          productName: itemName,
          title: itemName,
          healthScore,
          ingredientsText: undefined, // GPT analyzer doesn't provide ingredients
          ingredientFlags: [],
          nutritionData: {
            calories: primaryFood.calories,
            protein: primaryFood.protein,
            carbs: primaryFood.carbs,
            fat: primaryFood.fat,
            fiber: primaryFood.fiber,
            sugar: primaryFood.sugar,
            sodium: primaryFood.sodium,
          },
          healthProfile: {
            isOrganic: false,
            isGMO: false,
            allergens: [],
            preservatives: [],
            additives: []
          },
          personalizedWarnings: [],
          suggestions: data.processing_notes ? [data.processing_notes] : [],
          overallRating: healthScore >= 8 ? 'excellent' : 
                        healthScore >= 6 ? 'good' : 
                        healthScore >= 4 ? 'fair' : 
                        healthScore >= 2 ? 'poor' : 'avoid'
        };

        setAnalysisResult(analysisResult);
        setCurrentState('report');
      }
      
      // Trigger daily score calculation after health scan completion
      if (user?.id) {
        triggerDailyScoreCalculation(user.id);
      }
      
    } catch (error) {
      console.error(`❌ ${type} analysis failed:`, error);
      toast({
        title: "Analysis Failed",
        description: `Unable to process ${type} input. Please try again.`,
        variant: "destructive",
      });
      setCurrentState('fallback');
    }
  };

  /**
   * Convert LogProduct to legacy HealthAnalysisResult format
   */
  const legacyFromProduct = (product: any, metadata: { source: string }): HealthAnalysisResult => {
    const itemName = product.productName || 'Unknown item';
    const healthScore = product.health?.score ? product.health.score / 10 : 0; // Convert 0-100 to 0-10
    
    const ingredientFlags = (product.health?.flags || []).map((f: any) => ({
      ingredient: f.label || 'Ingredient',
      flag: f.details || f.label || '',
      severity: (f.level === 'danger' ? 'high' : f.level === 'warning' ? 'medium' : 'low') as 'low' | 'medium' | 'high',
    }));

    const nutritionData = {
      calories: product.nutrition?.calories || 0,
      protein: product.nutrition?.protein_g || 0,
      carbs: product.nutrition?.carbs_g || 0,
      fat: product.nutrition?.fat_g || 0,
      fiber: product.nutrition?.fiber_g || 0,
      sugar: product.nutrition?.sugar_g || 0,
      sodium: product.nutrition?.sodium_mg || 0,
    };

    return {
      itemName,
      productName: itemName,
      title: itemName,
      healthScore,
      ingredientsText: product.ingredients?.join(', '),
      ingredientFlags,
      nutritionData,
      healthProfile: {
        isOrganic: product.ingredients?.some((ing: string) => ing.toLowerCase().includes('organic')) || false,
        isGMO: product.ingredients?.some((ing: string) => ing.toLowerCase().includes('gmo')) || false,
        allergens: product.ingredients ? 
          ['milk', 'eggs', 'fish', 'shellfish', 'nuts', 'peanuts', 'wheat', 'soy'].filter(allergen => 
            product.ingredients!.some((ing: string) => ing.toLowerCase().includes(allergen))
          ) : [],
        preservatives: product.ingredients?.filter((ing: string) => 
          ing.toLowerCase().includes('preservative') || 
          ing.toLowerCase().includes('sodium benzoate') ||
          ing.toLowerCase().includes('potassium sorbate')
        ) || [],
        additives: product.ingredients?.filter((ing: string) => 
          ing.toLowerCase().includes('artificial') || 
          ing.toLowerCase().includes('flavor') ||
          ing.toLowerCase().includes('color')
        ) || []
      },
      personalizedWarnings: [],
      suggestions: ingredientFlags.filter(f => f.severity === 'medium').map(f => f.flag),
      overallRating: healthScore >= 8 ? 'excellent' : 
                    healthScore >= 6 ? 'good' : 
                    healthScore >= 4 ? 'fair' : 
                    healthScore >= 2 ? 'poor' : 'avoid'
    };
  };

  /**
   * Route analysis based on detection kind
   */
  const routeBasedOnKind = async (data: any, legacy: any, imageData: string, captureId: string) => {
    const kind = data?.kind || 'none';
    const fallback = data?.fallback === true;
    const hasProduct = !!data?.product;
    const productName = data?.product?.productName || data?.productName || 'Unknown';
    
    console.log(`[HS] Routing DEV log [${captureId}]:`, { kind, fallback, hasProduct, productName });
    
    switch (kind) {
      case 'single_product':
        case 'branded': // Support both naming conventions
        // Use direct product mapping when product is available, bypass toLegacyFromEdge
        if (data.product && !fallback) {
          console.log(`[HS] Single product with direct product data [${captureId}]`);
          const directLegacy = legacyFromProduct(data.product, { source: 'image' });
          setAnalysisResult(directLegacy);
          setCurrentState('report');
          
          // Trigger daily score calculation
          if (user?.id) {
            triggerDailyScoreCalculation(user.id);
          }
        } else {
          // Fallback to existing toLegacyFromEdge flow
          console.log(`[HS] Single product using legacy adapter [${captureId}]`);
          await processAndShowResult(legacy, data, captureId, 'image');
        }
        break;
        
      case 'multiple_candidates':
      case 'branded_candidates':
        // Multiple branded products → show candidate picker
        if (isInRollout('photo_meal_ui_v1', user?.id) && data.candidates && data.candidates.length > 1) {
          console.log(`[HS] Found ${data.candidates.length} candidates, showing selection UI [${captureId}]`);
          setCandidates(data.candidates);
          setCurrentState('candidates');
        } else {
          // Fallback to first candidate or no detection
          await handleFallbackFromCandidates(data, legacy, captureId);
        }
        break;
        
      case 'meal':
        // Multi-food meal detected → show meal detection UI  
        if (isInRollout('photo_meal_ui_v1', user?.id) && data.foods && data.foods.length > 0) {
          console.log(`[HS] Meal detected with ${data.foods.length} foods [${captureId}]`);
          setMealFoods(data.foods);
          setCurrentState('meal_detection');
        } else {
          // Fallback to multi-detector
          await handleMealFallback(imageData, captureId);
        }
        break;
        
      case 'none':default:
        // No clear detection → try multi-detector as fallback
        console.log(`[HS] No detection, trying multi-food fallback [${captureId}]`);
        await handleMealFallback(imageData, captureId);
        break;
    }
  };
  
  /**
   * Handle meal detection fallback using multi-detector
   */
  const handleMealFallback = async (imageData: string, captureId: string) => {
    if (!isInRollout('photo_meal_ui_v1', user?.id)) {
      // Feature not enabled, show no detection
      setCurrentState('no_detection');
      return;
    }
    
    try {
      console.log(`[HS] Running multi-food detector fallback [${captureId}]`);
      setLoadingMessage('Detecting individual foods...');
      
      const detectedFoods = await detectFoodsFromAllSources(imageData);
      
      if (detectedFoods && detectedFoods.length > 0) {
        console.log(`[HS] Multi-detector found ${detectedFoods.length} foods [${captureId}]`);
        setMealFoods(detectedFoods);
        setCurrentState('meal_detection');
      } else {
        console.log(`[HS] Multi-detector found no foods [${captureId}]`);
        setCurrentState('no_detection');
      }
    } catch (error) {
      console.error(`[HS] Multi-detector failed [${captureId}]:`, error);
      setCurrentState('no_detection');
    }
  };
  
  /**
   * Handle candidates fallback
   */
  const handleFallbackFromCandidates = async (data: any, legacy: any, captureId: string) => {
    if (data.candidates && data.candidates.length > 0) {
      // Use first candidate as fallback
      console.log(`[HS] Using first candidate as fallback [${captureId}]`);
      await processAndShowResult(legacy, data, captureId, 'image');
    } else {
      console.log(`[HS] No candidates available [${captureId}]`);
      setCurrentState('no_detection');  
    }
  };
  
  /**
   * Process result and show appropriate report
   */
  const processAndShowResult = async (legacy: any, data: any, captureId: string, type: string) => {
    // Handle different statuses
    if (legacy.status === 'no_detection') {
      console.log(`[HS] No detection from ${type} [${captureId}], showing no detection UI`);
      setCurrentState('no_detection');
      return;
    }
    
    if (legacy.status === 'not_found') {
      console.log(`[HS] ${type} not found [${captureId}], showing not found UI`);
      setCurrentState('not_found'); 
      return;
    }
    
    // Set name once and mirror to all possible header keys
    const itemName = legacy.productName || 'Unknown item';
    console.log(`[HS ${type.toUpperCase()}] Final itemName [${captureId}]:`, itemName);
    
    // Process score, flags, and nutrition same as before
    const rawScore = legacy.healthScore ?? data?.product?.health?.score ?? data?.health?.score ?? (data as any)?.healthScore;
    const scorePct = extractScore(rawScore);
    const score10 = scorePct == null ? null : scorePct / 10;
    
    const rawFlags = Array.isArray(legacy.healthFlags) ? legacy.healthFlags
                    : Array.isArray((data as any)?.healthFlags) ? (data as any).healthFlags
                    : [];
    const ingredientFlags = rawFlags.map((f: any) => ({
      ingredient: f.title || f.label || f.key || 'Ingredient',
      flag: f.description || f.label || '',
      severity: (/danger|high/i.test(f.severity) ? 'high' : /warn|med/i.test(f.severity) ? 'medium' : 'low') as 'low' | 'medium' | 'high',
    }));
    
    const ingredientsText = legacy.ingredientsText;
    const nutritionData = legacy.nutrition || {};
    
    const analysisResult: HealthAnalysisResult = {
      itemName,
      productName: itemName,
      title: itemName,
      healthScore: score10 ?? 0,
      ingredientsText,
      ingredientFlags,
      nutritionData: nutritionData || {},
      healthProfile: {
        isOrganic: ingredientsText?.includes('organic') || false,
        isGMO: ingredientsText?.toLowerCase().includes('gmo') || false,
        allergens: ingredientsText ? 
          ['milk', 'eggs', 'fish', 'shellfish', 'nuts', 'peanuts', 'wheat', 'soy'].filter(allergen => 
            ingredientsText!.toLowerCase().includes(allergen)
          ) : [],
        preservatives: ingredientsText ? 
          ingredientsText.split(',').filter(ing => 
            ing.toLowerCase().includes('preservative') || 
            ing.toLowerCase().includes('sodium benzoate') ||
            ing.toLowerCase().includes('potassium sorbate')
          ) : [],
        additives: ingredientsText ? 
          ingredientsText.split(',').filter(ing => 
            ing.toLowerCase().includes('artificial') || 
            ing.toLowerCase().includes('flavor') ||
            ing.toLowerCase().includes('color')
          ) : []
      },
      personalizedWarnings: [],
      suggestions: ingredientFlags.filter(f => f.severity === 'medium').map(f => f.flag),
      overallRating: score10 == null ? 'avoid' : 
                    score10 >= 8 ? 'excellent' : 
                    score10 >= 6 ? 'good' : 
                    score10 >= 4 ? 'fair' : 
                    score10 >= 2 ? 'poor' : 'avoid'
    };
    
    setAnalysisResult(analysisResult);
    setCurrentState('report');
    
    // Trigger daily score calculation
    if (user?.id) {
      triggerDailyScoreCalculation(user.id);
    }
  };

  /**
   * Handle meal confirmation from multi-food detection
   */
  const handleMealConfirm = async (selectedFoods: any[]) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in to save meals.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setCurrentState('loading');
      setLoadingMessage('Saving meal...');
      
      const result = await logMealAsSet(selectedFoods, user.id);
      
      if (result.success) {
        toast({
          title: "Meal Saved!",
          description: `Successfully logged ${selectedFoods.length} food items as a meal.`,
        });
        
        // Show meal confirmation state
        setCurrentState('meal_confirm');
        
        // Auto-close after success
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to save meal');
      }
    } catch (error) {
      console.error('❌ Meal confirmation failed:', error);
      toast({
        title: "Error",
        description: "Failed to save meal. Please try again.",
        variant: "destructive",
      });
      setCurrentState('meal_detection');
    }
  };
  
  /**
   * Handle meal cancellation
   */
  const handleMealCancel = () => {
    setCurrentState('fallback');
  };
  
  /**
   * Handle adding food manually from meal detection
   */
  const handleMealAddManually = () => {
    setCurrentState('fallback');
  };

  const handleCandidateSelect = async (candidateId: string) => {
    console.log(`🔍 Fetching details for candidate: ${candidateId}`);
    
    try {
      setCurrentState('loading');
      setLoadingMessage('Fetching product details...');
      
      // Fetch detailed product information using barcode mode
      const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
        body: { mode: 'barcode', barcode: candidateId, source: 'candidate-selection' }
      });
      
      if (error || !data?.ok) {
        throw new Error('Failed to fetch candidate details');
      }
      
      // Use the same processing logic as the main flow
      const legacy = toLegacyFromEdge(data);
      
      if (legacy.status === 'no_detection' || legacy.status === 'not_found') {
        setCurrentState('fallback');
        return;
      }
      
      // Process the result same as barcode flow
      const itemName = legacy.productName || 'Unknown item';
      const rawScore = legacy.healthScore ?? data?.product?.health?.score ?? null;
      const scorePct = extractScore(rawScore);
      const score10 = scorePct == null ? null : scorePct / 10;
      
      const rawFlags = Array.isArray(legacy.healthFlags) ? legacy.healthFlags : [];
      const ingredientFlags = rawFlags.map((f: any) => ({
        ingredient: f.title || f.label || f.key || 'Ingredient',
        flag: f.description || f.label || '',
        severity: (/danger|high/i.test(f.severity) ? 'high' : /warn|med/i.test(f.severity) ? 'medium' : 'low') as 'low' | 'medium' | 'high',
      }));
      
      const ingredientsText = legacy.ingredientsText;
      const nutritionData = legacy.nutrition || {};
      
      const analysisResult: HealthAnalysisResult = {
        itemName,
        productName: itemName,
        title: itemName,
        healthScore: score10 ?? 0,
        ingredientsText,
        ingredientFlags,
        nutritionData: nutritionData || {},
        healthProfile: {
          isOrganic: ingredientsText?.includes('organic') || false,
          isGMO: ingredientsText?.toLowerCase().includes('gmo') || false,
          allergens: ingredientsText ? 
            ['milk', 'eggs', 'fish', 'shellfish', 'nuts', 'peanuts', 'wheat', 'soy'].filter(allergen => 
              ingredientsText!.toLowerCase().includes(allergen)
            ) : [],
          preservatives: ingredientsText ? 
            ingredientsText.split(',').filter(ing => 
              ing.toLowerCase().includes('preservative') || 
              ing.toLowerCase().includes('sodium benzoate') ||
              ing.toLowerCase().includes('potassium sorbate')
            ) : [],
          additives: ingredientsText ? 
            ingredientsText.split(',').filter(ing => 
              ing.toLowerCase().includes('artificial') || 
              ing.toLowerCase().includes('flavor') ||
              ing.toLowerCase().includes('color')
            ) : []
        },
        personalizedWarnings: [],
        suggestions: ingredientFlags.filter(f => f.severity === 'medium').map(f => f.flag),
        overallRating: score10 == null ? 'avoid' : 
                      score10 >= 8 ? 'excellent' : 
                      score10 >= 6 ? 'good' : 
                      score10 >= 4 ? 'fair' : 
                      score10 >= 2 ? 'poor' : 'avoid'
      };
      
      setAnalysisResult(analysisResult);
      setCurrentState('report');
      
      // Trigger daily score calculation
      if (user?.id) {
        triggerDailyScoreCalculation(user.id);
      }
      
    } catch (candidateError) {
      console.error('❌ Candidate selection failed:', candidateError);
      toast({
        title: "Error",
        description: "Failed to fetch product details. Please try again.",
        variant: "destructive",
      });
      setCurrentState('fallback');
    }
  };

  const handleCandidateManualEntry = () => {
    setCurrentState('fallback');
  };

  const handleScanAnother = () => {
    setCurrentState('scanner');
    setAnalysisResult(null);
  };

  const handleClose = () => {
    setCurrentState('scanner');
    setAnalysisResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className={`max-w-full max-h-full w-full h-full p-0 border-0 ${
          currentState === 'report' ? 'bg-background overflow-auto' : 'bg-black overflow-hidden'
        }`}
        showCloseButton={false}
      >
        <div className="relative w-full h-full">
          {/* Main Content */}
          {currentState === 'scanner' && (
            <HealthScannerInterface 
              onCapture={handleImageCapture}
              onManualEntry={() => setCurrentState('fallback')}
              onManualSearch={handleManualEntry}
              onCancel={handleClose}
            />
          )}

          {currentState === 'loading' && (
            <HealthAnalysisLoading 
              message={loadingMessage}
              analysisType={analysisType}
            />
          )}

          {currentState === 'report' && analysisResult && (
            <HealthReportPopup
              result={analysisResult}
              onScanAnother={handleScanAnother}
              onClose={handleClose}
            />
          )}

          {currentState === 'meal_detection' && isInRollout('photo_meal_ui_v1', user?.id) && (
            <MultiAIFoodDetection
              detectedFoods={mealFoods}
              isLoading={false}
              onConfirm={handleMealConfirm}
              onCancel={handleMealCancel}
              onAddManually={handleMealAddManually}
              onAddToResults={() => {}} // Not used in health check context
            />
          )}

          {currentState === 'meal_confirm' && (
            <div className="w-full min-h-screen bg-background flex items-center justify-center">
              <div className="text-center space-y-4 p-8">
                <div className="text-6xl mb-6">✅</div>
                <h2 className="text-2xl font-bold text-foreground">Meal Saved Successfully!</h2>
                <p className="text-foreground/70">Your food items have been logged as a complete meal.</p>
                <div className="pt-4">
                  <Button onClick={onClose} className="px-8">
                    Done
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentState === 'candidates' && isInRollout('photo_meal_ui_v1', user?.id) && (
            <BrandedCandidatesList
              candidates={candidates}
              onSelectCandidate={handleCandidateSelect}
              onManualEntry={handleCandidateManualEntry}
            />
          )}

          {(currentState === 'no_detection' || currentState === 'not_found') && (
            <NoDetectionFallback
              status={currentState}
              onRetryCamera={() => setCurrentState('scanner')}
              onRetryPhoto={() => setCurrentState('scanner')}
              onManualEntry={() => setCurrentState('fallback')}
              onVoiceEntry={() => setCurrentState('fallback')}
              onBack={handleClose}
            />
          )}

          {currentState === 'fallback' && (
            <ManualEntryFallback
              onManualEntry={handleManualEntry}
              onBack={() => setCurrentState('scanner')}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Note: handleBarcodeInput removed - barcode-in-photo path now uses unified enhanced-health-scanner pipeline