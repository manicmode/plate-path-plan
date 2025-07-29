import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Clock, Flame, Timer, Calendar, TrendingUp, Target, Award, Activity, Upload, Loader2, Camera } from 'lucide-react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIsMobile } from '@/hooks/use-mobile';
import { AddWorkoutModal } from '@/components/AddWorkoutModal';
import { CreateRoutineModal } from '@/components/CreateRoutineModal';
import { WorkoutPreferencesModal } from '@/components/WorkoutPreferencesModal';
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
import { WorkoutCalendarView } from '@/components/analytics/WorkoutCalendarView';
import { WorkoutVolumeChart } from '@/components/analytics/WorkoutVolumeChart';
import { EnhancedStreakTracker } from '@/components/analytics/EnhancedStreakTracker';
import { ProgressOverviewCard } from '@/components/analytics/ProgressOverviewCard';
import { MuscleGroupRadarChart } from '@/components/analytics/MuscleGroupRadarChart';
import { WeeklyGoalCard } from '@/components/analytics/WeeklyGoalCard';
import { MotivationCard } from '@/components/analytics/MotivationCard';
import { WorkoutTrophyCard } from '@/components/analytics/WorkoutTrophyCard';
import { WorkoutProgressCalendar } from '@/components/analytics/WorkoutProgressCalendar';
import { ExerciseGoalsInitializer } from '@/components/exercise/ExerciseGoalsInitializer';
import { useWorkoutCompletion } from '@/contexts/WorkoutCompletionContext';
import { AIFitnessCoach } from '@/components/workout/AIFitnessCoach';

