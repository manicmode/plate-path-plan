import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Clock } from 'lucide-react';
import { OnboardingData } from './OnboardingFlow';

interface EatingPatternsScreenProps {
  formData: OnboardingData;
  updateFormData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip: () => void;
}

const mealFrequencies = [
  { value: '2', label: '2 meals per day', emoji: '🍽️' },
  { value: '3', label: '3 meals per day', emoji: '🍽️🍽️🍽️' },
  { value: '4', label: '4 meals per day', emoji: '🍽️🍽️🍽️🍽️' },
  { value: '5', label: '5 meals per day', emoji: '🍽️🍽️🍽️🍽️🍽️' },
  { value: '6+', label: '6+ meals per day', emoji: '🍽️⭐' },
];

const fastingSchedules = [
  { value: 'none', label: 'No specific eating window', emoji: '🕐' },
  { value: '16_8', label: '16:8 (eat for 8 hours, fast for 16)', emoji: '⏰' },
  { value: '18_6', label: '18:6 (eat for 6 hours, fast for 18)', emoji: '⏲️' },
  { value: '20_4', label: '20:4 (eat for 4 hours, fast for 20)', emoji: '⏱️' },
  { value: 'omad', label: 'OMAD (one meal a day)', emoji: '🍽️' },
  { value: 'alternate_day', label: 'Alternate day fasting', emoji: '📅' },
];

export const EatingPatternsScreen = ({ formData, updateFormData, onNext, onSkip }: EatingPatternsScreenProps) => {
  console.log('🎬 EatingPatternsScreen component mounted');
  
  // FAIL-FAST LOGGING & GUARD CLAUSE
  if (!formData.mealFrequency || formData.mealFrequency === undefined) {
    console.error('[EP-DEBUG] mealFrequency still empty! Raw formData:', formData);
    throw new Error('mealFrequency is empty before rendering RadioGroup');
  }
  
  // Super defensive null checks
  if (!formData) {
    console.error('❌ EatingPatternsScreen: formData is null/undefined');
    return <div>Loading eating patterns screen...</div>;
  }
  
  if (!updateFormData || typeof updateFormData !== 'function') {
    console.error('❌ EatingPatternsScreen: updateFormData is not a function');
    return <div>Error: Missing update function</div>;
  }
  
  if (!onNext || typeof onNext !== 'function') {
    console.error('❌ EatingPatternsScreen: onNext is not a function');
    return <div>Error: Missing navigation function</div>;
  }
  
  if (!onSkip || typeof onSkip !== 'function') {
    console.error('❌ EatingPatternsScreen: onSkip is not a function');
    return <div>Error: Missing skip function</div>;
  }
  
  console.log('📊 EatingPatternsScreen received formData:', JSON.stringify(formData, null, 2));
  
  // HARD FALLBACK (temporary) - Force-set valid default
  const safeMealFrequency = formData.mealFrequency
    ? formData.mealFrequency
    : '3';   // valid default

  // Ensure eating pattern fields are properly initialized - extra defensive
  const safeFormData = {
    ...formData,
    mealFrequency: safeMealFrequency as OnboardingData['mealFrequency'],
    fastingSchedule: formData?.fastingSchedule || 'none',
    eatingWindow: formData?.eatingWindow || ''
  };
  
  console.log('🔧 EatingPatternsScreen safeFormData:', JSON.stringify(safeFormData, null, 2));
  
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          What are your eating patterns?
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          We'll time nutrient recommendations to match your eating style and optimize absorption
        </p>
      </div>

      <div className="space-y-6">
        {/* Meal Frequency */}
        <div>
          <Label className="text-base font-medium mb-4 block">How many meals do you typically eat per day?</Label>
          <RadioGroup
            value={safeFormData.mealFrequency || '3'} // ✅ Additional safety check
            onValueChange={(value: any) => {
              console.log('🔄 EatingPatternsScreen: mealFrequency changing to:', value);
              if (value && value !== '') {
                updateFormData({ mealFrequency: value });
              }
            }}
            className="space-y-3"
          >
            {mealFrequencies.map((freq) => {
              // INSTRUMENT EVERY RADIOGROUP ITEM
              console.log('[EP-DEBUG] Rendering meal frequency item', freq.value);
              // ✅ Ensure freq.value is never empty
              const freqValue = freq.value || '3';
              return (
                <div key={freqValue} className={`flex items-center space-x-3 p-4 rounded-lg glass-button transition-all duration-200 ${
                  safeFormData.mealFrequency === freqValue 
                    ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20 scale-[1.02]' 
                    : 'border border-border hover:border-green-400 hover:bg-muted/50'
                }`}>
                  <RadioGroupItem value={freqValue} id={freqValue} />
                  <Label htmlFor={freqValue} className="flex items-center space-x-3 flex-1 cursor-pointer">
                    <span className="text-xl">{freq.emoji}</span>
                    <span className="text-base">{freq.label}</span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {/* Fasting Schedule */}
        <div>
          <Label className="text-base font-medium mb-4 block">Do you follow intermittent fasting or have specific eating windows?</Label>
          <RadioGroup
            value={safeFormData.fastingSchedule}
            onValueChange={(value: any) => updateFormData({ fastingSchedule: value })}
            className="space-y-3"
          >
            {fastingSchedules.map((schedule) => {
              // INSTRUMENT EVERY RADIOGROUP ITEM
              console.log('[EP-DEBUG] Rendering fasting schedule item', schedule.value);
              // ✅ Ensure schedule.value is never empty
              const scheduleValue = schedule.value || 'none';
              return (
                <div key={scheduleValue} className={`flex items-center space-x-3 p-4 rounded-lg glass-button transition-all duration-200 ${
                  safeFormData.fastingSchedule === scheduleValue 
                    ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20 scale-[1.02]' 
                    : 'border border-border hover:border-green-400 hover:bg-muted/50'
                }`}>
                  <RadioGroupItem value={scheduleValue} id={scheduleValue} />
                  <Label htmlFor={scheduleValue} className="flex items-center space-x-3 flex-1 cursor-pointer">
                    <span className="text-xl">{schedule.emoji}</span>
                    <div>
                      <div className="text-base font-medium">{schedule.label.split(' (')[0]}</div>
                      {schedule.label.includes('(') && (
                        <div className="text-sm text-muted-foreground">
                          {schedule.label.split(' (')[1]?.replace(')', '')}
                        </div>
                      )}
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {/* Eating Window */}
        {safeFormData.fastingSchedule && safeFormData.fastingSchedule !== 'none' && safeFormData.fastingSchedule !== 'alternate_day' && (
          <div>
            <Label htmlFor="eatingWindow" className="text-base font-medium">
              What time do you typically eat? (e.g., "12pm - 8pm" or "6am - 2pm")
            </Label>
            <Input
              id="eatingWindow"
              placeholder="e.g., 12pm - 8pm"
              value={safeFormData.eatingWindow}
              onChange={(e) => updateFormData({ eatingWindow: e.target.value })}
              className="glass-button border-0 mt-2"
            />
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
          onClick={onNext}
          className="flex-1 gradient-primary"
        >
          Next
        </Button>
      </div>
    </div>
  );
};