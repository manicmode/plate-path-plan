import { useState, useEffect, useCallback } from 'react';
import { useWorkoutCompletions } from './useWorkoutCompletions';
import { useRealExerciseData } from './useRealExerciseData';
import { useWeeklyExerciseInsights } from './useWeeklyExerciseInsights';

export interface WorkoutStreak {
  current: number;
  longest: number;
}

export interface MuscleGroupData {
  muscle: string;
  frequency: number;
  fullMark: number;
}

export interface TrendData {
  metric: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
}

export const useWorkoutAnalytics = () => {
  const { getWorkoutCompletions, getWeeklyStats } = useWorkoutCompletions();
  const { summary, weeklyChartData, isLoading: exerciseLoading } = useRealExerciseData('30d');
  const { latestInsight } = useWeeklyExerciseInsights();
  
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([]);
  const [streaks, setStreaks] = useState<WorkoutStreak>({ current: 0, longest: 0 });
  const [muscleGroupData, setMuscleGroupData] = useState<MuscleGroupData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate workout streaks from completion data
  const calculateStreaks = useCallback((completions: any[]): WorkoutStreak => {
    if (!completions.length) return { current: 0, longest: 0 };
    
    // Sort by completion date (most recent first)
    const sortedCompletions = completions.sort((a, b) => 
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // Calculate current streak (consecutive days from today backwards)
    let streakDate = new Date(today);
    for (const completion of sortedCompletions) {
      const completionDate = new Date(completion.completedAt);
      completionDate.setHours(23, 59, 59, 999);
      
      const daysDiff = Math.floor((streakDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) { // Same day or next day
        if (currentStreak === 0 || daysDiff === 1) {
          currentStreak++;
          streakDate = new Date(completionDate);
          streakDate.setDate(streakDate.getDate() - 1);
        }
      } else {
        break; // Streak broken
      }
    }
    
    // Calculate longest streak
    const workoutDates = completions.map(c => 
      new Date(c.completedAt).toISOString().split('T')[0]
    ).sort();
    
    const uniqueDates = [...new Set(workoutDates)];
    
    for (let i = 0; i < uniqueDates.length; i++) {
      tempStreak = 1;
      
      for (let j = i + 1; j < uniqueDates.length; j++) {
        const currentDate = new Date(uniqueDates[j]);
        const prevDate = new Date(uniqueDates[j - 1]);
        const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          tempStreak++;
        } else {
          break;
        }
      }
      
      longestStreak = Math.max(longestStreak, tempStreak);
    }
    
    return { current: currentStreak, longest: longestStreak };
  }, []);

  // Calculate muscle group frequency from workout data
  const calculateMuscleGroupData = useCallback((completions: any[]): MuscleGroupData[] => {
    const muscleFrequency: Record<string, number> = {};
    
    completions.forEach(completion => {
      if (completion.musclesWorked && Array.isArray(completion.musclesWorked)) {
        completion.musclesWorked.forEach((muscle: string) => {
          muscleFrequency[muscle] = (muscleFrequency[muscle] || 0) + 1;
        });
      }
    });
    
    // Convert to chart format
    const maxFrequency = Math.max(...Object.values(muscleFrequency), 15);
    
    return Object.entries(muscleFrequency).map(([muscle, frequency]) => ({
      muscle: muscle.charAt(0).toUpperCase() + muscle.slice(1),
      frequency,
      fullMark: maxFrequency
    })).slice(0, 8); // Limit to top 8 muscle groups
  }, []);

  // Calculate trend data comparing current vs previous periods
  const calculateTrendData = useCallback((currentCompletions: any[], allCompletions: any[]): TrendData[] => {
    const currentPeriodStart = new Date();
    currentPeriodStart.setDate(currentPeriodStart.getDate() - 30);
    
    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - 60);
    const previousPeriodEnd = new Date(currentPeriodStart);
    
    const previousCompletions = allCompletions.filter(c => {
      const date = new Date(c.completedAt);
      return date >= previousPeriodStart && date < previousPeriodEnd;
    });
    
    // Current period metrics
    const currentTotal = currentCompletions.length;
    const currentDuration = currentCompletions.reduce((sum, c) => sum + c.durationMinutes, 0);
    const currentCalories = summary.totalCalories;
    const currentAvgDuration = currentTotal > 0 ? Math.round(currentDuration / currentTotal) : 0;
    
    // Previous period metrics
    const previousTotal = previousCompletions.length;
    const previousDuration = previousCompletions.reduce((sum, c) => sum + c.durationMinutes, 0);
    const previousAvgDuration = previousTotal > 0 ? Math.round(previousDuration / previousTotal) : 0;
    
    // Calculate percentage changes
    const calculateChange = (current: number, previous: number): { change: number; trend: 'up' | 'down' | 'stable' } => {
      if (previous === 0) return { change: current > 0 ? 100 : 0, trend: current > 0 ? 'up' : 'stable' };
      const change = Math.round(((current - previous) / previous) * 100);
      return {
        change: Math.abs(change),
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
      };
    };
    
    const durationTrend = calculateChange(currentAvgDuration, previousAvgDuration);
    const frequencyTrend = calculateChange(currentTotal, previousTotal);
    const weeklyFrequency = Math.round((currentTotal / 4.3)); // 30 days ≈ 4.3 weeks
    const weeklyFrequencyChange = calculateChange(weeklyFrequency, Math.round(previousTotal / 4.3));
    
    return [
      {
        metric: 'Avg Duration',
        value: currentAvgDuration,
        change: durationTrend.change,
        trend: durationTrend.trend,
        unit: 'min'
      },
      {
        metric: 'Weekly Frequency',
        value: weeklyFrequency,
        change: weeklyFrequencyChange.change,
        trend: weeklyFrequencyChange.trend,
        unit: 'workouts'
      },
      {
        metric: 'Calories/Session',
        value: currentTotal > 0 ? Math.round(currentCalories / currentTotal) : 0,
        change: 8, // Placeholder - would need exercise_logs calorie data for accuracy
        trend: 'up',
        unit: 'kcal'
      },
      {
        metric: 'Consistency',
        value: Math.min(Math.round((currentTotal / 12) * 100), 100), // 12 workouts/month = 100%
        change: 0,
        trend: 'stable',
        unit: '%'
      }
    ];
  }, [summary.totalCalories]);

  // Generate dynamic insights based on real data
  const generateInsights = useCallback((completions: any[], trends: TrendData[], muscleData: MuscleGroupData[]): string[] => {
    const insights: string[] = [];
    
    if (trends.length > 0) {
      const durationTrend = trends[0];
      if (durationTrend.trend === 'up') {
        insights.push(`Your workout duration has increased by ${durationTrend.change}% this month - great progress!`);
      } else if (durationTrend.trend === 'down') {
        insights.push(`Consider extending your workouts - duration decreased by ${durationTrend.change}% this month.`);
      }
    }
    
    if (muscleData.length > 0) {
      const topMuscle = muscleData[0];
      const leastWorked = muscleData[muscleData.length - 1];
      if (topMuscle && leastWorked && topMuscle.frequency > leastWorked.frequency * 2) {
        insights.push(`Consider adding more ${leastWorked.muscle.toLowerCase()} exercises to balance your muscle group coverage.`);
      }
    }
    
    const recentWorkouts = completions.filter(c => {
      const date = new Date(c.completedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    });
    
    if (recentWorkouts.length >= 4) {
      insights.push("Your consistency is strong! You're maintaining excellent workout frequency.");
    } else if (recentWorkouts.length >= 2) {
      insights.push("Good consistency this week, but try to maintain at least 4 workouts per week.");
    } else {
      insights.push("Let's work on consistency - aim for at least 3-4 workouts this week.");
    }
    
    // Fallback insights if no data-driven insights
    if (insights.length === 0) {
      insights.push("Start logging workouts to get personalized insights!");
      insights.push("Consistency is key - aim for regular workout sessions.");
      insights.push("Track different muscle groups for balanced development.");
    }
    
    return insights.slice(0, 4); // Limit to 4 insights
  }, []);

  // Main data loading effect
  useEffect(() => {
    const loadWorkoutData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch last 60 days of workout completions for trend analysis
        const completions = await getWorkoutCompletions(100);
        
        // Filter to last 30 days for current metrics
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentCompletions = completions.filter(c => 
          new Date(c.completedAt || '') >= thirtyDaysAgo
        );
        
        setWorkoutHistory(recentCompletions);
        
        // Calculate all metrics
        const calculatedStreaks = calculateStreaks(completions);
        const calculatedMuscleData = calculateMuscleGroupData(recentCompletions);
        const calculatedTrends = calculateTrendData(recentCompletions, completions);
        const generatedInsights = generateInsights(recentCompletions, calculatedTrends, calculatedMuscleData);
        
        setStreaks(calculatedStreaks);
        setMuscleGroupData(calculatedMuscleData);
        setTrendData(calculatedTrends);
        setInsights(generatedInsights);
        
      } catch (error) {
        console.error('Error loading workout analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkoutData();
  }, [getWorkoutCompletions, calculateStreaks, calculateMuscleGroupData, calculateTrendData, generateInsights]);

  return {
    workoutHistory,
    streaks,
    muscleGroupData,
    trendData,
    insights,
    isLoading: isLoading || exerciseLoading,
    // Also expose original hooks' data for backward compatibility
    summary,
    weeklyChartData,
    latestInsight,
  };
};