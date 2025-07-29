import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, Target, Activity, RefreshCw, Lock, LockOpen, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface AIRoutineCardProps {
  routine: {
    id: string;
    routine_name: string;
    routine_goal: string;
    split_type: string;
    days_per_week: number;
    estimated_duration_minutes: number;
    fitness_level: string;
    equipment_needed: string[];
    start_date: string | null;
    current_week: number;
    current_day_in_week: number;
    is_active: boolean;
    locked_days: any;
    routine_data: any;
    created_at: string;
  };
  onEdit?: (routine: any) => void;
  onDelete?: (routine: any) => void;
}

export const AIRoutineCard: React.FC<AIRoutineCardProps> = ({ routine, onEdit, onDelete }) => {
  const { user } = useAuth();
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [currentDay, setCurrentDay] = useState<any>(null);

  // Calculate current day based on start date and schedule
  useEffect(() => {
    if (routine.start_date && routine.routine_data?.weeks) {
      const startDate = new Date(routine.start_date);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - startDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Calculate which week and day we're on
      const weekIndex = Math.floor(diffDays / 7) % (routine.routine_data.weeks.length || 8);
      const dayOfWeek = diffDays % 7;
      
      // Get day names for the schedule
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDayName = daysOfWeek[dayOfWeek];
      
      if (routine.routine_data.weeks[weekIndex]?.days[currentDayName]) {
        setCurrentDay({
          week: weekIndex + 1,
          dayName: currentDayName,
          data: routine.routine_data.weeks[weekIndex].days[currentDayName]
        });
      }
    }
  }, [routine]);

  const handleStartRoutine = async () => {
    try {
      const { error } = await supabase
        .from('ai_routines')
        .update({
          start_date: new Date().toISOString().split('T')[0],
          is_active: true,
          current_week: 1,
          current_day_in_week: 1
        })
        .eq('id', routine.id);

      if (error) throw error;

      toast.success('Routine started! 🚀');
      // Navigate to routine execution
      window.location.href = `/routine-execution?routineId=${routine.id}&type=ai`;
    } catch (error) {
      console.error('Error starting routine:', error);
      toast.error('Failed to start routine');
    }
  };

  const handleContinueWorkout = () => {
    window.location.href = `/routine-execution?routineId=${routine.id}&type=ai`;
  };

  const handleRegenerateDay = async () => {
    if (!currentDay || !user) return;

    try {
      setRegenerating(true);

      const { data, error } = await supabase.functions.invoke('regenerate-day', {
        body: {
          user_id: user.id,
          routine_id: routine.id,
          current_week: currentDay.week,
          current_day: currentDay.dayName,
          workout_type: currentDay.data.workout_type,
          target_muscles: currentDay.data.target_muscles,
          fitness_level: routine.fitness_level,
          equipment_available: routine.equipment_needed.join(', '),
          time_available: routine.estimated_duration_minutes
        }
      });

      if (error) throw error;

      if (data?.success && data?.day) {
        // Update the routine data with the new day
        const updatedRoutineData = { ...routine.routine_data };
        updatedRoutineData.weeks[currentDay.week - 1].days[currentDay.dayName] = data.day;

        const { error: updateError } = await supabase
          .from('ai_routines')
          .update({ routine_data: updatedRoutineData })
          .eq('id', routine.id);

        if (updateError) throw updateError;

        toast.success('Day regenerated with fresh exercises! 🔄');
        setShowRegenerateModal(false);
        
        // Refresh the current day data
        setCurrentDay({
          ...currentDay,
          data: data.day
        });
      }
    } catch (error) {
      console.error('Error regenerating day:', error);
      toast.error('Failed to regenerate day');
    } finally {
      setRegenerating(false);
    }
  };

  const getStatusColor = () => {
    if (!routine.is_active) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  };

  const getGoalEmoji = (goal: string) => {
    const emojiMap: { [key: string]: string } = {
      build_muscle: '💪',
      lose_weight: '🔥',
      improve_endurance: '🏃',
      increase_strength: '🏋️',
      flexibility: '🧘',
      general_fitness: '⚡'
    };
    return emojiMap[goal] || '🎯';
  };

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-300 border-border bg-card">
        <div className={`h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-t-lg`}></div>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{getGoalEmoji(routine.routine_goal)}</div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{routine.routine_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getStatusColor()}>
                    {routine.is_active ? 'Active' : 'Not Started'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Generated
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                <span>{routine.routine_goal.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{routine.days_per_week} days/week</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{routine.estimated_duration_minutes} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                <span>{routine.split_type.replace(/_/g, ' ')}</span>
              </div>
            </div>

            {routine.is_active && currentDay && (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 mt-3">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Week {currentDay.week} • {currentDay.data.workout_type}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Today: {currentDay.data.target_muscles?.join(', ') || 'Full body workout'}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!routine.is_active ? (
              <Button
                onClick={handleStartRoutine}
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
              >
                Start Routine
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleContinueWorkout}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  Continue Workout
                </Button>
                <Button
                  onClick={() => setShowRegenerateModal(true)}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  title="Regenerate Today"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Regenerate Day Modal */}
      <Dialog open={showRegenerateModal} onOpenChange={setShowRegenerateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Today's Workout</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Generate a fresh variation of today's workout with new exercises while maintaining 
              the same training goals and structure.
            </p>
            
            {currentDay && (
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="font-medium">Current Workout:</div>
                <div className="text-sm text-muted-foreground">
                  Week {currentDay.week} • {currentDay.data.workout_type}
                </div>
                <div className="text-sm text-muted-foreground">
                  Target: {currentDay.data.target_muscles?.join(', ') || 'Full body'}
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowRegenerateModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRegenerateDay}
                disabled={regenerating}
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
              >
                {regenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};