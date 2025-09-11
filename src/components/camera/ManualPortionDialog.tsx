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
  const [portionSize, setPortionSize] = useState(enrichedData?.servingGrams ?? 100);

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
    <div className="fixed inset-0 grid place-items-center bg-black/40 z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-lg">Confirm Portion Size</CardTitle>
          <p className="text-sm text-muted-foreground">{candidate?.name}</p>
        </CardHeader>
        
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
    </div>
  );
}