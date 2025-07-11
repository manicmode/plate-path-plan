
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Activity } from 'lucide-react';
import { OnboardingData } from './OnboardingFlow';

interface ActivityLevelScreenProps {
  formData: OnboardingData;
  updateFormData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip: () => void;
}

const activityLevels = [
  { 
    value: 'sedentary', 
    label: 'Sedentary', 
    description: 'Mostly sitting',
    emoji: '🪑'
  },
  { 
    value: 'light', 
    label: 'Light', 
    description: 'Walking, light chores',
    emoji: '🚶'
  },
  { 
    value: 'moderate', 
    label: 'Moderate', 
    description: 'Regular workouts',
    emoji: '🏃'
  },
  { 
    value: 'very_active', 
    label: 'Very active', 
    description: 'Daily intense training',
    emoji: '🏋️'
  },
];

export const ActivityLevelScreen = ({ formData, updateFormData, onNext, onSkip }: ActivityLevelScreenProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          How active are you day-to-day?
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          This helps us calculate your nutritional needs
        </p>
      </div>

      <RadioGroup
        value={formData.activityLevel}
        onValueChange={(value: any) => updateFormData({ activityLevel: value })}
        className="space-y-3"
      >
        {activityLevels.map((level) => (
          <div key={level.value} className={`flex items-center space-x-3 p-4 rounded-lg glass-button border-0 transition-colors ${
            formData.activityLevel === level.value 
              ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-500' 
              : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
          }`}>
            <RadioGroupItem value={level.value} id={level.value} />
            <Label htmlFor={level.value} className="flex items-center space-x-3 flex-1 cursor-pointer">
              <span className="text-2xl">{level.emoji}</span>
              <div>
                <div className="text-base font-medium">{level.label}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{level.description}</div>
              </div>
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
          onClick={onNext}
          className="flex-1 gradient-primary"
        >
          Next
        </Button>
      </div>
    </div>
  );
};
