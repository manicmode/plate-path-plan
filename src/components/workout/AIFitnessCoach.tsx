import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, Play, Lock, Unlock, RotateCcw, Calendar, Clock, Target, Dumbbell, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { useAIWorkoutGeneration } from '@/hooks/useAIWorkoutGeneration';
import { AIWorkoutRoutineConfigModal } from '@/components/AIWorkoutRoutineConfigModal';
import { toast } from 'sonner';

interface AIRoutine {
  id: string;
  routine_name: string;
  routine_goal: string;
  split_type: string;
  days_per_week: number;
  estimated_duration_minutes: number;
  fitness_level: string;
  equipment_needed: string[];
  routine_data: any;
  weekly_routine_data: any;
  is_active: boolean;
  start_date?: string;
  current_week: number;
  created_at: string;
}

interface WorkoutDay {
  day_name: string;
  workout_type: string;
  target_muscles: string[];
  estimated_duration: number;
  exercises: any[];
  is_locked: boolean;
  is_completed: boolean;
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const AIFitnessCoach: React.FC = () => {
  const { user } = useAuth();
  const { generateFullRoutine, regenerateDay, toggleDayLock, isGenerating, isRegenerating } = useAIWorkoutGeneration();
  
  const [currentRoutine, setCurrentRoutine] = useState<AIRoutine | null>(null);
  const [workoutDays, setWorkoutDays] = useState<Record<string, WorkoutDay>>({});
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);

  // Load current routine and workout data
  useEffect(() => {
    if (!user?.id) return;
    loadCurrentRoutine();
  }, [user?.id]);

  const loadCurrentRoutine = async () => {
    setIsLoading(true);
    try {
      // Get the user's most recent active routine
      const { data: routine, error: routineError } = await supabase
        .from('ai_routines')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (routineError && routineError.code !== 'PGRST116') {
        throw routineError;
      }

      if (routine) {
        setCurrentRoutine(routine);
        await loadWorkoutDays(routine.id, selectedWeek);
      } else {
        // No active routine found, check for any recent routines
        const { data: recentRoutine } = await supabase
          .from('ai_routines')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentRoutine) {
          setCurrentRoutine(recentRoutine);
          await loadWorkoutDays(recentRoutine.id, selectedWeek);
        }
      }
    } catch (error) {
      console.error('Error loading routine:', error);
      toast.error('Failed to load routine data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWorkoutDays = async (routineId: string, weekNumber: number) => {
    try {
      const { data: workouts, error } = await supabase
        .from('workout_routines')
        .select('*')
        .eq('ai_routine_id', routineId)
        .eq('week_number', weekNumber);

      if (error) throw error;

        const daysMap: Record<string, WorkoutDay> = {};
        workouts?.forEach(workout => {
          daysMap[workout.day_of_week] = {
            day_name: workout.day_of_week,
            workout_type: workout.workout_type || 'Rest',
            target_muscles: Array.isArray(workout.target_muscles) ? workout.target_muscles : [],
            estimated_duration: workout.estimated_duration || 0,
            exercises: Array.isArray(workout.exercises) ? workout.exercises : [],
            is_locked: workout.is_locked || false,
            is_completed: workout.completion_status === 'completed'
          };
        });

      setWorkoutDays(daysMap);
    } catch (error) {
      console.error('Error loading workout days:', error);
    }
  };

  const handleCreateNewRoutine = () => {
    setIsConfigModalOpen(true);
  };

  const handleRoutineCreated = (routine: AIRoutine) => {
    setCurrentRoutine(routine);
    setIsConfigModalOpen(false);
    loadCurrentRoutine();
    toast.success('New routine created! 🚀');
  };

  const handleStartRoutine = async () => {
    if (!currentRoutine) return;

    try {
      const { error } = await supabase
        .from('ai_routines')
        .update({
          is_active: true,
          start_date: new Date().toISOString().split('T')[0],
          current_week: 1
        })
        .eq('id', currentRoutine.id);

      if (error) throw error;

      setCurrentRoutine({ ...currentRoutine, is_active: true, start_date: new Date().toISOString().split('T')[0] });
      toast.success('Routine started! Let\'s get moving! 💪');
    } catch (error) {
      console.error('Error starting routine:', error);
      toast.error('Failed to start routine');
    }
  };

  const handleRegenerateDay = async (dayName: string) => {
    if (!currentRoutine) return;

    const newDay = await regenerateDay(currentRoutine.id, dayName, selectedWeek);
    if (newDay) {
      await loadWorkoutDays(currentRoutine.id, selectedWeek);
    }
  };

  const handleToggleDayLock = async (dayName: string, isLocked: boolean) => {
    if (!currentRoutine) return;

    await toggleDayLock(currentRoutine.id, dayName, selectedWeek, isLocked);
    await loadWorkoutDays(currentRoutine.id, selectedWeek);
  };

  const handleDayClick = (dayName: string) => {
    const dayData = workoutDays[dayName];
    if (dayData && dayData.workout_type !== 'Rest') {
      setSelectedDay(dayData);
      setIsDayDetailOpen(true);
    }
  };

  const getWorkoutTypeColor = (workoutType: string): string => {
    const colors: Record<string, string> = {
      'Push': 'bg-red-500',
      'Pull': 'bg-blue-500',
      'Legs': 'bg-green-500',
      'Upper': 'bg-purple-500',
      'Lower': 'bg-orange-500',
      'Full Body': 'bg-pink-500',
      'Cardio': 'bg-cyan-500',
      'Rest': 'bg-gray-500'
    };
    return colors[workoutType] || 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your AI fitness coach...</p>
        </div>
      </div>
    );
  }

