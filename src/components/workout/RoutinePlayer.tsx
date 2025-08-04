import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Home, 
  Timer, 
  Dumbbell,
  CheckCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info,
  X
} from 'lucide-react';
import { useSound } from '@/contexts/SoundContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { useWorkoutCompletion } from '@/contexts/WorkoutCompletionContext';
import { useWorkoutAdaptations } from '@/hooks/useWorkoutAdaptations';
import { PostWorkoutModal } from './PostWorkoutModal';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
}

interface WorkoutStep {
  type: 'exercise' | 'rest';
  exerciseName?: string;
  duration: number; // in seconds
  setNumber?: number;
  totalSets?: number;
  reps?: string;
  isLast?: boolean;
}

interface RoutinePlayerProps {
  week: number;
  day: number;
  workout?: {
    title: string;
    exercises: Exercise[];
    duration: number;
  };
}

const motivationalPhrases = [
  "Let's crush this! 💪",
  "You've got this! 🔥",
  "Beast mode activated! 🦍",
  "One more step to greatness! ⭐",
  "Feeling the burn? That's growth! 📈",
  "Champions never quit! 🏆",
  "Push through the challenge! ⚡",
  "Your future self will thank you! 🙌",
  "Strong mind, strong body! 🧠",
  "Excellence is a habit! ✨"
];

