/**
 * Nutrition Facts with Per 100g ↔ Per Portion Toggle
 * Remembers user preference and shows portion estimation badge
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { NutritionPer100g, toPerPortion, parsePortionGrams, PortionInfo } from '@/lib/nutrition/portionCalculator';

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

  // Parse portion information
  const portionInfo: PortionInfo = useMemo(() => 
    parsePortionGrams(productData, ocrText), 
    [productData, ocrText]
  );

  // Calculate portion nutrition
  const portionNutrition = useMemo(() => 
    toPerPortion(nutrition100g, portionInfo.grams),
    [nutrition100g, portionInfo.grams]
  );

  const displayNutrition = mode === 'portion' ? portionNutrition : nutrition100g;

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
        <div className="flex items-center space-x-2 mt-4">
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
          
          {/* Portion Info Badge */}
          {mode === 'portion' && (
            <div className="flex items-center space-x-2">
              <Badge variant={portionInfo.isEstimated ? 'secondary' : 'default'}>
                {portionInfo.grams}g {portionInfo.isEstimated && '(est.)'}
              </Badge>
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
          {mode === 'portion' && portionInfo.isEstimated && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                <strong>Note:</strong> Portion size estimated at {portionInfo.grams}g. 
                Actual portions may vary.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};