
import { useMemo } from 'react';
import { useNutrition } from '@/contexts/NutritionContext';
import { useAuth } from '@/contexts/auth';
import { useRealNutritionHistory } from '@/hooks/useRealNutritionHistory';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';
import { useRealSupplementData } from '@/hooks/useRealSupplementData';

export const useAnalyticsCalculations = () => {
  const { currentDay, weeklyData, getTodaysProgress } = useNutrition();
  const { user } = useAuth();
  const { dailyData, weeklyData: realWeeklyData, isLoading } = useRealNutritionHistory();
  const { summary: exerciseSummary, weeklyChartData: exerciseWeeklyData } = useRealExerciseData('7d');
  const { todayCount: supplementsTodayCount, weeklyData: supplementWeeklyData } = useRealSupplementData('7d');
  
  const progress = getTodaysProgress();
  
  // Convert targetHydration (glasses) to ml
  const hydrationTargetMl = (user?.targetHydration || 8) * 250;
  
  // Memoize weekly averages using real data when available
  const weeklyAverage = useMemo(() => {
    // Use real weekly data if available, otherwise fall back to current system
    const dataToUse = realWeeklyData.length > 0 ? realWeeklyData : 
      (weeklyData.length > 0 ? weeklyData.slice(-7) : [currentDay]);
    
    if (realWeeklyData.length > 0) {
      // Calculate averages from real weekly data
      const avgCalories = realWeeklyData.reduce((sum, day) => sum + day.calories, 0) / realWeeklyData.length;
      const avgProtein = realWeeklyData.reduce((sum, day) => sum + day.protein, 0) / realWeeklyData.length;
      const avgCarbs = realWeeklyData.reduce((sum, day) => sum + day.carbs, 0) / realWeeklyData.length;
      const avgFat = realWeeklyData.reduce((sum, day) => sum + day.fat, 0) / realWeeklyData.length;
      
      // Calculate real supplement average from supplement data
      const avgSupplements = supplementWeeklyData.length > 0 
        ? supplementWeeklyData.reduce((sum, day) => sum + day.count, 0) / supplementWeeklyData.length
        : supplementsTodayCount;
      
      return {
        calories: avgCalories,
        protein: avgProtein,
        carbs: avgCarbs,
        fat: avgFat,
        hydration: progress.hydration, // Use current day's hydration
        steps: exerciseSummary.todaySteps || 0,
        exerciseMinutes: exerciseSummary.todayDuration || 0,
        supplements: avgSupplements,
      };
    } else {
      // Fall back to existing logic for legacy data
      const avgCalories = dataToUse.reduce((sum, day) => {
        const calories = 'calories' in day ? day.calories : ('totalCalories' in day ? day.totalCalories : 0);
        return sum + (calories || 0);
      }, 0) / dataToUse.length;
      
      const avgProtein = dataToUse.reduce((sum, day) => {
        const protein = 'protein' in day ? day.protein : ('totalProtein' in day ? day.totalProtein : 0);
        return sum + (protein || 0);
      }, 0) / dataToUse.length;
      
      const avgCarbs = dataToUse.reduce((sum, day) => {
        const carbs = 'carbs' in day ? day.carbs : ('totalCarbs' in day ? day.totalCarbs : 0);
        return sum + (carbs || 0);
      }, 0) / dataToUse.length;
      
      const avgFat = dataToUse.reduce((sum, day) => {
        const fat = 'fat' in day ? day.fat : ('totalFat' in day ? day.totalFat : 0);
        return sum + (fat || 0);
      }, 0) / dataToUse.length;
      
      const avgHydration = dataToUse.reduce((sum, day) => {
        const hydration = 'hydration' in day ? day.hydration : ('totalHydration' in day ? day.totalHydration : 0);
        return sum + (hydration || 0);
      }, 0) / dataToUse.length;
      
      // Use real supplement data even in fallback mode
      const avgSupplements = supplementWeeklyData.length > 0 
        ? supplementWeeklyData.reduce((sum, day) => sum + day.count, 0) / supplementWeeklyData.length
        : supplementsTodayCount;
      
      return {
        calories: avgCalories,
        protein: avgProtein,
        carbs: avgCarbs,
        fat: avgFat,
        hydration: avgHydration,
        steps: exerciseSummary.todaySteps || 0,
        exerciseMinutes: exerciseSummary.todayDuration || 0,
        supplements: avgSupplements,
      };
    }
  }, [weeklyData, currentDay, progress, realWeeklyData, exerciseSummary, supplementWeeklyData, supplementsTodayCount]);

  // Memoize chart data using real data when available
  const weeklyChartData = useMemo(() => {
    if (realWeeklyData.length > 0) {
      // Use real weekly data
      return realWeeklyData.map((day, index) => ({
        day: `Day ${index + 1}`,
        calories: day.calories,
        protein: day.protein,
        carbs: day.carbs,
        fat: day.fat,
        target: user?.targetCalories || 2000
      }));
    } else if (weeklyData.length > 0) {
      // Use existing nutrition context data
      return weeklyData.slice(-7).map((day, index) => ({
        day: `Day ${index + 1}`,
        calories: 'calories' in day ? day.calories : ('totalCalories' in day ? day.totalCalories : 0),
        protein: 'protein' in day ? day.protein : ('totalProtein' in day ? day.totalProtein : 0),
        carbs: 'carbs' in day ? day.carbs : ('totalCarbs' in day ? day.totalCarbs : 0),
        fat: 'fat' in day ? day.fat : ('totalFat' in day ? day.totalFat : 0),
        target: user?.targetCalories || 2000
      }));
    } else {
      // Return empty array instead of generating mock data
      return [];
    }
  }, [weeklyData, realWeeklyData, user?.targetCalories]);

  // Real hydration data - will be replaced with real data hook
  const hydrationWeeklyData = useMemo(() => {
    // Return empty array for now - this will use real data from useRealHydrationData hook
    return [];
  }, []);

  // Use real steps data from exercise hook
  const stepsData = useMemo(() => {
    if (exerciseWeeklyData.length > 0) {
      return exerciseWeeklyData.map(day => ({
        day: day.day,
        steps: day.steps,
      }));
    }
    // Return empty array if no data available
    return [];
  }, [exerciseWeeklyData]);

  // Use real exercise calories data from exercise hook  
  const exerciseCaloriesData = useMemo(() => {
    if (exerciseWeeklyData.length > 0) {
      return exerciseWeeklyData.map(day => ({
        day: day.day,
        calories: day.calories,
      }));
    }
    // Return empty array if no data available
    return [];
  }, [exerciseWeeklyData]);

  // Memoize macro data using real progress
  const macroData = useMemo(() => [
    { name: 'Protein', value: progress.protein, color: '#10B981', percentage: 30 },
    { name: 'Carbs', value: progress.carbs, color: '#F59E0B', percentage: 45 },
    { name: 'Fat', value: progress.fat, color: '#8B5CF6', percentage: 25 },
  ], [progress.protein, progress.carbs, progress.fat]);

  return {
    progress: {
      ...progress,
      supplements: supplementsTodayCount // Use real supplement count for today
    },
    weeklyAverage,
    weeklyChartData,
    hydrationWeeklyData,
    stepsData,
    exerciseCaloriesData,
    macroData,
    user,
    hydrationTargetMl,
    isLoading // Export loading state for components that need it
  };
};
