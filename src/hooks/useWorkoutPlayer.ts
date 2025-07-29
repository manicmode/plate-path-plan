import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: string;
  duration_seconds?: number;
  rest_seconds?: number;
  instructions?: string;
  muscle_groups?: string[];
}

export interface SetLog {
  reps: number;
  weight: number;
  completed: boolean;
  duration_seconds?: number;
  started_at?: Date;
  completed_at?: Date;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
  notes: string;
  completed: boolean;
}

export type WorkoutPhase = 'exercise-intro' | 'set-active' | 'set-rest' | 'exercise-complete' | 'workout-complete';

export function useWorkoutPlayer(
  routineId: string,
  dayName: string,
  dayIndex: number,
  exercises: Exercise[]
) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [phase, setPhase] = useState<WorkoutPhase>('exercise-intro');
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLog>>({});
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const { toast } = useToast();

  const currentExercise = exercises[currentExerciseIndex];
  const currentLog = exerciseLogs[currentExercise?.id] || {
    exerciseId: currentExercise?.id || '',
    sets: [],
    notes: '',
    completed: false
  };

  // Sound effects
  const playBeep = useCallback((type: 'start' | 'end' | 'rest-start' | 'rest-end') => {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    
    oscillator.connect(gain);
    gain.connect(context.destination);
    
    // Different frequencies for different beep types
    const frequencies = {
      'start': 800,
      'end': 600,
      'rest-start': 400,
      'rest-end': 1000
    };
    
    oscillator.frequency.setValueAtTime(frequencies[type], context.currentTime);
    oscillator.type = 'sine';
    
    gain.gain.setValueAtTime(0.1, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
    
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
  }, []);

  // Timer management
  useEffect(() => {
    if (isTimerActive && timerSeconds > 0) {
      const timer = setTimeout(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isTimerActive && timerSeconds === 0) {
      handleTimerComplete();
    }
  }, [isTimerActive, timerSeconds]);

  const handleTimerComplete = useCallback(() => {
    setIsTimerActive(false);
    
    if (phase === 'set-active') {
      playBeep('end');
      if (currentExercise?.rest_seconds) {
        startRestTimer();
      } else {
        completeCurrentSet();
      }
    } else if (phase === 'set-rest') {
      playBeep('rest-end');
      moveToNextSet();
    }
  }, [phase, currentExercise, playBeep]);

  const initializeSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: session, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          routine_id: routineId,
          day_name: dayName,
          day_index: dayIndex,
          total_exercises: exercises.length,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(session.id);
      setSessionStartTime(new Date());

      // Initialize exercise logs
      const initialLogs: Record<string, ExerciseLog> = {};
      exercises.forEach(exercise => {
        const targetSets = exercise.sets || 3;
        initialLogs[exercise.id] = {
          exerciseId: exercise.id,
          sets: Array(targetSets).fill(null).map(() => ({
            reps: parseInt(exercise.reps?.split('-')[0] || '10'),
            weight: 0,
            completed: false
          })),
          notes: '',
          completed: false
        };
      });
      setExerciseLogs(initialLogs);

    } catch (error) {
      console.error('Error initializing session:', error);
      toast({
        title: "Error",
        description: "Failed to start workout session",
        variant: "destructive",
      });
    }
  };

  const startSet = useCallback(() => {
    playBeep('start');
    setPhase('set-active');
    
    if (currentExercise?.duration_seconds) {
      setTimerSeconds(currentExercise.duration_seconds);
      setIsTimerActive(true);
    }
    
    // Update set start time
    updateCurrentSet({ started_at: new Date() });
  }, [currentExercise, playBeep]);

  const completeCurrentSet = useCallback(() => {
    playBeep('end');
    updateCurrentSet({ 
      completed: true, 
      completed_at: new Date() 
    });
    
    if (currentExercise?.rest_seconds && currentSetIndex < currentLog.sets.length - 1) {
      startRestTimer();
    } else {
      moveToNextSet();
    }
  }, [currentExercise, currentSetIndex, currentLog.sets.length, playBeep]);

  const startRestTimer = useCallback(() => {
    playBeep('rest-start');
    setPhase('set-rest');
    setTimerSeconds(currentExercise?.rest_seconds || 60);
    setIsTimerActive(true);
  }, [currentExercise, playBeep]);

  const extendRest = useCallback((seconds: number) => {
    setTimerSeconds(prev => prev + seconds);
  }, []);

  const skipRest = useCallback(() => {
    setIsTimerActive(false);
    setTimerSeconds(0);
    playBeep('rest-end');
    moveToNextSet();
  }, [playBeep]);

  const moveToNextSet = useCallback(() => {
    if (currentSetIndex < currentLog.sets.length - 1) {
      setCurrentSetIndex(prev => prev + 1);
      setPhase('exercise-intro');
    } else {
      setPhase('exercise-complete');
    }
  }, [currentSetIndex, currentLog.sets.length]);

  const moveToNextExercise = useCallback(() => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setCurrentSetIndex(0);
      setPhase('exercise-intro');
    } else {
      setPhase('workout-complete');
    }
  }, [currentExerciseIndex, exercises.length]);

  const updateCurrentSet = useCallback((updates: Partial<SetLog>) => {
    setExerciseLogs(prev => ({
      ...prev,
      [currentExercise.id]: {
        ...prev[currentExercise.id],
        sets: prev[currentExercise.id].sets.map((set, idx) =>
          idx === currentSetIndex ? { ...set, ...updates } : set
        )
      }
    }));
  }, [currentExercise?.id, currentSetIndex]);

  const updateExerciseNotes = useCallback((notes: string) => {
    setExerciseLogs(prev => ({
      ...prev,
      [currentExercise.id]: {
        ...prev[currentExercise.id],
        notes
      }
    }));
  }, [currentExercise?.id]);

  const markExerciseComplete = useCallback(() => {
    setExerciseLogs(prev => ({
      ...prev,
      [currentExercise.id]: {
        ...prev[currentExercise.id],
        completed: true
      }
    }));
    moveToNextExercise();
  }, [currentExercise?.id, moveToNextExercise]);

  const saveWorkoutSession = async () => {
    if (!sessionId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const completedExercises = Object.values(exerciseLogs).filter(log => log.completed).length;
      const sessionDuration = sessionStartTime 
        ? Math.round((new Date().getTime() - sessionStartTime.getTime()) / 60000)
        : 0;

      // Save all exercise logs
      for (const exercise of exercises) {
        const log = exerciseLogs[exercise.id];
        if (log && log.sets.some(set => set.completed)) {
          await supabase
            .from('workout_logs')
            .insert({
              user_id: user.id,
              routine_id: routineId,
              day_name: dayName,
              day_index: dayIndex,
              exercise_name: exercise.name,
              exercise_type: exercise.muscle_groups?.[0] || 'strength',
              sets_completed: log.sets.filter(set => set.completed).length,
              target_sets: log.sets.length,
              reps_completed: JSON.stringify(log.sets.map(set => set.reps)),
              target_reps: exercise.reps || '',
              weight_used: log.sets.reduce((avg, set) => avg + set.weight, 0) / log.sets.length,
              notes: log.notes
            });
        }
      }

      // Update session
      await supabase
        .from('workout_sessions')
        .update({
          completed_exercises: completedExercises,
          total_duration_minutes: sessionDuration,
          session_notes: sessionNotes,
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      toast({
        title: "🎉 Workout Complete!",
        description: `Great job! You completed ${completedExercises}/${exercises.length} exercises in ${sessionDuration} minutes.`,
      });

    } catch (error) {
      console.error('Error saving workout:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save workout data",
        variant: "destructive",
      });
    }
  };

  return {
    // State
    sessionId,
    currentExercise,
    currentExerciseIndex,
    currentSetIndex,
    phase,
    currentLog,
    timerSeconds,
    isTimerActive,
    sessionStartTime,
    
    // Actions
    initializeSession,
    startSet,
    completeCurrentSet,
    extendRest,
    skipRest,
    updateCurrentSet,
    updateExerciseNotes,
    markExerciseComplete,
    saveWorkoutSession,
    
    // Computed
    totalExercises: exercises.length,
    completedExercises: Object.values(exerciseLogs).filter(log => log.completed).length,
    currentSetNumber: currentSetIndex + 1,
    totalSets: currentLog.sets.length,
    progressPercentage: (Object.values(exerciseLogs).filter(log => log.completed).length / exercises.length) * 100
  };
}