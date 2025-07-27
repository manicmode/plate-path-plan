import { useState, useEffect, useCallback } from 'react';
import { useSound } from '@/hooks/useSound';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

export interface ExerciseStep {
  id: string;
  type: 'warmup' | 'exercise' | 'rest' | 'cooldown';
  title: string;
  description?: string;
  duration?: number; // seconds
  reps?: number;
  sets?: number;
  currentSet?: number;
  instructions?: string;
  imageUrl?: string;
  exerciseName?: string; // For media lookup
}

interface UseRoutineExecutionProps {
  routineId: string;
  onComplete?: () => void;
}

export const useRoutineExecution = ({ routineId, onComplete }: UseRoutineExecutionProps) => {
  const [steps, setSteps] = useState<ExerciseStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [routine, setRoutine] = useState<any>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [motivationCounter, setMotivationCounter] = useState(0);
  
  const { playProgressUpdate, playGoalHit, playReminderChime } = useSound();
  const { user } = useAuth();

  // Load routine data and generate steps
  useEffect(() => {
    const loadRoutine = () => {
      // Mock routine data - in real app this would come from API/Supabase
      const mockRoutine = {
        id: parseInt(routineId),
        title: "Push/Pull/Legs Split",
        createdAt: new Date().toISOString(),
        weeklyPlan: {
          Monday: "Push: Bench press 3x8, Shoulder press 3x10, Tricep dips 3x12",
          Tuesday: "Pull: Pull-ups 3x8, Rows 3x10, Bicep curls 3x12",
          Wednesday: "Legs: Squats 3x10, Deadlifts 3x8, Calf raises 3x15",
          Thursday: "Push: Incline press 3x8, Lateral raises 3x12, Push-ups 3x15",
          Friday: "Pull: Lat pulldowns 3x10, Face pulls 3x15, Hammer curls 3x12",
          Saturday: "Legs: Leg press 3x12, Romanian deadlifts 3x10, Lunges 3x12",
          Sunday: "Rest day"
        }
      };
      
      setRoutine(mockRoutine);
      
      // Calculate current day based on routine start
      const startDate = new Date(mockRoutine.createdAt);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const calculatedDay = ((diffDays - 1) % 7) + 1;
      setCurrentDay(calculatedDay);
      
      // Get today's workout
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = daysOfWeek[new Date().getDay()];
      const todaysWorkout = mockRoutine.weeklyPlan[todayName];
      
      // Parse workout into steps
      const generatedSteps = parseWorkoutIntoSteps(todaysWorkout, todayName);
      setSteps(generatedSteps);
    };

    if (routineId) {
      loadRoutine();
    }
  }, [routineId]);

  const parseWorkoutIntoSteps = (workout: string, dayName: string): ExerciseStep[] => {
    if (!workout || workout === "Rest day") {
      return [{
        id: '1',
        type: 'rest',
        title: 'Rest Day',
        description: 'Take a well-deserved rest today!',
        duration: 0
      }];
    }

    const steps: ExerciseStep[] = [];
    
    // Add warm-up
    steps.push({
      id: 'warmup',
      type: 'warmup',
      title: '5-Minute Warm-up',
      description: 'Light cardio and dynamic stretching',
      duration: 300, // 5 minutes
      instructions: 'Start with light movement to warm up your muscles'
    });

    // Parse exercises from workout string
    const exercises = workout.split(',').map(ex => ex.trim());
    
    exercises.forEach((exercise, index) => {
      // Extract exercise details (name, sets, reps)
      const match = exercise.match(/(.+?)\s+(\d+)x(\d+)/);
      if (match) {
        const [, name, sets, reps] = match;
        const setsCount = parseInt(sets);
        const repsCount = parseInt(reps);
        
        // Add sets for this exercise
        for (let set = 1; set <= setsCount; set++) {
          const exerciseName = name.trim().toLowerCase().replace(/\s+/g, '-');
          steps.push({
            id: `${index}-${set}`,
            type: 'exercise',
            title: `Set ${set}: ${name.trim()}`,
            description: `${repsCount} reps`,
            reps: repsCount,
            sets: setsCount,
            currentSet: set,
            duration: 60, // 1 minute for exercise
            instructions: `Perform ${repsCount} repetitions of ${name.trim()}`,
            exerciseName,
            imageUrl: `/images/exercises/${exerciseName}.gif`
          });
          
          // Add rest between sets (except after last set of last exercise)
          if (set < setsCount || index < exercises.length - 1) {
            steps.push({
              id: `rest-${index}-${set}`,
              type: 'rest',
              title: 'Rest',
              description: 'Take a break between sets',
              duration: 90 // 90 seconds rest
            });
          }
        }
      }
    });

    // Add cool-down
    steps.push({
      id: 'cooldown',
      type: 'cooldown',
      title: '5-Minute Cool-down',
      description: 'Static stretching and relaxation',
      duration: 300, // 5 minutes
      instructions: 'Stretch and cool down your worked muscles'
    });

    return steps;
  };

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && !isPaused && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Step completed
            playReminderChime(); // Beep sound for step transition
            handleStepComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isRunning, isPaused, timeRemaining]);

  // Initialize timer when step changes
  useEffect(() => {
    if (steps[currentStepIndex]?.duration) {
      setTimeRemaining(steps[currentStepIndex].duration);
    }
  }, [currentStepIndex, steps]);

  const handleStepComplete = useCallback(() => {
    const currentStep = steps[currentStepIndex];
    if (currentStep) {
      setCompletedSteps(prev => [...prev, currentStep.title]);
      
      // Show motivation every ~3 steps
      setMotivationCounter(prev => {
        const newCount = prev + 1;
        if (newCount % 3 === 0 && !isCompleted) {
          showMotivationMessage(currentStep);
        }
        return newCount;
      });
    }
    
    handleNextStep();
  }, [currentStepIndex, steps, isCompleted]);

  const showMotivationMessage = useCallback(async (step: ExerciseStep) => {
    try {
      const progress = steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0;
      
      const response = await supabase.functions.invoke('generate-motivation', {
        body: {
          currentStep: step.title,
          stepType: step.type,
          progress: Math.round(progress)
        }
      });
      
      if (response.data?.motivationMessage) {
        toast.success(response.data.motivationMessage, {
          duration: 3000,
          position: 'top-center'
        });
      }
    } catch (error) {
      console.error('Error generating motivation:', error);
      // Fallback motivational messages
      const fallbackMessages = [
        "🔥 You're crushing it! Keep going!",
        "💪 You're on fire! One more set!",
        "🚀 Finish strong – your body will thank you!",
        "⚡ Amazing work! You've got this!",
        "🌟 Keep pushing! Every rep counts!"
      ];
      const randomMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
      toast.success(randomMessage, {
        duration: 3000,
        position: 'top-center'
      });
    }
  }, [currentStepIndex, steps]);

  const handleStart = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  const handlePause = useCallback(() => {
    setIsPaused(!isPaused);
  }, [isPaused]);

  const handleNextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Workout completed
      handleComplete();
    }
  }, [currentStepIndex, steps.length]);

  const handlePrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const handleComplete = useCallback(async () => {
    setIsCompleted(true);
    setIsRunning(false);
    playGoalHit();
    
    // Log workout to database with enhanced details
    if (user && routine) {
      try {
        const totalDuration = steps.reduce((acc, step) => acc + (step.duration || 0), 0);
        const estimatedCalories = Math.round(totalDuration * 0.15); // Rough estimate
        
        const { error } = await supabase
          .from('exercise_logs')
          .insert({
            user_id: user.id,
            activity_type: routine.title,
            duration_minutes: Math.round(totalDuration / 60),
            calories_burned: estimatedCalories,
            intensity_level: 'moderate',
            // Store additional data in a JSON column if available, or we'll add it as separate fields later
          });
          
        if (error) {
          console.error('Error logging workout:', error);
        } else {
          toast.success("🎉 Workout logged successfully!", {
            description: `${completedSteps.length} steps completed in ${Math.round(totalDuration / 60)} minutes`
          });
        }
      } catch (error) {
        console.error('Error logging workout:', error);
      }
    }
    
    if (onComplete) {
      onComplete();
    }
  }, [user, routine, steps, playGoalHit, onComplete]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const currentStep = steps[currentStepIndex];
  const progress = steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0;

  return {
    // State
    steps,
    currentStep,
    currentStepIndex,
    timeRemaining,
    isRunning,
    isPaused,
    isCompleted,
    routine,
    currentDay,
    progress,
    completedSteps,
    
    // Actions
    handleStart,
    handlePause,
    handleNextStep,
    handlePrevStep,
    handleComplete,
    formatTime
  };
};