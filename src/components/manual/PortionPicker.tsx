import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MANUAL_FX } from '@/config/flags';

interface PortionPickerProps {
  selectedFood: any;
  onCancel: () => void;
  onContinue: (food: any, portion: any) => void;
  isLoading?: boolean;
}

export function PortionPicker({ selectedFood, onCancel, onContinue, isLoading }: PortionPickerProps) {
  const [servings, setServings] = useState(1.0);
  const [grams, setGrams] = useState(selectedFood?.grams || selectedFood?.servingSize || 100);
  const [percent, setPercent] = useState([100]);
  const [showConfetti, setShowConfetti] = useState(false);

  const hasGrams = selectedFood?.grams || selectedFood?.servingSize;
  const servingUnit = selectedFood?.servingUnit || 'serving';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fxEnabled = MANUAL_FX && !reducedMotion;

  const handleContinue = () => {
    const portion = {
      servings,
      grams: hasGrams ? grams : undefined,
      percent: percent[0]
    };

    console.log('[FX][PORTION] apply', { servings, grams, percent: percent[0] });
    
    // Show confetti if FX enabled
    if (fxEnabled) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 400);
    }
    
    // Small delay for confetti if enabled
    const delay = fxEnabled ? 120 : 0;
    setTimeout(() => {
      onContinue(selectedFood, portion);
    }, delay);
  };

  const adjustServings = (delta: number) => {
    setServings(Math.max(0.5, servings + delta));
  };

  // Calculate preview macros if available
  const previewCalories = selectedFood?.calories 
    ? Math.round((selectedFood.calories * servings * percent[0]) / 100)
    : null;

  const motionProps = fxEnabled 
    ? {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 8 },
        transition: { duration: 0.14, ease: "easeOut" }
      }
    : {};

  return fxEnabled ? (
    <motion.div 
      className="space-y-6 border-t pt-6" 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.14 }}
    >
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Choose portion</h3>
        <p className="text-sm text-muted-foreground truncate">
          {selectedFood?.name}
          {selectedFood?.brand && (
            <span className="opacity-70"> • {selectedFood.brand}</span>
          )}
        </p>
      </div>

      {/* Serving count */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Serving count
        </label>
        <div className="flex items-center gap-3">
          <motion.div
            whileTap={fxEnabled ? { scale: 0.97 } : undefined}
            transition={{ duration: 0.06 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustServings(-0.5)}
              className="h-9 w-9 p-0 rounded-full"
              disabled={servings <= 0.5}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </motion.div>
          
          <div className="flex-1 text-center">
            <div className="font-semibold text-lg">
              {servings.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">
              {servingUnit}{servings !== 1 ? 's' : ''}
            </div>
          </div>
          
          <motion.div
            whileTap={fxEnabled ? { scale: 0.97 } : undefined}
            transition={{ duration: 0.06 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustServings(0.5)}
              className="h-9 w-9 p-0 rounded-full"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Grams */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Weight (grams)
        </label>
        {hasGrams ? (
          <Input
            type="number"
            value={grams}
            onChange={(e) => setGrams(Math.max(1, Number(e.target.value)))}
            className="h-10"
            min="1"
            max="9999"
          />
        ) : (
          <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg border">
            Weight information not available for this item
          </div>
        )}
      </div>

      {/* Percentage slider */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Portion size: {percent[0]}%
        </label>
        <div className="px-2">
          <Slider
            value={percent}
            onValueChange={setPercent}
            max={200}
            min={25}
            step={25}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>25%</span>
            <span>100%</span>
            <span>200%</span>
          </div>
        </div>
      </div>

      {/* Macro preview */}
      {previewCalories && (
        <motion.div 
          className="p-3 bg-primary/5 border border-primary/10 rounded-lg"
          initial={fxEnabled ? { opacity: 0, scale: 0.95 } : undefined}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-sm text-foreground">
            <span className="font-medium">Preview:</span>
            <span className="ml-2">{previewCalories} calories</span>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button 
          variant="outline" 
          onClick={onCancel} 
          className="flex-1 h-12"
          disabled={isLoading}
        >
          Cancel
        </Button>
        
        <div className="relative flex-1">
          <Button 
            onClick={handleContinue} 
            className="w-full h-12 font-medium"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Continue'}
          </Button>
          
          {/* Confetti effect */}
          <AnimatePresence>
            {showConfetti && fxEnabled && (
              <motion.div 
                className="absolute inset-0 pointer-events-none flex items-center justify-center"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-primary rounded-full"
                    initial={{ 
                      x: 0, 
                      y: 0,
                      opacity: 1,
                      scale: 1
                    }}
                    animate={{
                      x: (Math.random() - 0.5) * 80,
                      y: (Math.random() - 0.5) * 80,
                      opacity: 0,
                      scale: 0
                    }}
                    transition={{
                      duration: 0.5,
                      delay: i * 0.03,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  ) : (
    <div className="space-y-6 border-t pt-6">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Choose portion</h3>
        <p className="text-sm text-muted-foreground truncate">
          {selectedFood?.name}
          {selectedFood?.brand && (
            <span className="opacity-70"> • {selectedFood.brand}</span>
          )}
        </p>
      </div>

      {/* Serving count */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Serving count
        </label>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => adjustServings(-0.5)}
            className="h-9 w-9 p-0 rounded-full"
            disabled={servings <= 0.5}
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 text-center">
            <div className="font-semibold text-lg">
              {servings.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">
              {servingUnit}{servings !== 1 ? 's' : ''}
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => adjustServings(0.5)}
            className="h-9 w-9 p-0 rounded-full"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grams */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Weight (grams)
        </label>
        {hasGrams ? (
          <Input
            type="number"
            value={grams}
            onChange={(e) => setGrams(Math.max(1, Number(e.target.value)))}
            className="h-10"
            min="1"
            max="9999"
          />
        ) : (
          <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg border">
            Weight information not available for this item
          </div>
        )}
      </div>

      {/* Percentage slider */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Portion size: {percent[0]}%
        </label>
        <div className="px-2">
          <Slider
            value={percent}
            onValueChange={setPercent}
            max={200}
            min={25}
            step={25}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>25%</span>
            <span>100%</span>
            <span>200%</span>
          </div>
        </div>
      </div>

      {/* Macro preview */}
      {previewCalories && (
        <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
          <div className="text-sm text-foreground">
            <span className="font-medium">Preview:</span>
            <span className="ml-2">{previewCalories} calories</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button 
          variant="outline" 
          onClick={onCancel} 
          className="flex-1 h-12"
          disabled={isLoading}
        >
          Cancel
        </Button>
        
        <Button 
          onClick={handleContinue} 
          className="flex-1 h-12 font-medium"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}