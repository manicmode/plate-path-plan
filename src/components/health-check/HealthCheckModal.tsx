import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { adaptScanResult, ScanResult } from '@/types/healthScan';
import { prepareImage } from '@/utils/imageUtils';
import { logScanEvent } from '@/lib/healthScanEvents';

interface HealthCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface HealthAnalysisResult {
  itemName: string;
  healthScore: number;
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

type Phase = "idle" | "capturing" | "uploading" | "processing" | "result" | "error" | "retake";

export const HealthCheckModal: React.FC<HealthCheckModalProps> = ({
  isOpen,
  onClose
}) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [requestId, setRequestId] = useState<string | undefined>();
  const [analysisResult, setAnalysisResult] = useState<HealthAnalysisResult | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [analysisType, setAnalysisType] = useState<'barcode' | 'image' | 'manual'>('image');
  const { toast } = useToast();
  const { user } = useAuth();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPhase("idle");
      setScan(null);
      setError(null);
      setAnalysisResult(null);
      setLoadingMessage('');
    }
  }, [isOpen]);

  const callScanner = useCallback(async (blob: Blob, mode?: "ping") => {
    setPhase("processing");
    setError(null);
    const traceId = crypto.randomUUID();
    try {
      const res = await fetch(`/functions/v1/enhanced-health-scanner` + (mode ? `?mode=${mode}` : ""), {
        method: "POST",
        headers: { "content-type": "image/jpeg", "x-trace-id": traceId },
        body: blob,
      });
      const raw = await res.json();
      const adapted = adaptScanResult(raw);
      setScan(adapted);
      setRequestId(adapted.requestId ?? traceId);
      setPhase("result");
      
      logScanEvent("scan_result", { 
        status: adapted.status, 
        flags: adapted.flags?.length, 
        requestId: traceId 
      });
    } catch (e: any) {
      console.error("scan_error", { traceId, err: String(e) });
      logScanEvent("scan_error", { error: String(e), traceId });
      setError("We couldn't process the photo. Try retaking with better lighting.");
      setPhase("error");
    }
  }, []);

  async function onPhotoSelected(file: File) {
    setPhase("uploading");
    try {
      const blob = await prepareImage(file); // ensures JPEG + orientation + resize
      await callScanner(blob);
    } catch (e: any) {
      setError("Couldn't read the image. Please try again.");
      setPhase("error");
    }
  }

  function handleRetake() {
    setScan(null);
    setError(null);
    setPhase("retake"); // your UI should re-open the camera/file picker
  }

  function handleManualSearch() {
    setPhase("idle"); // keep existing manual flow
    // Optionally close modal or keep as side panel
  }

  const nextActions = useMemo(() => scan?.nextActions ?? [], [scan]);

  const handleImageCapture = async (imageData: string) => {
    try {
      setPhase('processing');
      setLoadingMessage('Analyzing image...');
      
      // Check if image contains a barcode (appended from HealthScannerInterface)
      const barcodeMatch = imageData.match(/&barcode=(\d+)$/);
      const detectedBarcode = barcodeMatch ? barcodeMatch[1] : null;
      
      // Clean image data if it contains a barcode parameter
      const cleanImageData = detectedBarcode ? 
        imageData.replace(/&barcode=\d+$/, '') : 
        imageData;
      
      if (detectedBarcode) {
        setAnalysisType('barcode');
        setLoadingMessage('Processing barcode...');
        
        // Use the dedicated barcode processor with enhanced OFF lookup
        try {
          const result = await handleBarcodeInputEnhanced(detectedBarcode, user?.id);
          
          if (!result) {
            // If barcode lookup fails, continue with regular image analysis
            return handleImageCapture(cleanImageData);
          }
          
          if (process.env.NEXT_PUBLIC_SCAN_DEBUG === '1') {
            console.log('[HS] off', { status: 'success', hasProduct: true });
          }
          
          // Transform the backend response to match frontend interface
          const analysisResult: HealthAnalysisResult = {
            itemName: result.productName || 'Unknown Item',
            healthScore: result.healthScore || 0,
            ingredientFlags: (result.healthFlags || []).map((flag: any) => ({
              ingredient: flag.title,
              flag: flag.description,
              severity: flag.type === 'danger' ? 'high' : flag.type === 'warning' ? 'medium' : 'low'
            })),
            nutritionData: result.nutritionSummary || {},
            healthProfile: {
              isOrganic: result.ingredients?.includes('organic') || false,
              isGMO: result.ingredients?.some((ing: string) => ing.toLowerCase().includes('gmo')) || false,
              allergens: result.ingredients?.filter((ing: string) => 
                ['milk', 'eggs', 'fish', 'shellfish', 'nuts', 'peanuts', 'wheat', 'soy'].some(allergen => 
                  ing.toLowerCase().includes(allergen)
                )
              ) || [],
              preservatives: result.ingredients?.filter((ing: string) => 
                ing.toLowerCase().includes('preservative') || 
                ing.toLowerCase().includes('sodium benzoate') ||
                ing.toLowerCase().includes('potassium sorbate')
              ) || [],
              additives: result.ingredients?.filter((ing: string) => 
                ing.toLowerCase().includes('artificial') || 
                ing.toLowerCase().includes('flavor') ||
                ing.toLowerCase().includes('color')
              ) || []
            },
            personalizedWarnings: Array.isArray(result.recommendations) ? 
              result.recommendations.filter((rec: string) => rec.toLowerCase().includes('warning') || rec.toLowerCase().includes('avoid')) : [],
            suggestions: Array.isArray(result.recommendations) ? result.recommendations : ['No specific recommendations available.'],
            overallRating: result.healthScore >= 80 ? 'excellent' : 
                          result.healthScore >= 60 ? 'good' : 
                          result.healthScore >= 40 ? 'fair' : 
                          result.healthScore >= 20 ? 'poor' : 'avoid'
          };
          
          setAnalysisResult(analysisResult);
          setPhase('result');
          
          // Trigger daily score calculation after health scan completion
          if (user?.id) {
            triggerDailyScoreCalculation(user.id);
          }
          
          return;
        } catch (barcodeError) {
          console.error('❌ Barcode analysis failed:', barcodeError);
          // Continue with image analysis as fallback
        }
      }
      
      // If no barcode or barcode processing failed, proceed with image analysis
      setAnalysisType('image');
      
      // Evidence gating: only proceed if we expect good results (plate confidence >= 0.85)
      const plateConf = hasHighQualityPlate(cleanImageData) ? 0.9 : 0.3; // Mock confidence for now
      const willScore = detectedBarcode || plateConf >= 0.85;
      
      if (process.env.NEXT_PUBLIC_SCAN_DEBUG === '1') {
        console.log('[HS] decision', { willScore, willFallback: !willScore, plateConf });
      }
      
      if (!willScore) {
        setPhase('error');
        return;
      }
        
      // Use enhanced scanner with structured results
      const payload = {
        imageBase64: cleanImageData,
        mode: 'scan'
      };
      
      let data, error;
      try {
        const result = await supabase.functions.invoke('enhanced-health-scanner', {
          body: payload
        });
        
        data = result.data;
        error = result.error;
      } catch (funcError) {
        console.error("❌ Enhanced Health Scanner Failed:", funcError);
        throw funcError;
      }

      if (error) {
        throw new Error(error.message || 'Failed to analyze image');
      }
      
      // Check if image recognition failed based on various criteria
      const isImageRecognitionFailure = (
        // No meaningful product name detected
        !data.productName || 
        data.productName === 'Unknown Product' || 
        data.productName === 'Unknown Item' || 
        data.productName === 'Error' ||
        data.productName === 'Detected Food' ||
        // Very low confidence or health score indicating poor recognition
        data.healthScore === 0 ||
        // Specific failure indicators in health flags
        data.healthFlags?.some((flag: any) => 
          flag.title === 'Processing Error' || 
          flag.title === 'Product Not Found' ||
          flag.description?.includes('Unable to parse') ||
          flag.description?.includes('couldn\'t identify')
        ) ||
        // Empty or minimal ingredients suggesting failed recognition
        (!data.ingredients || data.ingredients.length === 0 || 
         (data.ingredients.length === 1 && data.ingredients[0] === 'Unable to parse ingredients'))
      );

      if (isImageRecognitionFailure) {
        setPhase('error');
        return;
      }
      
      // Transform the backend response to match frontend interface
      const analysisResult: HealthAnalysisResult = {
        itemName: data.productName || 'Unknown Item',
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

      setAnalysisResult(analysisResult);
      setPhase('result');
      
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
      setPhase('error');
    }
  };

  const handleManualEntry = async (query: string, type: 'text' | 'voice') => {
    try {
      setPhase('processing');
      setAnalysisType('manual');
      setLoadingMessage(type === 'voice' ? 'Processing voice input...' : 'Searching food database...');
      
      console.log(`📝 Processing ${type} input:`, query);
      
      const { data, error } = await supabase.functions.invoke('health-check-processor', {
        body: {
          inputType: type,
          data: query,
          userId: user?.id
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
      setPhase('result');
      
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
      setPhase('error');
    }
  };

  const handleScanAnother = () => {
    setPhase("idle");
    setScan(null);
    setAnalysisResult(null);
  };

  const handleClose = () => {
    setPhase("idle");
    setScan(null);
    setAnalysisResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className={`max-w-full max-h-full w-full h-full p-0 border-0 ${
          phase === 'result' ? 'bg-background overflow-auto' : 'bg-black overflow-hidden'
        }`}
        showCloseButton={false}
      >
        <div className="relative w-full h-full">
          {/* Main Content */}
          {(phase === "idle" || phase === "retake") && (
            <HealthScannerInterface 
              onCapture={handleImageCapture}
              onManualEntry={() => setPhase("idle")}
              onManualSearch={handleManualEntry}
              onCancel={handleClose}
            />
          )}

        {/* Processing Phase - Show loading animation */}
        {phase === "processing" && (
          <HealthAnalysisLoading 
            message={loadingMessage || 'Analyzing...'}
            analysisType={analysisType}
          />
        )}

        {/* Show results */}
        {phase === "result" && analysisResult && (
          <HealthReportPopup
            result={analysisResult}
            onScanAnother={handleScanAnother}
            onClose={handleClose}
          />
        )}

        {phase === "error" && (
          <ManualEntryFallback
            onManualEntry={handleManualEntry}
            onBack={() => setPhase("retake")}
          />
        )}

        {/* Legacy scan result flow */}
        {phase === "result" && scan && !analysisResult && (
          <ResultCard
            scan={scan}
            requestId={requestId}
            onRetake={handleRetake}
            onManualSearch={handleManualSearch}
            onConfirmItems={() => {}}
            onChoosePortion={() => {}}
            onOpenFacts={() => {}}
          />
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Enhanced barcode processor with direct OFF lookup
export const handleBarcodeInputEnhanced = async (barcode: string, userId?: string) => {
  try {
    // Direct OpenFoodFacts lookup (v2 then v1 fallback)
    let offProduct = null;
    
    // Try v2 API first
    try {
      const v2Response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      const v2Data = await v2Response.json();
      
      if (v2Data.status === 1 && v2Data.product) {
        offProduct = v2Data.product;
      }
    } catch (v2Error) {
      // Continue to v1 fallback
    }
    
    // Fallback to v1 API
    if (!offProduct) {
      try {
        const v1Response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const v1Data = await v1Response.json();
        
        if (v1Data.status === 1 && v1Data.product) {
          offProduct = v1Data.product;
        }
      } catch (v1Error) {
        // Both failed
      }
    }
    
    if (!offProduct) {
      return null;
    }
    
    // Map OFF product to our health analysis format
    const productName = offProduct.product_name || offProduct.product_name_en || 'Unknown Product';
    const ingredients = offProduct.ingredients_text || offProduct.ingredients_text_en || '';
    const nutritionData = offProduct.nutriments || {};
    
    // Calculate basic health score based on available data
    let healthScore = 50; // Base score
    
    // Positive factors
    if (offProduct.labels_tags?.some((label: string) => label.includes('organic'))) healthScore += 20;
    if (offProduct.additives_n === 0) healthScore += 15;
    if (offProduct.nova_group <= 2) healthScore += 10;
    
    // Negative factors
    if (offProduct.additives_n > 5) healthScore -= 20;
    if (offProduct.nova_group >= 4) healthScore -= 15;
    if (nutritionData.salt_100g > 1.5) healthScore -= 10;
    if (nutritionData.sugars_100g > 15) healthScore -= 10;
    
    // Ensure score is within bounds
    healthScore = Math.max(0, Math.min(100, healthScore));
    
    // Generate health flags based on OFF data
    const healthFlags = [];
    
    if (offProduct.additives_n > 0) {
      healthFlags.push({
        title: 'Food Additives',
        description: `Contains ${offProduct.additives_n} food additives`,
        type: offProduct.additives_n > 5 ? 'danger' : 'warning'
      });
    }
    
    if (offProduct.nova_group >= 4) {
      healthFlags.push({
        title: 'Ultra-processed Food',
        description: 'This is classified as an ultra-processed food (NOVA Group 4)',
        type: 'warning'
      });
    }
    
    if (nutritionData.salt_100g > 1.5) {
      healthFlags.push({
        title: 'High Salt Content',
        description: `High salt content: ${nutritionData.salt_100g}g per 100g`,
        type: 'warning'
      });
    }
    
    if (nutritionData.sugars_100g > 15) {
      healthFlags.push({
        title: 'High Sugar Content',
        description: `High sugar content: ${nutritionData.sugars_100g}g per 100g`,
        type: 'warning'
      });
    }
    
    return {
      productName,
      healthScore,
      healthFlags,
      ingredients: ingredients ? ingredients.split(',').map((ing: string) => ing.trim()) : [],
      nutritionSummary: {
        calories: nutritionData.energy_kcal_100g || nutritionData.energy_100g,
        protein: nutritionData.proteins_100g,
        carbs: nutritionData.carbohydrates_100g,
        fat: nutritionData.fat_100g,
        fiber: nutritionData.fiber_100g,
        sugar: nutritionData.sugars_100g,
        sodium: nutritionData.sodium_100g
      },
      recommendations: [
        healthScore >= 80 ? 'This product has a good nutritional profile.' :
        healthScore >= 60 ? 'This product is acceptable for occasional consumption.' :
        healthScore >= 40 ? 'Consider this as an occasional treat.' :
        'Look for healthier alternatives when possible.',
        `Barcode: ${barcode} • Source: OpenFoodFacts`
      ],
      barcode
    };
  } catch (error) {
    console.error('❌ Error in enhanced barcode processor:', error);
    return null;
  }
}

// Check if image has high-quality plate/food content
function hasHighQualityPlate(imageData: string): boolean {
  // Placeholder - in production this would use basic image analysis
  // For now, assume true to maintain existing behavior
  return true;
}

// Keep original function for backward compatibility
export const handleBarcodeInput = async (barcode: string, userId?: string) => {
  return handleBarcodeInputEnhanced(barcode, userId);
};