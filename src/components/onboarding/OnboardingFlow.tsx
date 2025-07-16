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
  mealFrequency: '2' | '3' | '4' | '5' | '6+';
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

const TOTAL_SCREENS = 13;

export const OnboardingFlow = ({ onComplete, onSkip }: OnboardingFlowProps) => {
  const { user, refreshUser } = useAuth();
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
    mealFrequency: '3', // ✅ Default to '3' to prevent empty string error
    fastingSchedule: 'none',
    eatingWindow: '',
    currentSupplements: {},
    supplementGoals: [],
    deficiencyConcerns: [],
  });

  const updateFormData = (updates: Partial<OnboardingData>) => {
    try {
      console.log('📝 UpdateFormData called with:', updates);
      setFormData(prev => {
        const newData = { 
          ...prev, 
          ...updates,
          // Ensure critical fields always have defaults
          foodAllergies: { ...(prev.foodAllergies || {}), ...(updates.foodAllergies || {}) },
          crossContaminationSensitive: updates.crossContaminationSensitive ?? prev.crossContaminationSensitive ?? false,
          mealFrequency: (updates.mealFrequency ?? prev.mealFrequency ?? '3') as OnboardingData['mealFrequency'],
          fastingSchedule: updates.fastingSchedule ?? prev.fastingSchedule ?? 'none',
          eatingWindow: updates.eatingWindow ?? prev.eatingWindow ?? ''
        };
        console.log('📝 Form data updated:', newData);
        return newData;
      });
    } catch (error) {
      console.error('❌ Error updating form data:', error);
      toast.error('Failed to update form data');
    }
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
    try {
      console.log(`🚀 NAVIGATION: Moving from screen ${currentScreen} to ${currentScreen + 1}`);
      console.log(`📊 FORM DATA AT TRANSITION:`, JSON.stringify(formData, null, 2));
      console.log(`🎯 TOTAL_SCREENS: ${TOTAL_SCREENS}`);
      
      if (currentScreen < TOTAL_SCREENS - 1) {
        const newScreen = currentScreen + 1;
        console.log(`✅ SETTING SCREEN: ${newScreen}`);
        setCurrentScreen(newScreen);
        console.log(`✅ SCREEN SET SUCCESSFULLY: ${newScreen}`);
      } else {
        console.warn(`❌ Cannot navigate beyond screen ${currentScreen}. Max screen: ${TOTAL_SCREENS - 1}`);
        toast.error('Navigation error: Cannot proceed beyond last screen');
      }
    } catch (error) {
      console.error('❌ CRITICAL ERROR in nextScreen:', error);
      toast.error('Navigation error occurred');
    }
  };

  const prevScreen = () => {
    try {
      console.log(`Navigating from screen ${currentScreen} to ${currentScreen - 1}`);
      
      if (currentScreen > 0) {
        setCurrentScreen(prev => {
          const newScreen = prev - 1;
          console.log(`Screen updated from ${prev} to ${newScreen}`);
          return newScreen;
        });
      } else {
        console.warn(`Cannot navigate below screen 0. Current screen: ${currentScreen}`);
      }
    } catch (error) {
      console.error('Error in prevScreen:', error);
      toast.error('Navigation error occurred');
    }
  };

  const skipScreen = () => {
    try {
      console.log(`Skipping screen ${currentScreen}`);
      nextScreen();
    } catch (error) {
      console.error('Error in skipScreen:', error);
      toast.error('Skip navigation error occurred');
    }
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
      
      // Await the Supabase update and handle it properly
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
        throw error;
      }

      console.log('[DEBUG] OnboardingFlow: Profile saved successfully:', data);
      console.log('[DEBUG] OnboardingFlow: Refreshing user profile...');
      window.location.href = '/';
      // Update localStorage immediately to prevent re-rendering onboarding
      const cacheKey = `onboarding_complete_${user.id}`;
      localStorage.setItem(cacheKey, 'true');
      console.log('[DEBUG] OnboardingFlow: Updated localStorage cache');
      
      // Refresh the user profile to get the latest data
      await refreshUser();
      console.log('[DEBUG] OnboardingFlow: User profile refreshed, calling onComplete...');
      
      toast.success('Welcome to NutriCoach! Your personalized profile is ready with custom nutrition targets.');
      
      // Only call onComplete after successful database update and user refresh
      onComplete();
      
    } catch (error: any) {
      console.error('Error during onboarding completion:', error);
      // Remove localStorage cache on error
      const cacheKey = `onboarding_complete_${user.id}`;
      localStorage.removeItem(cacheKey);
      toast.error('Something went wrong during setup. Please try again.');
      throw error;
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
    try {
      console.log(`🎬 RENDERING SCREEN ${currentScreen}/${TOTAL_SCREENS - 1}`);
      console.log(`📊 CURRENT FORM DATA:`, JSON.stringify(formData, null, 2));

      // Add bounds checking
      if (currentScreen < 0 || currentScreen >= TOTAL_SCREENS) {
        console.error(`❌ INVALID SCREEN INDEX: ${currentScreen}. Valid range: 0-${TOTAL_SCREENS - 1}`);
        toast.error('Navigation error: Invalid screen');
        return (
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Navigation Error</h3>
            <p className="text-gray-600 mb-4">Screen {currentScreen} is out of range.</p>
            <Button onClick={() => setCurrentScreen(0)}>Return to Start</Button>
          </div>
        );
      }
      
      // Ensure formData is properly structured before rendering any screen
      const safeFormData = {
        ...formData,
        foodAllergies: formData.foodAllergies || {},
        crossContaminationSensitive: formData.crossContaminationSensitive ?? false,
        mealFrequency: (formData.mealFrequency || '3') as OnboardingData['mealFrequency'], // ✅ Default to '3' instead of empty string
        fastingSchedule: formData.fastingSchedule || 'none',
        eatingWindow: formData.eatingWindow || '',
        currentSupplements: formData.currentSupplements || {},
        supplementGoals: formData.supplementGoals || [],
        deficiencyConcerns: formData.deficiencyConcerns || []
      };
      
      console.log(`🔧 SAFE FORM DATA:`, JSON.stringify(safeFormData, null, 2));

      switch (currentScreen) {
        case 0:
          return <OnboardingIntro onStart={nextScreen} onSkip={handleSkipAll} />;
        case 1:
          console.log('🎬 Rendering BasicInfoScreen');
          return (
            <BasicInfoScreen 
              formData={safeFormData} 
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
            <FoodsToAvoidScreen 
              formData={formData} 
              updateFormData={updateFormData}
              onNext={nextScreen}
              onSkip={skipScreen}
            />
          );
        case 9:
          console.log('🎬 ABOUT TO RENDER AllergiesScreen');
          console.log('🔍 AllergiesScreen props check:', {
            formData: safeFormData,
            foodAllergies: safeFormData.foodAllergies,
            crossContaminationSensitive: safeFormData.crossContaminationSensitive,
            updateFormData: typeof updateFormData,
            onNext: typeof nextScreen,
            onSkip: typeof skipScreen
          });
          
          // Extra validation before rendering
          if (!safeFormData) {
            console.error('❌ safeFormData is null in case 9');
            return (
              <div className="text-center p-8">
                <h3 className="text-lg font-semibold text-red-600 mb-2">Data Error</h3>
                <p className="text-gray-600 mb-4">Form data is missing</p>
                <Button onClick={prevScreen} variant="outline">Go Back</Button>
              </div>
            );
          }
          
          if (!updateFormData || typeof updateFormData !== 'function') {
            console.error('❌ updateFormData is not a function in case 9');
            return (
              <div className="text-center p-8">
                <h3 className="text-lg font-semibold text-red-600 mb-2">Function Error</h3>
                <p className="text-gray-600 mb-4">Update function is missing</p>
                <Button onClick={prevScreen} variant="outline">Go Back</Button>
              </div>
            );
          }
          
          try {
            console.log('🔄 Creating AllergiesScreen component...');
            const allergiesScreenComponent = (
              <AllergiesScreen 
                formData={safeFormData} 
                updateFormData={updateFormData}
                onNext={nextScreen}
                onSkip={skipScreen}
              />
            );
            console.log('✅ AllergiesScreen component created successfully');
            return allergiesScreenComponent;
          } catch (error) {
            console.error('❌ CRITICAL ERROR rendering AllergiesScreen:', error);
            console.error('❌ Error stack:', error?.stack);
            console.error('❌ Error name:', error?.name);
            console.error('❌ Error message:', error?.message);
            toast.error('Failed to load allergies screen');
            return (
              <div className="text-center p-8">
                <h3 className="text-lg font-semibold text-red-600 mb-2">Screen Loading Error</h3>
                <p className="text-gray-600 mb-4">Failed to load allergies screen: {error?.message || 'Unknown error'}</p>
                <div className="space-x-2">
                  <Button onClick={prevScreen} variant="outline">Go Back</Button>
                  <Button onClick={skipScreen}>Skip This Screen</Button>
                </div>
              </div>
            );
          }
        case 10:
          console.log('🎬 ABOUT TO RENDER EatingPatternsScreen');
          console.log('🔍 EatingPatternsScreen props check:', {
            formData: safeFormData,
            mealFrequency: safeFormData.mealFrequency,
            fastingSchedule: safeFormData.fastingSchedule,
            eatingWindow: safeFormData.eatingWindow,
            updateFormData: typeof updateFormData,
            onNext: typeof nextScreen,
            onSkip: typeof skipScreen
          });
          
          try {
            const eatingPatternsComponent = (
              <EatingPatternsScreen 
                formData={safeFormData} 
                updateFormData={updateFormData}
                onNext={nextScreen}
                onSkip={skipScreen}
              />
            );
            console.log('✅ EatingPatternsScreen component created successfully');
            return eatingPatternsComponent;
          } catch (error) {
            console.error('❌ CRITICAL ERROR rendering EatingPatternsScreen:', error);
            console.error('❌ Error stack:', error.stack);
            toast.error('Failed to load eating patterns screen');
            return (
              <div className="text-center p-8">
                <h3 className="text-lg font-semibold text-red-600 mb-2">Screen Loading Error</h3>
                <p className="text-gray-600 mb-4">Failed to load eating patterns screen: {error?.message || 'Unknown error'}</p>
                <div className="space-x-2">
                  <Button onClick={prevScreen} variant="outline">Go Back</Button>
                  <Button onClick={skipScreen}>Skip This Screen</Button>
                </div>
              </div>
            );
          }
        case 11:
          console.log('🎬 Rendering SupplementsScreen');
          return (
            <SupplementsScreen 
              formData={safeFormData} 
              updateFormData={updateFormData}
              onNext={nextScreen}
              onSkip={skipScreen}
            />
          );
        case 12:
          return <OnboardingComplete 
            onComplete={handleComplete} 
            isSubmitting={isSubmitting} 
            formData={{
              age: formData.age,
              gender: formData.gender,
              weight: formData.weight,
              mainHealthGoal: formData.mainHealthGoal,
              activityLevel: formData.activityLevel
            }}
          />;
        default:
          console.error(`Unhandled screen case: ${currentScreen}`);
          return (
            <div className="text-center p-8">
              <h3 className="text-lg font-semibold text-red-600 mb-2">Screen Not Found</h3>
              <p className="text-gray-600 mb-4">Screen {currentScreen} is not implemented.</p>
              <Button onClick={() => setCurrentScreen(0)}>Return to Start</Button>
            </div>
          );
      }
    } catch (error) {
      console.error('Error rendering screen:', error);
      toast.error('Failed to render screen');
      return (
        <div className="text-center p-8">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Rendering Error</h3>
          <p className="text-gray-600 mb-4">An error occurred while loading this screen.</p>
          <Button onClick={() => setCurrentScreen(0)}>Return to Start</Button>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
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
