import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Check, Clock, Dumbbell, Target, Timer, Plus, Minus, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: string;
  duration_seconds?: number;
  rest_seconds?: number;
  instructions?: string;
  muscle_groups?: string[];
}

interface WorkoutExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  routineId: string;
  dayName: string;
  dayIndex: number;
  exercises: Exercise[];
  estimatedDuration: number;
}

interface ExerciseLog {
  exerciseId: string;
  sets: Array<{
    reps: number;
    weight: number;
    completed: boolean;
  }>;
  notes: string;
  completed: boolean;
}

export function WorkoutExecutionModal({
  isOpen,
  onClose,
  routineId,
  dayName,
  dayIndex,
  exercises,
  estimatedDuration
}: WorkoutExecutionModalProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLog>>({});
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [sessionNotes, setSessionNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const currentExercise = exercises[currentExerciseIndex];
  const currentLog = exerciseLogs[currentExercise?.id] || {
    exerciseId: currentExercise?.id || '',
    sets: [],
    notes: '',
    completed: false
  };

  // Initialize workout session
  useEffect(() => {
    if (isOpen && !sessionId) {
      initializeSession();
    }
  }, [isOpen]);

  // Rest timer
  useEffect(() => {
    if (isResting && restTimeLeft > 0) {
      const timer = setTimeout(() => {
        setRestTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (restTimeLeft === 0) {
      setIsResting(false);
    }
  }, [isResting, restTimeLeft]);

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

  const updateExerciseSet = (setIndex: number, field: 'reps' | 'weight', value: number) => {
    setExerciseLogs(prev => ({
      ...prev,
      [currentExercise.id]: {
        ...prev[currentExercise.id],
        sets: prev[currentExercise.id].sets.map((set, idx) =>
          idx === setIndex ? { ...set, [field]: value } : set
        )
      }
    }));
  };

  const completeSet = (setIndex: number) => {
    setExerciseLogs(prev => {
      const updated = {
        ...prev,
        [currentExercise.id]: {
          ...prev[currentExercise.id],
          sets: prev[currentExercise.id].sets.map((set, idx) =>
            idx === setIndex ? { ...set, completed: true } : set
          )
        }
      };

      // Check if all sets are completed
      const allSetsCompleted = updated[currentExercise.id].sets.every(set => set.completed);
      if (allSetsCompleted) {
        updated[currentExercise.id].completed = true;
      }

      return updated;
    });

    // Start rest timer if exercise has rest time
    if (currentExercise.rest_seconds && setIndex < currentLog.sets.length - 1) {
      setIsResting(true);
      setRestTimeLeft(currentExercise.rest_seconds);
    }
  };

  const nextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setIsResting(false);
      setRestTimeLeft(0);
    }
  };

  const previousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
      setIsResting(false);
      setRestTimeLeft(0);
    }
  };

  const saveExerciseLog = async () => {
    if (!sessionId || !currentExercise) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const log = currentLog;
      
      await supabase
        .from('workout_logs')
        .insert({
          user_id: user.id,
          routine_id: routineId,
          day_name: dayName,
          day_index: dayIndex,
          exercise_name: currentExercise.name,
          exercise_type: currentExercise.muscle_groups?.[0] || 'strength',
          sets_completed: log.sets.filter(set => set.completed).length,
          target_sets: log.sets.length,
          reps_completed: JSON.stringify(log.sets.map(set => set.reps)),
          target_reps: currentExercise.reps || '',
          weight_used: log.sets.reduce((avg, set) => avg + set.weight, 0) / log.sets.length,
          notes: log.notes
        });

      toast({
        title: "Exercise Logged",
        description: `${currentExercise.name} has been saved`,
      });

    } catch (error) {
      console.error('Error saving exercise log:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save exercise data",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const completeWorkout = async () => {
    if (!sessionId) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const completedExercises = Object.values(exerciseLogs).filter(log => log.completed).length;
      const sessionDuration = sessionStartTime 
        ? Math.round((new Date().getTime() - sessionStartTime.getTime()) / 60000)
        : estimatedDuration;

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

      onClose();

    } catch (error) {
      console.error('Error completing workout:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save workout data",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const completedExercises = Object.values(exerciseLogs).filter(log => log.completed).length;
  const progressPercentage = (completedExercises / exercises.length) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentExercise) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            {dayName.charAt(0).toUpperCase() + dayName.slice(1)} Workout
          </DialogTitle>
          <DialogDescription>
            Exercise {currentExerciseIndex + 1} of {exercises.length} • {completedExercises} completed
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Rest Timer */}
        {isResting && (
          <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Timer className="h-5 w-5 text-orange-600" />
                <span className="font-medium">Rest Time</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {formatTime(restTimeLeft)}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsResting(false)}
                className="mt-2"
              >
                Skip Rest
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Exercise Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{currentExercise.name}</span>
                <Badge variant={currentLog.completed ? "default" : "secondary"}>
                  {currentLog.completed ? "Completed" : "In Progress"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Target Info */}
              <div className="grid grid-cols-3 gap-4 text-center">
                {currentExercise.sets && (
                  <div>
                    <div className="text-2xl font-bold text-primary">{currentExercise.sets}</div>
                    <div className="text-sm text-muted-foreground">Sets</div>
                  </div>
                )}
                {currentExercise.reps && (
                  <div>
                    <div className="text-2xl font-bold text-primary">{currentExercise.reps}</div>
                    <div className="text-sm text-muted-foreground">Reps</div>
                  </div>
                )}
                {currentExercise.duration_seconds && (
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {formatTime(currentExercise.duration_seconds)}
                    </div>
                    <div className="text-sm text-muted-foreground">Duration</div>
                  </div>
                )}
              </div>

              {/* Muscle Groups */}
              {currentExercise.muscle_groups && (
                <div className="flex flex-wrap gap-1">
                  {currentExercise.muscle_groups.map((muscle) => (
                    <Badge key={muscle} variant="outline" className="text-xs">
                      {muscle}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Instructions */}
              {currentExercise.instructions && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-1">Instructions</h4>
                  <p className="text-sm text-muted-foreground">
                    {currentExercise.instructions}
                  </p>
                </div>
              )}

              {/* Exercise Notes */}
              <div className="space-y-2">
                <Label>Exercise Notes</Label>
                <Textarea
                  placeholder="Add notes about this exercise..."
                  value={currentLog.notes}
                  onChange={(e) => setExerciseLogs(prev => ({
                    ...prev,
                    [currentExercise.id]: {
                      ...prev[currentExercise.id],
                      notes: e.target.value
                    }
                  }))}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Set Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Track Your Sets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentLog.sets.map((set, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 border rounded-lg transition-all",
                    set.completed 
                      ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" 
                      : "bg-background"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Set {index + 1}</span>
                    {set.completed && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Reps</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateExerciseSet(index, 'reps', Math.max(1, set.reps - 1))}
                          disabled={set.completed}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={set.reps}
                          onChange={(e) => updateExerciseSet(index, 'reps', parseInt(e.target.value) || 0)}
                          className="h-8 text-center"
                          disabled={set.completed}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateExerciseSet(index, 'reps', set.reps + 1)}
                          disabled={set.completed}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Weight (kg)</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateExerciseSet(index, 'weight', Math.max(0, set.weight - 2.5))}
                          disabled={set.completed}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          step="0.5"
                          value={set.weight}
                          onChange={(e) => updateExerciseSet(index, 'weight', parseFloat(e.target.value) || 0)}
                          className="h-8 text-center"
                          disabled={set.completed}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateExerciseSet(index, 'weight', set.weight + 2.5)}
                          disabled={set.completed}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {!set.completed && (
                    <Button
                      onClick={() => completeSet(index)}
                      size="sm"
                      className="w-full mt-2"
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Complete Set
                    </Button>
                  )}
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={saveExerciseLog} 
                  variant="outline" 
                  size="sm"
                  disabled={isSaving}
                >
                  <Save className="mr-1 h-3 w-3" />
                  Save Exercise
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation & Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={previousExercise}
              disabled={currentExerciseIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={nextExercise}
              disabled={currentExerciseIndex === exercises.length - 1}
            >
              Next
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Save & Exit
            </Button>
            <Button
              onClick={completeWorkout}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? "Saving..." : "Finish Workout"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}