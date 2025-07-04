
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sparkles, User, Scale, Ruler } from 'lucide-react';

interface OnboardingData {
  age: string;
  heightUnit: 'ft' | 'cm';
  heightFeet: string;
  heightInches: string;
  heightCm: string;
  weight: string;
  weightUnit: 'lb' | 'kg';
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | '';
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<OnboardingData>({
    age: '',
    heightUnit: 'ft',
    heightFeet: '',
    heightInches: '',
    heightCm: '',
    weight: '',
    weightUnit: 'lb',
    gender: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('User not found. Please try logging in again.');
      return;
    }

    // Validation
    if (!formData.age || !formData.weight || !formData.gender) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (formData.heightUnit === 'ft' && (!formData.heightFeet || !formData.heightInches)) {
      toast.error('Please enter your height in feet and inches.');
      return;
    }

    if (formData.heightUnit === 'cm' && !formData.heightCm) {
      toast.error('Please enter your height in centimeters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const profileData = {
        user_id: user.id,
        age: parseInt(formData.age),
        height_unit: formData.heightUnit,
        height_feet: formData.heightUnit === 'ft' ? parseInt(formData.heightFeet) : null,
        height_inches: formData.heightUnit === 'ft' ? parseInt(formData.heightInches) : null,
        height_cm: formData.heightUnit === 'cm' ? parseInt(formData.heightCm) : null,
        weight: parseFloat(formData.weight),
        weight_unit: formData.weightUnit,
        gender: formData.gender,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData);

      if (error) {
        console.error('Error saving profile:', error);
        toast.error('Failed to save your information. Please try again.');
        return;
      }

      toast.success('Welcome to NutriCoach! Your profile has been set up successfully.');
      onComplete();
    } catch (error) {
      console.error('Error during onboarding:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (updates: Partial<OnboardingData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className={`w-full max-w-2xl glass-card border-0 rounded-3xl ${isMobile ? 'mx-4' : ''}`}>
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent`}>
            Welcome to NutriCoach!
          </CardTitle>
          <p className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-sm' : 'text-base'} mt-2`}>
            Let's personalize your experience with some quick details
          </p>
        </CardHeader>

        <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Age */}
            <div className="space-y-2">
              <Label htmlFor="age" className="flex items-center space-x-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Age *</span>
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
                required
              />
            </div>

            {/* Height */}
            <div className="space-y-4">
              <Label className="flex items-center space-x-2">
                <Ruler className="w-4 h-4 text-emerald-600" />
                <span>Height *</span>
              </Label>
              
              <RadioGroup
                value={formData.heightUnit}
                onValueChange={(value: 'ft' | 'cm') => updateFormData({ heightUnit: value })}
                className="flex space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ft" id="ft" />
                  <Label htmlFor="ft">Feet & Inches</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cm" id="cm" />
                  <Label htmlFor="cm">Centimeters</Label>
                </div>
              </RadioGroup>

              {formData.heightUnit === 'ft' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="feet">Feet</Label>
                    <Select value={formData.heightFeet} onValueChange={(value) => updateFormData({ heightFeet: value })}>
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
                    <Select value={formData.heightInches} onValueChange={(value) => updateFormData({ heightInches: value })}>
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
                <span>Weight *</span>
              </Label>
              
              <div className="flex space-x-4">
                <Input
                  type="number"
                  placeholder={`Enter weight in ${formData.weightUnit}`}
                  value={formData.weight}
                  onChange={(e) => updateFormData({ weight: e.target.value })}
                  className="glass-button border-0 flex-1"
                  min="50"
                  max="500"
                  step="0.1"
                  required
                />
                <Select value={formData.weightUnit} onValueChange={(value: 'lb' | 'kg') => updateFormData({ weightUnit: value })}>
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

            {/* Gender */}
            <div className="space-y-3">
              <Label>Gender *</Label>
              <RadioGroup
                value={formData.gender}
                onValueChange={(value: 'male' | 'female' | 'other' | 'prefer_not_to_say') => updateFormData({ gender: value })}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">Female</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other">Other</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="prefer_not_to_say" id="prefer_not_to_say" />
                  <Label htmlFor="prefer_not_to_say">Prefer not to say</Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className={`w-full gradient-primary ${isMobile ? 'h-12' : 'h-14'} text-lg font-semibold`}
            >
              {isSubmitting ? 'Setting up your profile...' : 'Complete Setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
