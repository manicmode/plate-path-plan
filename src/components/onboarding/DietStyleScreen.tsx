
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Utensils } from 'lucide-react';
import { OnboardingData } from './OnboardingFlow';
import { toast } from 'sonner';

interface DietStyleScreenProps {
  formData: OnboardingData;
  updateFormData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip: () => void;
}

const dietStyles = [
  { value: 'vegan', label: 'Vegan', emoji: '🌱' },
  { value: 'vegetarian', label: 'Vegetarian', emoji: '🥬' },
  { value: 'keto', label: 'Keto', emoji: '🥑' },
  { value: 'low_carb', label: 'Low-carb', emoji: '🥩' },
  { value: 'mediterranean', label: 'Mediterranean', emoji: '🫒' },
  { value: 'high_protein', label: 'High-protein', emoji: '💪' },
  { value: 'gluten_free', label: 'Gluten-free', emoji: '🌾' },
  { value: 'balanced', label: 'None / Just eating balanced', emoji: '⚖️' },
];

export const DietStyleScreen = ({ formData, updateFormData, onNext, onSkip }: DietStyleScreenProps) => {
  const toggleDietStyle = (style: string) => {
    const currentStyles = formData.dietStyles;
    let newStyles;
    
    if (style === 'balanced') {
      // If selecting "balanced", clear all other selections
      newStyles = currentStyles.includes('balanced') ? [] : ['balanced'];
    } else {
      // If selecting a specific style, remove "balanced" and toggle the style
      newStyles = currentStyles.filter(s => s !== 'balanced');
      if (newStyles.includes(style)) {
        newStyles = newStyles.filter(s => s !== style);
      } else {
        newStyles = [...newStyles, style];
      }
    }
    
    // Force immediate re-render by updating state synchronously
    updateFormData({ dietStyles: newStyles });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
            <Utensils className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Do you follow any of these eating styles?
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Select all that apply - helps us suggest suitable recipes
        </p>
      </div>

      <div className="space-y-3">
        {dietStyles.map((style) => (
          <div 
            key={style.value}
            className={`flex items-center space-x-3 p-4 rounded-lg glass-button transition-all duration-200 cursor-pointer min-h-[44px] ${
              formData.dietStyles.includes(style.value)
                ? 'bg-emerald-100 border-emerald-500 border-2 transform scale-[1.02] dark:bg-emerald-900/20' 
                : 'border border-border hover:border-green-400 hover:bg-muted/50'
            }`}
            onClick={() => toggleDietStyle(style.value)}
          >
            <Checkbox
              id={style.value}
              checked={formData.dietStyles.includes(style.value)}
              onCheckedChange={() => toggleDietStyle(style.value)}
            />
            <Label htmlFor={style.value} className="flex items-center space-x-3 flex-1 cursor-pointer pointer-events-none">
              <span className="text-xl">{style.emoji}</span>
              <span className="text-base">{style.label}</span>
            </Label>
          </div>
        ))}
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
          onClick={() => {
            // Validation: Check if at least one diet style is selected
            if (formData.dietStyles.length === 0) {
              toast.error("Please complete all required fields before continuing.");
              return;
            }
            console.log('✅ DietStyleScreen validation passed');
            onNext();
          }}
          className="flex-1 gradient-primary"
        >
          Next
        </Button>
      </div>
    </div>
  );
};
