/**
 * Portion Size Settings Sheet
 * Allows users to customize portion sizes with unit conversion and live preview
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Minus, Plus, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveUserPortionPreference, deleteUserPortionPreference } from '@/lib/nutrition/userPortionPrefs';
import { getUnitsForFood, convertUnitToGrams } from '@/lib/nutrition/categoryUnits';
import { mlToGrams, gramsToMl } from '@/lib/nutrition/density';
import { toPerPortion, type NutritionPer100g } from '@/lib/nutrition/portionCalculator';

interface PortionSheetProps {
  currentGrams: number;
  currentDisplay?: string;
  isEstimated: boolean;
  source: string;
  productData: any;
  nutrition100g: NutritionPer100g;
  onPortionChange: (grams: number, display?: string) => void;
  children: React.ReactNode;
}

export const PortionSheet: React.FC<PortionSheetProps> = ({
  currentGrams,
  currentDisplay,
  isEstimated,
  source,
  productData,
  nutrition100g,
  onPortionChange,
  children
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [portionGrams, setPortionGrams] = useState(currentGrams);
  const [selectedUnit, setSelectedUnit] = useState('g');
  const [customAmount, setCustomAmount] = useState('1');
  const [isSaving, setIsSaving] = useState(false);

  // Reset values when sheet opens
  useEffect(() => {
    if (isOpen) {
      setPortionGrams(currentGrams);
      setSelectedUnit('g');
      setCustomAmount('1');
    }
  }, [isOpen, currentGrams]);

  // Get available units for this food
  const categoryUnits = useMemo(() => {
    const productName = productData?.productName || productData?.itemName || productData?.name || '';
    return getUnitsForFood(productName);
  }, [productData]);

  // Calculate live nutrition preview
  const previewNutrition = useMemo(() => 
    toPerPortion(nutrition100g, portionGrams),
    [nutrition100g, portionGrams]
  );

  const handleStepChange = (delta: number) => {
    const step = portionGrams >= 100 ? 10 : 5;
    const newGrams = Math.max(5, Math.min(500, portionGrams + (delta * step)));
    setPortionGrams(newGrams);
  };

  const handleUnitChange = (unit: string) => {
    setSelectedUnit(unit);
    updatePortionFromUnit(parseFloat(customAmount) || 1, unit);
  };

  const handleAmountChange = (amount: string) => {
    setCustomAmount(amount);
    const numAmount = parseFloat(amount);
    if (numAmount > 0) {
      updatePortionFromUnit(numAmount, selectedUnit);
    }
  };

  const updatePortionFromUnit = (amount: number, unit: string) => {
    let newGrams = portionGrams;

    if (unit === 'g') {
      newGrams = Math.round(amount);
    } else if (unit === 'ml') {
      const productName = productData?.productName || productData?.itemName || '';
      newGrams = mlToGrams(amount, productName);
    } else if (categoryUnits) {
      const productName = productData?.productName || productData?.itemName || '';
      const converted = convertUnitToGrams(amount, unit, productName);
      if (converted) {
        newGrams = converted;
      }
    }

    setPortionGrams(Math.max(5, Math.min(500, Math.round(newGrams))));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const display = selectedUnit === 'g' ? 
        `${portionGrams}g` : 
        `${customAmount} ${selectedUnit}`;
      
      const success = await saveUserPortionPreference(
        productData,
        portionGrams,
        display
      );
      
      if (success) {
        onPortionChange(portionGrams, display);
        setIsOpen(false);
        toast({
          title: "Portion size saved!",
          description: `Future reports will use ${display} for this product.`,
        });
      } else {
        toast({
          title: "Save failed",
          description: "Unable to save portion preference. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Save portion error:', error);
      toast({
        title: "Save failed",
        description: "An error occurred while saving.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await deleteUserPortionPreference(productData);
      // Reset to original estimated portion
      const resetGrams = 30;
      setPortionGrams(resetGrams);
      onPortionChange(resetGrams);
      setIsOpen(false);
      toast({
        title: "Portion size reset",
        description: "Using default portion size estimation.",
      });
    } catch (error) {
      console.error('Reset portion error:', error);
    }
  };

  const availableUnits = ['g', 'ml', ...(categoryUnits?.units.map(u => u.unit) || [])];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] max-h-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Set Portion Size</span>
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 mt-6">
          {/* Current Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2">{productData?.productName || productData?.itemName}</h3>
            <div className="flex items-center space-x-2">
              <Badge variant={isEstimated ? "secondary" : "default"}>
                Current: {currentGrams}g
              </Badge>
              <Badge variant="outline">
                {source === 'user_set' ? 'Your setting' :
                 source === 'ocr_declared' ? 'From label' :
                 source === 'db_declared' ? 'From database' :
                 source === 'ocr_inferred_ratio' ? 'Calculated' :
                 'Estimated'}
              </Badge>
            </div>
          </div>

          {/* Portion Controls */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Adjust Portion Size</Label>
            
            {/* Step Controls */}
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleStepChange(-1)}
                disabled={portionGrams <= 5}
              >
                <Minus className="w-4 h-4" />
              </Button>
              
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold">{portionGrams}g</div>
                <div className="text-sm text-muted-foreground">
                  {portionGrams >= 100 ? '-/+10g' : '-/+5g'} steps
                </div>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleStepChange(1)}
                disabled={portionGrams >= 500}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Unit Conversion */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={customAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  step="0.1"
                  min="0.1"
                  max="10"
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={selectedUnit} onValueChange={handleUnitChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.map(unit => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Live Preview */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <h4 className="font-semibold mb-2">Nutrition Preview ({portionGrams}g)</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {previewNutrition.calories && (
                  <div>Calories: <strong>{previewNutrition.calories}</strong> kcal</div>
                )}
                {previewNutrition.protein && (
                  <div>Protein: <strong>{previewNutrition.protein?.toFixed(1)}</strong>g</div>
                )}
                {previewNutrition.carbs && (
                  <div>Carbs: <strong>{previewNutrition.carbs?.toFixed(1)}</strong>g</div>
                )}
                {previewNutrition.fat && (
                  <div>Fat: <strong>{previewNutrition.fat?.toFixed(1)}</strong>g</div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Portion'}
            </Button>
            
            {source === 'user_set' && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Default
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};