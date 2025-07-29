import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Trophy, Calendar, Clock } from 'lucide-react';
import { WeekSelector } from '@/components/routine/WeekSelector';
import { DayCard } from '@/components/routine/DayCard';
import { WorkoutDetailModal } from '@/components/routine/WorkoutDetailModal';
import { WorkoutPreferencesModal } from '@/components/WorkoutPreferencesModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';

interface WorkoutDay {
  day: number;
  dayName: string;
  workout?: {
    title: string;
    muscleGroups: string[];
    exercises: Array<{
      name: string;
      sets: number;
      reps: string;
      rest: string;
      notes?: string;
    }>;
    duration: number;
    difficulty: string;
  };
  isRestDay: boolean;
  isCompleted: boolean;
  isLocked: boolean;
}

interface WeekData {
  week: number;
  days: WorkoutDay[];
  completedWorkouts: number;
  totalMinutes: number;
}

export default function AIRoutineViewer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [routineData, setRoutineData] = useState<any>(null);
  const [weekData, setWeekData] = useState<WeekData[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  useEffect(() => {
    loadRoutineData();
  }, [user?.id]);

  const loadRoutineData = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      console.log('AIRoutineViewer: Loading routine data for user:', user.id);
      
      // First try to get the user's active AI routine
      const { data: activeRoutine, error: activeError } = await supabase
        .from('ai_routines')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeRoutine) {
        console.log('AIRoutineViewer: Found active routine:', activeRoutine.id);
        setRoutineData(activeRoutine);
        generateWeekData(activeRoutine);
        return;
      }

      // If no active routine, try to find any routine
      const { data: anyRoutine, error: anyError } = await supabase
        .from('ai_routines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anyRoutine) {
        console.log('AIRoutineViewer: Found inactive routine:', anyRoutine.id);
        setRoutineData(anyRoutine);
        generateWeekData(anyRoutine);
        return;
      }

      // No routines found at all
      console.log('AIRoutineViewer: No routines found for user');
      setRoutineData(null);
    } catch (error) {
      console.error('Error loading routine data:', error);
      setRoutineData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const generateWeekData = (routine: any) => {
    const weeks: WeekData[] = [];
    const routineData = routine.routine_data;
    
    for (let week = 1; week <= 8; week++) {
      const days: WorkoutDay[] = [];
      let completedWorkouts = 0;
      let totalMinutes = 0;

      // Generate 7 days for each week
      for (let day = 1; day <= 7; day++) {
        const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][day - 1];
        const workoutKey = `week_${week}_day_${day}`;
        const workoutData = routineData?.weeks?.[week - 1]?.days?.[day - 1];

        if (workoutData && !workoutData.isRestDay) {
          const isCompleted = routine.locked_days?.[workoutKey]?.completed || false;
          const isLocked = routine.locked_days?.[workoutKey]?.locked || false;
          
          if (isCompleted) completedWorkouts++;
          totalMinutes += workoutData.duration || 45;

          days.push({
            day,
            dayName,
            workout: workoutData,
            isRestDay: false,
            isCompleted,
            isLocked
          });
        } else {
          days.push({
            day,
            dayName,
            isRestDay: true,
            isCompleted: false,
            isLocked: false
          });
        }
      }

      weeks.push({
        week,
        days,
        completedWorkouts,
        totalMinutes
      });
    }

    setWeekData(weeks);
  };

  const handleDayClick = (dayData: WorkoutDay) => {
    if (!dayData.isRestDay) {
      setSelectedWorkout(dayData);
    }
  };

  const handleMarkComplete = async (dayData: WorkoutDay, week: number) => {
    if (!routineData || dayData.isRestDay) return;

    try {
      const workoutKey = `week_${week}_day_${dayData.day}`;
      const updatedLockedDays = {
        ...routineData.locked_days,
        [workoutKey]: {
          ...routineData.locked_days?.[workoutKey],
          completed: !dayData.isCompleted
        }
      };

      const { error } = await supabase
        .from('ai_routines')
        .update({ locked_days: updatedLockedDays })
        .eq('id', routineData.id);

      if (error) throw error;

      // Update local state
      setRoutineData({ ...routineData, locked_days: updatedLockedDays });
      generateWeekData({ ...routineData, locked_days: updatedLockedDays });

      toast({
        title: dayData.isCompleted ? "Workout Unchecked" : "Workout Completed! 🎉",
        description: dayData.isCompleted 
          ? "Workout marked as incomplete" 
          : "Great job crushing that workout!",
      });
    } catch (error) {
      console.error('Error updating completion:', error);
      toast({
        title: "Error",
        description: "Failed to update workout status.",
        variant: "destructive"
      });
    }
  };

  const handleSaveAsFavorite = async () => {
    if (!routineData) return;

    try {
      // Create a copy of the routine as a favorite
      const { error } = await supabase
        .from('ai_routines')
        .insert({
          user_id: user?.id,
          routine_name: `${routineData.routine_name} (Favorite)`,
          routine_goal: routineData.routine_goal,
          split_type: routineData.split_type,
          fitness_level: routineData.fitness_level,
          days_per_week: routineData.days_per_week,
          estimated_duration_minutes: routineData.estimated_duration_minutes,
          equipment_needed: routineData.equipment_needed,
          routine_data: routineData.routine_data,
          is_active: false // Save as inactive favorite
        });

      if (error) throw error;

      toast({
        title: "Routine Saved! 💾",
        description: "This routine has been saved to your favorites.",
      });
    } catch (error) {
      console.error('Error saving favorite:', error);
      toast({
        title: "Error",
        description: "Failed to save routine as favorite.",
        variant: "destructive"
      });
    }
  };

  const currentWeekData = weekData.find(w => w.week === selectedWeek);
  const completionPercentage = currentWeekData 
    ? (currentWeekData.completedWorkouts / Math.max(currentWeekData.days.filter(d => !d.isRestDay).length, 1)) * 100
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="grid grid-cols-7 gap-3">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleActivateRoutine = async (routineId: string) => {
    if (!user?.id) return;
    
    try {
      // Deactivate all existing routines
      await supabase
        .from('ai_routines')
        .update({ is_active: false })
        .eq('user_id', user.id);
      
      // Activate the selected routine
      const { error } = await supabase
        .from('ai_routines')
        .update({ is_active: true })
        .eq('id', routineId);

      if (error) throw error;

      toast({
        title: "Routine Activated! 🚀",
        description: "This routine is now your active workout plan.",
      });
      
      // Reload data to reflect changes
      loadRoutineData();
    } catch (error) {
      console.error('Error activating routine:', error);
      toast({
        title: "Error",
        description: "Failed to activate routine.",
        variant: "destructive"
      });
    }
  };

  const handleGenerateNewRoutine = () => {
    console.log('AIRoutineViewer: Generate New Routine button clicked');
    setShowPreferencesModal(true);
  };

  const handleRoutineCreated = async (newRoutine: any) => {
    console.log('AIRoutineViewer: New routine created:', newRoutine);
    // Reload routine data to show the new routine
    await loadRoutineData();
    setShowPreferencesModal(false);
  };

  if (!routineData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>

          {/* No Active Routine Found */}
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-lg mx-auto shadow-lg">
              <CardContent className="pt-8 pb-6 text-center space-y-6">
                <div className="text-6xl mb-4">🏋️‍♂️</div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">No Active Routine Found</h2>
                  <p className="text-muted-foreground mb-6">
                    You can create a new one below or view past routines.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    onClick={handleGenerateNewRoutine}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
                  >
                    Generate New Routine
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/exercise-hub')}
                    className="w-full"
                  >
                    View Past Routines
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            {!routineData?.is_active && (
              <Button
                onClick={() => handleActivateRoutine(routineData.id)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Trophy className="h-4 w-4" />
                Activate This Routine
              </Button>
            )}
            <Button
              onClick={handleSaveAsFavorite}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              <Save className="h-4 w-4" />
              Save as Favorite
            </Button>
          </div>
        </div>

        {/* Title Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {routineData?.routine_name || 'My 8-Week Workout Plan'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Tap each day to see details or regenerate a workout 💪
          </p>
          {!routineData?.is_active && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              Inactive Routine
            </Badge>
          )}
          {routineData && (
            <div className="flex justify-center gap-4 mt-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                {routineData.routine_goal}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {routineData.days_per_week} days/week
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ~{routineData.estimated_duration_minutes}min
              </Badge>
            </div>
          )}
        </div>

        {/* AI Coach Tip */}
        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🤖</div>
              <div>
                <p className="font-medium text-foreground">AI Coach Tip</p>
                <p className="text-sm text-muted-foreground">
                  Stay consistent! Complete at least 80% of your weekly workouts for optimal results.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week Selector */}
        <WeekSelector
          selectedWeek={selectedWeek}
          onWeekChange={setSelectedWeek}
          weekData={weekData}
        />

        {/* Week Layout */}
        {currentWeekData && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Week {selectedWeek}</span>
                <Badge variant="outline">
                  {currentWeekData.completedWorkouts}/{currentWeekData.days.filter(d => !d.isRestDay).length} completed
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 mb-6">
                {currentWeekData.days.map((day) => (
                  <DayCard
                    key={day.day}
                    day={day}
                    week={selectedWeek}
                    onClick={() => handleDayClick(day)}
                    onMarkComplete={(dayData) => handleMarkComplete(dayData, selectedWeek)}
                  />
                ))}
              </div>

              {/* Progress Footer */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Week Progress</span>
                  <span className="font-medium">{Math.round(completionPercentage)}% Complete</span>
                </div>
                <Progress value={completionPercentage} className="h-2" />
                
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{currentWeekData.completedWorkouts} workouts completed</span>
                  <span>{currentWeekData.totalMinutes} total minutes</span>
                </div>
                
                {completionPercentage === 100 && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg">
                    <Trophy className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">
                      Perfect Week! 🎉
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workout Detail Modal */}
        {selectedWorkout && (
          <WorkoutDetailModal
            workout={selectedWorkout}
            week={selectedWeek}
            isOpen={!!selectedWorkout}
            onClose={() => setSelectedWorkout(null)}
            onMarkComplete={(dayData) => handleMarkComplete(dayData, selectedWeek)}
          />
        )}

        {/* Workout Preferences Modal */}
        <WorkoutPreferencesModal
          isOpen={showPreferencesModal}
          onClose={() => setShowPreferencesModal(false)}
          onRoutineCreated={handleRoutineCreated}
        />
      </div>
    </div>
  );
}