export function RoutinePlayer({ week, day, workout }: RoutinePlayerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { playSound } = useSound();
  const { showCompletionModal } = useWorkoutCompletion();
  const { getAdaptationForDay } = useWorkoutAdaptations('current_routine');
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [workoutSteps, setWorkoutSteps] = useState<WorkoutStep[]>([]);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<typeof workout>(workout);
  const [showAdaptationInfo, setShowAdaptationInfo] = useState(false);
  const [currentAdaptation, setCurrentAdaptation] = useState<any>(null);
  const [skippedSets, setSkippedSets] = useState(0);
  const [skippedSetsByExercise, setSkippedSetsByExercise] = useState<{[key: string]: number}>({});
  const [skippedStepsIds, setSkippedStepsIds] = useState<Set<string>>(new Set());
  const [showPostWorkoutModal, setShowPostWorkoutModal] = useState(false);

  // Check for AI adaptations and load adapted workout if available
  useEffect(() => {
    if (!workout || !user) return;

    const adaptation = getAdaptationForDay(week, day);
    
    if (adaptation && adaptation.adapted_workout_data) {
      console.log('[ADAPTATION] Using AI-adapted workout for week', week, 'day', day);
      console.log('[ADAPTATION] Badge shown for adaptation type:', adaptation.adaptation_type);
      setActiveWorkout(adaptation.adapted_workout_data);
      setCurrentAdaptation(adaptation);
    } else {
      console.log('[ADAPTATION] No AI adaptation found — loading original workout.');
      setActiveWorkout(workout);
      setCurrentAdaptation(null);
    }
  }, [workout, week, day, user, getAdaptationForDay]);

  // Helper functions for adaptation badge
  const getAdaptationBadgeText = (adaptationType: string): string => {
    switch (adaptationType) {
      case 'increase_intensity':
        return '🔥 Boosted';
      case 'decrease_difficulty':
        return '💤 Eased';
      case 'adjust_rest':
        return '⏱️ Tuned';
      case 'maintain_current':
        return '✅ Stable';
      default:
        return '🧠 Adapted';
    }
  };

  const getAdaptationFullText = (adaptationType: string): string => {
    switch (adaptationType) {
      case 'increase_intensity':
        return 'Intensity Increased';
      case 'decrease_difficulty':
        return 'Difficulty Reduced';
      case 'adjust_rest':
        return 'Rest Time Adjusted';
      case 'maintain_current':
        return 'Current Level Maintained';
      default:
        return 'Workout Adapted';
    }
  };

  const handleAdaptationBadgeClick = () => {
    setShowAdaptationInfo(!showAdaptationInfo);
    console.log('[ADAPTATION] Info box', showAdaptationInfo ? 'collapsed' : 'expanded');
  };

  // Generate workout steps from exercise data
  useEffect(() => {
    if (!activeWorkout) return;
    
    const steps: WorkoutStep[] = [];
    
    activeWorkout.exercises.forEach((exercise, exerciseIndex) => {
      const restSeconds = parseInt(exercise.rest.replace(/[^0-9]/g, '')) || 60;
      
      for (let set = 1; set <= exercise.sets; set++) {
        // Exercise step (45 seconds default)
        steps.push({
          type: 'exercise',
          exerciseName: exercise.name,
          duration: 45,
          setNumber: set,
          totalSets: exercise.sets,
          reps: exercise.reps
        });
        
        // Rest step (except after last set of last exercise)
        if (!(exerciseIndex === activeWorkout.exercises.length - 1 && set === exercise.sets)) {
          steps.push({
            type: 'rest',
            duration: restSeconds,
            isLast: exerciseIndex === activeWorkout.exercises.length - 1 && set === exercise.sets
          });
        }
      }
    });
    
    setWorkoutSteps(steps);
    if (steps.length > 0) {
      setTimeRemaining(steps[0].duration);
    }
  }, [activeWorkout]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && !isPaused && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleStepComplete();
            return 0;
          }
          
          // Play warning sound at 5 seconds
          if (prev === 6) {
            playSound('notification');
          }
          
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isPlaying, isPaused, timeRemaining]);

  const handleStepComplete = () => {
    const currentStep = workoutSteps[currentStepIndex];
    
    // Play completion sound
    playSound('success');
    
    if (currentStepIndex < workoutSteps.length - 1) {
      // Move to next step
      const nextStepIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextStepIndex);
      setTimeRemaining(workoutSteps[nextStepIndex].duration);
      setCompletedSteps(prev => prev + 1);
      
      // Show motivational message for exercises
      if (currentStep.type === 'exercise') {
        const randomPhrase = motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)];
        toast({
          title: "Set Complete!",
          description: randomPhrase,
          duration: 2000
        });
      }
    } else {
      // Workout completed
      handleWorkoutComplete();
    }
  };

  const handleWorkoutComplete = async () => {
    setWorkoutCompleted(true);
    setIsPlaying(false);
    playSound('achievement');
    
    const endTime = Date.now();
    const actualDurationMinutes = workoutStartTime 
      ? Math.round((endTime - workoutStartTime) / 60000) 
      : workout?.duration || 0;

    // Log detailed performance data
    try {
      const performanceData = {
        user_id: user?.id,
        routine_id: 'current_routine',
        week_number: week,
        day_number: day,
        workout_title: activeWorkout?.title || 'AI Routine Workout',
        total_duration_minutes: actualDurationMinutes,
        planned_duration_minutes: activeWorkout?.duration || 45,
        completed_exercises_count: activeWorkout?.exercises.length || 0,
        total_exercises_count: activeWorkout?.exercises.length || 0,
        completed_sets_count: completedSteps,
        total_sets_count: workoutSteps.length,
        skipped_steps_count: Math.max(0, workoutSteps.length - completedSteps),
        skipped_sets_count: skippedSets,
        extra_rest_seconds: Math.max(0, (actualDurationMinutes - (activeWorkout?.duration || 45)) * 60),
        difficulty_rating: null, // Will be set by user in completion modal
        energy_level: null,
        muscle_groups_worked: [...new Set(activeWorkout?.exercises.map(ex => {
          const name = ex.name.toLowerCase();
          if (name.includes('bench') || name.includes('press') || name.includes('push')) return 'Chest';
          if (name.includes('pull') || name.includes('row')) return 'Back';
          if (name.includes('squat') || name.includes('leg')) return 'Legs';
          if (name.includes('curl') || name.includes('bicep')) return 'Biceps';
          if (name.includes('tricep') || name.includes('dip')) return 'Triceps';
          if (name.includes('shoulder') || name.includes('lateral')) return 'Shoulders';
          return 'Full Body';
        }) || [])],
        notes: null
      };

      // Also log individual exercise data with skipped sets
      for (const exercise of activeWorkout?.exercises || []) {
        const exerciseSkippedSets = skippedSetsByExercise[exercise.name] || 0;
        await supabase.from('workout_logs').insert({
          user_id: user?.id,
          routine_id: 'current_routine',
          day_name: `Day ${day}`,
          day_index: day,
          exercise_name: exercise.name,
          exercise_type: 'strength',
          sets_completed: Math.max(0, exercise.sets - exerciseSkippedSets),
          target_sets: exercise.sets,
          reps_completed: exercise.reps,
          target_reps: exercise.reps,
          skipped_sets: exerciseSkippedSets,
          duration_seconds: Math.round((actualDurationMinutes * 60) / (activeWorkout?.exercises.length || 1))
        });
      }

      // Log performance data
      const { error: perfError } = await supabase
        .from('workout_performance_logs')
        .insert(performanceData);

      if (perfError) {
        console.error('Error logging performance:', perfError);
      }

      // Mark workout as completed in database
      const { data: routine, error: fetchError } = await supabase
        .from('ai_routines')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .single();

      if (routine && !fetchError) {
        const workoutKey = `week_${week}_day_${day}`;
        const currentLockedDays = (routine.locked_days as Record<string, any>) || {};
        const currentWorkoutData = (currentLockedDays[workoutKey] as Record<string, any>) || {};
        
        const updatedLockedDays = {
          ...currentLockedDays,
          [workoutKey]: {
            ...currentWorkoutData,
            completed: true
          }
        };

        await supabase
          .from('ai_routines')
          .update({ locked_days: updatedLockedDays })
          .eq('id', routine.id);
      }
    } catch (error) {
      console.error('Error marking workout complete:', error);
    }

    // Show post-workout modal with AI feedback
    setShowPostWorkoutModal(true);

  };

  const handleStart = () => {
    setIsPlaying(true);
    setIsPaused(false);
    setWorkoutStartTime(Date.now());
    playSound('notification');
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleSkipStep = () => {
    if (currentStepIndex < workoutSteps.length - 1) {
      const nextStepIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextStepIndex);
      setTimeRemaining(workoutSteps[nextStepIndex].duration);
      setCompletedSteps(prev => prev + 1);
    }
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setTimeRemaining(workoutSteps[0]?.duration || 0);
    setIsPlaying(false);
    setIsPaused(false);
    setCompletedSteps(0);
    setWorkoutCompleted(false);
    setSkippedSets(0);
    setSkippedSetsByExercise({});
    setSkippedStepsIds(new Set());
    setShowPostWorkoutModal(false);
  };

  const handleSkipSet = () => {
    const currentStep = workoutSteps[currentStepIndex];
    if (currentStep?.type === 'exercise' && currentStep.exerciseName) {
      const stepId = `${currentStep.exerciseName}-${currentStep.setNumber}`;
      const isCurrentlySkipped = skippedStepsIds.has(stepId);
      
      if (isCurrentlySkipped) {
        // Undo skip
        setSkippedStepsIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(stepId);
          return newSet;
        });
        setSkippedSets(prev => prev - 1);
        setSkippedSetsByExercise(prev => ({
          ...prev,
          [currentStep.exerciseName!]: Math.max(0, (prev[currentStep.exerciseName!] || 0) - 1)
        }));
        
        toast({
          title: "Skip undone",
          description: `${currentStep.exerciseName} - Set ${currentStep.setNumber}`,
          duration: 2000
        });
      } else {
        // Mark as skipped
        setSkippedStepsIds(prev => new Set(prev).add(stepId));
        setSkippedSets(prev => prev + 1);
        setSkippedSetsByExercise(prev => ({
          ...prev,
          [currentStep.exerciseName!]: (prev[currentStep.exerciseName!] || 0) + 1
        }));
        
        toast({
          title: "Set marked as skipped",
          description: `${currentStep.exerciseName} - Set ${currentStep.setNumber}`,
          duration: 2000
        });
        
        // Move to next step
        handleStepComplete();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentStep = workoutSteps[currentStepIndex];
  const progress = workoutSteps.length > 0 ? (completedSteps / workoutSteps.length) * 100 : 0;

  if (!workout) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-bold mb-2">Workout Not Found</h2>
            <p className="text-muted-foreground mb-4">Unable to load workout data.</p>
            <Button onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (workoutCompleted) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Workout Complete!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Outstanding work! You've completed your {activeWorkout?.title || workout.title} workout.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleReset} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Do Again
              </Button>
              <Button onClick={() => navigate('/ai-routine-viewer')}>
                <Home className="h-4 w-4 mr-2" />
                Back to Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="relative">
              <CardTitle className="text-center">{activeWorkout?.title || workout.title}</CardTitle>
              
              {/* AI Adaptation Badge */}
              {currentAdaptation && (
                <div className="absolute top-0 right-0">
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-muted/50 transition-colors bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-950/30 dark:to-blue-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                    onClick={handleAdaptationBadgeClick}
                  >
                    {getAdaptationBadgeText(currentAdaptation.adaptation_type)}
                    {showAdaptationInfo ? (
                      <ChevronUp className="h-3 w-3 ml-1" />
                    ) : (
                      <ChevronDown className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                </div>
              )}
            </div>
            
            <div className="text-center">
              <Badge variant="secondary">
                Week {week} • Day {day}
              </Badge>
            </div>
            
            {/* Expandable Adaptation Info Box */}
            {currentAdaptation && showAdaptationInfo && (
              <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-semibold text-purple-800 dark:text-purple-200">
                    {getAdaptationFullText(currentAdaptation.adaptation_type)}
                  </span>
                </div>
                
                {currentAdaptation.ai_coach_feedback && (
                  <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                    {currentAdaptation.ai_coach_feedback}
                  </p>
                )}
                
                {currentAdaptation.performance_metrics && (
                  <div className="text-xs text-purple-600 dark:text-purple-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Completion Rate:</span>
                      <span>{Math.round((currentAdaptation.performance_metrics.completed_sets || 0) / Math.max(1, currentAdaptation.performance_metrics.total_sets || 1) * 100)}%</span>
                    </div>
                    {currentAdaptation.performance_metrics.difficulty_rating && (
                      <div className="flex justify-between">
                        <span>Difficulty:</span>
                        <span className="capitalize">{currentAdaptation.performance_metrics.difficulty_rating.replace('_', ' ')}</span>
                      </div>
                    )}
                    {currentAdaptation.performance_metrics.skipped_steps > 0 && (
                      <div className="flex justify-between">
                        <span>Skipped Steps:</span>
                        <span>{currentAdaptation.performance_metrics.skipped_steps}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{completedSteps} / {workoutSteps.length} steps</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Current Step */}
        {currentStep && (
          <Card className={`border-2 ${
            currentStep.type === 'exercise' 
              ? skippedStepsIds.has(`${currentStep.exerciseName}-${currentStep.setNumber}`)
                ? 'border-red-300 bg-red-50 dark:bg-red-950/20 opacity-75'
                : 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
              : 'border-green-500 bg-green-50 dark:bg-green-950/20'
          }`}>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                {currentStep.type === 'exercise' ? (
                  <Dumbbell className="h-6 w-6 text-blue-500" />
                ) : (
                  <Timer className="h-6 w-6 text-green-500" />
                )}
                <Badge variant={currentStep.type === 'exercise' ? 'default' : 'secondary'}>
                  {currentStep.type === 'exercise' ? 'Exercise' : 'Rest'}
                </Badge>
              </div>
              
              {currentStep.type === 'exercise' ? (
                <div>
                  <CardTitle className={`text-2xl mb-2 ${
                    skippedStepsIds.has(`${currentStep.exerciseName}-${currentStep.setNumber}`)
                      ? 'line-through text-muted-foreground'
                      : ''
                  }`}>
                    {currentStep.exerciseName}
                  </CardTitle>
                  <p className={`text-lg ${
                    skippedStepsIds.has(`${currentStep.exerciseName}-${currentStep.setNumber}`)
                      ? 'line-through text-muted-foreground'
                      : ''
                  }`}>
                    Set {currentStep.setNumber} of {currentStep.totalSets}
                  </p>
                  <p className="text-muted-foreground">
                    Target: {currentStep.reps} reps
                  </p>
                  {skippedStepsIds.has(`${currentStep.exerciseName}-${currentStep.setNumber}`) && (
                    <Badge variant="destructive" className="mt-2">
                      Skipped
                    </Badge>
                  )}
                </div>
              ) : (
                <div>
                  <CardTitle className="text-2xl">Rest Time</CardTitle>
                  <p className="text-muted-foreground">
                    Prepare for the next set
                  </p>
                </div>
              )}
            </CardHeader>
            
            {/* Timer and Skip Set Button */}
            <CardContent className="text-center">
              <div className="text-6xl font-bold mb-4 font-mono">
                {formatTime(timeRemaining)}
              </div>
              
              {/* Skip Set Button for Exercise Steps */}
              {currentStep.type === 'exercise' && (
                <div className="mb-4">
                  <Button 
                    onClick={handleSkipSet}
                    variant={skippedStepsIds.has(`${currentStep.exerciseName}-${currentStep.setNumber}`) ? "default" : "outline"}
                    size="sm"
                    className={
                      skippedStepsIds.has(`${currentStep.exerciseName}-${currentStep.setNumber}`)
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/20"
                    }
                  >
                    <X className="h-4 w-4 mr-2" />
                    {skippedStepsIds.has(`${currentStep.exerciseName}-${currentStep.setNumber}`) 
                      ? "Undo Skip" 
                      : "Skip Set"
                    }
                  </Button>
                </div>
              )}
              
              {/* Next exercise preview */}
              {currentStep.type === 'rest' && currentStepIndex < workoutSteps.length - 1 && (
                <p className="text-sm text-muted-foreground">
                  Next: {workoutSteps[currentStepIndex + 1].exerciseName}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2 justify-center">
              {!isPlaying ? (
                <Button onClick={handleStart} size="lg" className="flex-1">
                  <Play className="h-5 w-5 mr-2" />
                  Start
                </Button>
              ) : (
                <Button onClick={handlePause} size="lg" variant="outline" className="flex-1">
                  <Pause className="h-5 w-5 mr-2" />
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
              )}
              
              <Button 
                onClick={handleSkipStep} 
                size="lg" 
                variant="outline"
                disabled={currentStepIndex >= workoutSteps.length - 1}
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button onClick={handleReset} variant="ghost" className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={() => navigate(-1)} variant="ghost" className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Exit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Exercise List Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Today's Exercises</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(activeWorkout?.exercises || workout?.exercises || []).map((exercise, index) => (
                <div 
                  key={index} 
                  className="flex justify-between items-center text-sm p-2 rounded border"
                >
                  <span className="font-medium">{exercise.name}</span>
                  <span className="text-muted-foreground">
                    {exercise.sets} × {exercise.reps}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Post-Workout AI Feedback Modal */}
        <PostWorkoutModal 
          isOpen={showPostWorkoutModal}
          onClose={() => setShowPostWorkoutModal(false)}
          workoutData={{
            title: activeWorkout?.title || workout?.title || 'Workout',
            setsCompleted: completedSteps,
            setsSkipped: skippedSets,
            totalSets: workoutSteps.reduce((total, step) => 
              step.type === 'exercise' ? total + 1 : total, 0
            ),
            durationMinutes: workoutStartTime 
              ? Math.round((Date.now() - workoutStartTime) / 60000) 
              : workout?.duration || 0,
            routineId: 'current_routine',
            skippedSetsByExercise,
            performanceScore: Math.round((completedSteps / workoutSteps.length) * 100),
            intensity: 'moderate'
          }}
        />
      </div>
    </div>
  );
}