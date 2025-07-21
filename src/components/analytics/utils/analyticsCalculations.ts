
import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth';
import { useRealNutritionData } from '@/hooks/useRealNutritionData';
import { useRealHydrationData } from '@/hooks/useRealHydrationData';
import { useRealSupplementData } from '@/hooks/useRealSupplementData';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';

export const useAnalyticsCalculations = () => {
  const { user } = useAuth();
  const { todayTotal: nutritionToday, data: nutritionWeekly } = useRealNutritionData(7);
  const { todayTotal: hydrationToday, data: hydrationWeekly } = useRealHydrationData(7);
  const { todayTotal: supplementsToday, data: supplementsWeekly } = useRealSupplementData(7);
  const { todayTotal: exerciseToday, data: exerciseWeekly } = useRealExerciseData(7);

  // Real progress data from today's totals
  const progress = useMemo(() => ({
    calories: nutritionToday.calories,
    protein: nutritionToday.protein,
    carbs: nutritionToday.carbs,
    fat: nutritionToday.fat,
    hydration: hydrationToday,
    supplements: supplementsToday
  }), [nutritionToday, hydrationToday, supplementsToday]);

  // Real weekly averages calculated from actual data
  const weeklyAverage = useMemo(() => {
    const nutritionAvg = {
      calories: nutritionWeekly.reduce((sum, day) => sum + day.calories, 0) / 7,
      protein: nutritionWeekly.reduce((sum, day) => sum + day.protein, 0) / 7,
      carbs: nutritionWeekly.reduce((sum, day) => sum + day.carbs, 0) / 7,
      fat: nutritionWeekly.reduce((sum, day) => sum + day.fat, 0) / 7,
    };

    const hydrationAvg = hydrationWeekly.reduce((sum, day) => sum + day, 0) / 7;
    const supplementsAvg = supplementsWeekly.reduce((sum, day) => sum + day, 0) / 7;
    const stepsAvg = exerciseWeekly.reduce((sum, day) => sum + day.steps, 0) / 7;
    const exerciseAvg = exerciseWeekly.reduce((sum, day) => sum + day.duration, 0) / 7;

    return {
      calories: nutritionAvg.calories,
      protein: nutritionAvg.protein,
      carbs: nutritionAvg.carbs,
      fat: nutritionAvg.fat,
      hydration: hydrationAvg,
      steps: stepsAvg,
      exerciseMinutes: exerciseAvg,
      supplements: supplementsAvg,
    };
  }, [nutritionWeekly, hydrationWeekly, supplementsWeekly, exerciseWeekly]);

  // Real chart data for nutrition
  const weeklyChartData = useMemo(() => 
    nutritionWeekly.map((day, index) => ({
      day: `Day ${index + 1}`,
      calories: day.calories,
      protein: day.protein,
      carbs: day.carbs,
      fat: day.fat,
      target: user?.targetCalories || 2000
    }))
  , [nutritionWeekly, user?.targetCalories]);

  // Real hydration chart data
  const hydrationWeeklyData = useMemo(() => 
    hydrationWeekly.map((amount, index) => ({
      day: index === 6 ? 'Today' : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index],
      amount: amount,
      target: user?.targetHydration || 2000,
    }))
  , [hydrationWeekly, user?.targetHydration]);

  // Real steps chart data
  const stepsData = useMemo(() => 
    exerciseWeekly.map((exercise, index) => ({
      day: index === 6 ? 'Today' : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index],
      steps: exercise.steps,
    }))
  , [exerciseWeekly]);

  // Real exercise calories chart data
  const exerciseCaloriesData = useMemo(() => 
    exerciseWeekly.map((exercise, index) => ({
      day: index === 6 ? 'Today' : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index],
      calories: exercise.calories,
    }))
  , [exerciseWeekly]);

  // Real macro data from today's nutrition
  const macroData = useMemo(() => [
    { name: 'Protein', value: progress.protein, color: '#10B981', percentage: 30 },
    { name: 'Carbs', value: progress.carbs, color: '#F59E0B', percentage: 45 },
    { name: 'Fat', value: progress.fat, color: '#8B5CF6', percentage: 25 },
  ], [progress.protein, progress.carbs, progress.fat]);

  return {
    progress,
    weeklyAverage,
    weeklyChartData,
    hydrationWeeklyData,
    stepsData,
    exerciseCaloriesData,
    macroData,
    user
  };
};
