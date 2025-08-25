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
        
        // Use the dedicated barcode processor
        try {
          console.log('🔄 Processing barcode:', detectedBarcode);
          const result = await handleBarcodeInput(detectedBarcode, user?.id);
          
          if (!result) {
            console.log('⚠️ No results from barcode lookup, falling back to image analysis');
            // If barcode lookup fails, continue with regular image analysis
            return handleImageCapture(cleanImageData);
          }
          
          // Log successful barcode analysis
          console.log('✅ Barcode analysis complete:', {
            productName: result.productName,
            healthScore: result.healthScore
          });
          
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
            suggestions: Array.isArray(result.recommendations) ? result.recommendations : [result.summary || 'No specific recommendations available.'],
            overallRating: result.healthScore >= 80 ? 'excellent' : 
                          result.healthScore >= 60 ? 'good' : 
                          result.healthScore >= 40 ? 'fair' : 
                          result.healthScore >= 20 ? 'poor' : 'avoid'
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

      console.log('✅ Health check processor response:', data);
      console.log('🏥 Health Score:', data.healthScore);
      console.log('🚩 Health Flags:', data.healthFlags?.length || 0, 'flags detected');
      
      // Check if image recognition failed based on various criteria
      // NEW: Treat generic success as success (≥2 recommendations OR any healthFlags OR any nutritionSummary fields)
      const hasValidRecommendations = Array.isArray(data.recommendations) && data.recommendations.length >= 2;
      const hasHealthFlags = Array.isArray(data.healthFlags) && data.healthFlags.length > 0;
      const hasNutritionData = data.nutritionSummary && typeof data.nutritionSummary === 'object' && 
                              Object.keys(data.nutritionSummary).length > 0;
      
      // Debug log for success evaluation
      console.log('scan_success_eval:', {
        hasName: !!data.productName && data.productName !== 'Unknown Product' && data.productName !== 'Error',
        hasBarcode: !!data.barcode,
        recs: Array.isArray(data.recommendations) ? data.recommendations.length : 0,
        flags: Array.isArray(data.healthFlags) ? data.healthFlags.length : 0,
        hasValidRecommendations,
        hasHealthFlags,
        hasNutritionData
      });
      
      const isImageRecognitionFailure = (
        // Only fail if no useful content AND has error indicators
        (!hasValidRecommendations && !hasHealthFlags && !hasNutritionData) &&
        (
          // No meaningful product name detected
          !data.productName || 
          data.productName === 'Unknown Product' || 
          data.productName === 'Unknown Item' || 
          data.productName === 'Error' ||
          // Specific failure indicators in health flags
          data.healthFlags?.some((flag: any) => 
            flag.title === 'Processing Error' || 
            flag.title === 'Product Not Found' ||
            flag.description?.includes('Unable to parse') ||
            flag.description?.includes('couldn\'t identify')
          )
        )
      );

      if (isImageRecognitionFailure) {
        console.log('🚨 Image recognition failed - redirecting to manual entry');
        console.log('💡 Failure criteria met:', {
          productName: data.productName,
          healthScore: data.healthScore,
          ingredientsCount: data.ingredients?.length || 0,
          hasErrorFlags: data.healthFlags?.some((flag: any) => 
            flag.title === 'Processing Error' || 
            flag.title === 'Product Not Found'
          )
        });
        setCurrentState('fallback');
        return;
      }
      
      // Log whether barcode was detected or Google Vision/GPT was used
      if (data.barcode) {
        console.log('📊 Barcode detected in response:', data.barcode);
        setAnalysisType('barcode');
      } else {
        console.log('🔍 No barcode found - using Google Vision + GPT analysis');
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

// Helper function to handle barcode input specifically
export const handleBarcodeInput = async (barcode: string, userId?: string) => {
  console.log('📊 Processing barcode input:', barcode);
  
  const { data, error } = await supabase.functions.invoke('health-check-processor', {
    body: {
      inputType: 'barcode',
      data: barcode,
      userId: userId,
      detectedBarcode: barcode
    }
  });

  if (error) {
    throw new Error(error.message || 'Failed to analyze barcode');
  }

  console.log('✅ Barcode processor response:', data);
  console.log('🏥 Health Score:', data.healthScore);
  console.log('🚩 Health Flags:', data.healthFlags?.length || 0, 'flags detected');
  
  return data;
};