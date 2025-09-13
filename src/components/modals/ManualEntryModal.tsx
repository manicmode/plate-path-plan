import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Info, Minus, Plus } from 'lucide-react';
import { MANUAL_PORTION_STEP } from '@/config/flags';
import ManualFoodEntry from '@/components/camera/ManualFoodEntry';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodSelected: (food: any) => void;
}

interface PortionPickerProps {
  selectedFood: any;
  onCancel: () => void;
  onContinue: (food: any, portion: any) => void;
}

function PortionPicker({ selectedFood, onCancel, onContinue }: PortionPickerProps) {
  const [servings, setServings] = useState(1.0);
  const [grams, setGrams] = useState(selectedFood?.grams || selectedFood?.servingSize || 100);
  const [percent, setPercent] = useState([100]);

  const hasGrams = selectedFood?.grams || selectedFood?.servingSize;
  const servingUnit = selectedFood?.servingUnit || 'serving';

  const handleContinue = () => {
    const portion = {
      servings,
      grams: hasGrams ? grams : undefined,
      percent: percent[0]
    };

    console.log('[PORTION][APPLY]', { servings, grams, percent: percent[0] });
    
    const itemWithPortion = {
      ...selectedFood,
      portion,
      inputSource: 'manual'
    };

    onContinue(selectedFood, portion);
  };

  const adjustServings = (delta: number) => {
    setServings(Math.max(0.5, servings + delta));
  };

  // Calculate preview macros if available
  const previewCalories = selectedFood?.calories 
    ? Math.round((selectedFood.calories * servings * percent[0]) / 100)
    : null;

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="space-y-2">
        <h3 className="font-medium">Choose portion</h3>
        <p className="text-xs text-muted-foreground">
          {selectedFood?.name} {selectedFood?.brand && `• ${selectedFood.brand}`}
        </p>
      </div>

      {/* Serving count */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Serving count</label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => adjustServings(-0.5)}
            className="h-8 w-8 p-0"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <div className="flex-1 text-center font-medium">
            {servings.toFixed(1)} {servingUnit}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => adjustServings(0.5)}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Grams */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Grams</label>
        {hasGrams ? (
          <Input
            type="number"
            value={grams}
            onChange={(e) => setGrams(Number(e.target.value))}
            className="h-8"
            min="1"
          />
        ) : (
          <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
            Weight information not available for this item
          </div>
        )}
      </div>

      {/* Percentage slider */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          % of serving: {percent[0]}%
        </label>
        <Slider
          value={percent}
          onValueChange={setPercent}
          max={200}
          min={25}
          step={25}
          className="w-full"
        />
      </div>

      {/* Macro preview */}
      {previewCalories && (
        <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
          Preview: ~{previewCalories} calories
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleContinue} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}

export function ManualEntryModal({ isOpen, onClose, onFoodSelected }: ManualEntryModalProps) {
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);

  // Log UX helpers once when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('[MANUAL][UX] helper_copy=enabled');
      console.log('[MANUAL][UX] info_sheet=available');
    }
  }, [isOpen]);

  const handleFoodSelect = async (candidate: any) => {
    try {
      console.log('[MANUAL][SELECT]', candidate);
      
      const candidateId = candidate.id || candidate.name;
      setEnrichingId(candidateId);

      // Show portion picker if flag is enabled
      if (MANUAL_PORTION_STEP) {
        console.log('[PORTION][OPEN]', { source: 'manual', itemId: candidateId });
        setSelectedFood(candidate);
        setEnrichingId(null);
        return;
      }

      console.log('[ROUTE][CALL]', { source: 'manual', id: candidate?.id || candidate?.name });
      
      // Call parent with candidate for routing and enrichment
      onFoodSelected(candidate);
      onClose();
    } catch (error) {
      console.warn('[MANUAL][SELECT][ERROR]', error);
      
      // Create skeleton fallback
      const skeleton = {
        ...candidate,
        source: 'manual',
        enriched: false,
        hasIngredients: false,
        ingredientsList: [],
        ingredientsText: '',
        ingredientsUnavailable: true,
        enrichmentSource: 'manual'
      };

      onFoodSelected(skeleton);
      onClose();
    } finally {
      if (!MANUAL_PORTION_STEP) {
        setEnrichingId(null);
      }
    }
  };

  const handlePortionContinue = (food: any, portion: any) => {
    const itemWithPortion = {
      ...food,
      portion,
      inputSource: 'manual'
    };

    console.log('[ROUTE][CALL]', { source: 'manual', itemId: food?.id || food?.name });
    
    onFoodSelected(itemWithPortion);
    setSelectedFood(null);
    onClose();
  };

  const handlePortionCancel = () => {
    setSelectedFood(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md z-[600]">
        <VisuallyHidden>
          <DialogTitle>Add Food Manually</DialogTitle>
          <DialogDescription>
            Search and select foods to add to your log
          </DialogDescription>
        </VisuallyHidden>
        
        <DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Manual Entry</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Best for restaurant meals, branded items, and supermarket foods.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInfoSheet(!showInfoSheet)}
                className="h-6 w-6 p-0 rounded-full"
              >
                <Info className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {showInfoSheet && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3 border">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span><strong>Manual Entry:</strong> best for restaurant meals, brand items, supermarket foods</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span><strong>Take a Photo:</strong> best for mixed plates and home-cooked meals</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span><strong>Speak to Log:</strong> fastest way to add simple items by voice</span>
              </li>
            </ul>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowInfoSheet(false)}
              className="w-full"
            >
              Got it
            </Button>
          </div>
        )}

        <div className="space-y-6">
          {selectedFood ? (
            <PortionPicker
              selectedFood={selectedFood}
              onCancel={handlePortionCancel}
              onContinue={handlePortionContinue}
            />
          ) : (
            <ManualFoodEntry
              onFoodSelect={handleFoodSelect}
              onClose={onClose}
              enrichingId={enrichingId}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}