/**
 * Nutrition Facts with Per 100g ↔ Per Portion Toggle
 * Remembers user preference and shows portion estimation badge
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Settings } from 'lucide-react';
import { NutritionPer100g, toPerPortion, type PortionInfo } from '@/lib/nutrition/portionCalculator';
import { detectPortionSafe, getPortionInfoSync, formatPortionDisplay } from '@/lib/nutrition/portionDetectionSafe';
import { PortionSheetLazy } from './PortionSheetLazy';

interface NutritionToggleProps {
  nutrition100g: NutritionPer100g;
  productData?: any;
  ocrText?: string;
  className?: string;
}

type NutritionMode = 'per100g' | 'portion';

export const NutritionToggle: React.FC<NutritionToggleProps> = ({
  nutrition100g,
  productData,
  ocrText,
  className
}) => {
  // Safe localStorage access with SSR guard
  const [mode, setMode] = useState<NutritionMode>('per100g');
  const [currentPortionInfo, setCurrentPortionInfo] = useState<PortionInfo | null>(null);
  const [portionDetectionEnabled, setPortionDetectionEnabled] = useState(true);

  // Load saved preference after component mounts (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nutrition-display-mode');
        if (saved === 'portion') {
          setMode('portion');
        }
      } catch (error) {
        console.warn('Failed to load nutrition display mode:', error);
      }
    }
  }, []);

  // Load portion information safely
  useEffect(() => {
    const loadPortionInfo = async () => {
      try {
        const portionInfo = await detectPortionSafe(productData, ocrText, 'nutrition_toggle');
        setCurrentPortionInfo(portionInfo);
        
        // Check if detection was actually enabled
        const enabled = portionInfo.source !== 'fallback_default';
        setPortionDetectionEnabled(enabled);
      } catch (error) {
        console.warn('[REPORT][V2][PORTION][ERROR]', { 
          stage: 'nutrition_toggle', 
          message: error.message 
        });
        // Use safe fallback
        setCurrentPortionInfo({ 
          grams: 30, 
          isEstimated: true, 
          source: 'estimated' as const, 
          confidence: 0 
        });
        setPortionDetectionEnabled(false);
      }
    };
    
    loadPortionInfo();
  }, [productData, ocrText]);

  const handleModeChange = (newMode: NutritionMode) => {
    setMode(newMode);
    
    // Safe localStorage write with error handling
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nutrition-display-mode', newMode);
      } catch (error) {
        console.warn('Failed to save nutrition display mode:', error);
      }
    }
  };

  // Get safe portion info for render
  const portionInfo: PortionInfo = getPortionInfoSync(currentPortionInfo);

  // Calculate portion nutrition safely
  const portionNutrition = useMemo(() => {
    try {
      return toPerPortion(nutrition100g, portionInfo.grams);
    } catch (error) {
      console.warn('Failed to calculate portion nutrition:', error);
      return nutrition100g; // Fallback to 100g values
    }
  }, [nutrition100g, portionInfo.grams]);

  const displayNutrition = mode === 'portion' ? portionNutrition : nutrition100g;

  const handlePortionChange = (newGrams: number, newDisplay?: string) => {
    const updatedPortionInfo: PortionInfo = {
      grams: newGrams,
      isEstimated: false,
      source: 'user_set',
      confidence: 2,
      display: newDisplay
    };
    setCurrentPortionInfo(updatedPortionInfo);
  };

  // Get portion source label for display
  const getPortionSourceLabel = (source: string) => {
    const labels = {
      'user_set': 'Your setting',
      'ocr_declared': 'OCR',
      'db_declared': 'DB',
      'ocr_inferred_ratio': 'Calculated',
      'model_estimate': 'Estimated',
    'fallback_default': 'est.',
      'estimated': 'est.'
    };
    return labels[source] || 'est.';
  };

  const hasValidNutrition = (nutrition: any): boolean => {
    return nutrition && 
           typeof nutrition === 'object' && 
           !Array.isArray(nutrition) &&
           Object.keys(nutrition).length > 0 &&
           Object.values(nutrition).some(value => value !== null && value !== undefined && value !== 0);
  };

  if (!hasValidNutrition(nutrition100g)) {
    return (
      <Card className={`bg-card border-border backdrop-blur-sm ${className}`}>
        <CardHeader className="pb-4">
          <h3 className="text-xl font-bold text-foreground flex items-center">
            <div className="text-2xl mr-3">📊</div>
            NUTRITION FACTS
          </h3>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-center text-foreground font-medium">
            Nutrition facts not available from scan data
          </div>
        </CardContent>
      </Card>
    );
  }

  const nutrientInfo = {
    calories: { label: 'Calories', unit: 'kcal', priority: 1 },
    protein: { label: 'Protein', unit: 'g', priority: 2 },
    carbs: { label: 'Carbs', unit: 'g', priority: 3 },
    fat: { label: 'Total Fat', unit: 'g', priority: 4 },
    sugar: { label: 'Sugar', unit: 'g', priority: 5 },
    fiber: { label: 'Fiber', unit: 'g', priority: 6 },
    sodium: { label: 'Sodium', unit: 'mg', priority: 7 },
  };

  return (
    <Card className={`bg-card border-border backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-foreground flex items-center">
            <div className="text-2xl mr-3">📊</div>
            NUTRITION FACTS
          </h3>
          
          {/* Health Score Tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Score uses standardized 100g for fairness</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Mode Toggle */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => handleModeChange('per100g')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'per100g'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Per 100g
            </button>
            <button
              onClick={() => handleModeChange('portion')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'portion'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Per portion
            </button>
          </div>
          
          {/* Portion Info Chip */}
          {mode === 'portion' && (
            <div className="flex items-center space-x-2">
              <PortionSheetLazy
                currentGrams={portionInfo.grams}
                currentDisplay={portionInfo.display}
                isEstimated={portionInfo.isEstimated}
                source={portionInfo.source}
                productData={productData}
                nutrition100g={nutrition100g}
                onPortionChange={handlePortionChange}
                enabled={portionDetectionEnabled}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  {formatPortionDisplay(portionInfo)}
                  <Settings className="w-3 h-3 ml-1" />
                </Button>
              </PortionSheetLazy>
              
              {portionInfo.source !== 'user_set' && portionInfo.isEstimated && portionDetectionEnabled && (
                <span className="text-xs text-muted-foreground">
                  <PortionSheetLazy
                    currentGrams={portionInfo.grams}
                    currentDisplay={portionInfo.display}
                    isEstimated={portionInfo.isEstimated}
                    source={portionInfo.source}
                    productData={productData}
                    nutrition100g={nutrition100g}
                    onPortionChange={handlePortionChange}
                    enabled={portionDetectionEnabled}
                  >
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary">
                      Adjust
                    </Button>
                  </PortionSheetLazy>
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Current Mode Display */}
          <div className="text-center">
            <h4 className="text-lg font-semibold mb-3">
              {mode === 'per100g' ? 'Per 100g' : `Per portion (${portionInfo.grams}g)`}
            </h4>
          </div>
          
          {/* Nutrition Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(displayNutrition).map(([key, value]) => {
              if (value === undefined || value === null || value === 0) return null;

              const info = nutrientInfo[key as keyof typeof nutrientInfo];
              if (!info) return null;

              return (
                <div key={key} className="bg-muted/30 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground">{info.label}</div>
                  <div className="text-lg font-semibold text-foreground">
                    {typeof value === 'number' ? 
                      (info.unit === 'mg' ? Math.round(value) : value.toFixed(1)) : 
                      value
                    } {info.unit}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mode-specific notes */}
          {mode === 'portion' && portionInfo.isEstimated && portionInfo.source !== 'user_set' && portionDetectionEnabled && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                <strong>Note:</strong> Portion size estimated at {portionInfo.grams}g. 
                <PortionSheetLazy
                  currentGrams={portionInfo.grams}
                  currentDisplay={portionInfo.display}
                  isEstimated={portionInfo.isEstimated}
                  source={portionInfo.source}
                  productData={productData}
                  nutrition100g={nutrition100g}
                  onPortionChange={handlePortionChange}
                  enabled={portionDetectionEnabled}
                >
                  <Button variant="link" className="h-auto p-0 ml-1 text-yellow-600 dark:text-yellow-400 underline">
                    Set portion size
                  </Button>
                </PortionSheetLazy>
                {' '}for accurate nutrition info.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};