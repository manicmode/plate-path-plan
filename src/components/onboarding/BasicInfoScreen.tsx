
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { User, Ruler, Scale } from 'lucide-react';
import { OnboardingData } from './OnboardingFlow';

interface BasicInfoScreenProps {
  formData: OnboardingData;
  updateFormData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip: () => void;
}

export const BasicInfoScreen = ({ formData, updateFormData, onNext, onSkip }: BasicInfoScreenProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Let's get some basic details
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Help us understand you better (all optional)
        </p>
      </div>

      <div className="space-y-6">
        {/* Age */}
        <div className="space-y-2">
          <Label htmlFor="age" className="flex items-center space-x-2">
            <User className="w-4 h-4 text-emerald-600" />
            <span>Age</span>
          </Label>
          <Input
            id="age"
            type="number"
            placeholder="Enter your age"
            value={formData.age}
            onChange={(e) => updateFormData({ age: e.target.value })}
            className="glass-button border-0"
            min="13"
            max="120"
          />
        </div>

        {/* Gender */}
        <div className="space-y-3">
          <Label>Gender</Label>
          <RadioGroup
            value={formData.gender}
            onValueChange={(value: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say') => updateFormData({ gender: value })}
            className="grid grid-cols-2 gap-4"
          >
            <div className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${
              formData.gender === 'male' 
                ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-500' 
                : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
            }`}>
              <RadioGroupItem value="male" id="male" />
              <Label htmlFor="male">Male</Label>
            </div>
            <div className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${
              formData.gender === 'female' 
                ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-500' 
                : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
            }`}>
              <RadioGroupItem value="female" id="female" />
              <Label htmlFor="female">Female</Label>
            </div>
            <div className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${
              formData.gender === 'non_binary' 
                ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-500' 
                : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
            }`}>
              <RadioGroupItem value="non_binary" id="non_binary" />
              <Label htmlFor="non_binary">Non-binary</Label>
            </div>
            <div className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${
              formData.gender === 'prefer_not_to_say' 
                ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-500' 
                : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
            }`}>
              <RadioGroupItem value="prefer_not_to_say" id="prefer_not_to_say" />
              <Label htmlFor="prefer_not_to_say">Prefer not to say</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Height */}
        <div className="space-y-4">
          <Label className="flex items-center space-x-2">
            <Ruler className="w-4 h-4 text-emerald-600" />
            <span>Height</span>
          </Label>
          
          <RadioGroup
            value={formData.heightUnit}
            onValueChange={(value: 'ft' | 'cm') => updateFormData({ heightUnit: value })}
            className="flex space-x-6"
          >
            <div className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${
              formData.heightUnit === 'ft' 
                ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-500' 
                : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
            }`}>
              <RadioGroupItem value="ft" id="ft" />
              <Label htmlFor="ft">Feet & Inches</Label>
            </div>
            <div className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${
              formData.heightUnit === 'cm' 
                ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-500' 
                : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
            }`}>
              <RadioGroupItem value="cm" id="cm" />
              <Label htmlFor="cm">Centimeters</Label>
            </div>
          </RadioGroup>

          {formData.heightUnit === 'ft' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="feet">Feet</Label>
                <Select 
                  value={formData.heightFeet} 
                  onValueChange={(value) => updateFormData({ heightFeet: value })}
                >
                  <SelectTrigger className="glass-button border-0">
                    <SelectValue placeholder="Feet" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => i + 3).map(foot => (
                      <SelectItem key={foot} value={foot.toString()}>{foot} ft</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="inches">Inches</Label>
                <Select 
                  value={formData.heightInches} 
                  onValueChange={(value) => updateFormData({ heightInches: value })}
                >
                  <SelectTrigger className="glass-button border-0">
                    <SelectValue placeholder="Inches" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i).map(inch => (
                      <SelectItem key={inch} value={inch.toString()}>{inch} in</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <Input
              type="number"
              placeholder="Enter height in cm"
              value={formData.heightCm}
              onChange={(e) => updateFormData({ heightCm: e.target.value })}
              className="glass-button border-0"
              min="100"
              max="250"
            />
          )}
        </div>

        {/* Weight */}
        <div className="space-y-4">
          <Label className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-emerald-600" />
            <span>Weight</span>
          </Label>
          
          <div className="flex space-x-4">
            <Input
              type="number"
              placeholder={`Weight in ${formData.weightUnit}`}
              value={formData.weight}
              onChange={(e) => updateFormData({ weight: e.target.value })}
              className="glass-button border-0 flex-1"
              min="50"
              max="500"
              step="0.1"
            />
            <Select 
              value={formData.weightUnit} 
              onValueChange={(value: 'lb' | 'kg') => updateFormData({ weightUnit: value })}
            >
              <SelectTrigger className="glass-button border-0 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lb">lb</SelectItem>
                <SelectItem value="kg">kg</SelectItem>
              </SelectContent>
            </Select>
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
