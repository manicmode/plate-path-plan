import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, Keyboard, Mic, Zap, AlertTriangle } from 'lucide-react';
import { HealthScannerInterface } from './HealthScannerInterface';
import { HealthAnalysisLoading } from './HealthAnalysisLoading';
import { HealthReportPopup } from './HealthReportPopup';
import { ManualEntryFallback } from './ManualEntryFallback';
import { ResultCard } from './ResultCard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { triggerDailyScoreCalculation } from '@/lib/dailyScoreUtils';
import { toLegacyFromEdge } from '@/lib/health/toLegacyFromEdge';
import { logScoreNorm } from '@/lib/health/extractScore';

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

type ModalState = 'scanner' | 'loading' | 'report' | 'fallback';

export const HealthCheckModal: React.FC<HealthCheckModalProps> = ({
  isOpen,
  onClose
}) => {
  const [currentState, setCurrentState] = useState<ModalState>('scanner');
  const [analysisResult, setAnalysisResult] = useState<HealthAnalysisResult | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [analysisType, setAnalysisType] = useState<'barcode' | 'image' | 'manual'>('image');
  const { toast } = useToast();
  const { user } = useAuth();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentState('scanner');
      setAnalysisResult(null);
      setLoadingMessage('');
    }
  }, [isOpen]);

  const handleImageCapture = async (imageData: string) => {
    console.log("🚀 HealthCheckModal.handleImageCapture called!");
    console.log("📥 Image data received:", imageData ? `${imageData.length} characters` : "NO DATA");
    console.log("👤 User ID:", user?.id || "NO USER");
    
    try {
      setCurrentState('loading');
      setLoadingMessage('Analyzing image...');
      
      // Check if image contains a barcode (appended from HealthScannerInterface)
      const barcodeMatch = imageData.match(/&barcode=(\d+)$/);
      const detectedBarcode = barcodeMatch ? barcodeMatch[1] : null;
      
      if (detectedBarcode) {
        console.log('📊 Barcode detected in image:', detectedBarcode);
        setAnalysisType('barcode');
        setLoadingMessage('Processing barcode...');
        
        // Remove the barcode part from the image data
        const cleanImageData = imageData.replace(/&barcode=\d+$/, '');
        
        // Use unified barcode pipeline (same as Log flow)
        try {
          console.log('🔄 Processing barcode:', detectedBarcode);
          console.log('[HS PIPELINE]', 'enhanced-health-scanner (unified)', { mode: 'barcode', barcode: detectedBarcode });
          
          const { data: result, error } = await supabase.functions.invoke('enhanced-health-scanner', {
            body: { mode: 'barcode', barcode: detectedBarcode, source: 'health-scan' }
          });
          
          if (error || !result?.ok) {
            console.log('⚠️ No results from unified barcode pipeline, falling back to image analysis');
            // If barcode lookup fails, continue with regular image analysis
            return handleImageCapture(cleanImageData);
          }
          
          // Use the tolerant adapter to normalize the data (same as Log flow)
          const legacy = toLegacyFromEdge(result);
          
          // RCA telemetry for barcode-photo path (now unified with Log flow)
          console.groupCollapsed('[HS] RCA (barcode-photo)');
          console.log('edge/result.product.name', result?.product?.name);
          console.log('edge/result.product.health.score', result?.product?.health?.score);
          console.log('edge/result.product.health.flags.len', result?.product?.health?.flags?.length ?? 0);
          console.log('edge/result.health.score', result?.health?.score);
          console.groupEnd();
          
          console.groupCollapsed('[HS] RCA legacy (barcode-photo)');
          console.log('legacy.productName', legacy?.productName);
          console.log('legacy.healthScore', legacy?.healthScore);
          console.log('legacy.healthFlags.len', legacy?.healthFlags?.length ?? 0);
          console.log('legacy.ingredientsText.len', legacy?.ingredientsText?.length ?? 0);
          console.groupEnd();

          // Score (0–100) from multiple likely sources, then convert to 0–10 for UI
          // Add scale guard: if already 0-10, don't divide again
          const rawScore = legacy.healthScore ?? result?.product?.health?.score ?? result?.health?.score ?? (result as any)?.healthScore;
          const scorePct = extractScore(rawScore);
          const score10 = scorePct == null ? undefined : scorePct / 10; // DO NOT default to 0
          
          // Score normalization telemetry
          logScoreNorm('score_norm:barcode-photo.edge', result?.product?.health?.score ?? result?.health?.score, null);
          logScoreNorm('score_norm:barcode-photo.legacy', legacy?.healthScore, null);

          // Flags: prefer adapter global flags; if empty, fall back to top-level result.healthFlags
          const rawFlags = Array.isArray(legacy.healthFlags) ? legacy.healthFlags
                          : Array.isArray((result as any)?.healthFlags) ? (result as any).healthFlags
                          : [];
          const ingredientFlags = rawFlags.map((f: any) => ({
            ingredient: f.title || f.label || f.key || 'Ingredient',
            flag:       f.description || f.label || '',
            severity:   /danger|high/i.test(f.severity) ? 'high'
                      : /warn|med/i.test(f.severity)   ? 'medium' : 'low',
          }));

          // Ingredients
          const ingredientsText =
            legacy.ingredientsText ??
            (Array.isArray(result?.product?.ingredients) ? result.product.ingredients.join(', ') : undefined);

          // Nutrition (normalize field names if needed)
          function mapNutrition(n: any) {
            if (!n) return undefined;
            const pick = (obj: any, ...keys: string[]) => {
              for (const k of keys) if (obj && obj[k] != null) return obj[k];
              return undefined;
            };
            return {
              calories: pick(n, 'calories', 'energy_kcal', 'kcal'),
              protein:  pick(n, 'protein', 'protein_g'),
              carbs:    pick(n, 'carbs', 'carbohydrates', 'carbs_g', 'carbohydrates_g'),
              fat:      pick(n, 'fat', 'fat_g'),
              fiber:    pick(n, 'fiber', 'fiber_g'),
              sugar:    pick(n, 'sugar', 'sugars', 'sugar_g', 'sugars_g'),
              sodium:   pick(n, 'sodium', 'sodium_mg'),
            };
          }
          const nutritionData = mapNutrition(legacy.nutrition) ?? legacy.nutrition ?? undefined;

          // Telemetry
          console.groupCollapsed('[HS] report_model (barcode-photo)');
          console.log({ edgeScore: result?.product?.health?.score ?? result?.health?.score,
                        legacyScore: legacy.healthScore, scorePct, score10,
                        flagsLen: ingredientFlags.length, ingredientsLen: ingredientsText?.length ?? 0 });
          console.groupEnd();

          // Determine tier without forcing "Avoid" on unknown score
          const tier = score10 == null ? 'unknown' : score10 < 3 ? 'avoid' : score10 < 6 ? 'caution' : 'ok';

          // Guardrails
          if (ingredientsText && ingredientsText.length < 5) {
            console.warn('[HS] BUG: ingredients collapsed', { ingredientsText });
          }
          if (rawFlags.length > 0 && ingredientFlags.length === 0) {
            console.warn('[HS] BUG: flags lost in mapping', { rawFlags });
          }

          // Transform to match frontend interface
          const analysisResult: HealthAnalysisResult = {
            itemName: legacy?.productName || 'Unknown Item',
            healthScore: score10 ?? 0,              // 0–10 scale for UI
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
          
          // Trigger daily score calculation after health scan completion
          if (user?.id) {
            triggerDailyScoreCalculation(user.id);
          }
          
          return;
        } catch (barcodeError) {
          console.error('❌ Barcode analysis failed:', barcodeError);
          // Continue with image analysis as fallback
          console.log('🔄 Falling back to image analysis...');
        }
      }
      
      // If no barcode or barcode processing failed, proceed with image analysis
      setAnalysisType('image');
      
      console.log('🖼️ About to call enhanced-health-scanner function...');
      
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
      
      console.log('📦 Enhanced scanner payload:', {
        mode: payload.mode,
        dataLength: payload.imageBase64?.length || 0,
        hasDetectedBarcode: !!detectedBarcode
      });
      
      let data, error;
      try {
        console.log('🔄 Making enhanced-health-scanner call...');
        console.log('[HS PIPELINE]', 'enhanced-health-scanner', { mode: payload.mode });
        const result = await supabase.functions.invoke('enhanced-health-scanner', {
          body: payload
        });
        console.log("✅ Enhanced Health Scanner Success:", result);
        
        data = result.data;
        error = result.error;
      } catch (funcError) {
        console.error("❌ Enhanced Health Scanner Failed:", funcError);
        throw funcError;
      }

      if (error) {
        throw new Error(error.message || 'Failed to analyze image');
      }

      // Use the tolerant adapter to map edge response to legacy fields
      const legacy = toLegacyFromEdge(data);

      // RCA telemetry for image-only path
      console.groupCollapsed('[HS] RCA (image)');
      console.log('edge.product.name', data?.product?.name);
      console.log('edge.product.code', data?.product?.code);
      console.log('edge.product.health.score', data?.product?.health?.score);
      console.log('edge.product.ingredientsText', data?.product?.ingredientsText?.slice(0,200));
      console.log('edge.product.ingredients.len', data?.product?.ingredients?.length ?? 0);
      console.log('edge.product.health.flags.len', data?.product?.health?.flags?.length ?? 0);
      console.log('edge.health.score', data?.health?.score);
      console.groupEnd();
      
      console.groupCollapsed('[HS] RCA legacy (image)');
      console.log('legacy.productName', legacy?.productName);
      console.log('legacy.barcode', legacy?.barcode);
      console.log('legacy.healthScore', legacy?.healthScore);
      console.log('legacy.ingredientsText', legacy?.ingredientsText?.slice(0,200));
      console.log('legacy.healthFlags.len', legacy?.healthFlags?.length ?? 0);
      console.log('legacy.nutrition.keys', legacy?.nutrition ? Object.keys(legacy.nutrition) : null);
      console.groupEnd();

      // Accept gate: pass if we have either a decent name OR a barcode
      const hasName = !!(legacy?.productName && legacy.productName.trim().length >= 3);
      const hasBarcode = !!legacy?.barcode;

      if (!(hasName || hasBarcode)) {
        setCurrentState('fallback');
        return;
      }

          // Score (0–100) from multiple likely sources, then convert to 0–10 for UI
          // Add scale guard: if already 0-10, don't divide again
          const rawScore = legacy.healthScore ?? data?.product?.health?.score ?? data?.health?.score ?? (data as any)?.healthScore;
          const scorePct = extractScore(rawScore);
          const score10 = scorePct == null ? undefined : scorePct / 10; // DO NOT default to 0
      
      // Score normalization telemetry
      logScoreNorm('score_norm:image.edge', data?.product?.health?.score ?? data?.health?.score, null);
      logScoreNorm('score_norm:image.legacy', legacy?.healthScore, null);

      // Log whether barcode was detected or Google Vision/GPT was used
      if (data.barcode) {
        console.log('📊 Barcode detected in response:', data.barcode);
        setAnalysisType('barcode');
      } else {
        console.log('🔍 No barcode found - using Google Vision + GPT analysis');
      }

      // Flags: prefer adapter global flags; if empty, fall back to top-level data.healthFlags
      const rawFlags = Array.isArray(legacy.healthFlags) ? legacy.healthFlags
                      : Array.isArray((data as any)?.healthFlags) ? (data as any).healthFlags
                      : [];
      const ingredientFlags = rawFlags.map((f: any) => ({
        ingredient: f.title || f.label || f.key || 'Ingredient',
        flag:       f.description || f.label || '',
        severity:   /danger|high/i.test(f.severity) ? 'high'
                  : /warn|med/i.test(f.severity)   ? 'medium' : 'low',
      }));

      // Ingredients text: prefer full list from legacy
      const ingredientsText = legacy?.ingredientsText;

      // Nutrition (normalize field names if needed)
      function mapNutrition(n: any) {
        if (!n) return undefined;
        const pick = (obj: any, ...keys: string[]) => {
          for (const k of keys) if (obj?.[k] != null) return obj[k];
          return undefined;
        };
        return {
          calories: pick(n, 'calories', 'energy_kcal', 'kcal'),
          protein:  pick(n, 'protein', 'protein_g'),
          carbs:    pick(n, 'carbs', 'carbohydrates', 'carbs_g', 'carbohydrates_g'),
          fat:      pick(n, 'fat', 'fat_g'),
          fiber:    pick(n, 'fiber', 'fiber_g'),
          sugar:    pick(n, 'sugar', 'sugars', 'sugar_g', 'sugars_g'),
          sodium:   pick(n, 'sodium', 'sodium_mg'),
        };
      }
      const nutritionData = mapNutrition(legacy?.nutrition) ?? legacy?.nutrition ?? undefined;

      // Telemetry
      console.groupCollapsed('[HS] report_model');
      console.log({ edgeScore: data?.product?.health?.score ?? data?.health?.score,
                    legacyScore: legacy.healthScore, scorePct, score10,
                    flagsLen: ingredientFlags.length, ingredientsLen: ingredientsText?.length ?? 0 });
      console.groupEnd();

      // Determine tier without forcing "Avoid" on unknown score
      const tier = score10 == null ? 'unknown' : score10 < 3 ? 'avoid' : score10 < 6 ? 'caution' : 'ok';

      // Guardrails: log if mapping silently collapses
      if (ingredientsText && ingredientsText.length < 5) {
        console.warn('[HS] BUG: ingredients collapsed', { ingredientsText });
      }
      if (rawFlags.length > 0 && ingredientFlags.length === 0) {
        console.warn('[HS] BUG: flags lost in mapping', { rawFlags });
      }

      // Transform to match frontend interface
      const analysisResult: HealthAnalysisResult = {
        itemName: legacy?.productName ?? 'Unknown Item',
        healthScore: score10 ?? 0,              // 0–10 scale for UI
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
      
      // Trigger daily score calculation after health scan completion
      if (user?.id) {
        triggerDailyScoreCalculation(user.id);
      }
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze the image. Please try again or use manual entry.",
        variant: "destructive",
      });
      setCurrentState('fallback');
    }
  };

  const handleManualEntry = async (query: string, type: 'text' | 'voice') => {
    try {
      setCurrentState('loading');
      setAnalysisType('manual');
      setLoadingMessage(type === 'voice' ? 'Processing voice input...' : 'Searching food database...');
      
      console.log(`📝 Processing ${type} input:`, query);
      
      const { data, error } = await supabase.functions.invoke('health-check-processor', {
        body: {
          inputType: type,
          data: query,
          userId: user?.id,
          detectedBarcode: null
        }
      });

      if (error) {
        throw new Error(error.message || `Failed to process ${type} input`);
      }

      console.log('✅ Manual entry processor response:', data);
      console.log('🏥 Health Score:', data.healthScore);
      console.log('🚩 Health Flags:', data.healthFlags?.length || 0, 'flags detected');
      
      // Transform the backend response to match frontend interface
      const result: HealthAnalysisResult = {
        itemName: data.productName || query,
        healthScore: data.healthScore || 0,
        ingredientFlags: (data.healthFlags || []).map((flag: any) => ({
          ingredient: flag.title,
          flag: flag.description,
          severity: flag.type === 'danger' ? 'high' : flag.type === 'warning' ? 'medium' : 'low'
        })),
        nutritionData: data.nutritionSummary || {},
        healthProfile: {
          isOrganic: data.ingredients?.includes('organic') || false,
          isGMO: data.ingredients?.some((ing: string) => ing.toLowerCase().includes('gmo')) || false,
          allergens: data.ingredients?.filter((ing: string) => 
            ['milk', 'eggs', 'fish', 'shellfish', 'nuts', 'peanuts', 'wheat', 'soy'].some(allergen => 
              ing.toLowerCase().includes(allergen)
            )
          ) || [],
          preservatives: data.ingredients?.filter((ing: string) => 
            ing.toLowerCase().includes('preservative') || 
            ing.toLowerCase().includes('sodium benzoate') ||
            ing.toLowerCase().includes('potassium sorbate')
          ) || [],
          additives: data.ingredients?.filter((ing: string) => 
            ing.toLowerCase().includes('artificial') || 
            ing.toLowerCase().includes('flavor') ||
            ing.toLowerCase().includes('color')
          ) || []
        },
        personalizedWarnings: Array.isArray(data.recommendations) ? 
          data.recommendations.filter((rec: string) => rec.toLowerCase().includes('warning') || rec.toLowerCase().includes('avoid')) : [],
        suggestions: Array.isArray(data.recommendations) ? data.recommendations : [data.generalSummary || 'No specific recommendations available.'],
        overallRating: data.healthScore >= 80 ? 'excellent' : 
                      data.healthScore >= 60 ? 'good' : 
                      data.healthScore >= 40 ? 'fair' : 
                      data.healthScore >= 20 ? 'poor' : 'avoid'
      };

      setAnalysisResult(result);
      setCurrentState('report');
      
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