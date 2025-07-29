import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

export interface WorkoutGenerationParams {
  routine_goal: string;
  split_type: string;
  days_per_week: number;
  available_time_per_day: number;
  fitness_level: string;
  equipment_available: string[];
  preferred_routine_name?: string;
}

export interface GeneratedDay {
  day_name: string;
  workout_type: string;
  target_muscles: string[];
  estimated_duration: number;
  exercises: any[];
  rest_periods: any;
  progression_notes?: string;
}

export interface WeeklyRoutine {
  week_number: number;
  focus: string;
  days: Record<string, GeneratedDay>;
}

export const useAIWorkoutGeneration = () => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const generateFullRoutine = useCallback(async (params: WorkoutGenerationParams) => {
    if (!user?.id) {
      toast.error('Please log in to generate a routine');
      return null;
    }

    setIsGenerating(true);
    try {
      // Generate routine plan using AI
      const { data: planData, error: planError } = await supabase.functions.invoke('generate-routine-plan', {
        body: {
          user_id: user.id,
          routine_goal: params.routine_goal,
          split_type: params.split_type,
          days_per_week: params.days_per_week,
          available_time_per_day: params.available_time_per_day,
          fitness_level: params.fitness_level,
          equipment_available: params.equipment_available,
          preferred_routine_name: params.preferred_routine_name || `AI ${params.routine_goal} Routine`
        }
      });

      if (planError) {
        throw planError;
      }

      if (!planData?.success || !planData?.plan) {
        throw new Error('Failed to generate routine plan');
      }

      const routinePlan = planData.plan;

      // Save the main routine to ai_routines table
      const { data: routine, error: saveError } = await supabase
        .from('ai_routines')
        .insert({
          user_id: user.id,
          routine_name: routinePlan.routine_name,
          routine_goal: params.routine_goal,
          split_type: params.split_type,
          days_per_week: params.days_per_week,
          estimated_duration_minutes: params.available_time_per_day,
          fitness_level: params.fitness_level,
          equipment_needed: params.equipment_available,
          routine_data: routinePlan,
          weekly_routine_data: routinePlan.weeks || [],
          muscle_group_schedule: generateMuscleGroupSchedule(routinePlan.weeks || []),
          generation_metadata: {
            generation_date: new Date().toISOString(),
            ai_model: 'gpt-4.1-2025-04-14',
            user_preferences: JSON.stringify(params)
          },
          total_weeks: routinePlan.total_weeks || 8,
          is_active: false
        })
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      // Generate and save individual workout routines for each day
      await generateWorkoutRoutines(routine.id, routinePlan.weeks || [], user.id);

      // Log generation history
      await supabase
        .from('routine_generation_history')
        .insert({
          user_id: user.id,
          routine_id: routine.id,
          generation_type: 'initial',
          generation_request: params,
          generation_response: routinePlan,
          success: true
        });

      toast.success('🎉 AI Routine Generated Successfully!', {
        description: `Your personalized ${params.routine_goal} routine is ready!`
      });

      return routine;
    } catch (error: any) {
      console.error('Error generating routine:', error);
      toast.error('Failed to generate routine. Please try again.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [user?.id]);

  const regenerateDay = useCallback(async (routineId: string, dayName: string, weekNumber: number = 1) => {
    if (!user?.id) {
      toast.error('Please log in to regenerate');
      return null;
    }

    setIsRegenerating(true);
    try {
      // Get current routine data
      const { data: routine, error: routineError } = await supabase
        .from('ai_routines')
        .select('*')
        .eq('id', routineId)
        .single();

      if (routineError || !routine) {
        throw new Error('Routine not found');
      }

      // Generate new day using AI
      const { data: dayData, error: dayError } = await supabase.functions.invoke('generate-routine-plan', {
        body: {
          user_id: user.id,
          routine_goal: routine.routine_goal,
          split_type: routine.split_type,
          days_per_week: routine.days_per_week,
          available_time_per_day: routine.estimated_duration_minutes,
          fitness_level: routine.fitness_level,
          equipment_available: routine.equipment_needed,
          regenerate_day: dayName,
          week_number: weekNumber,
          existing_routine: routine.routine_data
        }
      });

      if (dayError || !dayData?.success || !dayData?.day) {
        throw new Error('Failed to regenerate day');
      }

      // Update routine data with new day
      const routineData = routine.routine_data as any;
      const updatedRoutineData = { ...routineData };
      if (updatedRoutineData.weeks && updatedRoutineData.weeks[weekNumber - 1]) {
        updatedRoutineData.weeks[weekNumber - 1].days[dayName] = dayData.day;
      }

      const { error: updateError } = await supabase
        .from('ai_routines')
        .update({ 
          routine_data: updatedRoutineData,
          updated_at: new Date().toISOString()
        })
        .eq('id', routineId);

      if (updateError) throw updateError;

      // Update corresponding workout_routines entry
      await supabase
        .from('workout_routines')
        .update({
          workout_type: dayData.day.workout_type,
          target_muscles: dayData.day.target_muscles || [],
          estimated_duration: dayData.day.estimated_duration,
          exercises: dayData.day.steps || [],
          updated_at: new Date().toISOString()
        })
        .eq('ai_routine_id', routineId)
        .eq('day_of_week', dayName.toLowerCase())
        .eq('week_number', weekNumber);

      // Log regeneration history
      await supabase
        .from('routine_generation_history')
        .insert({
          user_id: user.id,
          routine_id: routineId,
          generation_type: 'regenerate_day',
          day_regenerated: dayName,
          week_regenerated: weekNumber,
          generation_response: dayData.day,
          success: true
        });

      toast.success('Day regenerated with fresh exercises! 🔄');
      return dayData.day;
    } catch (error: any) {
      console.error('Error regenerating day:', error);
      toast.error('Failed to regenerate day. Please try again.');
      return null;
    } finally {
      setIsRegenerating(false);
    }
  }, [user?.id]);

  const toggleDayLock = useCallback(async (routineId: string, dayName: string, weekNumber: number = 1, isLocked: boolean) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('workout_routines')
        .update({ is_locked: isLocked })
        .eq('ai_routine_id', routineId)
        .eq('day_of_week', dayName.toLowerCase())
        .eq('week_number', weekNumber);

      toast.success(isLocked ? '🔒 Day locked from regeneration' : '🔓 Day unlocked for regeneration');
    } catch (error) {
      console.error('Error toggling day lock:', error);
      toast.error('Failed to update lock status');
    }
  }, [user?.id]);

  return {
    generateFullRoutine,
    regenerateDay,
    toggleDayLock,
    isGenerating,
    isRegenerating
  };
};

// Helper function to generate muscle group schedule
const generateMuscleGroupSchedule = (weeks: WeeklyRoutine[]): Record<string, any> => {
  const schedule: Record<string, any> = {};
  
  weeks.forEach((week, weekIndex) => {
    Object.entries(week.days).forEach(([dayName, dayData]) => {
      if (dayData.target_muscles && dayData.target_muscles.length > 0) {
        const key = `week_${weekIndex + 1}_${dayName}`;
        schedule[key] = {
          muscles: dayData.target_muscles,
          workout_type: dayData.workout_type,
          rest_needed: calculateRestNeeded(dayData.target_muscles)
        };
      }
    });
  });
  
  return schedule;
};

// Helper function to calculate rest needed for muscle groups
const calculateRestNeeded = (muscles: string[]): number => {
  // Major muscle groups need more rest
  const majorMuscles = ['chest', 'back', 'legs', 'shoulders'];
  const hasMajorMuscles = muscles.some(muscle => majorMuscles.includes(muscle.toLowerCase()));
  return hasMajorMuscles ? 48 : 24; // hours
};

// Helper function to generate individual workout routines  
const generateWorkoutRoutines = async (routineId: string, weeks: WeeklyRoutine[], userId: string) => {
  const workoutRoutines: any[] = [];
  
  weeks.forEach((week, weekIndex) => {
    Object.entries(week.days).forEach(([dayName, dayData]) => {
      workoutRoutines.push({
        user_id: userId,
        ai_routine_id: routineId,
        day_of_week: dayName.toLowerCase(),
        week_number: weekIndex + 1,
        workout_type: dayData.workout_type,
        target_muscles: dayData.target_muscles || [],
        estimated_duration: dayData.estimated_duration,
        exercises: dayData.exercises || [],
        rest_periods: dayData.rest_periods || {},
        progression_notes: dayData.progression_notes || week.focus,
        is_locked: false,
        completion_status: 'pending'
      });
    });
  });

  if (workoutRoutines.length > 0) {
    await supabase
      .from('workout_routines')
      .insert(workoutRoutines);
  }
};