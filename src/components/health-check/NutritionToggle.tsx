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
  servingGrams?: number;
  portionLabel?: string;
}

type NutritionMode = 'per100g' | 'portion';

// Memoized NutritionToggle for performance
const MemoizedNutritionToggle = React.memo<NutritionToggleProps>(({
  nutrition100g,
  productData,
  ocrText,
  className,
  servingGrams,
  portionLabel
}) => {
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

  // Load portion information safely (only skip if external grams provided)
  useEffect(() => {
    const hasExternalGrams = typeof servingGrams === 'number';
    
    console.info('[PORTION][INQ3][WIDGET_PROPS]', {
      gotServingGrams: servingGrams ?? null
    });
    
    if (hasExternalGrams) {
      console.info('[PORTION][INQ3][HEADER]', { headerGrams: servingGrams, source: 'external' });
      console.log('[PORTION][INQ][WIDGET_SKIP]', { reason: 'external_override', servingGrams });
      return; // external override in effect
    } else {
      console.info('[PORTION][INQ3][HEADER]', { headerGrams: null, source: 'resolver' });
    }
    
    const loadPortionInfo = async () => {
      try {
        const { resolvePortion } = await import('@/lib/nutrition/portionResolver');
        const portionResult = await resolvePortion(productData, ocrText);
        
        const portionInfo = {
          grams: portionResult.grams,
          isEstimated: portionResult.source === 'fallback' || portionResult.source === 'category' || portionResult.source === 'unknown',
          source: portionResult.source === 'fallback' ? 'estimated' as const : 
                 portionResult.source === 'ocr' ? 'ocr_declared' as const :
                 portionResult.source === 'database' ? 'db_declared' as const :
                 portionResult.source === 'ratio' ? 'ocr_inferred_ratio' as const :
                 portionResult.source === 'category' ? 'estimated' as const :
                 portionResult.source === 'unknown' ? 'estimated' as const : 'estimated' as const,
          confidence: portionResult.confidence,
          display: portionResult.label
        };
        
        setCurrentPortionInfo(portionInfo);
        setPortionDetectionEnabled(portionResult.source !== 'fallback' && portionResult.source !== 'unknown');
      } catch (error) {
        // Fallback to null/unknown instead of 30g
        setCurrentPortionInfo({ 
          grams: null, 
          isEstimated: true, 
          source: 'estimated' as const, 
          confidence: 0,
          display: 'Unknown serving'
        });
        setPortionDetectionEnabled(false);
      }
    };
    
    loadPortionInfo();
  }, [productData, ocrText, servingGrams]);

  const handleModeChange = (newMode: NutritionMode) => {
    setMode(newMode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nutrition-display-mode', newMode);
      } catch (error) {
        console.warn('Failed to save nutrition display mode:', error);
      }
    }
  };

  // Get safe portion info for render
  const portionInfo: PortionInfo =
    typeof servingGrams === 'number'
      ? { grams: servingGrams, isEstimated: false, source: 'external', display: portionLabel ?? `${servingGrams}g` }
      : getPortionInfoSync(currentPortionInfo);

  // PORTION INQUIRY - Header and Chip Logging
  useEffect(() => {
    console.info('[PORTION][INQ3][HEADER]', {
      headerGrams: portionInfo?.grams, source: portionInfo?.source
    });
    console.info('[PORTION][INQ3][CHIP]', {
      chipLabel: portionInfo?.display, chipGrams: portionInfo?.grams, chipSource: portionInfo?.source
    });
  }, [portionInfo]);

  // Calculate portion nutrition safely - memoized
  const portionNutrition = useMemo(() => {
    try {
      // Only calculate if we have valid grams
      if (portionInfo.grams && portionInfo.grams > 0) {
        return toPerPortion(nutrition100g, portionInfo.grams);
      }
      return nutrition100g;
    } catch (error) {
      return nutrition100g;
    }
  }, [nutrition100g, portionInfo.grams]);

  const displayNutrition = mode === 'portion' ? portionNutrition : nutrition100g;

  const handlePortionChange = (newGrams: number, newDisplay?: string) => {
    setCurrentPortionInfo({
      grams: newGrams,
      isEstimated: false,
      source: 'user_set',
      confidence: 2,
      display: newDisplay
    });
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
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                  {formatPortionDisplay(portionInfo)}
                  <Settings className="w-3 h-3 ml-1" />
                </Button>
              </PortionSheetLazy>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="text-center">
            <h4 className="text-lg font-semibold mb-3">
              {mode === 'per100g' ? 'Per 100g' : 
               portionInfo.grams ? `Per portion (${portionInfo.grams}g)` : 
               'Per portion (unknown size)'}
            </h4>
          </div>
          
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
        </div>
      </CardContent>
    </Card>
  );
});

export const NutritionToggle = MemoizedNutritionToggle;