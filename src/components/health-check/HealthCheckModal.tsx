import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, Keyboard, Mic, Zap, AlertTriangle } from 'lucide-react';
import { HealthScannerInterface } from './HealthScannerInterface';
import { HealthAnalysisLoading } from './HealthAnalysisLoading';
import { HealthReportPopup } from './HealthReportPopup';
import { ManualEntryFallback } from './ManualEntryFallback';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

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
      setAnalysisType('image');
      
      console.log('🖼️ About to call health-check-processor function...');
      console.log('📡 Function URL should be: https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/health-check-processor');
      
      // Log the exact payload being sent
      const payload = {
        inputType: 'image',
        data: imageData,
        userId: user?.id
      };
      console.log('📦 Payload being sent:', {
        inputType: payload.inputType,
        dataLength: payload.data?.length || 0,
        userId: payload.userId
      });
      
      let data, error;
      try {
        console.log('🔄 Making supabase.functions.invoke call...');
        const result = await supabase.functions.invoke('health-check-processor', {
          body: payload
        });
        console.log("✅ Supabase Function Call Success:", result);
        
        data = result.data;
        error = result.error;
      } catch (funcError) {
        console.error("❌ Supabase Function Call Failed:", funcError);
        throw funcError;
      }

      if (error) {
        throw new Error(error.message || 'Failed to analyze image');
      }

      console.log('✅ Health check processor response:', data);
      console.log('🏥 Health Score:', data.healthScore);
      console.log('🚩 Health Flags:', data.healthFlags?.length || 0, 'flags detected');
      
      // Log whether barcode was detected or Google Vision/GPT was used
      if (data.barcode) {
        console.log('📊 Barcode detected:', data.barcode);
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
      setCurrentState('report');
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
      <DialogContent className="max-w-full max-h-full w-full h-full p-0 border-0 bg-black overflow-hidden">
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
      userId: userId
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