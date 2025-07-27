import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Clock, Flame, Timer, Calendar, TrendingUp, Target, Award, Activity, Upload, Loader2, Camera } from 'lucide-react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIsMobile } from '@/hooks/use-mobile';
import { AddWorkoutModal } from '@/components/AddWorkoutModal';
import { CreateRoutineModal } from '@/components/CreateRoutineModal';
import { RoutineCard } from '@/components/RoutineCard';
import { ExerciseProgressChart } from '@/components/analytics/ExerciseProgressChart';
import { WorkoutTypesChart } from '@/components/analytics/WorkoutTypesChart';
import { ExerciseStatsCard } from '@/components/analytics/ExerciseStatsCard';
import { DateFilterSelect } from '@/components/analytics/DateFilterSelect';
import { PreMadePlanCard } from '@/components/PreMadePlanCard';
import { PlanPreviewModal } from '@/components/PlanPreviewModal';

import { MonthlyExerciseReportCard } from '@/components/exercise/MonthlyExerciseReportCard';
import { YearlyExerciseReportCard } from '@/components/exercise/YearlyExerciseReportCard';
import { WeeklyExerciseInsightsCard } from "@/components/analytics/WeeklyExerciseInsightsCard";

const ExerciseHub = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'workout-log' | 'my-routines' | 'progress-reports' | 'pre-made-plans'>('workout-log');
  const [isAddWorkoutModalOpen, setIsAddWorkoutModalOpen] = useState(false);
  const [isCreateRoutineModalOpen, setIsCreateRoutineModalOpen] = useState(false);
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

  // Store the origin route when entering Exercise Hub
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

  // Enhanced mock workout data with complete workout history - make it dynamic
  const [mockWorkouts, setMockWorkouts] = useState([
    {
      id: 1,
      name: "Upper Body Strength",
      emoji: "🏋️",
      type: "Strength",
      duration: "45 minutes",
      calories: "320 kcal",
      date: "2024-01-23",
      time: "09:30 AM",
      summary: "Bench press, shoulder press, rows, pull-ups",
      gradient: "from-orange-300 to-red-500"
    },
    {
      id: 2,
      name: "Morning Cardio Run",
      emoji: "🏃",
      type: "Cardio", 
      duration: "30 minutes",
      calories: "280 kcal",
      date: "2024-01-23",
      time: "07:00 AM",
      summary: "5K outdoor run around the park",
      gradient: "from-blue-300 to-cyan-500"
    },
    {
      id: 3,
      name: "Evening Yoga Flow",
      emoji: "🧘",
      type: "Flexibility",
      duration: "25 minutes", 
      calories: "150 kcal",
      date: "2024-01-22",
      time: "06:30 PM",
      summary: "Vinyasa flow, sun salutations, meditation",
      gradient: "from-purple-300 to-pink-500"
    }
  ]);

  // Function to handle adding new workouts
  const handleAddWorkout = (newWorkout: any) => {
    setMockWorkouts(prev => [newWorkout, ...prev]); // Add to beginning of array
  };

  // Enhanced mock routine data - make it dynamic
  const [mockRoutines, setMockRoutines] = useState([
    {
      id: 1,
      title: "Push/Pull/Legs Split",
      emoji: "🏋️",
      type: "Strength",
      routineType: "strength",
      duration: "60-75 minutes",
      gradient: "from-red-400 to-orange-600",
      weeklyPlan: {
        Monday: "Push: Bench press 3x8, Shoulder press 3x10, Tricep dips 3x12",
        Tuesday: "Pull: Pull-ups 3x8, Rows 3x10, Bicep curls 3x12",
        Wednesday: "Legs: Squats 3x10, Deadlifts 3x8, Calf raises 3x15",
        Thursday: "Push: Incline press 3x8, Lateral raises 3x12, Push-ups 3x15",
        Friday: "Pull: Lat pulldowns 3x10, Face pulls 3x15, Hammer curls 3x12",
        Saturday: "Legs: Leg press 3x12, Romanian deadlifts 3x10, Lunges 3x12",
        Sunday: "Rest day"
      },
      notes: "Progressive overload each week. Rest 2-3 minutes between sets.",
      createdAt: "2024-01-20T10:00:00Z"
    },
    {
      id: 2,
      title: "Morning HIIT Routine",
      emoji: "⚡",
      type: "HIIT",
      routineType: "hiit",
      duration: "25-30 minutes",
      gradient: "from-yellow-400 to-orange-600",
      weeklyPlan: {
        Monday: "Burpees 30s, Rest 30s, Jump squats 30s, Rest 30s - Repeat 5 rounds",
        Tuesday: "Rest day",
        Wednesday: "Mountain climbers 30s, Rest 30s, High knees 30s, Rest 30s - Repeat 5 rounds",
        Thursday: "Rest day",
        Friday: "Jumping jacks 30s, Rest 30s, Plank 30s, Rest 30s - Repeat 5 rounds",
        Saturday: "Full body HIIT circuit - 40 minutes",
        Sunday: "Active recovery walk"
      },
      notes: "High intensity intervals for maximum fat burn. Stay hydrated!",
      createdAt: "2024-01-18T08:00:00Z"
    }
  ]);

  // Function to handle adding/editing routines
  const handleSaveRoutine = (newRoutine: any) => {
    if (newRoutine.id && mockRoutines.find(r => r.id === newRoutine.id)) {
      // Edit existing routine
      setMockRoutines(prev => prev.map(r => r.id === newRoutine.id ? newRoutine : r));
    } else {
      // Add new routine
      setMockRoutines(prev => [newRoutine, ...prev]);
    }
  };

  // Function to handle duplicating routines
  const handleDuplicateRoutine = (routine: any) => {
    const duplicatedRoutine = {
      ...routine,
      id: Date.now(),
      title: `${routine.title} (Copy)`,
      createdAt: new Date().toISOString()
    };
    setMockRoutines(prev => [duplicatedRoutine, ...prev]);
  };

  // State for editing routines
  const [editingRoutine, setEditingRoutine] = useState<any>(null);

  // Mock progress data for charts
  const mockProgressData = [
    { date: '2024-01-15', duration: 45 },
    { date: '2024-01-16', duration: 30 },
    { date: '2024-01-17', duration: 0 },
    { date: '2024-01-18', duration: 60 },
    { date: '2024-01-19', duration: 35 },
    { date: '2024-01-20', duration: 50 },
    { date: '2024-01-21', duration: 25 },
    { date: '2024-01-22', duration: 45 },
    { date: '2024-01-23', duration: 75 },
    { date: '2024-01-24', duration: 40 },
    { date: '2024-01-25', duration: 55 },
    { date: '2024-01-26', duration: 30 },
    { date: '2024-01-27', duration: 65 },
    { date: '2024-01-28', duration: 50 }
  ];

  const mockWorkoutTypesData = [
    { type: 'Strength', count: 12, emoji: '🏋️', color: '#f59e0b' },
    { type: 'Cardio', count: 8, emoji: '🏃', color: '#3b82f6' },
    { type: 'Flexibility', count: 6, emoji: '🧘', color: '#8b5cf6' },
    { type: 'HIIT', count: 4, emoji: '⚡', color: '#ef4444' }
  ];

  const mockExerciseStats = [
    {
      icon: Activity,
      label: 'Total Workouts Logged',
      value: '30',
      color: 'from-blue-400 to-cyan-500'
    },
    {
      icon: Clock,
      label: 'Total Minutes Exercised',
      value: '1,350',
      color: 'from-emerald-400 to-teal-500'
    },
    {
      icon: TrendingUp,
      label: 'Avg. Weekly Frequency',
      value: '4.2 days',
      color: 'from-orange-400 to-red-500'
    },
    {
      icon: Flame,
      label: 'Longest Streak',
      value: '12 days',
      color: 'from-purple-400 to-pink-500'
    },
    {
      icon: Target,
      label: 'Favorite Routine',
      value: 'Push/Pull/Legs',
      color: 'from-green-400 to-emerald-500'
    },
    {
      icon: Award,
      label: 'Most Logged Type',
      value: '🏋️ Strength',
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
    const newRoutine = {
      id: Date.now(),
      title: plan.title,
      emoji: plan.emoji,
      type: plan.type,
      routineType: plan.type.toLowerCase(),
      duration: plan.timeCommitment,
      gradient: plan.gradient,
      weeklyPlan: plan.weeks["Week 1"], // Use first week as the routine template
      notes: plan.description,
      createdAt: new Date().toISOString()
    };
    
    setMockRoutines(prev => [newRoutine, ...prev]);
    
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
      id: 'workout-log',
      title: 'Workout Log',
      emoji: '📘',
      content: 'Here you will see your full workout log and stats.'
    },
    {
      id: 'my-routines',
      title: 'My Routines', 
      emoji: '🧠',
      content: 'This is where your custom workout routines will live.'
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
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3 -mx-4 mb-6">
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
            <h1 className="text-xl font-bold whitespace-nowrap">Exercise Hub</h1>
          </div>
          
          {/* Right Column - Empty for balance */}
          <div></div>
        </div>
      </div>

      {/* Body Scan AI Tile */}
      <div className="mb-4 mt-2">
        <button
          onClick={() => navigate('/body-scan-ai')}
          className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 dark:from-purple-600 dark:to-blue-700 hover:from-purple-400 hover:to-blue-500 dark:hover:from-purple-500 dark:hover:to-blue-600 transition-all duration-300 transform hover:scale-[1.01] hover:shadow-2xl hover:shadow-purple-500/40 border border-purple-500/30 dark:border-purple-600/30 shadow-xl shadow-purple-500/25 group relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] before:animate-[shimmer_3s_ease-in-out_infinite] before:skew-x-12"
        >
          <div className="flex items-center justify-center gap-3 mb-1 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-5xl transition-transform duration-300 group-hover:scale-110 animate-camera-flash">📸</span>
              <h2 className="text-xl font-bold text-white">Body Scan AI</h2>
            </div>
            <span className="text-sm opacity-70 transition-transform duration-300 group-hover:translate-x-1">→</span>
          </div>
          <p className="text-white/90 text-sm opacity-90 relative z-10">
            Analyze your physique to unlock personalized posture and muscle balance insights
          </p>
        </button>
      </div>

      {/* Recovery Center Tab */}
      <div className="w-full mb-6">
        <button
          onClick={() => navigate('/recovery-center')}
          className="w-full p-4 rounded-xl bg-gradient-to-r from-[#FFD580] to-[#FF8C66] dark:from-[#FFB347] dark:to-[#FF7043] hover:from-[#FFE4A3] hover:to-[#FFA07A] dark:hover:from-[#FFC470] dark:hover:to-[#FF8A65] transition-all duration-300 transform hover:scale-[1.01] hover:shadow-2xl hover:shadow-[#FF8C66]/40 border border-[#FFD580]/30 dark:border-[#FFB347]/30 shadow-xl shadow-[#FF8C66]/25 group relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] before:animate-[shimmer_3s_ease-in-out_infinite] before:skew-x-12"
        >
          <div className="flex items-center justify-center gap-3 mb-1 relative z-10">
            <span className="text-5xl transition-transform duration-300 group-hover:scale-110 animate-[breathe_4s_ease-in-out_infinite]">🧘</span>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Recovery Center</h2>
            <span className="text-sm opacity-70 transition-transform duration-300 group-hover:translate-x-1">→</span>
          </div>
          <p className="text-gray-700 dark:text-indigo-100 text-sm opacity-90 relative z-10">
            Your wellness guide for rest, recovery, and mindfulness
          </p>
        </button>
      </div>

      {/* Action Buttons Group - Tightly Spaced */}
      <div className="space-y-1 mb-6">
        {/* Add Workout Button */}
        <Card className="w-full shadow-lg border-border bg-card mb-0 !mb-0">
          <CardContent className="p-4 !p-4">
            <Button
              onClick={() => setIsAddWorkoutModalOpen(true)}
              className="w-full h-14 bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-500 hover:from-emerald-300 hover:via-cyan-400 hover:to-blue-400 text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 hover:scale-105 hover:brightness-110"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Workout
            </Button>
          </CardContent>
        </Card>

        {/* New Routine Button */}
        <Card className="w-full shadow-lg border-border bg-card mb-0 !mb-0">
          <CardContent className="p-4 !p-4">
            <Button
              onClick={() => setIsCreateRoutineModalOpen(true)}
              className="w-full h-14 bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 hover:from-purple-300 hover:via-pink-400 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:brightness-110"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Routine
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        {/* 4 tabs in grid */}
        <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-4 gap-3'}`}>
          {tabs.slice(0, 4).map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'workout-log' | 'my-routines' | 'progress-reports' | 'pre-made-plans')}
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
                      {mockWorkouts.map((workout) => (
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
                      ))}
                    </div>

                    {/* Empty State (if no workouts) */}
                    {mockWorkouts.length === 0 && (
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

                    {/* Your Saved Routines Header */}
                    <div className="text-center mb-4">
                      <h2 className="text-2xl font-bold text-foreground mb-2">Your Saved Routines</h2>
                      <p className="text-muted-foreground">Custom workout plans tailored for you</p>
                    </div>

                    {/* Routines Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {mockRoutines.map((routine) => (
                        <RoutineCard
                          key={routine.id}
                          routine={routine}
                          onEdit={(editRoutine) => {
                            setEditingRoutine(editRoutine);
                            setIsCreateRoutineModalOpen(true);
                          }}
                          onDuplicate={handleDuplicateRoutine}
                        />
                      ))}
                    </div>

                    {/* Empty State (if no routines) */}
                    {mockRoutines.length === 0 && (
                       <Card className="w-full shadow-lg border-border bg-card mb-0 !mb-0">
                        <CardContent className="p-8 text-center">
                          <div className="text-4xl mb-4">🧠</div>
                          <h3 className="text-xl font-bold text-foreground mb-2">No routines yet</h3>
                          <p className="text-muted-foreground mb-6">Create your first custom workout routine!</p>
                          <Button
                            onClick={() => setIsCreateRoutineModalOpen(true)}
                            className="bg-gradient-to-r from-purple-400 to-pink-600 hover:from-purple-500 hover:to-pink-700 text-white"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create Your First Routine
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : tab.id === 'progress-reports' ? (
                  /* Progress & Reports Tab - Enhanced */
                  <div className="space-y-6">
                    {/* Header with motivational badge */}
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-foreground mb-2">Your Progress This Month</h2>
                      <p className="text-muted-foreground mb-4">Track your fitness journey and celebrate your achievements</p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-sm font-semibold rounded-full shadow-lg">
                        🏆 You're Crushing It!
                      </div>
                    </div>

                    {/* Date Filter */}
                    <DateFilterSelect value={dateFilter} onValueChange={setDateFilter} />

                    {/* Progress Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <ExerciseProgressChart data={mockProgressData} />
                      <WorkoutTypesChart data={mockWorkoutTypesData} />
                    </div>

                    {/* Exercise Stats */}
                    <ExerciseStatsCard stats={mockExerciseStats} />

                    {/* Weekly Overview */}
                     <Card className="w-full shadow-lg border-border bg-card mb-0 !mb-0">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                          📅 Weekly Activity Overview
                        </h3>
                        <div className="space-y-3">
                          {mockWeeklyData.map((day, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-all duration-200">
                              <span className="font-medium text-foreground">{day.day}</span>
                              <div className="flex items-center space-x-3">
                                <div className="flex-1 bg-muted rounded-full h-2 w-24 overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full transition-all duration-500"
                                    style={{ width: day.height }}
                                  />
                                </div>
                                <span className="text-sm text-muted-foreground min-w-[80px] text-right">
                                  {day.workouts} workout{day.workouts !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Report Cards Section - Moved to Bottom */}
                    <div className="space-y-6 pt-4">
                      <div className="text-center">
                        <h3 className="text-xl font-bold text-foreground mb-2">📈 Your Exercise Reports</h3>
                        <p className="text-muted-foreground text-sm">Comprehensive insights into your fitness journey</p>
                      </div>

                      {/* 📈 Workout Duration Trend (Last 30 Days) - This is the ExerciseProgressChart */}
                      <div className="w-full">
                        <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          📈 Workout Duration Trend (Last 30 Days)
                        </h4>
                        <ExerciseProgressChart data={mockProgressData} />
                      </div>

                      {/* 📅 WeeklyExerciseInsightsCard */}
                      <div className="w-full">
                        <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          📅 Weekly Exercise Insights
                        </h4>
                        <WeeklyExerciseInsightsCard />
                      </div>

                      {/* 🗓️ MonthlyExerciseReportCard */}
                      <div className="w-full">
                        <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          🗓️ Monthly Exercise Report
                        </h4>
                        <MonthlyExerciseReportCard />
                      </div>

                      {/* 📊 YearlyExerciseReportCard */}
                      <div className="w-full">
                        <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          📊 Yearly Exercise Report
                        </h4>
                        <YearlyExerciseReportCard />
                      </div>
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
                        <div className="text-6xl mb-4 animate-[breathe_4s_ease-in-out_infinite]">🧘</div>
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
                            <div className="text-5xl mb-4 group-hover:animate-[float_2s_ease-in-out_infinite]">🧘</div>
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
                            <div className="text-5xl mb-4 group-hover:animate-[breathe_3s_ease-in-out_infinite]">🌬️</div>
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
                            <div className="text-5xl mb-4 group-hover:animate-[float_2.5s_ease-in-out_infinite]">🤸</div>
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
                            <div className="text-5xl mb-4 group-hover:animate-[float_3s_ease-in-out_infinite]">🧎</div>
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
                            <div className="text-5xl mb-4 group-hover:animate-[slow-pulse_2s_ease-in-out_infinite]">💆</div>
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
                            <div className="text-5xl mb-4 group-hover:animate-[breathe_4s_ease-in-out_infinite]">💤</div>
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
                            <div className="text-5xl mb-4 group-hover:animate-[float_2.5s_ease-in-out_infinite]">💭</div>
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
        onSave={handleAddWorkout}
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
    </div>
  );
};

export default ExerciseHub;