  if (!currentRoutine) {
    return (
      <div className="space-y-6">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">AI Fitness Coach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-lg">
              Get a personalized 8-week workout routine designed by AI, tailored to your goals, fitness level, and available equipment.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
              <div className="text-center">
                <Target className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-medium">Goal-Oriented</h3>
                <p className="text-sm text-muted-foreground">Customized for your specific fitness goals</p>
              </div>
              <div className="text-center">
                <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-medium">Progressive Plan</h3>
                <p className="text-sm text-muted-foreground">8-week structured progression</p>
              </div>
              <div className="text-center">
                <Dumbbell className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-medium">Equipment Flexible</h3>
                <p className="text-sm text-muted-foreground">Adapts to your available equipment</p>
              </div>
            </div>
            <Button 
              onClick={handleCreateNewRoutine} 
              size="lg" 
              className="w-full"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Your Routine...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate My AI Routine
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <AIWorkoutRoutineConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onRoutineCreated={handleRoutineCreated}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Routine Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {currentRoutine.routine_name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{currentRoutine.routine_goal}</Badge>
                <Badge variant="outline">{currentRoutine.split_type}</Badge>
                <Badge variant="outline">{currentRoutine.fitness_level}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!currentRoutine.is_active && (
                <Button onClick={handleStartRoutine} size="sm">
                  <Play className="mr-2 h-4 w-4" />
                  Start Routine
                </Button>
              )}
              <Button 
                onClick={handleCreateNewRoutine} 
                variant="outline" 
                size="sm"
                disabled={isGenerating}
              >
                <Settings className="mr-2 h-4 w-4" />
                New Routine
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Days per Week</p>
              <p className="font-semibold">{currentRoutine.days_per_week}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-semibold">{currentRoutine.estimated_duration_minutes} min</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Equipment</p>
              <p className="font-semibold">{currentRoutine.equipment_needed.join(', ')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={currentRoutine.is_active ? "default" : "secondary"}>
                {currentRoutine.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Week Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {Array.from({ length: 8 }, (_, i) => i + 1).map(week => (
              <Button
                key={week}
                variant={selectedWeek === week ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedWeek(week);
                  if (currentRoutine) {
                    loadWorkoutDays(currentRoutine.id, week);
                  }
                }}
                className="flex-shrink-0"
              >
                Week {week}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Workout Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Week {selectedWeek} Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
            {DAYS_OF_WEEK.map(day => {
              const dayData = workoutDays[day];
              const isWorkoutDay = dayData && dayData.workout_type !== 'Rest';
              
              return (
                <Card 
                  key={day}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isWorkoutDay ? 'hover:scale-105' : 'opacity-75'
                  } ${dayData?.is_completed ? 'ring-2 ring-green-500' : ''}`}
                  onClick={() => isWorkoutDay && handleDayClick(day)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium capitalize">
                        {day}
                      </CardTitle>
                      {isWorkoutDay && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleDayLock(day, !dayData.is_locked);
                            }}
                          >
                            {dayData.is_locked ? (
                              <Lock className="h-3 w-3" />
                            ) : (
                              <Unlock className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRegenerateDay(day);
                            }}
                            disabled={dayData.is_locked || isRegenerating}
                          >
                            <RotateCcw className={`h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {dayData ? (
                      <div className="space-y-2">
                        <div className={`inline-block px-2 py-1 rounded text-xs text-white ${getWorkoutTypeColor(dayData.workout_type)}`}>
                          {dayData.workout_type}
                        </div>
                        {dayData.target_muscles.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {dayData.target_muscles.join(', ')}
                          </p>
                        )}
                        {dayData.estimated_duration > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {dayData.estimated_duration} min
                            </span>
                          </div>
                        )}
                        {dayData.is_completed && (
                          <Badge variant="default" className="text-xs">
                            ✓ Completed
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        No workout data
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <AIWorkoutRoutineConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onRoutineCreated={handleRoutineCreated}
      />

      <Dialog open={isDayDetailOpen} onOpenChange={setIsDayDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="capitalize">{selectedDay?.day_name}</span>
              <Badge className={getWorkoutTypeColor(selectedDay?.workout_type || '')}>
                {selectedDay?.workout_type}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedDay && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Target Muscles</p>
                  <p className="font-medium">{selectedDay.target_muscles.join(', ')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{selectedDay.estimated_duration} minutes</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Exercises</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedDay.exercises.map((exercise: any, index: number) => (
                    <Card key={index} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{exercise.title || `Exercise ${index + 1}`}</p>
                          <p className="text-sm text-muted-foreground">{exercise.description}</p>
                        </div>
                        {exercise.step_type === 'exercise' && (
                          <Badge variant="outline">
                            {exercise.sets}x{exercise.reps}
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};