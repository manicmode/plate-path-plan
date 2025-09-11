import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

interface Props {
  candidate: any;
  enrichedData: any;
  onContinue: (finalData: any) => void;
  onCancel: () => void;
}

export function ManualPortionDialog({ candidate, enrichedData, onContinue, onCancel }: Props) {
  // All hooks declared unconditionally at top
  const [portionSize, setPortionSize] = useState(() => enrichedData?.servingGrams || 100);
  const [mealType, setMealType] = useState('lunch');

  // Check readiness for conditional rendering (not hooks)
  const isReady = !!candidate && !!enrichedData;

  const handleContinue = () => {
    console.log('[DIALOG][COMMIT]', { 
      hasIngredients: !!enrichedData?.ingredientsList?.length,
      portionSize
    });
    
    onContinue({
      ...enrichedData,
      servingGrams: portionSize,
      userConfirmed: true
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {isReady ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Confirm Portion Size</h3>
              <p className="text-sm text-muted-foreground">{candidate?.name}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Portion Size</span>
                <span className="font-medium">{portionSize}g</span>
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
        ) : (
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        )}
      </div>
    </div>
  );
}