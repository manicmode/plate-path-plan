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

interface ManualFoodEntryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualFoodEntry: React.FC<ManualFoodEntryProps> = ({
  isOpen,
  onClose
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
      console.log('🧠 [Manual Entry] Estimating nutrition with GPT...', {
        foodName: trimmedName,
        amountPercentage: amountPercentage[0],
        mealType
      });

      // Call GPT nutrition estimator
      const { data, error } = await supabase.functions.invoke('gpt-nutrition-estimator', {
        body: {
          foodName: trimmedName,
          amountPercentage: amountPercentage[0],
          mealType: mealType || null
        }
      });

      if (error) {
        console.error('❌ [Manual Entry] GPT estimation failed:', error);
        toast.error('Failed to estimate nutrition. Please try again.');
        return;
      }

      if (!data?.nutrition) {
        console.error('❌ [Manual Entry] No nutrition data received');
        toast.error('Unable to estimate nutrition data');
        return;
      }

      const { nutrition } = data;
      
      // Create food item with GPT-estimated nutrition
      const foodData = {
        id: `manual-gpt-${Date.now()}`,
        name: trimmedName,
        calories: Math.round(nutrition.calories),
        protein: Math.round(nutrition.protein * 10) / 10,
        carbs: Math.round(nutrition.carbs * 10) / 10,
        fat: Math.round(nutrition.fat * 10) / 10,
        fiber: Math.round(nutrition.fiber * 10) / 10,
        sugar: Math.round(nutrition.sugar * 10) / 10,
        sodium: Math.round(nutrition.sodium),
        saturated_fat: Math.round(nutrition.saturated_fat * 10) / 10,
        confidence: Math.round(nutrition.confidence),
        timestamp: new Date(),
        confirmed: true, // Auto-confirm GPT entries
        image: undefined,
        source: 'gpt'
      };

      console.log('✅ [Manual Entry] GPT nutrition estimated:', foodData);

      // Save using persistence hook
      const savedId = await saveFood(foodData);
      
      if (savedId) {
        toast.success(
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            <span><strong>{trimmedName}</strong> added — estimated {nutrition.calories} kcal</span>
          </div>
        );
        onClose();
        
        // Reset form
        setFoodName('');
        setAmountPercentage([100]);
        setMealType('');
      } else {
        toast.error('Failed to save food item');
      }

    } catch (error) {
      console.error('❌ [Manual Entry] Error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameChange = (value: string) => {
    setFoodName(sanitizeText(value));
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
                placeholder="e.g., Apple, Banana, Chicken sandwich..."
                required
                disabled={isLoading}
                className="text-base"
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