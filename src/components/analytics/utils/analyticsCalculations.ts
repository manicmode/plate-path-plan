
import { useMemo } from 'react';
import { useNutrition } from '@/contexts/NutritionContext';
import { useAuth } from '@/contexts/auth';

// Deterministic random function based on seed
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Generate stable data based on date and user
const generateStableData = (baseValue: number, seed: number, variation: number) => {
  return Math.max(0, baseValue + (seededRandom(seed) - 0.5) * variation);
};

export const useAnalyticsCalculations = () => {
  const { currentDay, weeklyData, getTodaysProgress } = useNutrition();
  const { user } = useAuth();
  
  const progress = getTodaysProgress();
  
  // Memoize weekly averages to prevent recalculation
  const weeklyAverage = useMemo(() => {
    const dataToUse = weeklyData.length > 0 ? weeklyData.slice(-7) : [currentDay];
    
    const avgCalories = dataToUse.reduce((sum, day) => sum + day.totalCalories, 0) / dataToUse.length;
    const avgProtein = dataToUse.reduce((sum, day) => sum + day.totalProtein, 0) / dataToUse.length;
    const avgCarbs = dataToUse.reduce((sum, day) => sum + day.totalCarbs, 0) / dataToUse.length;
    const avgFat = dataToUse.reduce((sum, day) => sum + day.totalFat, 0) / dataToUse.length;
    const avgHydration = dataToUse.reduce((sum, day) => sum + day.totalHydration, 0) / dataToUse.length;
    const avgSupplements = dataToUse.reduce((sum, day) => sum + day.supplements.length, 0) / dataToUse.length;
    
    return {
      calories: avgCalories,
      protein: avgProtein,
      carbs: avgCarbs,
      fat: avgFat,
      hydration: avgHydration,
      steps: progress.hydration > 0 ? 7500 + (progress.hydration / 100) : 6000,
      exerciseMinutes: progress.calories > 1000 ? 25 + Math.round(progress.calories / 100) : 15,
      supplements: avgSupplements,
    };
  }, [weeklyData, currentDay, progress]);

  // Memoize chart data with stable generation
  const weeklyChartData = useMemo(() => {
    const today = new Date().toDateString();
    const userId = user?.id || 'default';
    const seedBase = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    return weeklyData.length > 0 ? 
      weeklyData.slice(-7).map((day, index) => ({
        day: `Day ${index + 1}`,
        calories: day.totalCalories,
        protein: day.totalProtein,
        carbs: day.totalCarbs,
        fat: day.totalFat,
        target: user?.targetCalories || 2000
      })) :
      Array.from({ length: 7 }, (_, index) => ({
        day: `Day ${index + 1}`,
        calories: generateStableData(progress.calories, seedBase + index, 400),
        protein: generateStableData(progress.protein, seedBase + index + 100, 20),
        carbs: generateStableData(progress.carbs, seedBase + index + 200, 50),
        fat: generateStableData(progress.fat, seedBase + index + 300, 15),
        target: user?.targetCalories || 2000
      }));
  }, [weeklyData, progress, user?.targetCalories, user?.id]);

  // Real hydration data - will be replaced with real data hook
  const hydrationWeeklyData = useMemo(() => {
    // Return empty array for now - this will use real data from useRealHydrationData hook
    return [];
  }, []);

  // Memoize steps data
  const stepsData = useMemo(() => {
    const today = new Date().toDateString();
    const seedBase = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    return Array.from({ length: 7 }, (_, index) => {
      const baseSteps = weeklyAverage.steps;
      return {
        day: index === 6 ? 'Today' : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index],
        steps: index === 6 ? Math.round(baseSteps) : Math.round(generateStableData(baseSteps, seedBase + index, 2000)),
      };
    });
  }, [weeklyAverage.steps]);

  // Memoize exercise calories data
  const exerciseCaloriesData = useMemo(() => {
    const today = new Date().toDateString();
    const seedBase = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    return Array.from({ length: 7 }, (_, index) => {
      const baseCalories = weeklyAverage.exerciseMinutes * 8;
      return {
        day: index === 6 ? 'Today' : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index],
        calories: index === 6 ? Math.round(baseCalories) : Math.round(generateStableData(baseCalories, seedBase + index, 100)),
      };
    });
  }, [weeklyAverage.exerciseMinutes]);

  // Memoize macro data
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
