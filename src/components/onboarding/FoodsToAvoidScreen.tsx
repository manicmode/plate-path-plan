
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { OnboardingData } from './OnboardingFlow';

interface FoodsToAvoidScreenProps {
  formData: OnboardingData;
  updateFormData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip: () => void;
}

const commonFoods = ['dairy', 'sugar', 'red meat', 'gluten', 'soy', 'nuts', 'shellfish', 'eggs'];

export const FoodsToAvoidScreen = ({ formData, updateFormData, onNext, onSkip }: FoodsToAvoidScreenProps) => {
  const addFood = (food: string) => {
    const current = formData.foodsToAvoid;
    const foods = current ? current.split(', ').filter(f => f.trim()) : [];
    if (!foods.includes(food)) {
      const newFoods = [...foods, food].join(', ');
      updateFormData({ foodsToAvoid: newFoods });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Any foods you want to avoid?
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Optional - helps us filter out foods you can't or don't want to eat
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="foods">Foods to avoid</Label>
          <Input
            id="foods"
            placeholder="e.g., dairy, nuts, shellfish (separate with commas)"
            value={formData.foodsToAvoid}
            onChange={(e) => updateFormData({ foodsToAvoid: e.target.value })}
            className="glass-button border-0 mt-2"
          />
        </div>

        <div>
          <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
            Quick add common foods:
          </Label>
          <div className="flex flex-wrap gap-2">
            {commonFoods.map((food) => (
              <Badge
                key={food}
                variant="outline"
                className="cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                onClick={() => addFood(food)}
              >
                + {food}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex space-x-4 pt-6">
        <Button
          variant="outline"
          onClick={onSkip}
          className="flex-1"
        >
          Skip for now
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 gradient-primary"
        >
          Next
        </Button>
      </div>
    </div>
  );
};
