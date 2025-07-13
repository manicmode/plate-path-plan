import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { OnboardingIntro } from './OnboardingIntro';
import { BasicInfoScreen } from './BasicInfoScreen';
import { WeightGoalsScreen } from './WeightGoalsScreen';
import { HealthGoalScreen } from './HealthGoalScreen';
import { ActivityLevelScreen } from './ActivityLevelScreen';
import { ExerciseLifestyleScreen } from './ExerciseLifestyleScreen';
import { HealthConditionsScreen } from './HealthConditionsScreen';
import { DietStyleScreen } from './DietStyleScreen';
import { FoodsToAvoidScreen } from './FoodsToAvoidScreen';
import { AllergiesScreen } from './AllergiesScreen';
import { EatingPatternsScreen } from './EatingPatternsScreen';
import { SupplementsScreen } from './SupplementsScreen';
import { OnboardingComplete } from './OnboardingComplete';
import { calculateNutritionTargets } from '@/utils/nutritionCalculations';

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
  
  // Weight goals
  targetWeight: string;
  weightGoalType: 'lose_weight' | 'gain_weight' | 'maintain_weight' | 'body_recomposition' | '';
  weightGoalTimeline: '3_months' | '6_months' | '1_year' | 'long_term' | '';
  
  // Health info
  mainHealthGoal: 'lose_weight' | 'gain_muscle' | 'maintain_weight' | 'eat_healthier' | 'improve_energy' | 'improve_digestion' | 'other' | '';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | '';
  dailyLifestyle: 'sedentary_job' | 'active_job' | 'very_active_job' | '';
  exerciseFrequency: 'never' | 'rarely' | '1_2_week' | '3_4_week' | '5_6_week' | 'daily' | 'twice_daily' | '';
  exerciseTypes: string[];
  
  healthConditions: string[];
  medications: string[];
  dietStyles: string[];
  foodsToAvoid: string;
  
  // Allergies and restrictions
  foodAllergies: { [key: string]: string }; // allergen: severity
  crossContaminationSensitive: boolean;
  
  // Eating patterns
  mealFrequency: '2' | '3' | '4' | '5' | '6+' | '';
  fastingSchedule: 'none' | '16_8' | '18_6' | '20_4' | 'omad' | 'alternate_day' | '';
  eatingWindow: string;
  
  // Supplements
  currentSupplements: { [key: string]: { dosage: string; frequency: string; } };
  supplementGoals: string[];
  deficiencyConcerns: string[];
}

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