const ExerciseHub = () => {
  const { showCompletionModal } = useWorkoutCompletion();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const tabsRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'workout-log' | 'my-routines' | 'ai-fitness-coach' | 'progress-reports' | 'pre-made-plans'>('workout-log');
  const [isAddWorkoutModalOpen, setIsAddWorkoutModalOpen] = useState(false);
  const [isCreateRoutineModalOpen, setIsCreateRoutineModalOpen] = useState(false);
  const [isWorkoutPreferencesModalOpen, setIsWorkoutPreferencesModalOpen] = useState(false);
  const [isExploreMoreModalOpen, setIsExploreMoreModalOpen] = useState(false);
  const [originRoute, setOriginRoute] = useState<string>('/explore');
  const [dateFilter, setDateFilter] = useState('30d');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isPlanPreviewOpen, setIsPlanPreviewOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<any>(null);
  
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
      type: "Yoga",
      duration: "60 minutes",
      calories: "180 kcal",
      date: "2024-01-22",
      time: "07:00 PM",
      summary: "Deep stretching and meditation session",
      gradient: "from-green-300 to-teal-500"
    }
  ]);

  const [mockRoutines, setMockRoutines] = useState<any[]>([
    {
      id: 1,
      title: "My Custom Upper Body",
      emoji: "💪",
      type: "Strength",
      routineType: "strength" as const,
      duration: "45 min",
      gradient: "from-orange-300 to-red-500",
      status: "in-progress" as const,
      currentDay: 3,
      weeklyPlan: {
        "Monday": "Chest & Triceps - 8 exercises, 45 min",
        "Tuesday": "Back & Biceps - 7 exercises, 40 min",
        "Wednesday": "Rest Day",
        "Thursday": "Shoulders & Core - 6 exercises, 35 min",
        "Friday": "Full Upper Body - 10 exercises, 50 min",
        "Saturday": "Light Cardio",
        "Sunday": "Rest Day"
      },
      notes: "Progressive overload focused routine",
      createdAt: new Date().toISOString()
    }
  ]);

  const mockPreMadePlans = [
    {
      id: 1,
      title: "7-Day Strength Builder",
      emoji: "💪",
      type: "Strength",
      difficulty: "Beginner" as const,
      duration: "2 Weeks",
      timeCommitment: "30 min/day, 4x/week",
      gradient: "from-orange-300 to-red-500",
      schedulePreview: "Mon: Upper, Tue: Lower, Thu: Push, Fri: Pull + Core",
      description: "Perfect introduction to strength training with progressive overload and proper form focus.",
      weeks: {
        "Week 1": {
          "Monday": "Upper Body Basics - Push-ups, rows, overhead press, 30 min",
          "Tuesday": "Lower Body Foundation - Squats, lunges, calf raises, 30 min",
          "Wednesday": "Rest day",
          "Thursday": "Push Focus - Chest and shoulder emphasis, 30 min",
          "Friday": "Pull & Core - Back exercises plus core work, 30 min",
          "Saturday": "Active recovery walk",
          "Sunday": "Rest day"
        },
        "Week 2": {
          "Monday": "Upper Body Progression - Increased reps and intensity, 35 min",
          "Tuesday": "Lower Body Power - Add explosive movements, 35 min", 
          "Wednesday": "Rest day",
          "Thursday": "Push Power - Advanced push variations, 35 min",
          "Friday": "Pull & Core Plus - Extended back and core session, 35 min",
          "Saturday": "Active recovery",
          "Sunday": "Rest day"
        }
      }
    }
  ];

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
      id: 'ai-fitness-coach',
      title: 'AI Fitness Coach',
      emoji: '🤖',
      content: 'AI-powered workout routine generation and coaching.'
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

  const handleAddWorkout = (newWorkout: any) => {
    const workoutWithId = {
      ...newWorkout,
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      })
    };
    setMockWorkouts(prev => [workoutWithId, ...prev]);
  };

  const handleSaveRoutine = (routineData: any) => {
    if (editingRoutine) {
      setMockRoutines(prev => prev.map(routine => 
        routine.id === editingRoutine.id ? { ...routine, ...routineData } : routine
      ));
    } else {
      const newRoutine = {
        ...routineData,
        id: Date.now(),
        status: "not-started" as const,
        currentDay: 1,
        createdAt: new Date().toISOString()
      };
      setMockRoutines(prev => [newRoutine, ...prev]);
    }
    setEditingRoutine(null);
  };

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

  // Demo function to test workout completion modal
  const handleDemoWorkoutComplete = () => {
    showCompletionModal({
      workoutId: 'demo-workout',
      workoutType: 'manual',
      durationMinutes: 45,
      exercisesCount: 6,
      setsCount: 18,
      musclesWorked: ['Chest', 'Triceps', 'Shoulders'],
      workoutData: {
        title: 'Upper Body Push Day',
        difficulty: 'intermediate'
      }
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      {/* Silent goal initialization */}
      <ExerciseGoalsInitializer />
      
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
            <h1 className="text-xl font-bold whitespace-nowrap">Exercise & Recovery</h1>
          </div>
          
          {/* Right Column - Empty for balance */}
          <div></div>
        </div>
      </div>

      {/* Body Scan AI Tile */}
      <div className="mb-6 mt-2">
        <button
          onClick={() => navigate('/body-scan-ai')}
          className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-300 to-blue-400 dark:from-purple-600 dark:to-blue-700 hover:from-purple-200 hover:to-blue-300 dark:hover:from-purple-500 dark:hover:to-blue-600 transition-all duration-300 transform hover:scale-[1.01] hover:shadow-2xl hover:shadow-purple-500/40 border border-purple-500/30 dark:border-purple-600/30 shadow-xl shadow-purple-500/25 group relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] before:animate-[shimmer_3s_ease-in-out_infinite] before:skew-x-12"
        >
          <div className="flex items-center justify-center gap-3 mb-1 relative z-10">
            <div className="flex items-center gap-4">
              <span className="text-5xl transition-transform duration-300 group-hover:scale-110 animate-camera-flash">📸</span>
              <h2 className="text-xl font-bold text-black dark:text-white">Body Scan AI</h2>
            </div>
            <span className="text-sm opacity-70 transition-transform duration-300 group-hover:translate-x-1 text-black dark:text-white">→</span>
          </div>
          <p className="text-black/90 dark:text-white/90 text-sm opacity-90 relative z-10">
            Analyze your physique to unlock personalized posture and muscle balance insights
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
              <span className="text-5xl transition-transform duration-300 group-hover:scale-110">🤖</span>
              <h2 className="text-xl font-bold text-white">AI Workout Generator</h2>
            </div>
            <span className="text-sm opacity-70 transition-transform duration-300 group-hover:translate-x-1 text-white">→</span>
          </div>
          <p className="text-white/90 text-sm opacity-90 relative z-10">
            Create personalized workout routines tailored to your goals and preferences
          </p>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6" ref={tabsRef}>
        {/* Separator line to distinguish tabs section */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mb-4"></div>
        
        {/* 5 tabs in grid */}
        <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-5 gap-3'}`}>
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as 'workout-log' | 'my-routines' | 'ai-fitness-coach' | 'progress-reports' | 'pre-made-plans');
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
                {/* Workout Log Tab */}
                {tab.id === 'workout-log' ? (
                  <div className="space-y-6">
                    {/* Workout History Header */}
                    <div className="text-center mb-4">
                      <h2 className="text-2xl font-bold text-foreground mb-2">Workout History</h2>
                      <p className="text-muted-foreground">Your complete fitness journey</p>
                    </div>

                    {/* Add Workout Button */}
                    <div className="text-center mb-6">
                      <Button
                        onClick={() => setIsAddWorkoutModalOpen(true)}
                        className="bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-white"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Workout
                      </Button>
                    </div>

                    {/* Workout Entries */}
                    <div className="space-y-4">
                      {mockWorkouts.map((workout) => (
                        <Card key={workout.id} className="w-full shadow-lg border-border bg-card hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
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
                       <Card className="w-full shadow-lg border-border bg-card">
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
                  /* My Routines Tab */
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="text-center mb-4">
                      <h2 className="text-2xl font-bold text-foreground mb-2">My Routines</h2>
                      <p className="text-muted-foreground">Your custom workout plans</p>
                    </div>

                    {/* Create Routine Button */}
                    <div className="text-center mb-6">
                      <Button
                        onClick={() => setIsCreateRoutineModalOpen(true)}
                        className="bg-gradient-to-r from-purple-400 to-pink-600 hover:from-purple-500 hover:to-pink-700 text-white"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Routine
                      </Button>
                    </div>

                    {/* Routines List */}
                    <div className="space-y-4">
                      {mockRoutines.map((routine) => (
                        <Card key={routine.id} className="w-full shadow-lg border-border bg-card">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-semibold">{routine.title}</h3>
                                <p className="text-muted-foreground">{routine.type} • {routine.duration}</p>
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setEditingRoutine(routine);
                                  setIsCreateRoutineModalOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Empty State */}
                    {mockRoutines.length === 0 && (
                      <Card className="w-full shadow-lg border-border bg-card">
                        <CardContent className="p-8 text-center">
                          <div className="text-4xl mb-4">🧠</div>
                          <h3 className="text-xl font-bold text-foreground mb-2">No routines created yet</h3>
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

                ) : tab.id === 'ai-fitness-coach' ? (
                  /* AI Fitness Coach Tab */
                  <AIFitnessCoach />

                ) : tab.id === 'progress-reports' ? (
                  /* Progress Reports Tab */
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-foreground mb-2">Progress & Reports</h2>
                      <p className="text-muted-foreground">Track your fitness journey with detailed analytics</p>
                    </div>

                    {/* Date Filter */}
                    <div className="flex justify-center mb-6">
                      <DateFilterSelect value={dateFilter} onValueChange={setDateFilter} />
                    </div>

                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <Card className="p-4">
                        <div className="flex items-center space-x-2">
                          <Activity className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Total Workouts</p>
                            <p className="font-semibold text-foreground">24</p>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-green-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Hours Trained</p>
                            <p className="font-semibold text-foreground">18.5</p>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center space-x-2">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Calories Burned</p>
                            <p className="font-semibold text-foreground">6,240</p>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Coming Soon Progress Reports */}
                    <Card className="w-full shadow-lg border-border bg-card">
                      <CardContent className="p-8 text-center">
                        <div className="text-4xl mb-4">📈</div>
                        <h3 className="text-xl font-bold text-foreground mb-2">Detailed Analytics Coming Soon</h3>
                        <p className="text-muted-foreground">We're working on comprehensive progress tracking and reports!</p>
                      </CardContent>
                    </Card>
                  </div>

                ) : tab.id === 'pre-made-plans' ? (
                  /* Pre-Made Plans Tab */
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-foreground mb-2">Pre-Made Plans</h2>
                      <p className="text-muted-foreground">Choose from expert-designed workout programs</p>
                    </div>

                    {/* Plans Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {mockPreMadePlans.map((plan) => (
                        <Card key={plan.id} className="w-full shadow-lg border-border bg-card">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold">{plan.title}</h3>
                              <span className="text-2xl">{plan.emoji}</span>
                            </div>
                            <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => handlePlanPreview(plan)}>Preview</Button>
                              <Button onClick={() => handleStartPlan(plan)}>Start Plan</Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Explore More Button */}
                    <div className="text-center mt-8">
                      <Button
                        onClick={() => setIsExploreMoreModalOpen(true)}
                        variant="outline"
                        className="bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-blue-200 hover:border-purple-300"
                      >
                        <Target className="mr-2 h-4 w-4" />
                        Explore More Plans
                      </Button>
                    </div>

                    {/* Empty State (if no plans) */}
                    {mockPreMadePlans.length === 0 && (
                       <Card className="w-full shadow-lg border-border bg-card">
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

                ) : (
                  /* Default Tab Content */
                  <Card className="w-full shadow-lg border-border bg-card">
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

      {/* Modals */}
      <AddWorkoutModal
        isOpen={isAddWorkoutModalOpen}
        onClose={() => setIsAddWorkoutModalOpen(false)}
        onSave={handleAddWorkout}
      />

      <CreateRoutineModal
        isOpen={isCreateRoutineModalOpen}
        onClose={() => {
          setIsCreateRoutineModalOpen(false);
          setEditingRoutine(null);
        }}
        onSave={handleSaveRoutine}
        editingRoutine={editingRoutine}
      />

      <WorkoutPreferencesModal
        isOpen={isWorkoutPreferencesModalOpen}
        onClose={() => setIsWorkoutPreferencesModalOpen(false)}
        onRoutineCreated={(routine) => {
          console.log('AI Routine created:', routine);
          // Optionally refresh the routines list or navigate
        }}
      />

      <PlanPreviewModal
        isOpen={isPlanPreviewOpen}
        onClose={() => setIsPlanPreviewOpen(false)}
        plan={selectedPlan}
        onAddToRoutines={handleAddPlanToRoutines}
      />

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
    </div>
  );
};

export default ExerciseHub;