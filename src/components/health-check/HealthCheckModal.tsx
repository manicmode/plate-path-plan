import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, Keyboard, Mic, Zap, AlertTriangle } from 'lucide-react';
import { HealthScannerInterface } from './HealthScannerInterface';
import { HealthAnalysisLoading } from './HealthAnalysisLoading';
import { HealthReportPopup } from './HealthReportPopup';
import { ManualEntryFallback } from './ManualEntryFallback';
import { useToast } from '@/hooks/use-toast';

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

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentState('scanner');
      setAnalysisResult(null);
      setLoadingMessage('');
    }
  }, [isOpen]);

  const handleImageCapture = async (imageData: string) => {
    try {
      setCurrentState('loading');
      setLoadingMessage('Scanning for barcodes...');
      
      // Simulate scanning process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // First try to detect barcode
      const hasBarcodeResult = await detectBarcode(imageData);
      
      if (hasBarcodeResult.hasBarcode) {
        setAnalysisType('barcode');
        setLoadingMessage('Barcode detected! Analyzing product...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const result = await analyzeBarcode(hasBarcodeResult.barcode);
        setAnalysisResult(result);
        setCurrentState('report');
      } else {
        setAnalysisType('image');
        setLoadingMessage('No barcode found. Analyzing food image...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const result = await analyzeFood(imageData);
        if (result) {
          setAnalysisResult(result);
          setCurrentState('report');
        } else {
          setCurrentState('fallback');
        }
      }
    } catch (error) {
      console.error('Analysis failed:', error);
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
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = await searchFoodDatabase(query);
      if (result) {
        setAnalysisResult(result);
        setCurrentState('report');
      } else {
        toast({
          title: "Food Not Found",
          description: "Unable to find nutritional information for this item.",
          variant: "destructive",
        });
        setCurrentState('fallback');
      }
    } catch (error) {
      console.error('Manual analysis failed:', error);
      toast({
        title: "Search Failed",
        description: "Unable to search the food database. Please try again.",
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

// Simulated API functions - these would be replaced with real API calls
async function detectBarcode(imageData: string): Promise<{ hasBarcode: boolean; barcode?: string }> {
  // Simulate barcode detection
  const random = Math.random();
  if (random > 0.7) {
    return { hasBarcode: true, barcode: '123456789012' };
  }
  return { hasBarcode: false };
}

async function analyzeBarcode(barcode: string): Promise<HealthAnalysisResult> {
  // Simulate barcode analysis
  return {
    itemName: 'Organic Quinoa Chips',
    healthScore: 85,
    ingredientFlags: [
      { ingredient: 'Natural Flavors', flag: 'Synthetic additive', severity: 'low' }
    ],
    nutritionData: {
      calories: 140,
      protein: 3,
      carbs: 18,
      fat: 7,
      fiber: 3,
      sugar: 1,
      sodium: 180
    },
    healthProfile: {
      isOrganic: true,
      isGMO: false,
      allergens: [],
      preservatives: [],
      additives: ['Natural Flavors']
    },
    personalizedWarnings: [],
    suggestions: ['Great choice! This snack aligns with your health goals.'],
    overallRating: 'good'
  };
}

async function analyzeFood(imageData: string): Promise<HealthAnalysisResult | null> {
  // Simulate food image analysis
  const random = Math.random();
  if (random > 0.3) {
    return {
      itemName: 'Grilled Chicken Salad',
      healthScore: 92,
      ingredientFlags: [],
      nutritionData: {
        calories: 320,
        protein: 35,
        carbs: 12,
        fat: 15,
        fiber: 6,
        sugar: 8,
        sodium: 480
      },
      healthProfile: {
        isOrganic: false,
        isGMO: false,
        allergens: [],
        preservatives: [],
        additives: []
      },
      personalizedWarnings: [],
      suggestions: ['Excellent choice! High in protein and nutrients.'],
      overallRating: 'excellent'
    };
  }
  return null;
}

async function searchFoodDatabase(query: string): Promise<HealthAnalysisResult | null> {
  // Simulate database search
  return {
    itemName: query,
    healthScore: 75,
    ingredientFlags: [
      { ingredient: 'High Sodium', flag: 'Exceeds daily recommended intake', severity: 'medium' }
    ],
    nutritionData: {
      calories: 250,
      protein: 12,
      carbs: 35,
      fat: 8,
      fiber: 4,
      sugar: 6,
      sodium: 890
    },
    healthProfile: {
      isOrganic: false,
      isGMO: true,
      allergens: ['Gluten'],
      preservatives: ['Sodium Benzoate'],
      additives: []
    },
    personalizedWarnings: ['High sodium content may affect blood pressure'],
    suggestions: ['Consider low-sodium alternatives'],
    overallRating: 'fair'
  };
}