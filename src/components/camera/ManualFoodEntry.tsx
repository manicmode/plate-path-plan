import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { X, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useNutritionPersistence } from '@/hooks/useNutritionPersistence';
import { sanitizeText } from '@/lib/validation';
import { supabase } from '@/integrations/supabase/client';
import { submitTextLookup, FEATURE_TEXT_LOOKUP_V2 } from '@/lib/food/textLookup';

interface ManualFoodEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onResults?: (items: any[]) => void;
}

export const ManualFoodEntry: React.FC<ManualFoodEntryProps> = ({
  isOpen,
  onClose,
  onResults
}) => {
  const { saveFood } = useNutritionPersistence();
  const [foodName, setFoodName] = useState('');
  const [amountPercentage, setAmountPercentage] = useState([100]);
  const [mealType, setMealType] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = foodName.trim();
    if (!trimmedName) {
      toast.error('Please enter a food name');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🧠 [Manual Entry] Looking up food with unified text lookup...', {
        foodName: trimmedName,
        amountPercentage: amountPercentage[0],
        mealType,
        useV2: FEATURE_TEXT_LOOKUP_V2
      });

      // Use unified text lookup system
      const { items } = await submitTextLookup(trimmedName, { source: 'manual' });

      if (!items || items.length === 0) {
        console.error('❌ [Manual Entry] No food items found');
        toast.error('No nutrition data found for this food. Please try a different name.');
        return;
      }

      // Apply portion scaling to all items
      const portionScale = amountPercentage[0] / 100;
      const scaledItems = items.map((item: any) => ({
        ...item,
        servingGrams: Math.round((item.servingGrams || 100) * portionScale),
        calories: Math.round(item.calories * portionScale),
        protein_g: Math.round(item.protein_g * portionScale * 10) / 10,
        carbs_g: Math.round(item.carbs_g * portionScale * 10) / 10,
        fat_g: Math.round(item.fat_g * portionScale * 10) / 10,
        fiber_g: Math.round((item.fiber_g || 2) * portionScale * 10) / 10,
        sugar_g: Math.round((item.sugar_g || 3) * portionScale * 10) / 10,
        source: 'manual'
      }));

      console.log(`✅ [Manual Entry] Found ${scaledItems.length} items, scaled by ${portionScale}x`);

      // Use shared router if available, otherwise fallback to legacy path
      if (onResults) {
        onResults(scaledItems);
        onClose();
        return;
      }

      // Legacy fallback - use first result for auto-confirm
      const foodItem = scaledItems[0];
      
      // Create food item for legacy save
      const foodData = {
        id: `manual-${foodItem.provider}-${Date.now()}`,
        name: trimmedName,
        calories: foodItem.calories,
        protein: foodItem.protein_g,
        carbs: foodItem.carbs_g,
        fat: foodItem.fat_g,
        fiber: foodItem.fiber_g,
        sugar: foodItem.sugar_g,
        sodium: Math.round((foodItem.meta?.sodium || 50) * portionScale),
        saturated_fat: Math.round((foodItem.meta?.saturated_fat || 1) * portionScale * 10) / 10,
        confidence: Math.round((foodItem.confidence || 0.7) * 100),
        timestamp: new Date(),
        confirmed: true,
        image: foodItem.imageUrl || undefined,
        source: foodItem.provider,
        brand: foodItem.brand || undefined,
        barcode: foodItem.barcode || undefined
      };

      console.log('✅ [Manual Entry] GPT nutrition estimated:', foodData);

      // Enhanced validation before saving
      const validateFoodData = (data: any) => {
        if (!data.name || data.name.trim() === '') {
          throw new Error('Food name is required');
        }
        
        if (data.calories < 0 || data.calories > 5000) {
          throw new Error(`Invalid calorie value: ${data.calories}`);
        }
        
        return data;
      };

      const validatedFoodData = validateFoodData(foodData);
      console.log('✅ [Manual Entry] Food data validation passed');

      // Save using persistence hook with error handling
      const savedId = await saveFood(validatedFoodData);
      
      if (!savedId) {
        throw new Error('Failed to save food item - no ID returned from saveFood');
      }

      console.log('✅ [Manual Entry] Food saved successfully with ID:', savedId);
      
      toast.success(
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-500" />
          <span><strong>{trimmedName}</strong> added — {foodData.calories} kcal ({foodItem.provider.toUpperCase()})</span>
        </div>
      );

      // Close modal and reset form
      onClose();
      setFoodName('');
      setAmountPercentage([100]);
      setMealType('');

    } catch (error) {
      console.error('❌ [Manual Entry] Error:', error);
      console.error('❌ [Manual Entry] Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name
      });
      toast.error('Manual entry failed: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameChange = (value: string) => {
    // Ensure spaces are preserved and handle edge cases
    const sanitizedValue = value
      .replace(/[<>]/g, '') // Remove XSS characters only
      .slice(0, 1000); // Limit length
    setFoodName(sanitizedValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ensure space key works properly
    if (e.key === ' ' || e.code === 'Space') {
      e.stopPropagation();
      // Let the default behavior proceed
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            Add Food Manually
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Food Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Food Name *</Label>
              <Input
                id="name"
                value={foodName}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., grilled chicken 150g, banana, cheese sandwich..."
                required
                disabled={isLoading}
                className="text-base"
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            {/* Amount Eaten Slider */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Amount Eaten</Label>
              <div className="px-3">
                <Slider
                  value={amountPercentage}
                  onValueChange={setAmountPercentage}
                  max={100}
                  min={10}
                  step={5}
                  disabled={isLoading}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>10%</span>
                  <span className="font-medium text-emerald-600">{amountPercentage[0]}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Meal Type (Optional) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Meal Type (Optional)</Label>
              <Select value={mealType} onValueChange={setMealType} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select meal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!foodName.trim() || isLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>AI Analyzing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Add Item</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};