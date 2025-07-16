import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target } from 'lucide-react';
import { OnboardingData } from './OnboardingFlow';
import { toast } from 'sonner';

interface WeightGoalsScreenProps {
  formData: OnboardingData;
  updateFormData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip: () => void;
}

const weightGoalTypes = [
  { value: 'lose_weight', label: 'Lose weight', emoji: '📉' },
  { value: 'gain_weight', label: 'Gain weight', emoji: '📈' },
  { value: 'maintain_weight', label: 'Maintain current weight', emoji: '⚖️' },
  { value: 'body_recomposition', label: 'Body recomposition (gain muscle, lose fat)', emoji: '🔄' },
];

const timelines = [
  { value: '3_months', label: '3 months' },
  { value: '6_months', label: '6 months' },
  { value: '1_year', label: '1 year' },
  { value: 'long_term', label: 'Long-term (1+ years)' },
];

export const WeightGoalsScreen = ({ formData, updateFormData, onNext, onSkip }: WeightGoalsScreenProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          What are your weight goals?
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          This helps us calculate your calorie and macro targets accurately
        </p>
      </div>

      <div className="space-y-6">
        {/* Weight Goal Type */}
        <div>
          <Label className="text-base font-medium mb-4 block">What's your primary goal?</Label>
          <RadioGroup
            value={formData.weightGoalType}
            onValueChange={(value: any) => updateFormData({ weightGoalType: value })}
            className="space-y-3"
          >
            {weightGoalTypes.map((goal) => (
              <div 
                key={goal.value} 
                className={`flex items-center space-x-3 p-4 rounded-lg glass-button transition-colors cursor-pointer ${
                  formData.weightGoalType === goal.value 
                    ? 'border-2 border-emerald-500 bg-emerald-100 dark:bg-emerald-900/20' 
                    : 'border border-border'
                }`}
                onClick={() => updateFormData({ weightGoalType: goal.value as any })}
              >
                <RadioGroupItem value={goal.value} id={goal.value} />
                <Label htmlFor={goal.value} className="flex items-center space-x-3 flex-1 cursor-pointer pointer-events-none">
                  <span className="text-xl">{goal.emoji}</span>
                  <span className="text-base">{goal.label}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Target Weight */}
        {formData.weightGoalType && formData.weightGoalType !== 'maintain_weight' && (
          <div>
            <Label htmlFor="targetWeight" className="text-base font-medium">
              Target weight ({formData.weightUnit})
            </Label>
            <Input
              id="targetWeight"
              type="number"
              placeholder={`Enter target weight in ${formData.weightUnit}`}
              value={formData.targetWeight}
              onChange={(e) => updateFormData({ targetWeight: e.target.value })}
              className={`glass-button border-0 mt-2 ${
                (!formData.targetWeight || parseFloat(formData.targetWeight) <= 0)
                  ? 'ring-2 ring-red-500 ring-opacity-50' 
                  : ''
              }`}
              min="50"
              max="500"
              step="0.1"
            />
          </div>
        )}

        {/* Timeline */}
        {formData.weightGoalType && formData.weightGoalType !== 'maintain_weight' && (
          <div>
            <Label className="text-base font-medium">What's your timeline?</Label>
            <Select 
              value={formData.weightGoalTimeline} 
              onValueChange={(value: any) => updateFormData({ weightGoalTimeline: value })}
            >
              <SelectTrigger className={`glass-button border-0 mt-2 ${
                !formData.weightGoalTimeline
                  ? 'ring-2 ring-red-500 ring-opacity-50' 
                  : ''
              }`}>
                <SelectValue placeholder="Select timeline" />
              </SelectTrigger>
              <SelectContent>
                {timelines.map((timeline) => (
                  <SelectItem key={timeline.value} value={timeline.value}>
                    {timeline.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
    if (!formData.weightGoalType) {
      toast.error("Please complete all required fields before continuing.");
      return;
    }

    if (formData.weightGoalType !== 'maintain_weight') {
      if (
        !formData.targetWeight ||
        parseFloat(formData.targetWeight) <= 0 ||
        !formData.weightGoalTimeline
      ) {
        toast.error("Please complete all required fields before continuing.");
        return;
      }
    }

    console.log("✅ WeightGoalsScreen validation passed");
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