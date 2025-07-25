import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Dumbbell } from 'lucide-react';
import { OnboardingData } from './OnboardingFlow';
import { toast } from 'sonner';

interface ExerciseLifestyleScreenProps {
  formData: OnboardingData;
  updateFormData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip: () => void;
}

const lifestyleOptions = [
  { value: 'sedentary_job', label: 'Desk job / mostly sitting', emoji: '💻' },
  { value: 'active_job', label: 'Active job / standing/walking', emoji: '🚶' },
  { value: 'very_active_job', label: 'Physical job / manual labor', emoji: '🏗️' },
];

const exerciseFrequencies = [
  { value: 'never', label: 'Never', emoji: '😴' },
  { value: 'rarely', label: 'Rarely (1-2 times per month)', emoji: '🌙' },
  { value: '1_2_week', label: '1-2 times per week', emoji: '🏃' },
  { value: '3_4_week', label: '3-4 times per week', emoji: '💪' },
  { value: '5_6_week', label: '5-6 times per week', emoji: '🔥' },
  { value: 'daily', label: 'Daily', emoji: '⚡' },
  { value: 'twice_daily', label: 'Multiple times daily', emoji: '🚀' },
];

const exerciseTypes = [
  { value: 'cardio', label: 'Cardio (running, cycling, etc.)' },
  { value: 'strength_training', label: 'Strength training / weightlifting' },
  { value: 'yoga_pilates', label: 'Yoga / Pilates' },
  { value: 'sports', label: 'Sports (tennis, basketball, etc.)' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'hiking_outdoor', label: 'Hiking / outdoor activities' },
  { value: 'dance_fitness', label: 'Dance / fitness classes' },
  { value: 'martial_arts', label: 'Martial arts' },
];

export const ExerciseLifestyleScreen = ({ formData, updateFormData, onNext, onSkip }: ExerciseLifestyleScreenProps) => {
  const toggleExerciseType = (type: string) => {
    console.log('🔧 ExerciseLifestyleScreen: Exercise type clicked:', type);
    const current = formData.exerciseTypes;
    if (current.includes(type)) {
      updateFormData({ exerciseTypes: current.filter(t => t !== type) });
    } else {
      updateFormData({ exerciseTypes: [...current, type] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Tell us about your exercise & lifestyle
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          This helps us calculate your precise energy needs and recovery requirements
        </p>
      </div>

      <div className="space-y-6">
        {/* Daily Lifestyle */}
        <div>
          <Label className="text-base font-medium mb-4 block">What's your daily lifestyle like?</Label>
          <RadioGroup
            value={formData.dailyLifestyle}
            onValueChange={(value: any) => updateFormData({ dailyLifestyle: value })}
            className="space-y-3"
          >
            {lifestyleOptions.map((option) => (
              <div 
                key={option.value} 
                className={`flex items-center space-x-3 p-4 rounded-lg glass-button transition-all duration-200 cursor-pointer min-h-[44px] ${
                  formData.dailyLifestyle === option.value 
                    ? 'border-2 border-emerald-500 bg-emerald-100 transform scale-[1.02] dark:bg-emerald-900/20' 
                    : 'border border-border hover:border-green-400 hover:bg-muted/50'
                } ${!formData.dailyLifestyle ? 'ring-2 ring-red-500 ring-opacity-50' : ''}`}
                onClick={() => {
                  console.log('🔧 ExerciseLifestyleScreen: Lifestyle option clicked:', option.value);
                  updateFormData({ dailyLifestyle: option.value as OnboardingData['dailyLifestyle'] });
                }}
              >
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value} className="flex items-center space-x-3 flex-1 cursor-pointer">
                  <span className="text-xl">{option.emoji}</span>
                  <span className="text-base">{option.label}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Exercise Frequency */}
        <div>
          <Label className="text-base font-medium mb-4 block">How often do you exercise?</Label>
          <RadioGroup
            value={formData.exerciseFrequency}
            onValueChange={(value: any) => updateFormData({ exerciseFrequency: value })}
            className="space-y-3"
          >
          {exerciseFrequencies.map((freq) => (
            <div 
              key={freq.value} 
              className={`flex items-center space-x-3 p-4 rounded-lg glass-button transition-all duration-200 cursor-pointer min-h-[44px] ${
                formData.exerciseFrequency === freq.value 
                  ? 'border-2 border-emerald-500 bg-emerald-100 transform scale-[1.02] dark:bg-emerald-900/20' 
                  : 'border border-border hover:border-green-400 hover:bg-muted/50'
              } ${!formData.exerciseFrequency ? 'ring-2 ring-red-500 ring-opacity-50' : ''}`}
              onClick={() => {
                console.log('🔧 ExerciseLifestyleScreen: Exercise frequency clicked:', freq.value);
                updateFormData({ exerciseFrequency: freq.value as OnboardingData['exerciseFrequency'] });
              }}
            >
              <RadioGroupItem value={freq.value} id={freq.value} />
              <Label htmlFor={freq.value} className="flex items-center space-x-3 flex-1 cursor-pointer">
                <span className="text-xl">{freq.emoji}</span>
                <span className="text-base">{freq.label}</span>
              </Label>
            </div>
            ))}
          </RadioGroup>
        </div>

        {/* Exercise Types */}
        {formData.exerciseFrequency && formData.exerciseFrequency !== 'never' && (
          <div>
            <Label className="text-base font-medium mb-4 block">What types of exercise do you do?</Label>
            <div className="space-y-3">
              {exerciseTypes.map((type) => (
                <div 
                  key={type.value} 
                  className={`flex items-center space-x-3 p-4 rounded-lg glass-button transition-all duration-200 cursor-pointer min-h-[44px] ${
                    formData.exerciseTypes.includes(type.value)
                      ? 'border-2 border-emerald-500 bg-emerald-100 transform scale-[1.02] dark:bg-emerald-900/20' 
                      : 'border border-border hover:border-green-400 hover:bg-muted/50'
                  }`}
                  onClick={() => toggleExerciseType(type.value)}
                >
                  <Checkbox
                    id={type.value}
                    checked={formData.exerciseTypes.includes(type.value)}
                    onCheckedChange={() => toggleExerciseType(type.value)}
                  />
                  <Label htmlFor={type.value} className="flex-1 cursor-pointer text-base pointer-events-none">
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}
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
            // Validation: Check required fields
            if (!formData.dailyLifestyle || !formData.exerciseFrequency) {
              toast.error("Please complete all required fields before continuing.");
              return;
            }
            console.log('✅ ExerciseLifestyleScreen validation passed');
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