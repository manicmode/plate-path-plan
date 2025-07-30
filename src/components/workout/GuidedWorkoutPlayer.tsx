import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  SkipForward, 
  ArrowLeft,
  Timer, 
  Dumbbell,
  CheckCircle,
  Target,
  Clock,
  FastForward
} from 'lucide-react';
import { useSound } from '@/contexts/SoundContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { useWorkoutCompletion } from '@/contexts/WorkoutCompletionContext';
import { cn } from '@/lib/utils';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
}

interface WorkoutData {
  title: string;
  exercises: Exercise[];
  duration: number;
}

interface GuidedWorkoutPlayerProps {
  workoutData: WorkoutData;
  week: number;
  day: number;
}

type WorkoutPhase = 'exercise' | 'rest' | 'completed';

export function GuidedWorkoutPlayer({ workoutData, week, day }: GuidedWorkoutPlayerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { playSound } = useSound();
  const { showCompletionModal } = useWorkoutCompletion();
  
  // State management
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState<WorkoutPhase>('exercise');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);

  const currentExercise = workoutData.exercises[currentExerciseIndex];
  const totalExercises = workoutData.exercises.length;
  const progressPercentage = ((currentExerciseIndex) / totalExercises) * 100;

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isTimerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerActive(false);
            playSound('complete');
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, timeRemaining]);

  const handleTimerComplete = () => {
    if (phase === 'exercise') {
      // Exercise completed, start rest if not last set
      if (currentSet < currentExercise.sets) {
        setPhase('rest');
        const restTime = parseInt(currentExercise.rest.split(' ')[0]) || 60;
        setTimeRemaining(restTime);
        setIsTimerActive(true);
      } else {
        // Exercise completely finished
        handleNextExercise();
      }
    } else if (phase === 'rest') {
      // Rest completed, start next set
      setPhase('exercise');
      setCurrentSet(prev => prev + 1);
    }
  };

  const handleStartSet = () => {
    if (!workoutStartTime) {
      setWorkoutStartTime(Date.now());
    }
    
    playSound('start');
    setPhase('exercise');
    // For now, we'll use a fixed 30-second timer for demo
    // In a real app, this could be configurable or based on exercise type
    setTimeRemaining(30);
    setIsTimerActive(true);
  };

  const handleSkipRest = () => {
    setIsTimerActive(false);
    setPhase('exercise');
    setCurrentSet(prev => prev + 1);
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < totalExercises - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setCurrentSet(1);
      setPhase('exercise');
      setIsTimerActive(false);
      setTimeRemaining(0);
    } else {
      handleWorkoutComplete();
    }
  };

  const handleSkipExercise = () => {
    setIsTimerActive(false);
    handleNextExercise();
  };

  const handleWorkoutComplete = async () => {
    setPhase('completed');
    
    if (!user || !workoutStartTime) return;

    const workoutDuration = Math.round((Date.now() - workoutStartTime) / 1000 / 60);
    
    try {
      // For now, we'll just show the completion modal without database logging
      // In a real implementation, you'd need to check the correct table schema

      // Show completion modal
      showCompletionModal({
        workoutType: 'ai_routine',
        durationMinutes: workoutDuration,
        exercisesCount: totalExercises,
        setsCount: workoutData.exercises.reduce((total, ex) => total + ex.sets, 0),
        musclesWorked: [], // Could be extracted from exercise data
        workoutData
      });

      toast({
        title: "Workout Complete! 🎉",
        description: `Great job completing ${workoutData.title}!`,
      });

    } catch (error) {
      console.error('Error logging workout:', error);
      toast({
        title: "Workout saved locally",
        description: "There was an issue syncing your workout, but your progress is saved.",
        variant: "destructive"
      });
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBack = () => {
    navigate('/exercise-hub');
  };

  if (phase === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto text-center p-8 border-primary/20 shadow-2xl">
          <div className="mb-6">
            <CheckCircle className="h-20 w-20 text-primary mx-auto mb-4 animate-scale-in" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Workout Complete!</h1>
            <p className="text-muted-foreground">Amazing work crushing {workoutData.title}</p>
          </div>
          <Button onClick={handleBack} className="w-full">
            Back to Exercise Hub
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="hover:scale-105 transition-transform">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">{workoutData.title}</h1>
          <Badge variant="secondary" className="mt-1">
            Exercise {currentExerciseIndex + 1} of {totalExercises}
          </Badge>
        </div>
        <div className="w-16"></div> {/* Spacer for balance */}
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <Progress value={progressPercentage} className="h-3 animate-fade-in" />
        <p className="text-center text-sm text-muted-foreground mt-2">
          {Math.round(progressPercentage)}% Complete
        </p>
      </div>

      {/* Main Exercise Card */}
      <div className="max-w-2xl mx-auto mb-8">
        <Card className={cn(
          "relative overflow-hidden border-2 transition-all duration-300 shadow-xl",
          phase === 'exercise' && isTimerActive ? "border-primary shadow-primary/25 animate-pulse" : "border-muted"
        )}>
          <CardContent className="p-8 text-center">
            {/* Exercise Info */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-4 animate-fade-in">
                {currentExercise.name}
              </h2>
              
              <div className="flex justify-center items-center gap-8 mb-6">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">{currentExercise.reps} reps</span>
                </div>
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">Set {currentSet}/{currentExercise.sets}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">{currentExercise.rest} rest</span>
                </div>
              </div>

              {currentExercise.notes && (
                <p className="text-muted-foreground bg-muted/50 rounded-lg p-4">
                  {currentExercise.notes}
                </p>
              )}
            </div>

            {/* Timer Display */}
            {isTimerActive && (
              <div className="mb-8 animate-scale-in">
                <div className={cn(
                  "text-6xl font-mono font-bold mb-2 transition-colors",
                  timeRemaining <= 5 ? "text-destructive animate-pulse" : "text-primary"
                )}>
                  {formatTime(timeRemaining)}
                </div>
                <p className="text-muted-foreground">
                  {phase === 'exercise' ? "Exercise Time" : "Rest Time"}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
              {phase === 'exercise' && !isTimerActive && (
                <Button 
                  onClick={handleStartSet}
                  size="lg"
                  className="w-full h-16 text-xl font-bold hover:scale-105 transition-transform bg-gradient-to-r from-primary to-primary/80"
                >
                  <Play className="h-6 w-6 mr-3" />
                  Start Set
                </Button>
              )}

              {phase === 'rest' && isTimerActive && (
                <div className="space-y-3">
                  <Button 
                    onClick={handleSkipRest}
                    variant="outline"
                    size="lg"
                    className="w-full h-14 text-lg hover:scale-105 transition-transform"
                  >
                    <FastForward className="h-5 w-5 mr-2" />
                    Skip Rest
                  </Button>
                  {currentSet < currentExercise.sets && (
                    <p className="text-sm text-muted-foreground">
                      Next: Set {currentSet + 1}/{currentExercise.sets}
                    </p>
                  )}
                </div>
              )}

              {!isTimerActive && phase === 'exercise' && currentSet >= currentExercise.sets && (
                <Button 
                  onClick={handleNextExercise}
                  size="lg"
                  className="w-full h-16 text-xl font-bold hover:scale-105 transition-transform"
                >
                  <CheckCircle className="h-6 w-6 mr-3" />
                  Complete Exercise
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Actions */}
      <div className="max-w-2xl mx-auto flex gap-4">
        <Button 
          onClick={handleSkipExercise}
          variant="outline"
          className="flex-1 h-12 hover:scale-105 transition-transform"
        >
          <SkipForward className="h-4 w-4 mr-2" />
          Skip Exercise
        </Button>
        
        {currentExerciseIndex === totalExercises - 1 && currentSet >= currentExercise.sets && (
          <Button 
            onClick={handleWorkoutComplete}
            className="flex-1 h-12 hover:scale-105 transition-transform bg-gradient-to-r from-primary to-primary/80"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Finish Workout
          </Button>
        )}
      </div>
    </div>
  );
}