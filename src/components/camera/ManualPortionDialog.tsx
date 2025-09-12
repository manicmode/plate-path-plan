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
  // Guard: this dialog should never open without both
  if (!candidate || !enrichedData) {
    console.error('[DIALOG][ERROR] Opened without data', { candidate: !!candidate, enrichedData: !!enrichedData });
    onCancel?.();
    return null;
  }

  // All hooks declared unconditionally at top
  const [portionGrams, setPortionGrams] = useState(() => enrichedData?.servingGrams || 100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const stepperIntervalRef = useRef<NodeJS.Timeout>();
  const defaultGrams = enrichedData?.servingGrams || 100;

  // Log when dialog actually mounts
  console.log('[PORTION][OPEN]', { name: candidate?.name, defaultG: defaultGrams });

  // Helper functions
  const setGrams = (newGrams: number) => {
    const clamped = Math.max(25, Math.min(500, Math.round(newGrams)));
    setPortionGrams(clamped);
  };

  const handlePreset = (multiplier: number) => {
    const newGrams = Math.round(defaultGrams * multiplier);
    setGrams(newGrams);
  };

  const handleStepper = (delta: number) => {
    setGrams(portionGrams + delta);
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
    console.log('[DIALOG][COMMIT]', { 
      hasIngredients: !!enrichedData?.ingredientsList?.length,
      portionGrams
    });
    
    onContinue({
      ...enrichedData,
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
            <h3 className="text-xl font-semibold text-foreground">Confirm Portion Size</h3>
            <p className="text-sm text-muted-foreground mt-1 truncate" title={candidate?.name}>
              {candidate?.name}
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
              disabled={isSubmitting || portionGrams <= 25}
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
              disabled={isSubmitting || portionGrams >= 500}
              className="h-10 w-10 rounded-full"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Slider */}
          <div className="space-y-3">
            <Slider
              value={[portionGrams]}
              onValueChange={(values) => setGrams(values[0])}
              min={25}
              max={500}
              step={5}
              disabled={isSubmitting}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>25g</span>
              <span>500g</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-center">Quick presets</p>
            <div className="flex gap-2 justify-center">
              {[
                { label: '¼×', multiplier: 0.25 },
                { label: '½×', multiplier: 0.5 },
                { label: '1×', multiplier: 1 },
                { label: '1.5×', multiplier: 1.5 },
                { label: '2×', multiplier: 2 }
              ].map(({ label, multiplier }) => {
                const presetGrams = Math.round(defaultGrams * multiplier);
                const isSelected = Math.abs(portionGrams - presetGrams) <= 2;
                return (
                  <Button
                    key={label}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePreset(multiplier)}
                    disabled={isSubmitting || presetGrams < 25 || presetGrams > 500}
                    className="min-w-[50px] text-xs"
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
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