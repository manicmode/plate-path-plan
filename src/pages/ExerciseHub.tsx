import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Clock, Flame, Timer, Calendar, TrendingUp, Target, Award, Activity, Upload, Loader2, Camera, ArrowRight } from 'lucide-react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIsMobile } from '@/hooks/use-mobile';
import { AddWorkoutModal } from '@/components/AddWorkoutModal';
import { CreateRoutineModal } from '@/components/CreateRoutineModal';
import { WorkoutPreferencesModal } from '@/components/WorkoutPreferencesModal';
import { RoutineCard } from '@/components/RoutineCard';
import { AIRoutineCard } from '@/components/routine/AIRoutineCard';
import { convertUnifiedToAIRoutineCard } from '@/utils/routineAdapters';
import { ExerciseProgressChart } from '@/components/analytics/ExerciseProgressChart';
import { WorkoutTypesChart } from '@/components/analytics/WorkoutTypesChart';
import { ExerciseStatsCard } from '@/components/analytics/ExerciseStatsCard';
import { DateFilterSelect } from '@/components/analytics/DateFilterSelect';
import { PreMadePlanCard } from '@/components/PreMadePlanCard';
import { PlanPreviewModal } from '@/components/PlanPreviewModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

import { MonthlyExerciseReportCard } from '@/components/exercise/MonthlyExerciseReportCard';
import { YearlyExerciseReportCard } from '@/components/exercise/YearlyExerciseReportCard';
import { WeeklyExerciseInsightsCard } from "@/components/analytics/WeeklyExerciseInsightsCard";
import { WorkoutCalendarView } from '@/components/analytics/WorkoutCalendarView';
import { WorkoutVolumeChart } from '@/components/analytics/WorkoutVolumeChart';
import { EnhancedStreakTracker } from '@/components/analytics/EnhancedStreakTracker';
import { useAllRoutines, type UnifiedRoutine } from '@/hooks/useAllRoutines';
import { useRoutines } from '@/hooks/useRoutines';
import { RoutineBadge } from '@/components/RoutineBadge';
import { ProgressOverviewCard } from '@/components/analytics/ProgressOverviewCard';
import { MuscleGroupRadarChart } from '@/components/analytics/MuscleGroupRadarChart';
import { WeeklyGoalCard } from '@/components/analytics/WeeklyGoalCard';
import { MotivationCard } from '@/components/analytics/MotivationCard';
import { WorkoutTrophyCard } from '@/components/analytics/WorkoutTrophyCard';
import { WorkoutProgressCalendar } from '@/components/analytics/WorkoutProgressCalendar';
import { ExerciseGoalsInitializer } from '@/components/exercise/ExerciseGoalsInitializer';
import { useWorkoutCompletion } from '@/contexts/WorkoutCompletionContext';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';
import { useWorkoutTrophy } from '@/hooks/useWorkoutTrophy';
import { WorkoutForecastChart } from '@/components/workout/WorkoutForecastChart';
import { MuscleGroupTrendsSection } from '@/components/workout/MuscleGroupTrendsSection';

