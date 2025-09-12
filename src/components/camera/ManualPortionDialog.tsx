import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Plus, Minus } from 'lucide-react';

interface Props {
  candidate: any;
  enrichedData: any;
  onContinue: (finalData: any) => void;
  onCancel: () => void;
}

export function ManualPortionDialog({ candidate, enrichedData, onContinue, onCancel }: Props) {
  // Guard: this dialog should never open without both
  if (!candidate || !enrichedData) {
    console.error('[DIALOG][ERROR] Opened without data', { candidate: !!candidate, enrichedData: !!enrichedData });
    onCancel?.();
    return null;
  }

  // All hooks declared unconditionally at top
  const [portionSize, setPortionSize] = useState(() => enrichedData?.servingGrams || 100);
  const [mealType, setMealType] = useState('lunch');

  // Log when dialog actually mounts
  console.log('[PORTION][OPEN]', { 
    name: candidate?.name,
    defaultG: enrichedData?.servingGrams || 100
  });

  // Quick preset multipliers for common portions
  const baseServingG = enrichedData?.servingGrams || 100;
  const presets = [
    { label: '½×', multiplier: 0.5, grams: Math.round(baseServingG * 0.5) },
    { label: '1×', multiplier: 1.0, grams: baseServingG },
    { label: '2×', multiplier: 2.0, grams: Math.round(baseServingG * 2) }
  ];

  const handleContinue = () => {
    console.log('[DIALOG][COMMIT]', { 
      hasIngredients: !!enrichedData?.ingredientsList?.length,
      portionSize
    });
    
    // Ensure ingredients and portion metadata pass through properly
    const payload = {
      ...enrichedData,
      servingGrams: portionSize,
      ingredientsList: enrichedData?.ingredientsList || [],
      ingredientsText: enrichedData?.ingredientsText || (enrichedData?.ingredientsList?.join(', ') || ''),
      portionMeta: {
        unit: enrichedData?.unit || 'g',
        defaultG: enrichedData?.servingGrams || 100,
        source: enrichedData?.portionSource || 'inferred'
      },
      userConfirmed: true
    };
    
    onContinue(payload);
  };

  const handlePresetSelect = (grams: number) => {
    setPortionSize(grams);
  };

  const handleStepperChange = (delta: number) => {
    const newSize = Math.max(25, Math.min(500, portionSize + delta));
    setPortionSize(newSize);
  };

  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Confirm Portion Size</h3>
            <p className="text-sm text-muted-foreground">{candidate?.name}</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span>Portion Size</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStepperChange(-5)}
                  disabled={portionSize <= 25}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="font-medium min-w-[60px] text-center">{portionSize}g</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStepperChange(5)}
                  disabled={portionSize >= 500}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <Slider
              value={[portionSize]}
              onValueChange={(values) => setPortionSize(values[0])}
              min={25}
              max={500}
              step={5}
              className="w-full"
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>25g</span>
              <span>500g</span>
            </div>

            {/* Quick preset buttons */}
            <div className="flex gap-2 justify-center">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  size="sm"
                  variant={portionSize === preset.grams ? "default" : "outline"}
                  onClick={() => handlePresetSelect(preset.grams)}
                  className="min-w-[50px]"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              onClick={onCancel} 
              variant="outline" 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleContinue} 
              className="flex-1"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}