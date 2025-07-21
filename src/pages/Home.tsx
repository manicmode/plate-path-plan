
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CircularProgress } from '@/components/CircularProgress';
import { NutrientCard } from '@/components/NutrientCard';
import { QuickLogButtonsHome } from '@/components/QuickLogButtonsHome';
import { BentoMealSuggestions } from '@/components/BentoMealSuggestions';
import { WaterProgress } from '@/components/WaterProgress';
import { HomeAIInsights } from '@/components/HomeAIInsights';
import { CaloriesBurnedToday } from '@/components/CaloriesBurnedToday';
import { ExerciseChallenge } from '@/components/ExerciseChallenge';
import { MoodCheck } from '@/components/MoodCheck';
import { useAuth } from '@/contexts/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useRealNutritionData } from '@/hooks/useRealNutritionData';
import { useRealHydrationData } from '@/hooks/useRealHydrationData';
import { useRealSupplementData } from '@/hooks/useRealSupplementData';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';
import { Utensils, Activity, Scale, Target, TrendingUp } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Use the scroll-to-top hook
  useScrollToTop();

  // Real data from Supabase
  const { todayTotal: nutritionToday, loading: nutritionLoading } = useRealNutritionData(1);
  const { todayTotal: hydrationToday, loading: hydrationLoading } = useRealHydrationData(1);
  const { todayTotal: supplementsToday, loading: supplementsLoading } = useRealSupplementData(1);
  const { todayTotal: exerciseToday, loading: exerciseLoading } = useRealExerciseData(1);

  const targetCalories = user?.targetCalories || 2000;
  const targetProtein = user?.targetProtein || 150;
  const targetCarbs = user?.targetCarbs || 250;
  const targetFat = user?.targetFat || 65;

  const caloriesPercentage = Math.min((nutritionToday.calories / targetCalories) * 100, 100);
  const proteinPercentage = Math.min((nutritionToday.protein / targetProtein) * 100, 100);
  const carbsPercentage = Math.min((nutritionToday.carbs / targetCarbs) * 100, 100);
  const fatPercentage = Math.min((nutritionToday.fat / targetFat) * 100, 100);

  if (nutritionLoading || hydrationLoading || supplementsLoading || exerciseLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 pb-8 ${isMobile ? 'px-4' : 'px-6'} pt-6`}>
      {/* Welcome Header */}
      <div className="text-center">
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 dark:text-white`}>
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Let's track your nutrition and wellness today
        </p>
      </div>

      {/* AI Insights */}
      <HomeAIInsights />

      {/* Main Progress Ring */}
      <div className="flex justify-center">
        <CircularProgress 
          percentage={caloriesPercentage}
          current={Math.round(nutritionToday.calories)}
          target={targetCalories}
          title="Calories"
          subtitle="kcal"
        />
      </div>

      {/* Quick Stats Grid */}
      <div className={`grid grid-cols-2 ${isMobile ? 'gap-3' : 'gap-4'}`}>
        <NutrientCard
          title="Protein"
          current={Math.round(nutritionToday.protein)}
          target={targetProtein}
          unit="g"
          percentage={proteinPercentage}
          color="#10B981"
        />
        <NutrientCard
          title="Carbs"
          current={Math.round(nutritionToday.carbs)}
          target={targetCarbs}
          unit="g"
          percentage={carbsPercentage}
          color="#F59E0B"
        />
        <NutrientCard
          title="Fat"
          current={Math.round(nutritionToday.fat)}
          target={targetFat}
          unit="g"
          percentage={fatPercentage}
          color="#8B5CF6"
        />
        <NutrientCard
          title="Steps"
          current={exerciseToday.steps}
          target={10000}
          unit="steps"
          percentage={Math.min((exerciseToday.steps / 10000) * 100, 100)}
          color="#22C55E"
        />
      </div>

      {/* Water Progress */}
      <WaterProgress currentIntake={hydrationToday} />

      {/* Quick Log Buttons */}
      <QuickLogButtonsHome />

      {/* Activity Summary */}
      <Card className="modern-action-card">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Today's Activity</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">Your movement summary</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{exerciseToday.steps}</p>
              <p className="text-xs text-gray-500">Steps</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{Math.round(exerciseToday.calories)}</p>
              <p className="text-xs text-gray-500">Calories</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{exerciseToday.duration}</p>
              <p className="text-xs text-gray-500">Minutes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supplements Today */}
      <Card className="modern-action-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-rose-500 rounded-xl flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Supplements</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Taken today</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-pink-600">{supplementsToday}</p>
              <p className="text-xs text-gray-500">supplements</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mood Check */}
      <MoodCheck />

      {/* Exercise Challenge */}
      <ExerciseChallenge />

      {/* Calories Burned Today */}
      <CaloriesBurnedToday />

      {/* Meal Suggestions */}
      <BentoMealSuggestions />
    </div>
  );
}