const TOTAL_SCREENS = 12;

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
    targetWeight: '',
    weightGoalType: '',
    weightGoalTimeline: '',
    mainHealthGoal: '',
    activityLevel: '',
    dailyLifestyle: '',
    exerciseFrequency: '',
    exerciseTypes: [],
    healthConditions: [],
    medications: [],
    dietStyles: [],
    foodsToAvoid: '',
    foodAllergies: {},
    crossContaminationSensitive: false,
    mealFrequency: '',
    fastingSchedule: 'none',
    eatingWindow: '',
    currentSupplements: {},
    supplementGoals: [],
    deficiencyConcerns: [],
  });

  const updateFormData = (updates: Partial<OnboardingData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Scroll to top when screen changes
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, [currentScreen]);

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
    console.log('Starting onboarding completion process...');

    try {
      // Calculate nutrition targets if we have enough data
      let nutritionTargets = null;
      if (formData.weight && formData.age && formData.gender && formData.activityLevel) {
        const weight = parseFloat(formData.weight);
        const height = formData.heightUnit === 'cm' 
          ? parseInt(formData.heightCm) 
          : (parseInt(formData.heightFeet) * 30.48) + (parseInt(formData.heightInches) * 2.54);
        const age = parseInt(formData.age);

        if (weight && height && age) {
          nutritionTargets = calculateNutritionTargets({
            weight,
            height,
            age,
            gender: formData.gender,
            activityLevel: formData.activityLevel,
            weightGoalType: formData.weightGoalType,
            weightGoalTimeline: formData.weightGoalTimeline,
            healthConditions: formData.healthConditions,
            dietStyles: formData.dietStyles,
            dailyLifestyle: formData.dailyLifestyle,
            exerciseFrequency: formData.exerciseFrequency,
          });
          console.log('Calculated nutrition targets:', nutritionTargets);
        }
      }

      const profileData = {
        user_id: user.id,
        // Basic info
        age: formData.age ? parseInt(formData.age) : null,
        height_unit: formData.heightUnit,
        height_feet: formData.heightUnit === 'ft' && formData.heightFeet ? parseInt(formData.heightFeet) : null,
        height_inches: formData.heightUnit === 'ft' && formData.heightInches ? parseInt(formData.heightInches) : null,
        height_cm: formData.heightUnit === 'cm' && formData.heightCm ? parseInt(formData.heightCm) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        weight_unit: formData.weightUnit,
        gender: formData.gender || null,
        
        // Weight goals
        target_weight: formData.targetWeight ? parseFloat(formData.targetWeight) : null,
        weight_goal_type: formData.weightGoalType || null,
        weight_goal_timeline: formData.weightGoalTimeline || null,
        
        // Activity and exercise
        main_health_goal: formData.mainHealthGoal || null,
        activity_level: formData.activityLevel || null,
        daily_lifestyle: formData.dailyLifestyle || null,
        exercise_frequency: formData.exerciseFrequency || null,
        exercise_types: formData.exerciseTypes.length > 0 ? formData.exerciseTypes : null,
        
        // Health
        health_conditions: formData.healthConditions.length > 0 ? formData.healthConditions : null,
        medications: formData.medications.length > 0 ? formData.medications : null,
        diet_styles: formData.dietStyles.length > 0 ? formData.dietStyles : null,
        foods_to_avoid: formData.foodsToAvoid || null,
        
        // Allergies
        food_allergies: Object.keys(formData.foodAllergies).length > 0 ? formData.foodAllergies : null,
        cross_contamination_sensitivity: formData.crossContaminationSensitive,
        
        // Eating patterns
        meal_frequency: formData.mealFrequency ? parseInt(formData.mealFrequency.replace('+', '')) : null,
        fasting_schedule: formData.fastingSchedule !== 'none' ? formData.fastingSchedule : null,
        eating_window: formData.eatingWindow || null,
        
        // Supplements
        current_supplements: Object.keys(formData.currentSupplements).length > 0 ? formData.currentSupplements : null,
        supplement_goals: formData.supplementGoals.length > 0 ? formData.supplementGoals : null,
        deficiency_concerns: formData.deficiencyConcerns.length > 0 ? formData.deficiencyConcerns : null,
        
        // Calculated targets (from nutrition calculations)
        calculated_bmr: nutritionTargets?.bmr || null,
        calculated_tdee: nutritionTargets?.tdee || null,
        target_calories: nutritionTargets?.calories || null,
        target_protein: nutritionTargets?.protein || null,
        target_carbs: nutritionTargets?.carbs || null,
        target_fat: nutritionTargets?.fat || null,
        target_fiber: nutritionTargets?.fiber || null,
        priority_micronutrients: nutritionTargets?.priorityMicronutrients || null,
        
        // Completion status
        onboarding_completed: true,
        onboarding_skipped: false,
        show_onboarding_reminder: false,
        profile_completion_percentage: 100,
        completed_sections: ['basic_info', 'goals', 'activity', 'health', 'diet', 'allergies', 'eating_patterns', 'supplements'],
        last_profile_update: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Saving profile data to database...');
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(profileData, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Database error saving profile:', error);
        toast.error('Failed to save your information. Please try again.');
        return;
      }

      console.log('🧩 OnboardingFlow: Profile saved successfully:', data);
      
      toast.success('Welcome to NutriCoach! Your personalized profile is ready with custom nutrition targets.');
      
      console.log('🧩 OnboardingFlow: Calling onComplete callback...');
      onComplete();
      
    } catch (error: any) {
      console.error('Error during onboarding completion:', error);
      toast.error('Something went wrong during setup. Please try again.');
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
          <WeightGoalsScreen 
            formData={formData} 
            updateFormData={updateFormData}
            onNext={nextScreen}
            onSkip={skipScreen}
          />
        );
      case 3:
        return (
          <HealthGoalScreen 
            formData={formData} 
            updateFormData={updateFormData}
            onNext={nextScreen}
            onSkip={skipScreen}
          />
        );
      case 4:
        return (
          <ActivityLevelScreen 
            formData={formData} 
            updateFormData={updateFormData}
            onNext={nextScreen}
            onSkip={skipScreen}
          />
        );
      case 5:
        return (
          <ExerciseLifestyleScreen 
            formData={formData} 
            updateFormData={updateFormData}
            onNext={nextScreen}
            onSkip={skipScreen}
          />
        );
      case 6:
        return (
          <HealthConditionsScreen 
            formData={formData} 
            updateFormData={updateFormData}
            onNext={nextScreen}
            onSkip={skipScreen}
          />
        );
      case 7:
        return (
          <DietStyleScreen 
            formData={formData} 
            updateFormData={updateFormData}
            onNext={nextScreen}
            onSkip={skipScreen}
          />
        );
      case 8:
        return (
          <AllergiesScreen 
            formData={formData} 
            updateFormData={updateFormData}
            onNext={nextScreen}
            onSkip={skipScreen}
          />
        );
      case 9:
        return (
          <EatingPatternsScreen 
            formData={formData} 
            updateFormData={updateFormData}
            onNext={nextScreen}
            onSkip={skipScreen}
          />
        );
      case 10:
        return (
          <SupplementsScreen 
            formData={formData} 
            updateFormData={updateFormData}
            onNext={nextScreen}
            onSkip={skipScreen}
          />
        );
      case 11:
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