const ExerciseHub = () => {
  const { showCompletionModal } = useWorkoutCompletion();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const tabsRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'workout-log' | 'my-routines' | 'progress-reports' | 'pre-made-plans'>('my-routines');
  const [isAddWorkoutModalOpen, setIsAddWorkoutModalOpen] = useState(false);
  const [isCreateRoutineModalOpen, setIsCreateRoutineModalOpen] = useState(false);
  const [isWorkoutPreferencesModalOpen, setIsWorkoutPreferencesModalOpen] = useState(false);
  const [isExploreMoreModalOpen, setIsExploreMoreModalOpen] = useState(false);
  const [originRoute, setOriginRoute] = useState<string>('/explore');
  const [dateFilter, setDateFilter] = useState('30d');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isPlanPreviewOpen, setIsPlanPreviewOpen] = useState(false);
  
  // Body Scan AI state
  const [bodyScanFile, setBodyScanFile] = useState<File | null>(null);
  const [bodyScanLoading, setBodyScanLoading] = useState(false);
  const [bodyScanResult, setBodyScanResult] = useState<any>(null);
  
  // Use the optimized scroll-to-top hook
  useScrollToTop();

  // Store the origin route when entering Exercise & Recovery
  useEffect(() => {
    const referrer = location.state?.from;
    if (referrer) {
      setOriginRoute(referrer);
    } else {
      // Enhanced fallback: check referrer or default to explore
      const fallbackRoute = document.referrer.includes('/home') ? '/home' : '/explore';
      setOriginRoute(fallbackRoute);
    }
  }, [location.state]);

  // Real workout data from database
  const [realWorkouts, setRealWorkouts] = useState<any[]>([]);
  const [workoutsLoading, setWorkoutsLoading] = useState(true);

  // Fetch real workout data
  useEffect(() => {
    const fetchWorkouts = async () => {
      if (!user?.id) return;
      
      setWorkoutsLoading(true);
      try {
        // Fetch from exercise_logs
        const { data: exerciseLogs, error: exerciseError } = await supabase
          .from('exercise_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        // Fetch from workout_completions
        const { data: workoutCompletions, error: workoutError } = await supabase
          .from('workout_completions')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(10);

        if (exerciseError) console.error('Error fetching exercise logs:', exerciseError);
        if (workoutError) console.error('Error fetching workout completions:', workoutError);

        // Combine and format data
        const combinedWorkouts = [];
        
        // Add exercise logs
        exerciseLogs?.forEach(log => {
          combinedWorkouts.push({
            id: `exercise_${log.id}`,
            name: log.activity_type || 'Exercise',
            emoji: getActivityEmoji(log.activity_type),
            type: getActivityType(log.activity_type),
            duration: `${log.duration_minutes} minutes`,
            calories: `${log.calories_burned || 0} kcal`,
            date: new Date(log.created_at).toISOString().split('T')[0],
            time: new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            summary: `${log.intensity_level || 'moderate'} intensity ${log.activity_type}`,
            gradient: getActivityGradient(log.activity_type),
            source: 'exercise_log'
          });
        });

        // Add workout completions
        workoutCompletions?.forEach(completion => {
          combinedWorkouts.push({
            id: `completion_${completion.id}`,
            name: completion.workout_type === 'ai_routine' ? 'AI Routine' : 
                  completion.workout_type === 'manual' ? 'Manual Workout' : 'Pre-made Plan',
            emoji: getWorkoutTypeEmoji(completion.workout_type),
            type: completion.workout_type,
            duration: `${completion.duration_minutes} minutes`,
            calories: `${Math.round(completion.duration_minutes * 6)} kcal`, // Estimate
            date: new Date(completion.completed_at).toISOString().split('T')[0],
            time: new Date(completion.completed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            summary: `${completion.exercises_count} exercises, ${completion.sets_count} sets`,
            gradient: getWorkoutTypeGradient(completion.workout_type),
            source: 'workout_completion'
          });
        });

        // Sort by date and time
        combinedWorkouts.sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateB.getTime() - dateA.getTime();
        });

        setRealWorkouts(combinedWorkouts);
      } catch (error) {
        console.error('Error fetching workout data:', error);
      } finally {
        setWorkoutsLoading(false);
      }
    };

    fetchWorkouts();
  }, [user?.id]);

  // Helper functions for formatting workout data
  const getActivityEmoji = (activityType: string) => {
    const emojiMap: Record<string, string> = {
      'running': '🏃',
      'cycling': '🚴',
      'swimming': '🏊',
      'walking': '🚶',
      'weightlifting': '🏋️',
      'yoga': '🧘',
      'pilates': '🤸',
      'hiit': '⚡',
      'dancing': '💃',
      'basketball': '🏀',
      'tennis': '🎾'
    };
    return emojiMap[activityType?.toLowerCase()] || '💪';
  };

  const getActivityType = (activityType: string) => {
    const typeMap: Record<string, string> = {
      'running': 'Cardio',
      'cycling': 'Cardio',
      'swimming': 'Cardio',
      'walking': 'Cardio',
      'weightlifting': 'Strength',
      'yoga': 'Flexibility',
      'pilates': 'Flexibility',
      'hiit': 'HIIT',
      'dancing': 'Cardio',
      'basketball': 'Sport',
      'tennis': 'Sport'
    };
    return typeMap[activityType?.toLowerCase()] || 'Exercise';
  };

  const getActivityGradient = (activityType: string) => {
    const gradientMap: Record<string, string> = {
      'running': 'from-blue-300 to-cyan-500',
      'cycling': 'from-green-300 to-emerald-500',
      'swimming': 'from-cyan-300 to-blue-500',
      'walking': 'from-green-300 to-teal-500',
      'weightlifting': 'from-orange-300 to-red-500',
      'yoga': 'from-purple-300 to-pink-500',
      'pilates': 'from-pink-300 to-purple-500',
      'hiit': 'from-red-300 to-orange-500',
      'dancing': 'from-pink-300 to-rose-500',
      'basketball': 'from-orange-300 to-amber-500',
      'tennis': 'from-yellow-300 to-orange-500'
    };
    return gradientMap[activityType?.toLowerCase()] || 'from-gray-300 to-slate-500';
  };

  const getWorkoutTypeEmoji = (workoutType: string) => {
    const emojiMap: Record<string, string> = {
      'ai_routine': '🤖',
      'manual': '📝',
      'pre_made': '📋'
    };
    return emojiMap[workoutType] || '💪';
  };

  const getWorkoutTypeGradient = (workoutType: string) => {
    const gradientMap: Record<string, string> = {
      'ai_routine': 'from-purple-300 to-indigo-500',
      'manual': 'from-blue-300 to-cyan-500',
      'pre_made': 'from-green-300 to-emerald-500'
    };
    return gradientMap[workoutType] || 'from-gray-300 to-slate-500';
  };

  // Function to refresh workout data after new entries
  const refreshWorkoutData = async () => {
    if (!user?.id) return;
    
    try {
      const { data: exerciseLogs } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: workoutCompletions } = await supabase
        .from('workout_completions')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(10);

      // Re-process and update the workouts
      const combinedWorkouts = [];
      
      exerciseLogs?.forEach(log => {
        combinedWorkouts.push({
          id: `exercise_${log.id}`,
          name: log.activity_type || 'Exercise',
          emoji: getActivityEmoji(log.activity_type),
          type: getActivityType(log.activity_type),
          duration: `${log.duration_minutes} minutes`,
          calories: `${log.calories_burned || 0} kcal`,
          date: new Date(log.created_at).toISOString().split('T')[0],
          time: new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          summary: `${log.intensity_level || 'moderate'} intensity ${log.activity_type}`,
          gradient: getActivityGradient(log.activity_type),
          source: 'exercise_log'
        });
      });

      workoutCompletions?.forEach(completion => {
        combinedWorkouts.push({
          id: `completion_${completion.id}`,
          name: completion.workout_type === 'ai_routine' ? 'AI Routine' : 
                completion.workout_type === 'manual' ? 'Manual Workout' : 'Pre-made Plan',
          emoji: getWorkoutTypeEmoji(completion.workout_type),
          type: completion.workout_type,
          duration: `${completion.duration_minutes} minutes`,
          calories: `${Math.round(completion.duration_minutes * 6)} kcal`,
          date: new Date(completion.completed_at).toISOString().split('T')[0],
          time: new Date(completion.completed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          summary: `${completion.exercises_count} exercises, ${completion.sets_count} sets`,
          gradient: getWorkoutTypeGradient(completion.workout_type),
          source: 'workout_completion'
        });
      });

      combinedWorkouts.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateB.getTime() - dateA.getTime();
      });

      setRealWorkouts(combinedWorkouts);
    } catch (error) {
      console.error('Error refreshing workout data:', error);
    }
  };

  // Use new routines hook for primary and supplemental routines
  const { primaryRoutine, supplementalRoutines, loading: routinesLoading, activateRoutine, deactivateRoutine } = useRoutines();
  
  // Remove mock routines - now handled by useAllRoutines hook

  // Remove conversion functions - now handled by useAllRoutines hook

  // Function to handle adding/editing routines (kept for backward compatibility)
  const handleSaveRoutine = (newRoutine: any) => {
    // This is now handled by the CreateRoutineModal internally
    // Keep this function for legacy support but routines are automatically updated via the hook
    console.log('Routine saved via Supabase:', newRoutine);
  };

  // Function to handle duplicating routines
  const handleDuplicateRoutine = async (routine: UnifiedRoutine) => {
    // Only allow duplication of non-mock routines for now
    if (routine.source === 'mock') {
      console.log('Cannot duplicate mock routines');
      return;
    }

    // For now, just show a message - duplication logic can be enhanced later
    console.log('Duplicate routine:', routine.title);
  };

  // State for editing routines
  const [editingRoutine, setEditingRoutine] = useState<any>(null);

  // Use real exercise data hooks
  const { exerciseData, summary: exerciseSummary, isLoading: exerciseDataLoading } = useRealExerciseData('30d');
  const { streak, isLoading: streakLoading } = useWorkoutTrophy();

  // Calculate real stats from data
  const totalWorkouts = exerciseData.length;
  const totalMinutes = exerciseSummary.totalDuration;
  const avgWeeklyFrequency = Math.round((totalWorkouts / 4) * 10) / 10; // Estimate based on 30 days
  const longestStreak = streak?.longestStreak || 0;
  const currentStreak = streak?.currentStreak || 0;

  // Real workout types data based on actual logs
  const workoutTypesData = exerciseData.reduce((acc, workout) => {
    const type = getActivityType(workout.activity_type);
    const existing = acc.find(item => item.type === type);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({
        type,
        count: 1,
        emoji: getActivityEmoji(workout.activity_type),
        color: getTypeColor(type)
      });
    }
    return acc;
  }, [] as Array<{ type: string; count: number; emoji: string; color: string }>);

  // Helper function for type colors
  const getTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      'Strength': '#f59e0b',
      'Cardio': '#3b82f6',
      'Flexibility': '#8b5cf6',
      'HIIT': '#ef4444',
      'Sport': '#10b981'
    };
    return colorMap[type] || '#6b7280';
  };

  // Real exercise stats
  const exerciseStats = [
    {
      icon: Activity,
      label: 'Total Workouts Logged',
      value: totalWorkouts.toString(),
      color: 'from-blue-400 to-cyan-500'
    },
    {
      icon: Clock,
      label: 'Total Minutes Exercised',
      value: totalMinutes.toLocaleString(),
      color: 'from-emerald-400 to-teal-500'
    },
    {
      icon: TrendingUp,
      label: 'Avg. Weekly Frequency',
      value: `${avgWeeklyFrequency} days`,
      color: 'from-orange-400 to-red-500'
    },
    {
      icon: Flame,
      label: 'Current Streak',
      value: `${currentStreak} days`,
      color: 'from-purple-400 to-pink-500'
    },
    {
      icon: Target,
      label: 'Longest Streak',
      value: `${longestStreak} days`,
      color: 'from-green-400 to-emerald-500'
    },
    {
      icon: Award,
      label: 'Most Logged Type',
      value: workoutTypesData.length > 0 ? 
        `${workoutTypesData[0].emoji} ${workoutTypesData[0].type}` : 
        '💪 Start logging!',
      color: 'from-yellow-400 to-orange-500'
    }
  ];

  // Mock progress data
  const mockWeeklyData = [
    { day: 'Mon', workouts: 2, height: '60%' },
    { day: 'Tue', workouts: 1, height: '30%' },
    { day: 'Wed', workouts: 3, height: '90%' },
    { day: 'Thu', workouts: 0, height: '0%' },
    { day: 'Fri', workouts: 2, height: '60%' },
    { day: 'Sat', workouts: 1, height: '30%' },
    { day: 'Sun', workouts: 2, height: '60%' }
  ];

  const mockStats = [
    {
      icon: Clock,
      title: "Avg. Workout Duration",
      value: "42 min",
      gradient: "from-blue-400 to-cyan-500",
      iconColor: "text-blue-500"
    },
    {
      icon: Flame,
      title: "Avg. Calories Burned",
      value: "310 kcal",
      gradient: "from-orange-400 to-red-500",
      iconColor: "text-orange-500"
    },
    {
      icon: Calendar,
      title: "Workout Days This Month",
      value: "16 days",
      gradient: "from-green-400 to-emerald-500",
      iconColor: "text-green-500"
    }
  ];

  // Comprehensive mock pre-made plans data
  const mockPreMadePlans = [
    {
      id: 1,
      title: "Full Body Blast",
      emoji: "💪",
      type: "Strength",
      difficulty: "Intermediate" as const,
      duration: "6 Weeks",
      timeCommitment: "45 min/day, 4x/week",
      gradient: "from-red-400 to-orange-600",
      schedulePreview: "Mon: Upper Body, Tue: Lower Body, Thu: Full Body, Fri: Core & Cardio",
      description: "A comprehensive strength training program designed to build muscle and improve overall fitness. Perfect for those looking to challenge themselves with compound movements and progressive overload.",
      weeks: {
        "Week 1": {
          "Monday": "Upper Body Focus - Bench press 3x8, Pull-ups 3x6, Shoulder press 3x10, Rows 3x10",
          "Tuesday": "Lower Body Focus - Squats 3x10, Deadlifts 3x6, Lunges 3x12, Calf raises 3x15",
          "Wednesday": "Rest day",
          "Thursday": "Full Body Circuit - Burpees 3x10, Mountain climbers 3x20, Push-ups 3x12, Plank 3x45s",
          "Friday": "Core & Cardio - Bicycle crunches 3x20, Russian twists 3x30, 20 min cardio",
          "Saturday": "Active recovery walk",
          "Sunday": "Rest day"
        },
        "Week 2": {
          "Monday": "Upper Body Focus - Incline press 3x8, Lat pulldowns 3x10, Dumbbell press 3x10, Cable rows 3x12",
          "Tuesday": "Lower Body Focus - Front squats 3x8, Romanian deadlifts 3x10, Bulgarian split squats 3x10, Hip thrusts 3x12",
          "Wednesday": "Rest day",
          "Thursday": "Full Body Circuit - Jump squats 3x12, Push-up variations 3x10, Bear crawls 3x30s, Side plank 3x30s",
          "Friday": "Core & Cardio - Dead bugs 3x12, Hollow holds 3x30s, 25 min cardio",
          "Saturday": "Active recovery yoga",
          "Sunday": "Rest day"
        },
        "Week 3": {
          "Monday": "Upper Body Focus - Weighted pull-ups 3x6, Dips 3x10, Arnold press 3x10, Face pulls 3x15",
          "Tuesday": "Lower Body Focus - Back squats 3x8, Sumo deadlifts 3x8, Walking lunges 3x12, Glute bridges 3x15",
          "Wednesday": "Rest day",
          "Thursday": "Full Body HIIT - 30s work, 15s rest for 20 minutes",
          "Friday": "Core & Strength - Hanging leg raises 3x10, Weighted planks 3x45s, 20 min LISS cardio",
          "Saturday": "Active recovery stretching",
          "Sunday": "Rest day"
        },
        "Week 4": {
          "Monday": "Upper Body Power - Explosive push-ups 3x8, Power rows 3x8, Med ball slams 3x12",
          "Tuesday": "Lower Body Power - Jump squats 3x10, Box jumps 3x8, Single leg deadlifts 3x8",
          "Wednesday": "Rest day",
          "Thursday": "Full Body Challenge - Complex movements, 30 min circuit",
          "Friday": "Core & Conditioning - Advanced core circuit, 25 min cardio",
          "Saturday": "Recovery and mobility",
          "Sunday": "Rest day"
        }
      }
    },
    {
      id: 2,
      title: "Beginner's Journey",
      emoji: "🌱",
      type: "Strength",
      difficulty: "Beginner" as const,
      duration: "4 Weeks",
      timeCommitment: "30 min/day, 3x/week",
      gradient: "from-green-400 to-emerald-600",
      schedulePreview: "Mon: Upper Body Basics, Wed: Lower Body Basics, Fri: Full Body Introduction",
      description: "Start your fitness journey with confidence! This beginner-friendly program introduces you to fundamental movements and builds a strong foundation for future progress.",
      weeks: {
        "Week 1": {
          "Monday": "Upper Body Basics - Wall push-ups 2x10, Assisted pull-ups 2x5, Light dumbbell press 2x8",
          "Tuesday": "Rest day",
          "Wednesday": "Lower Body Basics - Bodyweight squats 2x10, Glute bridges 2x12, Wall sits 2x30s",
          "Thursday": "Rest day",
          "Friday": "Full Body Introduction - Light full body movements, stretching",
          "Saturday": "Walk or light activity",
          "Sunday": "Rest day"
        },
        "Week 2": {
          "Monday": "Upper Body Progress - Modified push-ups 2x8, Band rows 2x10, Light overhead press 2x10",
          "Tuesday": "Rest day", 
          "Wednesday": "Lower Body Progress - Chair squats 2x12, Step-ups 2x8, Calf raises 2x15",
          "Thursday": "Rest day",
          "Friday": "Full Body Flow - Gentle circuit, focus on form",
          "Saturday": "Light cardio or walk",
          "Sunday": "Rest day"
        },
        "Week 3": {
          "Monday": "Upper Body Building - Knee push-ups 3x8, TRX rows 3x8, Dumbbell exercises 3x10",
          "Tuesday": "Rest day",
          "Wednesday": "Lower Body Building - Goblet squats 3x10, Deadlifts with light weight 3x8, Lunges 3x6 each leg",
          "Thursday": "Rest day",
          "Friday": "Full Body Confidence - Combining upper and lower movements",
          "Saturday": "Active recovery",
          "Sunday": "Rest day"
        },
        "Week 4": {
          "Monday": "Upper Body Challenge - Standard push-ups 3x5, Pull-up progression, Increased weights",
          "Tuesday": "Rest day",
          "Wednesday": "Lower Body Challenge - Deeper squats, More weight, Balance challenges",
          "Thursday": "Rest day",
          "Friday": "Full Body Celebration - Complete workout showcasing progress",
          "Saturday": "Fun activity of choice",
          "Sunday": "Rest and reflection"
        }
      }
    },
    {
      id: 3,
      title: "HIIT Inferno",
      emoji: "🔥",
      type: "HIIT",
      difficulty: "Advanced" as const,
      duration: "4 Weeks",
      timeCommitment: "25 min/day, 5x/week",
      gradient: "from-orange-500 to-red-600",
      schedulePreview: "High-intensity intervals daily with one rest day. Focus on fat burn and conditioning.",
      description: "Intense high-intensity interval training designed to maximize fat burn and improve cardiovascular fitness. Only for those ready to push their limits!",
      weeks: {
        "Week 1": {
          "Monday": "Total Body HIIT - 30s work, 30s rest - Burpees, jump squats, mountain climbers, 20 min",
          "Tuesday": "Upper Body HIIT - 30s work, 30s rest - Push-up variations, battle ropes, boxing, 20 min",
          "Wednesday": "Lower Body HIIT - 30s work, 30s rest - Jump lunges, squat jumps, single leg burpees, 20 min",
          "Thursday": "Cardio Blast - 45s work, 15s rest - High knees, jumping jacks, sprint intervals, 25 min",
          "Friday": "Core Inferno - 30s work, 30s rest - Plank variations, bicycle crunches, Russian twists, 20 min",
          "Saturday": "Active recovery or light yoga",
          "Sunday": "Rest day"
        },
        "Week 2": {
          "Monday": "Power Circuits - 40s work, 20s rest - Explosive movements, plyometrics, 25 min",
          "Tuesday": "Upper Intensity - 40s work, 20s rest - Advanced push variations, pull-ups, dips, 25 min",
          "Wednesday": "Lower Power - 40s work, 20s rest - Box jumps, broad jumps, single leg hops, 25 min",
          "Thursday": "Metabolic Madness - 30s work, 15s rest - Full body compound movements, 25 min",
          "Friday": "Core & Conditioning - 40s work, 20s rest - Advanced core, stability challenges, 25 min",
          "Saturday": "Recovery mobility work",
          "Sunday": "Rest day"
        },
        "Week 3": {
          "Monday": "Elite Total Body - 45s work, 15s rest - Complex movements, maximum intensity, 25 min",
          "Tuesday": "Upper Body Beast - 45s work, 15s rest - Weighted exercises, advanced variations, 25 min",
          "Wednesday": "Lower Body Lightning - 45s work, 15s rest - Plyometric combinations, agility work, 25 min",
          "Thursday": "Cardio Crusher - Intervals with minimal rest, 30 min",
          "Friday": "Core Destroyer - 45s work, 15s rest - Weighted core, instability training, 25 min",
          "Saturday": "Light movement and stretching",
          "Sunday": "Rest day"
        },
        "Week 4": {
          "Monday": "Championship Challenge - Max effort circuits, test your limits, 30 min",
          "Tuesday": "Upper Body Finals - Personal bests, advanced combinations, 30 min",
          "Wednesday": "Lower Body Finals - Explosive power, endurance test, 30 min",
          "Thursday": "Ultimate Cardio - Longest session, peak conditioning, 35 min",
          "Friday": "Core Mastery - Most challenging core workout yet, 30 min",
          "Saturday": "Victory lap - light celebration workout",
          "Sunday": "Rest and recovery"
        }
      }
    },
    {
      id: 4,
      title: "Zen Flow Flexibility",
      emoji: "🧘",
      type: "Flexibility",
      difficulty: "Beginner" as const,
      duration: "6 Weeks",
      timeCommitment: "20 min/day, 6x/week",
      gradient: "from-purple-400 to-blue-500",
      schedulePreview: "Daily gentle stretching and yoga flows. Focus on mobility, relaxation, and mind-body connection.",
      description: "A peaceful journey to improved flexibility and inner calm. Perfect for beginners or anyone looking to add mindful movement to their routine.",
      weeks: {
        "Week 1": {
          "Monday": "Morning Sun Salutation - Gentle wake-up flow, basic poses, 20 min",
          "Tuesday": "Hip Opening Flow - Gentle hip stretches, pigeon pose progressions, 20 min", 
          "Wednesday": "Spinal Mobility - Cat-cow, twists, backbend preparation, 20 min",
          "Thursday": "Shoulder & Neck Relief - Upper body focus, desk warrior sequence, 20 min",
          "Friday": "Leg Lengthening - Hamstring and calf stretches, forward folds, 20 min",
          "Saturday": "Full Body Integration - Combining all week's movements, 25 min",
          "Sunday": "Restorative Practice - Gentle holds, meditation, 20 min"
        },
        "Week 2": {
          "Monday": "Energizing Flow - More dynamic movements, building heat, 22 min",
          "Tuesday": "Deep Hip Work - Longer holds, hip flexor focus, 22 min",
          "Wednesday": "Spine & Core - Gentle core work with flexibility, 22 min",
          "Thursday": "Upper Body Freedom - Shoulder mobility, arm balances prep, 22 min",
          "Friday": "Lower Body Release - IT band, glutes, hamstrings, 22 min",
          "Saturday": "Moving Meditation - Flow and mindfulness combined, 25 min",
          "Sunday": "Yin Practice - Passive stretches, deep relaxation, 25 min"
        },
        "Week 3": {
          "Monday": "Power Vinyasa - Building strength in flexibility, 25 min",
          "Tuesday": "Hip Harmony - Advanced hip opening sequence, 25 min",
          "Wednesday": "Backbend Journey - Safe backbend progression, 25 min",
          "Thursday": "Arm Balance Play - Core strength meets flexibility, 25 min",
          "Friday": "Twisted Release - Spinal twists and leg stretches, 25 min",
          "Saturday": "Flow State - Continuous movement practice, 30 min",
          "Sunday": "Deep Rest - Extended relaxation, meditation, 25 min"
        },
        "Week 4": {
          "Monday": "Advanced Flow - Challenging sequences, 25 min",
          "Tuesday": "Hip Mastery - Deepest hip work yet, 25 min",
          "Wednesday": "Backbend Bliss - Full expression of backbends, 25 min",
          "Thursday": "Balance & Grace - Arm balances, inversions, 25 min",
          "Friday": "Flexibility Fusion - All areas combined, 25 min",
          "Saturday": "Personal Practice - Self-guided flow, 30 min",
          "Sunday": "Gratitude & Rest - Reflective practice, 25 min"
        }
      }
    },
    {
      id: 5,
      title: "Cardio Crusher",
      emoji: "🏃",
      type: "Cardio",
      difficulty: "Intermediate" as const,
      duration: "5 Weeks",
      timeCommitment: "35 min/day, 5x/week",
      gradient: "from-blue-400 to-cyan-500",
      schedulePreview: "Mon: Steady State, Tue: Intervals, Wed: Cross-training, Thu: Tempo, Fri: Fun Cardio",
      description: "Boost your cardiovascular fitness with varied cardio workouts. Improve endurance, burn calories, and have fun with different cardio modalities.",
      weeks: {
        "Week 1": {
          "Monday": "Steady State Run/Walk - 30 min moderate pace, build aerobic base",
          "Tuesday": "Interval Training - 5 min warm-up, 8x(2 min fast, 1 min easy), 5 min cool-down",
          "Wednesday": "Cross-Training - Bike, swim, or elliptical for 35 min",
          "Thursday": "Tempo Workout - 10 min easy, 15 min tempo pace, 10 min easy",
          "Friday": "Fun Cardio - Dance, hiking, sports, or favorite activity, 30-40 min",
          "Saturday": "Rest or gentle walk",
          "Sunday": "Rest day"
        },
        "Week 2": {
          "Monday": "Long Steady - 35 min moderate effort, conversation pace",
          "Tuesday": "Pyramid Intervals - Build up and down intensity, 30 min total",
          "Wednesday": "Strength Cardio - Circuit training with cardio elements, 35 min",
          "Thursday": "Tempo Plus - 10 min easy, 18 min tempo, 7 min easy",
          "Friday": "Adventure Cardio - Try something new and fun, 35 min",
          "Saturday": "Active recovery",
          "Sunday": "Rest day"
        },
        "Week 3": {
          "Monday": "Aerobic Build - 40 min steady with slight progressions",
          "Tuesday": "Speed Play - Fartlek training, vary pace naturally, 30 min",
          "Wednesday": "Multi-Modal - Combine 2-3 cardio types in one session, 35 min",
          "Thursday": "Threshold Work - 8 min easy, 20 min threshold effort, 7 min easy",
          "Friday": "Game Day Cardio - Competitive or team-based activity, 35 min",
          "Saturday": "Recovery movement",
          "Sunday": "Rest day"
        },
        "Week 4": {
          "Monday": "Endurance Test - 40 min steady, track how you feel vs week 1",
          "Tuesday": "Peak Intervals - Highest intensity intervals yet, 30 min",
          "Wednesday": "Cardio Strength Fusion - Heavy integration of strength and cardio, 35 min",
          "Thursday": "Time Trial - 25 min sustained effort, measure progress",
          "Friday": "Celebration Cardio - Fun, high-energy session, 35 min",
          "Saturday": "Easy movement",
          "Sunday": "Rest day"
        },
        "Week 5": {
          "Monday": "Mastery Distance - Longest steady cardio yet, 45 min",
          "Tuesday": "Ultimate Intervals - Most challenging interval session, 35 min",
          "Wednesday": "Your Choice Cross-Train - Pick your favorite alternative, 40 min",
          "Thursday": "Graduation Tempo - Final tempo test, 40 min",
          "Friday": "Victory Lap - Celebrate your progress with joyful movement, 30 min",
          "Saturday": "Gentle congratulatory activity",
          "Sunday": "Rest and reflect"
        }
      }
    },
    {
      id: 6,
      title: "Elite Athlete Prep",
      emoji: "🏆",
      type: "Strength",
      difficulty: "Advanced" as const,
      duration: "8 Weeks",
      timeCommitment: "60 min/day, 6x/week",
      gradient: "from-yellow-400 to-orange-500",
      schedulePreview: "Competition-level training. Strength, power, agility, and conditioning for peak performance.",
      description: "Elite-level training program for serious athletes and advanced fitness enthusiasts. Focuses on peak performance, power development, and competition preparation.",
      weeks: {
        "Week 1": {
          "Monday": "Max Strength - Squats 5x3@90%, Bench 5x3@90%, Deadlifts 3x3@95%",
          "Tuesday": "Power Development - Olympic lifts, plyometrics, explosive movements",
          "Wednesday": "Agility & Speed - Cone drills, sprint intervals, reaction training",
          "Thursday": "Upper Body Power - Weighted explosive movements, advanced variations",
          "Friday": "Conditioning - Sport-specific endurance, metabolic circuits",
          "Saturday": "Recovery & Mobility - Deep tissue work, movement prep",
          "Sunday": "Rest day"
        },
        "Week 2": {
          "Monday": "Strength Complex - Multi-exercise combinations, heavy loads",
          "Tuesday": "Plyometric Progression - Advanced jumping, bounding, reactive exercises",
          "Wednesday": "Speed & Agility Plus - More complex patterns, decision making",
          "Thursday": "Upper Body Dominance - Max effort upper body training",
          "Friday": "Peak Conditioning - Lactate threshold and VO2 max work",
          "Saturday": "Active Recovery & Assessment - Movement quality check",
          "Sunday": "Rest day"
        },
        "Week 3": {
          "Monday": "Competition Simulation - Training that mimics competitive demands",
          "Tuesday": "Explosive Power Peak - Maximum power output training",
          "Wednesday": "Elite Agility - Sport-specific movement patterns, game situations",
          "Thursday": "Upper Body Power Endurance - Sustained high-intensity upper work",
          "Friday": "Championship Conditioning - Peak aerobic and anaerobic systems",
          "Saturday": "Pre-Competition Prep - Light movement, mental preparation",
          "Sunday": "Complete rest"
        },
        "Week 4": {
          "Monday": "Deload Strength - Reduce volume, maintain intensity",
          "Tuesday": "Deload Power - Active recovery with light explosive work",
          "Wednesday": "Movement Quality - Perfect technique, mobility focus",
          "Thursday": "Light Upper - Maintain feel without fatigue",
          "Friday": "Easy Conditioning - Flush systems, prepare for next block",
          "Saturday": "Recovery & Regeneration",
          "Sunday": "Rest day"
        }
      }
    }
  ];

  // Functions to handle pre-made plans
  const handlePlanPreview = (plan: any) => {
    setSelectedPlan(plan);
    setIsPlanPreviewOpen(true);
  };

  const handleStartPlan = (plan: any) => {
    // Convert plan to routine format and add to user's routines
    const routineType = plan.type.toLowerCase();
    const newRoutine = {
      id: Date.now(),
      title: plan.title,
      emoji: plan.emoji,
      type: plan.type,
      routineType: routineType === "strength" ? "strength" as const : 
                   routineType === "hiit" ? "hiit" as const :
                   routineType === "cardio" ? "cardio" as const :
                   routineType === "yoga" ? "yoga" as const : "flexibility" as const,
      duration: plan.timeCommitment,
      gradient: plan.gradient,
      status: "not-started" as const,
      currentDay: 1,
      weeklyPlan: plan.weeks["Week 1"], // Use first week as the routine template
      notes: plan.description,
      createdAt: new Date().toISOString()
    };
    
    // For pre-made plans, we'll continue to use the mock approach for now
    // since these are different from custom user routines
    
    // Show success message or navigate to routines tab
    setActiveTab('my-routines');
  };

  const handleAddPlanToRoutines = (plan: any) => {
    handleStartPlan(plan);
  };

  // Body Scan AI handlers
  const handleBodyScanUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBodyScanFile(file);
      setBodyScanLoading(true);
      
      // Simulate processing time
      setTimeout(() => {
        setBodyScanLoading(false);
        setBodyScanResult({
          leftArm: "6%",
          rightArm: "8%",
          posture: "Slight Right Lean",
          focusAreas: "Left Shoulder, Core"
        });
      }, 3000);
    }
  };

  const tabs = [
    {
      id: 'my-routines',
      title: 'My Routines', 
      emoji: '🧠',
      content: 'This is where your custom workout routines will live.'
    },
    {
      id: 'workout-log',
      title: 'Workout Log',
      emoji: '📘',
      content: 'Here you will see your full workout log and stats.'
    },
    {
      id: 'progress-reports',
      title: 'Progress & Reports',
      emoji: '📈',
      content: 'Track your weekly and monthly workout stats here.'
    },
    {
      id: 'pre-made-plans',
      title: 'Pre-Made Plans',
      emoji: '🧩',
      content: 'Explore workout plans made for every fitness level.'
    }
  ];

  const handleBackClick = () => {
    navigate(originRoute);
  };


  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      {/* Silent goal initialization */}
      <ExerciseGoalsInitializer />
      
      {/* Header */}
      <div className="sticky top-0 z-[60]">
        <div className="relative left-1/2 -ml-[50vw] w-[100vw]">
          <div className="h-[var(--app-header-height,64px)] min-h-[var(--app-header-height,64px)] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b flex items-center px-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center">
              {/* Left Column - Back Button */}
              <div className="flex justify-start">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackClick}
                  className="rounded-full"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Center Column - Title */}
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">🏋️</span>
                <h1 className="text-xl font-bold whitespace-nowrap">Exercise & Recovery</h1>
              </div>
              
              {/* Right Column - Empty for balance */}
              <div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Body Scan Section */}
      <div className="mb-6 space-y-3">
        {/* AI Body Scan Analysis */}
        <button
          onClick={() => navigate('/body-scan-ai')}
          className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-300 to-blue-400 dark:from-purple-600 dark:to-blue-700 hover:from-purple-200 hover:to-blue-300 dark:hover:from-purple-500 dark:hover:to-blue-600 transition-all duration-300 transform hover:scale-[1.01] hover:shadow-2xl hover:shadow-purple-500/40 border border-purple-500/30 dark:border-purple-600/30 shadow-xl shadow-purple-500/25 group relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] before:animate-[shimmer_3s_ease-in-out_infinite] before:skew-x-12"
        >
          <div className="flex items-center justify-center gap-3 mb-1 relative z-10">
            <div className="flex items-center gap-4">
              <span className="text-5xl transition-transform duration-300 group-hover:scale-110 animate-camera-flash">🎯</span>
              <h2 className="text-xl font-bold text-black dark:text-white">AI Body Scan Analysis</h2>
            </div>
            <span className="text-sm opacity-70 transition-transform duration-300 group-hover:translate-x-1 text-black dark:text-white">→</span>
          </div>
          <p className="text-black/90 dark:text-white/90 text-sm opacity-90 relative z-10">
            Complete guided 3-step scan (front, side, back) for comprehensive posture analysis
          </p>
        </button>
      </div>

      {/* AI Routine Generator Hero Box */}
      <div className="w-full mb-6">
        <button
          onClick={() => setIsWorkoutPreferencesModalOpen(true)}
          className="group w-full p-4 rounded-xl bg-gradient-to-r from-purple-400 via-violet-500 to-fuchsia-400 dark:from-purple-600 dark:via-violet-700 dark:to-fuchsia-600 hover:from-purple-300 hover:via-violet-400 hover:to-fuchsia-300 dark:hover:from-purple-500 dark:hover:via-violet-600 dark:hover:to-fuchsia-500 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/30 border-0 overflow-hidden relative"
        >
          {/* Floating particles animation */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-2 left-4 w-2 h-2 bg-white rounded-full animate-[float_8s_ease-in-out_infinite]"></div>
            <div className="absolute top-4 right-8 w-1 h-1 bg-white rounded-full animate-[float_10s_ease-in-out_infinite_2s]"></div>
            <div className="absolute bottom-6 left-12 w-1.5 h-1.5 bg-white rounded-full animate-[float_12s_ease-in-out_infinite_4s]"></div>
            <div className="absolute bottom-3 right-6 w-1 h-1 bg-white rounded-full animate-[float_9s_ease-in-out_infinite_3s]"></div>
            <div className="absolute top-1/2 left-1/3 w-1 h-1 bg-white rounded-full animate-[float_11s_ease-in-out_infinite_1s]"></div>
          </div>
          
          <div className="flex items-center justify-center gap-3 mb-1 relative z-10">
            <div className="flex items-center gap-4">
              <span className="text-5xl transition-transform duration-300 group-hover:scale-110 animate-extra-slow-pulse">🤖</span>
              <h2 className="text-xl font-bold text-black dark:text-white">AI Routine Generator</h2>
            </div>
            <span className="text-sm opacity-70 transition-transform duration-300 group-hover:translate-x-1 text-black dark:text-white">→</span>
          </div>
          <p className="text-black/90 dark:text-white/90 text-sm opacity-90 relative z-10">
            Let the AI build your 8-week fitness plan and monitor your progress
          </p>
        </button>
        
      </div>

      {/* Recovery Center Tab */}
      <div className="w-full mb-6">
        <button
          onClick={() => navigate('/recovery-center')}
          className="w-full p-4 rounded-xl bg-gradient-to-r from-[#FFE6B3] to-[#FFAD80] dark:from-[#FFB347] dark:to-[#FF7043] hover:from-[#FFEECC] hover:to-[#FFC299] dark:hover:from-[#FFC470] dark:hover:to-[#FF8A65] transition-all duration-300 transform hover:scale-[1.01] hover:shadow-2xl hover:shadow-[#FF8C66]/40 border border-[#FFD580]/30 dark:border-[#FFB347]/30 shadow-xl shadow-[#FF8C66]/25 group relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] before:animate-[shimmer_3s_ease-in-out_infinite] before:skew-x-12"
        >
          <div className="flex items-center justify-center gap-3 mb-1 relative z-10">
            <span className="text-5xl transition-transform duration-300 group-hover:scale-110 animate-breathe drop-shadow-lg">🧘</span>
            <h2 className="text-xl font-bold text-black dark:text-white">Recovery Center</h2>
            <span className="text-sm opacity-70 transition-transform duration-300 group-hover:translate-x-1 text-black dark:text-white">→</span>
          </div>
          <p className="text-black/90 dark:text-white/90 text-sm opacity-90 relative z-10">
            Your wellness guide for rest, recovery, and mindfulness
          </p>
        </button>
      </div>

      {/* Action Buttons Group - Side by Side in Container */}
      <div className="w-full mb-6">
        <div className="bg-white dark:bg-gray-700 rounded-2xl p-3 md:p-4 shadow-lg border border-gray-200 dark:border-gray-500">
          <div className="flex gap-3 md:gap-4">
            {/* Add Workout Button */}
            <Button
              onClick={() => setIsAddWorkoutModalOpen(true)}
              className="flex-1 h-12 bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-500 hover:from-emerald-300 hover:via-cyan-400 hover:to-blue-400 text-white font-medium text-sm md:text-base rounded-xl shadow-lg hover:shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 hover:scale-105 hover:brightness-110 flex items-center justify-center min-w-0"
            >
              <Plus className="mr-1.5 md:mr-2 h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
              <span className="truncate">Add Workout</span>
            </Button>

            {/* New Routine Button */}
            <Button
              onClick={() => setIsCreateRoutineModalOpen(true)}
              className="flex-1 h-12 bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 hover:from-purple-300 hover:via-pink-400 hover:to-purple-500 text-white font-medium text-sm md:text-base rounded-xl shadow-lg hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:brightness-110 flex items-center justify-center min-w-0"
            >
              <Plus className="mr-1.5 md:mr-2 h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
              <span className="truncate">New Routine</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Add extra vertical spacing before Exercise Hub section */}
      <div className="mt-8 py-4">
        {/* Enhanced section title with fitness icon and better styling */}
        <div className="text-center mb-4 px-4">
          <h2 className="text-xl font-semibold text-foreground/80">💪 Your Exercise Hub</h2>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6" ref={tabsRef}>
          {/* Separator line to distinguish tabs section */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mb-6"></div>
          
          {/* 4 tabs in grid with consistent spacing */}
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          {tabs.slice(0, 4).map((tab) => (
            <Button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as 'workout-log' | 'my-routines' | 'progress-reports' | 'pre-made-plans');
                // Scroll to completely hide the section above the tabs
                if (tabsRef.current) {
                  const offsetTop = tabsRef.current.offsetTop - 80; // Smaller offset to scroll higher and hide buttons
                  window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                  });
                }
              }}
              variant={activeTab === tab.id ? "default" : "outline"}
              className={`
                relative h-16 p-3 rounded-xl transition-all duration-300 ease-out
                flex flex-col items-center justify-center gap-1
                ${activeTab === tab.id 
                  ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
                  : 'bg-card hover:bg-accent hover:text-accent-foreground border-border'
                }
              `}
            >
              <div className={`${isMobile ? 'text-2xl' : 'text-3xl'} transition-transform duration-300 ${
                activeTab === tab.id ? 'scale-110' : ''
              } -mb-1`}>
                {tab.emoji}
              </div>
              <span className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-center leading-tight`}>
                {tab.title}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`transition-all duration-500 ease-out ${
              activeTab === tab.id 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-4 absolute pointer-events-none'
            }`}
          >
            {activeTab === tab.id && (
              <>
                {/* Workout Log Tab - Enhanced */}
                {tab.id === 'workout-log' ? (
                  <div className="space-y-6">
                    {/* Workout History Header */}
                    <div className="text-center mb-4">
                      <h2 className="text-2xl font-bold text-foreground mb-2">Workout History</h2>
                      <p className="text-muted-foreground">Your complete fitness journey</p>
                    </div>

                    {/* Workout Entries */}
                    <div className="space-y-4">
                      {workoutsLoading ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map((i) => (
                            <Card key={i} className="w-full">
                              <CardContent className="p-6">
                                <div className="animate-pulse">
                                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                                  <div className="h-3 bg-muted rounded w-1/2"></div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        realWorkouts.map((workout) => (
                        <Card key={workout.id} className="w-full shadow-lg border-border bg-card hover:shadow-xl transition-all duration-300 hover:scale-[1.02] mb-0 !mb-0">
                          <CardContent className="p-0">
                            <div className={`bg-gradient-to-r ${workout.gradient} p-1 rounded-t-lg`} />
                            <div className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  <div className="text-4xl cursor-pointer transition-transform duration-200 hover:animate-bounce active:scale-110">{workout.emoji}</div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="text-xl font-bold text-foreground drop-shadow-sm">{workout.name}</h3>
                                      <span className="px-2 py-1 text-xs bg-muted rounded-full text-muted-foreground font-medium">{workout.type}</span>
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                      <div className="flex items-center">
                                        <Timer className="mr-1 h-3 w-3" />
                                        {workout.date} at {workout.time}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Workout Summary */}
                              <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium">Summary:</span> {workout.summary}
                                </p>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center space-x-2 bg-muted/50 rounded-lg p-3">
                                  <Clock className="h-4 w-4 text-blue-500" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Duration</p>
                                    <p className="font-semibold text-foreground drop-shadow-sm">{workout.duration}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2 bg-muted/50 rounded-lg p-3">
                                  <Flame className="h-4 w-4 text-orange-500" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Calories</p>
                                    <p className="font-semibold text-foreground drop-shadow-sm">{workout.calories}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        ))
                      )}
                    </div>

                    {/* Empty State (if no workouts) */}
                    {!workoutsLoading && realWorkouts.length === 0 && (
                       <Card className="w-full shadow-lg border-border bg-card mb-0 !mb-0">
                        <CardContent className="p-8 text-center">
                          <div className="text-4xl mb-4">📘</div>
                          <h3 className="text-xl font-bold text-foreground mb-2">No workouts logged yet</h3>
                          <p className="text-muted-foreground mb-6">Start tracking your fitness journey!</p>
                          <Button
                            onClick={() => setIsAddWorkoutModalOpen(true)}
                            className="bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-white"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Your First Workout
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : tab.id === 'my-routines' ? (
                  /* My Routines Tab - Enhanced */
                  <div className="space-y-6">

                    {/* View My Active AI Routine Section */}
                    <Card className="w-full shadow-lg border-border bg-card">
                      <CardContent className="p-6">
                        <div className="text-center mb-4">
                          <h3 className="text-xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                            <span className="text-2xl">🤖</span>
                            View My Active AI Routine
                          </h3>
                          <p className="text-muted-foreground">Your personalized 8-week workout plan</p>
                        </div>
                        
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Progress</span>
                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Week 3 of 8</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 mb-2">
                            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" style={{ width: '37.5%' }}></div>
                          </div>
                          <p className="text-sm text-muted-foreground">Next: Push Day • Upper Body Focus</p>
                        </div>

                        <Button
                          onClick={() => navigate('/ai-routine-viewer')}
                          className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold"
                        >
                          <span className="text-lg mr-2">📅</span>
                          View Full 8-Week Plan
                          <span className="ml-2 text-sm opacity-80">→</span>
                        </Button>
                      </CardContent>
                    </Card>


                    {/* Your Saved Routines Header */}
                    <div className="text-center mb-4 mt-8">
                      <h2 className="text-2xl font-bold text-foreground mb-2">Your Saved Routines</h2>
                      <p className="text-muted-foreground">Custom workout plans tailored for you</p>
                    </div>


                    {/* Primary Routine Section */}
                    <div className="mb-8">
                      {routinesLoading ? (
                        <div className="text-center py-8">
                          <div className="text-muted-foreground">Loading your primary routine...</div>
                        </div>
                      ) : primaryRoutine ? (
                        <div className="relative">
                          <AIRoutineCard
                            routine={{
                              id: primaryRoutine.id,
                              routine_name: primaryRoutine.routine_name,
                              routine_goal: primaryRoutine.routine_goal || 'Build strength and fitness',
                              fitness_level: primaryRoutine.fitness_level,
                              split_type: primaryRoutine.split_type,
                              days_per_week: primaryRoutine.days_per_week,
                              estimated_duration_minutes: primaryRoutine.session_duration_minutes,
                              equipment_needed: primaryRoutine.equipment_needed || primaryRoutine.equipment_available || [],
                              start_date: primaryRoutine.start_date || null,
                              current_week: primaryRoutine.current_week || 1,
                              current_day_in_week: primaryRoutine.current_day_in_week || 1,
                              is_active: primaryRoutine.is_active,
                              locked_days: {},
                              routine_data: primaryRoutine.weekly_routine_data,
                              created_at: primaryRoutine.created_at
                            }}
                            onEdit={() => {
                              console.log('Edit primary routine:', primaryRoutine.routine_name);
                            }}
                            onDelete={() => {
                              deactivateRoutine(primaryRoutine.id, primaryRoutine.source);
                            }}
                          />
                          <div className="absolute top-2 right-2 z-10">
                            <RoutineBadge 
                              source={primaryRoutine.source} 
                              isActive={primaryRoutine.is_active}
                            />
                          </div>
                        </div>
                      ) : (
                        <Card className="w-full shadow-lg border-border bg-card">
                          <CardContent className="p-8 text-center">
                            <div className="text-4xl mb-4">🎯</div>
                            <h3 className="text-xl font-bold text-foreground mb-2">No Primary Routine Active</h3>
                            <p className="text-muted-foreground mb-6">Activate a routine as your primary workout plan to get started!</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Supplemental Routines Section */}
                    <div>
                      {routinesLoading ? (
                        <div className="text-center py-8">
                          <div className="text-muted-foreground">Loading supplemental routines...</div>
                        </div>
                      ) : supplementalRoutines.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {supplementalRoutines.map((routine) => (
                            <div key={routine.id} className="relative">
                              <AIRoutineCard
                                routine={{
                                  id: routine.id,
                                  routine_name: routine.routine_name,
                                  routine_goal: routine.routine_goal || 'Supplemental training',
                                  fitness_level: routine.fitness_level,
                                  split_type: routine.split_type,
                                  days_per_week: routine.days_per_week,
                                  estimated_duration_minutes: routine.session_duration_minutes,
                                  equipment_needed: routine.equipment_needed || routine.equipment_available || [],
                                  start_date: routine.start_date || null,
                                  current_week: routine.current_week || 1,
                                  current_day_in_week: routine.current_day_in_week || 1,
                                  is_active: routine.is_active,
                                  locked_days: {},
                                  routine_data: routine.weekly_routine_data,
                                  created_at: routine.created_at
                                }}
                                onEdit={() => {
                                  console.log('Edit supplemental routine:', routine.routine_name);
                                }}
                                onDelete={() => {
                                  deactivateRoutine(routine.id, routine.source);
                                }}
                              />
                              <div className="absolute top-2 right-2 z-10">
                                <RoutineBadge 
                                  source={routine.source} 
                                  isActive={routine.is_active}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Card className="w-full shadow-lg border-border bg-card">
                          <CardContent className="p-8 text-center">
                            <div className="text-4xl mb-4">💪</div>
                            <h3 className="text-xl font-bold text-foreground mb-2">No Supplemental Routines</h3>
                            <p className="text-muted-foreground mb-6">Add supplemental routines like yoga, cardio, or flexibility training to complement your primary routine!</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                ) : tab.id === 'progress-reports' ? (
                  /* Progress & Reports Tab - Enhanced with Visual Experience */
                  <div>
                    {/* Header with motivational badge */}
                    <div className="mb-8">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-foreground mb-2">Your Fitness Progress</h2>
                        <p className="text-muted-foreground mb-4">Track your journey with detailed insights and analytics</p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-sm font-semibold rounded-full shadow-lg">
                          🏆 You're Crushing It!
                        </div>
                      </div>
                    </div>

                    {/* Monthly Achievement Card */}
                    <div className="mb-8">
                      <WorkoutTrophyCard />
                    </div>

                    {/* Weekly Goal Card */}
                    <div className="mb-8">
                      <WeeklyGoalCard />
                    </div>

                    {/* Monthly Progress Calendar */}
                    <div className="mb-8">
                      <WorkoutProgressCalendar />
                    </div>

                    {/* Workout Streak & Progress */}
                    <div className="mb-8">
                      <EnhancedStreakTracker />
                    </div>

                    {/* Weekly Training Volume Chart */}
                    <div className="mb-8">
                      <WorkoutVolumeChart />
                    </div>

                    {/* Muscle Group Balance Chart */}
                    <div className="mb-8">
                      <div>
                        <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          🎯 Muscle Group Balance
                        </h4>
                        <MuscleGroupRadarChart data={[
                          { muscle: 'Legs', frequency: 12, fullMark: 15 },
                          { muscle: 'Arms', frequency: 8, fullMark: 15 },
                          { muscle: 'Core', frequency: 10, fullMark: 15 },
                          { muscle: 'Back', frequency: 6, fullMark: 15 },
                          { muscle: 'Chest', frequency: 5, fullMark: 15 },
                          { muscle: 'Shoulders', frequency: 7, fullMark: 15 }
                        ]} />
                      </div>
                    </div>

                    {/* Muscle Group Trends Section */}
                    <div className="mb-8">
                      <MuscleGroupTrendsSection />
                    </div>

                    {/* AI Progress Overview */}
                    <div className="mb-8">
                      <ProgressOverviewCard />
                    </div>

                    {/* AI Workout Forecast */}
                    <div className="mb-8">
                      <WorkoutForecastChart />
                    </div>

                    {/* Coach Motivation Card */}
                    <div className="mb-8">
                      <Card>
                        <CardHeader>
                          <h3 className="text-lg font-semibold">💬 Coach Motivation</h3>
                        </CardHeader>
                        <CardContent>
                          <MotivationCard />
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed Reports Header */}
                    <div className="mb-8">
                      <div className="text-center">
                        <h3 className="text-xl font-bold text-foreground mb-2">📊 Detailed Reports</h3>
                        <p className="text-muted-foreground text-sm">Comprehensive insights and analysis</p>
                      </div>
                    </div>

                    {/* Weekly Exercise Insights Card */}
                    <div className="mb-8">
                      <WeeklyExerciseInsightsCard />
                    </div>

                    {/* Monthly Exercise Report Card */}
                    <div className="mb-8">
                      <MonthlyExerciseReportCard />
                    </div>

                    {/* Yearly Exercise Report Card */}
                    <div className="mb-8">
                      <YearlyExerciseReportCard />
                    </div>

                    {/* Body Scan Results Access */}
                    <div className="mb-8">
                      <Card className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-cyan-500/10 border-2 border-blue-500/30">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="p-2 rounded-full bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                              <Camera className="h-6 w-6 text-blue-600 animate-pulse" />
                            </div>
                            📊 Latest Scan Result
                          </CardTitle>
                          <p className="text-muted-foreground">View your latest body scan analysis and posture insights</p>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            onClick={() => navigate('/body-scan-result')}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg group-hover:shadow-xl transition-all duration-300"
                            size="lg"
                          >
                            <span className="mr-2">📊</span>
                            View Body Scan Results
                            <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : tab.id === 'pre-made-plans' ? (
                  /* Pre-Made Plans Tab - Enhanced */
                  <div className="space-y-6">
                    {/* Curated Plans Header */}
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-foreground mb-2">Curated Workout Plans</h2>
                      <p className="text-muted-foreground">Choose a plan and start training with confidence</p>
                    </div>

                    {/* Pre-Made Plans Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {mockPreMadePlans.map((plan) => (
                        <PreMadePlanCard
                          key={plan.id}
                          plan={plan}
                          onPreview={handlePlanPreview}
                          onStartPlan={handleStartPlan}
                        />
                      ))}
                    </div>

                    {/* Empty State (if no plans) */}
                    {mockPreMadePlans.length === 0 && (
                       <Card className="w-full shadow-lg border-border bg-card mb-0 !mb-0">
                        <CardContent className="p-8 text-center">
                          <div className="text-4xl mb-4">🧩</div>
                          <h3 className="text-xl font-bold text-foreground mb-2">No plans yet?</h3>
                          <p className="text-muted-foreground mb-6">Don't worry—we've got you covered with amazing workout plans!</p>
                          <div className="inline-flex items-center px-4 py-2 rounded-full bg-muted text-muted-foreground border border-border">
                            <span className="text-sm font-medium">Plans coming soon</span>
                          </div>
                        </CardContent>
                      </Card>
                     )}
                   </div>
                  ) : tab.id === 'body-scan-ai' ? (
                    /* Body Scan AI Tab */
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-foreground mb-2">📸 Body Scan AI — Analyze Your Physique</h2>
                        <p className="text-muted-foreground">Upload a body photo to analyze muscle symmetry, posture alignment, and get personalized recommendations.</p>
                      </div>

                      {/* Upload Section */}
                      {!bodyScanFile && !bodyScanResult && (
                         <Card className="w-full shadow-lg border-border bg-card mb-0 !mb-0">
                          <CardContent className="p-8">
                            <div className="text-center">
                              <div className="mb-6">
                                <Camera className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                              </div>
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleBodyScanUpload}
                                  className="hidden"
                                />
                                <Button className="w-full max-w-md h-14 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105">
                                  <Upload className="mr-2 h-5 w-5" />
                                  Upload Body Photo
                                </Button>
                              </label>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Loading Section */}
                      {bodyScanLoading && (
                         <Card className="w-full shadow-lg border-border bg-card mb-0 !mb-0">
                          <CardContent className="p-8">
                            <div className="text-center">
                              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
                              <h3 className="text-lg font-semibold mb-2">Analyzing Your Body...</h3>
                              <p className="text-muted-foreground">Our AI is processing your photo and generating insights.</p>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Results Section */}
                      {bodyScanResult && !bodyScanLoading && (
                         <Card className="w-full shadow-lg border-border bg-card mb-0 !mb-0">
                          <CardHeader>
                            <CardTitle className="text-center">🧠 AI Body Scan Report</CardTitle>
                          </CardHeader>
                          <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-muted rounded-lg p-4">
                                <h4 className="font-semibold text-sm text-muted-foreground mb-1">Left Arm Muscle Mass</h4>
                                <p className="text-2xl font-bold text-foreground">{bodyScanResult.leftArm}</p>
                              </div>
                              <div className="bg-muted rounded-lg p-4">
                                <h4 className="font-semibold text-sm text-muted-foreground mb-1">Right Arm Muscle Mass</h4>
                                <p className="text-2xl font-bold text-foreground">{bodyScanResult.rightArm}</p>
                              </div>
                              <div className="bg-muted rounded-lg p-4">
                                <h4 className="font-semibold text-sm text-muted-foreground mb-1">Posture</h4>
                                <p className="text-2xl font-bold text-foreground">{bodyScanResult.posture}</p>
                              </div>
                              <div className="bg-muted rounded-lg p-4">
                                <h4 className="font-semibold text-sm text-muted-foreground mb-1">Suggested Focus Areas</h4>
                                <p className="text-2xl font-bold text-foreground">{bodyScanResult.focusAreas}</p>
                              </div>
                            </div>
                            <div className="mt-6 text-center">
                              <Button 
                                onClick={() => {
                                  setBodyScanFile(null);
                                  setBodyScanResult(null);
                                }}
                                variant="outline"
                                className="w-full max-w-md"
                              >
                                Scan Another Photo
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : tab.id === 'recovery-center' ? (
                    /* Recovery Center Tab */
                    <div className="space-y-8">
                      {/* Welcome Section */}
                      <div className="text-center mb-8">
                        <div className="text-6xl mb-4 animate-breathe">🧘</div>
                        <h2 className="text-3xl font-bold text-foreground mb-3">Recovery Center</h2>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                          Find your inner peace and restore your body with guided wellness practices
                        </p>
                      </div>

                      {/* Recovery Tiles Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {/* Guided Meditation */}
                        <Card className="group cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20 border-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-900/30 rounded-3xl overflow-hidden">
                          <CardContent className="p-8 text-center space-y-4">
                            <div className="text-5xl mb-4 group-hover:animate-gentle-float">🧘</div>
                            <h3 className="text-xl font-bold text-foreground">Guided Meditation</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                              Peaceful guided sessions to calm your mind and reduce stress
                            </p>
                            <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="w-8 h-1 bg-blue-500 rounded-full mx-auto"></div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Breathing Exercises */}
                        <Card className="group cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20 border-0 bg-gradient-to-br from-cyan-50 to-teal-100 dark:from-cyan-950/30 dark:to-teal-900/30 rounded-3xl overflow-hidden">
                          <CardContent className="p-8 text-center space-y-4">
                            <div className="text-5xl mb-4 group-hover:animate-breathe">🌬️</div>
                            <h3 className="text-xl font-bold text-foreground">Breathing Exercises</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                              Controlled breathing techniques to center yourself and improve focus
                            </p>
                            <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="w-8 h-1 bg-cyan-500 rounded-full mx-auto"></div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Stretching Routines */}
                        <Card className="group cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20 border-0 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/30 rounded-3xl overflow-hidden">
                          <CardContent className="p-8 text-center space-y-4">
                            <div className="text-5xl mb-4 group-hover:animate-gentle-float">🤸</div>
                            <h3 className="text-xl font-bold text-foreground">Stretching Routines</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                              Gentle stretches to improve flexibility and release muscle tension
                            </p>
                            <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="w-8 h-1 bg-green-500 rounded-full mx-auto"></div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Yoga Flows */}
                        <Card className="group cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 border-0 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950/30 dark:to-violet-900/30 rounded-3xl overflow-hidden">
                          <CardContent className="p-8 text-center space-y-4">
                            <div className="text-5xl mb-4 group-hover:animate-gentle-float">🧎</div>
                            <h3 className="text-xl font-bold text-foreground">Yoga Flows</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                              Flowing sequences to build strength, flexibility, and mindfulness
                            </p>
                            <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="w-8 h-1 bg-purple-500 rounded-full mx-auto"></div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Muscle Recovery */}
                        <Card className="group cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/20 border-0 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/30 dark:to-amber-900/30 rounded-3xl overflow-hidden">
                          <CardContent className="p-8 text-center space-y-4">
                            <div className="text-5xl mb-4 group-hover:animate-slow-pulse">💆</div>
                            <h3 className="text-xl font-bold text-foreground">Muscle Recovery</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                              Targeted techniques to relieve muscle soreness and aid recovery
                            </p>
                            <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="w-8 h-1 bg-orange-500 rounded-full mx-auto"></div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Sleep Preparation */}
                        <Card className="group cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/20 border-0 bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-indigo-950/30 dark:to-slate-900/30 rounded-3xl overflow-hidden">
                          <CardContent className="p-8 text-center space-y-4">
                            <div className="text-5xl mb-4 group-hover:animate-breathe">💤</div>
                            <h3 className="text-xl font-bold text-foreground">Sleep Preparation</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                              Relaxing practices to prepare your body and mind for restful sleep
                            </p>
                            <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="w-8 h-1 bg-indigo-500 rounded-full mx-auto"></div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Mindfulness Prompts */}
                        <Card className="group cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/20 border-0 bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-950/30 dark:to-rose-900/30 rounded-3xl overflow-hidden md:col-span-2 lg:col-span-1">
                          <CardContent className="p-8 text-center space-y-4">
                            <div className="text-5xl mb-4 group-hover:animate-gentle-float">💭</div>
                            <h3 className="text-xl font-bold text-foreground">Mindfulness Prompts</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                              Daily affirmations and mindful exercises to cultivate inner peace
                            </p>
                            <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="w-8 h-1 bg-pink-500 rounded-full mx-auto"></div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Bottom Message */}
                      <div className="text-center mt-12 p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200/30 dark:border-blue-800/30">
                        <p className="text-muted-foreground text-sm italic">
                          "Take time to rest. A field that has rested gives a beautiful harvest." - Ovid
                        </p>
                      </div>
                    </div>
                  ) : (
                   /* Other Tabs - Keep Original Design */
                   <Card className="w-full shadow-lg border-border bg-card mb-0 !mb-0">
                    <CardContent className="p-8">
                      <div className="text-center space-y-6">
                        {/* Large Emoji */}
                        <div className="text-6xl mb-4">
                          {tab.emoji}
                        </div>
                        
                        {/* Title */}
                        <h2 className="text-2xl font-bold text-foreground mb-4">
                          {tab.title}
                        </h2>
                        
                        {/* Placeholder Content */}
                        <div className="max-w-md mx-auto">
                          <p className="text-muted-foreground text-lg leading-relaxed">
                            {tab.content}
                          </p>
                        </div>

                        {/* Coming Soon Badge */}
                        <div className="mt-8">
                          <div className="inline-flex items-center px-4 py-2 rounded-full bg-muted text-muted-foreground border border-border">
                            <span className="text-sm font-medium">Coming Soon</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Explore More Plans Modal */}
      <Dialog open={isExploreMoreModalOpen} onOpenChange={setIsExploreMoreModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Explore More Plans</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🧩</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">More Workout Plans</h3>
            <p className="text-muted-foreground">Coming soon!</p>
            <Button 
              onClick={() => setIsExploreMoreModalOpen(false)}
              className="mt-6 bg-gradient-to-r from-purple-400 to-pink-600 hover:from-purple-500 hover:to-pink-700 text-white"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plan Preview Modal */}
      <PlanPreviewModal
        plan={selectedPlan}
        isOpen={isPlanPreviewOpen}
        onClose={() => setIsPlanPreviewOpen(false)}
        onAddToRoutines={handleAddPlanToRoutines}
      />

      {/* Add Workout Modal */}
      <AddWorkoutModal
        isOpen={isAddWorkoutModalOpen}
        onClose={() => setIsAddWorkoutModalOpen(false)}
        onSave={(newWorkout) => {
          // Refresh workout data after adding new workout
          refreshWorkoutData();
        }}
      />

      {/* Create Routine Modal */}
      <CreateRoutineModal
        isOpen={isCreateRoutineModalOpen}
        onClose={() => {
          setIsCreateRoutineModalOpen(false);
          setEditingRoutine(null);
        }}
        onSave={handleSaveRoutine}
        editingRoutine={editingRoutine}
      />

      {/* Workout Preferences Modal */}
      <WorkoutPreferencesModal
        isOpen={isWorkoutPreferencesModalOpen}
        onClose={() => setIsWorkoutPreferencesModalOpen(false)}
        onRoutineCreated={(routine) => {
          console.log('AI Routine created:', routine);
          // Optionally refresh the routines list or navigate
        }}
      />
      </div> {/* Close the mt-6 wrapper div */}
    </div>
  );
};

export default ExerciseHub;
