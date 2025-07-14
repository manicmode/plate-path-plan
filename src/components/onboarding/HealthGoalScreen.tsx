import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Target } from 'lucide-react';
import { OnboardingData } from './OnboardingFlow';
import { toast } from 'sonner';

interface HealthGoalScreenProps {
  formData: OnboardingData;
  updateFormData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip: () => void;
}

const healthGoals = [
  { value: 'lose_weight', label: 'Lose weight', emoji: '⚖️' },
  { value: 'gain_muscle', label: 'Gain muscle', emoji: '💪' },
  { value: 'maintain_weight', label: 'Maintain weight', emoji: '🎯' },
  { value: 'eat_healthier', label: 'Eat healthier', emoji: '🥗' },
  { value: 'improve_energy', label: 'Improve energy', emoji: '⚡' },
  { value: 'improve_digestion', label: 'Improve digestion', emoji: '🌱' },
  { value: 'other', label: 'Other', emoji: '✨' },
];

export const HealthGoalScreen = ({ formData, updateFormData, onNext, onSkip }: HealthGoalScreenProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          What's your main goal?
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          This helps us personalize your experience
        </p>
      </div>

      <RadioGroup
        value={formData.mainHealthGoal}
        onValueChange={(value: any) => updateFormData({ mainHealthGoal: value })}
        className="space-y-3"
      >
        {healthGoals.map((goal) => (
          <div 
            key={goal.value}
            className={`flex items-center space-x-3 p-4 rounded-lg glass-button transition-colors cursor-pointer ${
              formData.mainHealthGoal === goal.value 
                ? 'bg-emerald-100 border-emerald-500 border-2 dark:bg-emerald-900/20' 
                : !formData.mainHealthGoal && goal.value === healthGoals[0].value 
                  ? 'ring-2 ring-red-500 ring-opacity-50 border border-border'
                  : 'border border-border'
            }`}
            onClick={() => updateFormData({ mainHealthGoal: goal.value as any })}
          >
            <RadioGroupItem value={goal.value} id={goal.value} />
            <Label htmlFor={goal.value} className="flex items-center space-x-3 flex-1 cursor-pointer pointer-events-none">
              <span className="text-xl">{goal.emoji}</span>
              <span className="text-base">{goal.label}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>

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
            // Validation: Check required field
            if (!formData.mainHealthGoal) {
              toast.error("Please select your main health goal before continuing");
              return;
            }
            console.log('✅ HealthGoalScreen validation passed');
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