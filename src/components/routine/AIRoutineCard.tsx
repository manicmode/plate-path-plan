import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, Target, Activity, RefreshCw, Lock, LockOpen, Sparkles, History, Edit, Share, Play, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { WorkoutCompleteButton } from '@/components/workout/WorkoutCompleteButton';
import { shareRoutine, type ShareableRoutine } from '@/utils/shareUtils';

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratingDay, setRegeneratingDay] = useState<string | null>(null);
  const [animatingDay, setAnimatingDay] = useState<string | null>(null);
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

  const handleRegenerateDay = async (weekIndex: number, dayName: string) => {
    if (!user) return;

    try {
      setRegenerating(true);
      setRegeneratingDay(`${weekIndex}-${dayName}`);

      const weekData = routine.routine_data?.weeks?.[weekIndex];
      const dayData = weekData?.days?.[dayName];

      if (!dayData) {
        toast.error('No workout data found for this day');
        return;
      }

      const { data, error } = await supabase.functions.invoke('regenerate-day', {
        body: {
          user_id: user.id,
          routine_id: routine.id,
          current_week: weekIndex + 1,
          current_day: dayName,
          workout_type: dayData.workout_type,
          target_muscles: dayData.target_muscles,
          fitness_level: routine.fitness_level,
          equipment_available: routine.equipment_needed.join(', '),
          time_available: routine.estimated_duration_minutes
        }
      });

      if (error) throw error;

      if (data?.success && data?.day) {
        // Update the routine data with the new day
        const updatedRoutineData = { ...routine.routine_data };
        updatedRoutineData.weeks[weekIndex].days[dayName] = data.day;

        const { error: updateError } = await supabase
          .from('ai_routines')
          .update({ routine_data: updatedRoutineData })
          .eq('id', routine.id);

        if (updateError) throw updateError;

        // Extract exercises for toast
        const exercises = data.day.steps
          ?.filter((step: any) => step.step_type === 'exercise')
          ?.map((step: any) => step.title)
          ?.slice(0, 3) || [];
        
        const exerciseList = exercises.length > 0 
          ? exercises.join(', ') + (data.day.steps?.filter((s: any) => s.step_type === 'exercise').length > 3 ? ', +more' : '')
          : 'New workout generated';

        toast.success(`✅ ${dayName.charAt(0).toUpperCase() + dayName.slice(1)} has been regenerated! New workout: ${exerciseList}.`);
        
        // Add animation effect
        setAnimatingDay(`${weekIndex}-${dayName}`);
        setTimeout(() => setAnimatingDay(null), 2000);
        
        // Refresh current day data if it matches
        if (currentDay && currentDay.week === weekIndex + 1 && currentDay.dayName === dayName) {
          setCurrentDay({
            ...currentDay,
            data: data.day
          });
        }
      }
    } catch (error) {
      console.error('Error regenerating day:', error);
      toast.error('Failed to regenerate day');
    } finally {
      setRegenerating(false);
      setRegeneratingDay(null);
    }
  };

  const handleEditRoutine = () => {
    if (!hasWorkouts) {
      toast.info('👉 This routine has no generated content yet. Tap regenerate to begin customizing your week.');
      return;
    }
    // Navigate to routine editor - placeholder for now
    setShowEditModal(true);
  };

  const handleShareRoutine = async () => {
    try {
      const shareableRoutine: ShareableRoutine = {
        id: routine.id,
        name: routine.routine_name,
        goal: routine.routine_goal,
        splitType: routine.split_type,
        daysPerWeek: routine.days_per_week,
        duration: routine.estimated_duration_minutes
      };

      const wasNativeShare = await shareRoutine(shareableRoutine);
      
      if (wasNativeShare) {
        toast.success('Routine shared successfully! 🚀');
      } else {
        toast.success('Share link copied to clipboard! 📋');
      }
    } catch (error) {
      console.error('Error sharing routine:', error);
      toast.error('Failed to share routine');
    }
  };

  const handleViewHistory = () => {
    setShowHistoryModal(true);
  };

  const handleDeleteRoutine = async () => {
    if (!window.confirm('Are you sure you want to delete this routine? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ai_routines')
        .delete()
        .eq('id', routine.id);

      if (error) throw error;

      toast.success('Routine deleted successfully');
      setShowEditModal(false);
      
      // Call onDelete callback if provided
      if (onDelete) {
        onDelete(routine);
      }
      
      // Refresh the page to update the routine list
      window.location.reload();
    } catch (error) {
      console.error('Error deleting routine:', error);
      toast.error('Failed to delete routine');
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

  const hasWorkouts = routine.routine_data?.weeks?.some((week: any) => 
    Object.values(week.days || {}).some((day: any) => day && Object.keys(day).length > 0)
  );

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 border-border bg-card shadow-lg hover:shadow-2xl w-full max-w-lg rounded-2xl overflow-hidden min-h-[420px]">
        <div className="h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-t-2xl"></div>
        
        {/* Progress bar */}
        <div className="h-1 bg-muted mx-6 mt-2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
            style={{ 
              width: routine.is_active 
                ? `${Math.min(((routine.current_week - 1) * 7 + routine.current_day_in_week) / (8 * 7) * 100, 100)}%`
                : '0%'
            }}
          />
        </div>
        
        <CardContent className="p-6 pb-8 relative">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{getGoalEmoji(routine.routine_goal)}</div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-2">{routine.routine_name}</h3>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor()}>
                    {routine.is_active ? 'Active' : 'Not Started'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action icons moved lower with more spacing */}
          <div className="absolute top-24 right-6 flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              disabled
              className="h-7 w-7 opacity-50 cursor-not-allowed text-muted-foreground"
              title="👉 Coming soon: Track past workouts, progress, and milestones."
            >
              <History className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleEditRoutine}
              className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Edit Routine"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleShareRoutine}
              className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Share Routine"
            >
              <Share className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-5 mb-6">
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

            {/* Current day info or fallback message */}
            {!hasWorkouts ? (
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No workouts planned yet. Tap edit to set or regenerate your week.
                </p>
              </div>
            ) : routine.is_active && currentDay ? (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 mt-3">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Week {currentDay.week} • {currentDay.data.workout_type}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Today: {currentDay.data.target_muscles?.join(', ') || 'Full body workout'}
                </div>
              </div>
            ) : null}
          </div>

          {/* Action buttons with proper spacing to prevent overlap */}
          <div className="flex items-center justify-center gap-2 pt-4 border-t border-border/50 px-2">
            {!routine.is_active ? (
              <Button
                size="sm"
                onClick={handleStartRoutine}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Routine
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 w-full">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleContinueWorkout}
                  className="px-4 py-2 border-primary/20 text-primary hover:bg-primary/10 transition-colors flex-1 max-w-[120px]"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Continue
                </Button>
                
                <div className={!hasWorkouts ? "relative flex-1 max-w-[120px]" : "flex-1 max-w-[120px]"}>
                  <WorkoutCompleteButton
                    routine_id={routine.id}
                    intensity={routine.routine_goal === 'increase_strength' ? 'high' : 'medium'}
                    duration_minutes={routine.estimated_duration_minutes}
                    difficulty_multiplier={routine.fitness_level === 'advanced' ? 1.3 : routine.fitness_level === 'intermediate' ? 1.1 : 1.0}
                    className={`px-4 py-2 w-full ${!hasWorkouts ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!hasWorkouts}
                    compact={true}
                  />
                  {!hasWorkouts && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      Start this routine first.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom-right AI source badge - positioned higher to avoid overlap */}
          <div className="absolute bottom-16 right-3">
            <Badge 
              variant="outline" 
              className="text-xs bg-background/80 backdrop-blur-sm border-primary/20"
              title="👉 This routine was generated by NutriCoach AI."
            >
              <Sparkles className="h-3 w-3 mr-1" />
              AI
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Edit Routine Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🛠️ Customize: {routine.routine_name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 px-2">
            <p className="text-muted-foreground">
              Regenerate specific days or entire weeks to fine-tune your plan.
            </p>
            
            {routine.routine_data?.weeks?.map((week: any, weekIndex: number) => (
              <div key={weekIndex} className="border rounded-lg p-5 bg-card/50">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Week {weekIndex + 1}
                </h4>
                <div className="border-t border-border/30 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(week.days || {}).map(([dayName, dayData]: [string, any]) => {
                      const dayKey = `${weekIndex}-${dayName}`;
                      const isRegeneratingThis = regeneratingDay === dayKey;
                      const isAnimating = animatingDay === dayKey;
                      
                      return (
                        <div 
                          key={dayName} 
                          className={`
                            bg-muted/40 rounded-lg p-4 border border-border/50 transition-all duration-300
                            ${isAnimating ? 'animate-pulse bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700' : ''}
                          `}
                        >
                          <div className="flex items-center justify-between h-full">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium capitalize text-foreground mb-1 flex items-center gap-2">
                                {dayName}
                                {isAnimating && <span className="text-green-600 dark:text-green-400 text-xs">✨ Updated</span>}
                              </div>
                              {dayData && Object.keys(dayData).length > 0 ? (
                                <>
                                  <div className="text-sm text-muted-foreground font-medium">
                                    {dayData.workout_type || 'Workout'}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {dayData.target_muscles?.join(', ') || 'Full body'}
                                  </div>
                                </>
                              ) : (
                                <div className="text-sm text-muted-foreground italic">Rest day</div>
                              )}
                            </div>
                            {dayData && Object.keys(dayData).length > 0 && (
                              <div className="ml-3 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRegenerateDay(weekIndex, dayName)}
                                  disabled={regenerating}
                                  className="h-9 w-9 p-0 hover:bg-primary/10 border-primary/20"
                                  title="Regenerate this day"
                                >
                                  <RefreshCw className={`h-4 w-4 ${isRegeneratingThis ? 'animate-spin text-primary' : ''}`} />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
            
            <div className="flex gap-3 pt-4 border-t border-border/50">
              <Button
                variant="outline"
                onClick={handleDeleteRoutine}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Routine
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Regenerate Today Modal (simplified) */}
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
                onClick={() => currentDay && handleRegenerateDay(currentDay.week - 1, currentDay.dayName)}
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

      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>📈 Workout History</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 text-center">
            <div className="text-muted-foreground">
              This feature is under construction! Soon you'll be able to review past workouts, progress, and milestones here.
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowHistoryModal(false)}
              className="w-full"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};