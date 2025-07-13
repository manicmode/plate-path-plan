
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Heart } from 'lucide-react';
import { OnboardingData } from './OnboardingFlow';

interface HealthConditionsScreenProps {
  formData: OnboardingData;
  updateFormData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip: () => void;
}

const healthConditions = [
  { value: 'inflammation', label: 'Inflammation', emoji: '🔥' },
  { value: 'high_blood_pressure', label: 'High blood pressure', emoji: '💗' },
  { value: 'diabetes', label: 'Diabetes', emoji: '🩸' },
  { value: 'pcos', label: 'PCOS', emoji: '⚕️' },
  { value: 'digestive_issues', label: 'Digestive issues', emoji: '🫄' },
  { value: 'food_allergies', label: 'Food allergies/sensitivities', emoji: '🚫' },
  { value: 'autoimmune', label: 'Autoimmune conditions', emoji: '🛡️' },
  { value: 'none', label: 'None / Prefer not to say', emoji: '✅' },
];

export const HealthConditionsScreen = ({ formData, updateFormData, onNext, onSkip }: HealthConditionsScreenProps) => {
  const toggleCondition = (condition: string) => {
    const currentConditions = formData.healthConditions;
    let newConditions;
    
    if (condition === 'none') {
      // If selecting "none", clear all other selections
      newConditions = currentConditions.includes('none') ? [] : ['none'];
    } else {
      // If selecting a specific condition, remove "none" and toggle the condition
      newConditions = currentConditions.filter(c => c !== 'none');
      if (newConditions.includes(condition)) {
        newConditions = newConditions.filter(c => c !== condition);
      } else {
        newConditions = [...newConditions, condition];
      }
    }
    
    updateFormData({ healthConditions: newConditions });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Do you have any of the following?
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Optional - helps us provide better recommendations
        </p>
      </div>

      <div className="space-y-3">
        {healthConditions.map((condition) => (
          <div key={condition.value} className={`flex items-center space-x-3 p-4 rounded-lg glass-button transition-all duration-200 ${
            formData.healthConditions.includes(condition.value)
              ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20 scale-[1.02]' 
              : 'border border-border hover:border-green-400 hover:bg-muted/50'
          }`}>
            <Checkbox
              id={condition.value}
              checked={formData.healthConditions.includes(condition.value)}
              onCheckedChange={() => toggleCondition(condition.value)}
            />
            <Label htmlFor={condition.value} className="flex items-center space-x-3 flex-1 cursor-pointer">
              <span className="text-xl">{condition.emoji}</span>
              <span className="text-base">{condition.label}</span>
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
          onClick={onNext}
          className="flex-1 gradient-primary"
        >
          Next
        </Button>
      </div>
    </div>
  );
};
