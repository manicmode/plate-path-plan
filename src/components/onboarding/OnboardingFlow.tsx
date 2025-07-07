import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { OnboardingIntro } from './OnboardingIntro';
import { BasicInfoScreen } from './BasicInfoScreen';
import { HealthGoalScreen } from './HealthGoalScreen';
import { ActivityLevelScreen } from './ActivityLevelScreen';
import { HealthConditionsScreen } from './HealthConditionsScreen';
import { DietStyleScreen } from './DietStyleScreen';
import { FoodsToAvoidScreen } from './FoodsToAvoidScreen';
import { OnboardingComplete } from './OnboardingComplete';

export interface OnboardingData {
  // Basic info
  age: string;
  gender: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | '';
  heightUnit: 'ft' | 'cm';
  heightFeet: string;
  heightInches: string;
  heightCm: string;
  weight: string;
  weightUnit: 'lb' | 'kg';
  // Health info
  mainHealthGoal: 'lose_weight' | 'gain_muscle' | 'maintain_weight' | 'eat_healthier' | 'improve_energy' | 'improve_digestion' | 'other' | '';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | '';
  healthConditions: string[];
  dietStyles: string[];
  foodsToAvoid: string;
}

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

const TOTAL_SCREENS = 8;

export const OnboardingFlow = ({ onComplete, onSkip }: OnboardingFlowProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [currentScreen, setCurrentScreen] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<OnboardingData>({
    age: '',
    gender: '',
    heightUnit: 'ft',
    heightFeet: '',
    heightInches: '',
    heightCm: '',
    weight: '',
    weightUnit: 'lb',
    mainHealthGoal: '',
    activityLevel: '',
    healthConditions: [],
    dietStyles: [],
    foodsToAvoid: '',
  });

  const updateFormData = (updates: Partial<OnboardingData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const nextScreen = () => {
    if (currentScreen < TOTAL_SCREENS - 1) {
      setCurrentScreen(currentScreen + 1);
    }
  };

  const prevScreen = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
    }
  };

  const skipScreen = () => {
    nextScreen();
  };

  const handleComplete = async () => {
    if (!user) {
      toast.error('User not found. Please try logging in again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const profileData = {
        user_id: user.id,
        // Basic info (keep existing logic from OnboardingScreen)
        age: formData.age ? parseInt(formData.age) : null,
        height_unit: formData.heightUnit,
        height_feet: formData.heightUnit === 'ft' && formData.heightFeet ? parseInt(formData.heightFeet) : null,
        height_inches: formData.heightUnit === 'ft' && formData.heightInches ? parseInt(formData.heightInches) : null,
        height_cm: formData.heightUnit === 'cm' && formData.heightCm ? parseInt(formData.heightCm) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        weight_unit: formData.weightUnit,
        gender: formData.gender || null,
        // New health info
        main_health_goal: formData.mainHealthGoal || null,
        activity_level: formData.activityLevel || null,
        health_conditions: formData.healthConditions.length > 0 ? formData.healthConditions : null,
        diet_styles: formData.dietStyles.length > 0 ? formData.dietStyles : null,
        foods_to_avoid: formData.foodsToAvoid || null,
        onboarding_completed: true,
        onboarding_skipped: false,
        show_onboarding_reminder: false,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving profile:', error);
        toast.error('Failed to save your information. Please try again.');
        return;
      }

      toast.success('Welcome to NutriCoach! Your profile has been set up successfully.');
      onComplete();
    } catch (error: any) {
      console.error('Error during onboarding:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipAll = async () => {
    if (!user) {
      toast.error('User not found. Please try logging in again.');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          onboarding_completed: false,
          onboarding_skipped: true,
          show_onboarding_reminder: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to skip onboarding. Please try again.');
        return;
      }

      toast.success('Onboarding skipped. You can complete it anytime from your profile.');
      onSkip();
    } catch (error: any) {
      console.error('Error skipping onboarding:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  const progress = ((currentScreen + 1) / TOTAL_SCREENS) * 100;

  const renderScreen = () => {
    switch (currentScreen) {
      case 0:
        return <OnboardingIntro onStart={nextScreen} onSkip={handleSkipAll} />;
      case 1:
        return (
          <BasicInfoScreen 
            formData={formData} 
            updateFormData={updateFormData}
            onNext={nextScreen}
            onSkip={skipScreen}
          />
        );
      case 2:
        return (
          <HealthGoalScreen 
            formData={formData} 
            updateFormData={updateFormData}
            onNext={nextScreen}
            onSkip={skipScreen}
          />
        );
      case 3:
        return (
          <ActivityLevelScreen 
            formData={formData} 
            updateFormData={updateFormData}
            onNext={nextScreen}
            onSkip={skipScreen}
          />
        );
      case 4:
        return (
          <HealthConditionsScreen 
            formData={formData} 
            updateFormData={updateFormData}
            onNext={nextScreen}
            onSkip={skipScreen}
          />
        );
      case 5:
        return (
          <DietStyleScreen 
            formData={formData} 
            updateFormData={updateFormData}
            onNext={nextScreen}
            onSkip={skipScreen}
          />
        );
      case 6:
        return (
          <FoodsToAvoidScreen 
            formData={formData} 
            updateFormData={updateFormData}
            onNext={nextScreen}
            onSkip={skipScreen}
          />
        );
      case 7:
        return <OnboardingComplete onComplete={handleComplete} isSubmitting={isSubmitting} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className={`w-full max-w-2xl glass-card border-0 rounded-3xl ${isMobile ? 'mx-4' : ''}`}>
        {currentScreen > 0 && currentScreen < TOTAL_SCREENS - 1 && (
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevScreen}
                className="p-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {currentScreen} of {TOTAL_SCREENS - 2}
              </div>
              <div className="w-8" />
            </div>
            <Progress value={progress} className="h-2 mb-6" />
          </div>
        )}
        <CardContent className={`${currentScreen > 0 && currentScreen < TOTAL_SCREENS - 1 ? 'pt-0' : 'p-6'}`}>
          {renderScreen()}
        </CardContent>
      </Card>
    </div>
  );
};
