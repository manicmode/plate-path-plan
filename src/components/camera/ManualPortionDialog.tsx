import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Minus, Plus, Loader2 } from 'lucide-react';

interface Props {
  candidate: any;
  enrichedData: any;
  onContinue: (finalData: any) => void;
  onCancel: () => void;
}

export function ManualPortionDialog({ candidate, enrichedData, onContinue, onCancel }: Props) {
  // ✅ Always call hooks first - using piecewise mapping for centered 100%
  const [sliderValue, setSliderValue] = useState(0.5); // Default to center (100%)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const stepperIntervalRef = useRef<NodeJS.Timeout>();
  
  const ready = Boolean(candidate && enrichedData);

  // Piecewise mapping functions
  const sliderToPercent = (t: number): number => {
    if (t <= 0.5) {
      return 25 + 150 * t; // 25% to 100% for t: 0 to 0.5
    } else {
      return 200 * t; // 100% to 200% for t: 0.5 to 1
    }
  };

  const percentToSlider = (p: number): number => {
    if (p <= 100) {
      return (p - 25) / 150; // Inverse of first piece
    } else {
      return p / 200; // Inverse of second piece
    }
  };

  // Calculate current portion percentage and grams
  const portionPercent = sliderToPercent(sliderValue);
  const defaultGrams = enrichedData?.servingGrams || 100;
  const portionGrams = Math.round((portionPercent / 100) * defaultGrams);
  
  // Close safely if data is missing, but after hooks are set up
  useEffect(() => {
    if (!ready) {
      const id = requestAnimationFrame(() => onCancel?.());
      return () => cancelAnimationFrame(id);
    }
  }, [ready, onCancel]);

  // Log when dialog actually mounts
  console.log('[PORTION][OPEN]', { name: candidate?.name, defaultG: defaultGrams });

  // Render nothing if we lack data, but AFTER hooks were called
  if (!ready) return null;

  // Helper functions
  const setPercent = (newPercent: number) => {
    const clamped = Math.max(25, Math.min(200, newPercent));
    setSliderValue(percentToSlider(clamped));
  };

  const handlePreset = (multiplier: number) => {
    const newPercent = multiplier * 100;
    setPercent(newPercent);
  };

  const handleStepper = (delta: number) => {
    const currentPercent = sliderToPercent(sliderValue);
    const newPercent = currentPercent + (delta / defaultGrams) * 100;
    setPercent(newPercent);
  };

  const handleStepperMouseDown = (delta: number) => {
    handleStepper(delta);
    stepperIntervalRef.current = setInterval(() => {
      handleStepper(delta);
    }, 200);
  };

  const handleStepperMouseUp = () => {
    if (stepperIntervalRef.current) {
      clearInterval(stepperIntervalRef.current);
      stepperIntervalRef.current = undefined;
    }
  };


  const handleContinue = () => {
    setIsSubmitting(true);
    console.log('[PORTION][COMMIT]', { 
      sendName: enrichedData?.name,
      sendServingG: portionGrams,
      hasIngredients: !!(enrichedData?.ingredientsText ||
         (enrichedData?.ingredientsList && enrichedData.ingredientsList.length)),
      sendText: !!enrichedData?.ingredientsText,
      keys: Object.keys(enrichedData || {})
    });
    
      onContinue({
        ...enrichedData,
        // Forward image fields
        imageUrl: enrichedData?.imageUrl,
        imageThumbUrl: enrichedData?.imageThumbUrl,
        imageAttribution: enrichedData?.imageAttribution,
        imageUrlKind: enrichedData?.imageUrlKind,
        // Ensure ingredients pass through:
        ingredientsList: enrichedData?.ingredientsList ?? [],
        ingredientsText:
          enrichedData?.ingredientsText ??
          (Array.isArray(enrichedData?.ingredientsList)
            ? enrichedData.ingredientsList.join(', ')
            : ''),
        hasIngredients:
        !!(enrichedData?.ingredientsText ||
           (enrichedData?.ingredientsList && enrichedData.ingredientsList.length)),
      servingGrams: portionGrams,
      userConfirmed: true
    });
  };

  // Cleanup stepper intervals on unmount
  useEffect(() => {
    return () => {
      if (stepperIntervalRef.current) {
        clearInterval(stepperIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm grid place-items-center z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-background border border-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground">Choose portion</h3>
            <p className="text-sm text-muted-foreground mt-1 truncate" title={`${candidate?.name}${enrichedData?.brand ? ` • ${enrichedData.brand}` : ''}`}>
              {candidate?.name}{enrichedData?.brand ? ` • ${enrichedData.brand}` : ''}
            </p>
          </div>
          
          {/* Primary Control Row */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onMouseDown={() => handleStepperMouseDown(-5)}
              onMouseUp={handleStepperMouseUp}
              onMouseLeave={handleStepperMouseUp}
              disabled={isSubmitting || portionPercent <= 25}
              className="h-10 w-10 rounded-full"
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <motion.div 
              key={portionGrams}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.15 }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-lg font-semibold min-w-[80px] text-center"
            >
              {portionGrams}g
            </motion.div>
            
            <Button
              variant="outline"
              size="icon"
              onMouseDown={() => handleStepperMouseDown(5)}
              onMouseUp={handleStepperMouseUp}
              onMouseLeave={handleStepperMouseUp}
              disabled={isSubmitting || portionPercent >= 200}
              className="h-10 w-10 rounded-full"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Slider with centered 100% */}
          <div className="space-y-3">
            <Slider
              value={[sliderValue]}
              onValueChange={(values) => setSliderValue(values[0])}
              min={0}
              max={1}
              step={0.01}
              disabled={isSubmitting}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>25%</span>
              <span>100%</span>
              <span>200%</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-center text-muted-foreground">Quick presets</p>
            <div className="flex gap-2 justify-center">
              {[
                { label: '¼×', multiplier: 0.25 },
                { label: '½×', multiplier: 0.5 },
                { label: '1×', multiplier: 1 },
                { label: '1.5×', multiplier: 1.5 },
                { label: '2×', multiplier: 2 }
              ].map(({ label, multiplier }) => {
                const presetPercent = multiplier * 100;
                const isSelected = Math.abs(portionPercent - presetPercent) <= 5;
                return (
                  <Button
                    key={label}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePreset(multiplier)}
                    disabled={isSubmitting || presetPercent < 25 || presetPercent > 200}
                    className="min-w-[50px] text-xs"
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
            
            {/* Calorie Preview */}
            {enrichedData?.calories && (
              <div className="text-center mt-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted rounded-lg text-sm">
                  <span className="text-muted-foreground">Preview:</span>
                  <span className="font-medium">
                    {Math.round((enrichedData.calories / (enrichedData.servingGrams || 100)) * portionGrams)} calories
                  </span>
                </div>
              </div>
            )}
          </div>


          {/* Footer Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              onClick={onCancel} 
              variant="outline" 
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleContinue} 
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}