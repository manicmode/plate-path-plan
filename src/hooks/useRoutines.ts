import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UnifiedRoutine {
  id: string;
  routine_name: string;
  routine_type: 'primary' | 'supplemental';
  source: 'ai-generated' | 'ai-legacy';
  is_active: boolean;
  start_date?: string;
  current_week?: number;
  current_day_in_week?: number;
  days_per_week: number;
  session_duration_minutes: number;
  weekly_routine_data: any;
  fitness_level: string;
  split_type: string;
  equipment_available?: string[];
  primary_goals?: string[];
  routine_goal?: string;
  equipment_needed?: string[];
  generation_metadata?: any;
  created_at: string;
  updated_at: string;
}

export const useRoutines = () => {
  const [primaryRoutine, setPrimaryRoutine] = useState<UnifiedRoutine | null>(null);
  const [supplementalRoutines, setSupplementalRoutines] = useState<UnifiedRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPrimaryRoutine = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_user_active_routine', {
        user_id_param: user.id
      });

      if (error) {
        console.error('Error fetching primary routine:', error);
        return;
      }

      if (data && data.length > 0) {
        const routineData = data[0];
        let fullRoutine;

        // Fetch full routine details based on table source
        if (routineData.table_source === 'ai_routines') {
          const { data: aiRoutine, error: aiError } = await supabase
            .from('ai_routines')
            .select('*')
            .eq('id', routineData.routine_id)
            .single();

          if (aiError) {
            console.error('Error fetching AI routine details:', aiError);
            return;
          }

          fullRoutine = {
            id: aiRoutine.id,
            routine_name: aiRoutine.routine_name,
            routine_type: aiRoutine.routine_type as 'primary' | 'supplemental',
            source: 'ai-legacy' as const,
            is_active: aiRoutine.is_active,
            start_date: aiRoutine.start_date,
            current_week: aiRoutine.current_week,
            current_day_in_week: aiRoutine.current_day_in_week,
            days_per_week: aiRoutine.days_per_week,
            session_duration_minutes: aiRoutine.estimated_duration_minutes,
            weekly_routine_data: aiRoutine.weekly_routine_data,
            fitness_level: aiRoutine.fitness_level,
            split_type: aiRoutine.split_type,
            equipment_needed: aiRoutine.equipment_needed,
            routine_goal: aiRoutine.routine_goal,
            created_at: aiRoutine.created_at,
            updated_at: aiRoutine.updated_at
          };
        } else {
          const { data: generatedRoutine, error: genError } = await supabase
            .from('ai_generated_routines')
            .select('*')
            .eq('id', routineData.routine_id)
            .single();

          if (genError) {
            console.error('Error fetching generated routine details:', genError);
            return;
          }

          fullRoutine = {
            id: generatedRoutine.id,
            routine_name: generatedRoutine.routine_name,
            routine_type: generatedRoutine.routine_type as 'primary' | 'supplemental',
            source: 'ai-generated' as const,
            is_active: generatedRoutine.is_active,
            days_per_week: generatedRoutine.days_per_week,
            session_duration_minutes: generatedRoutine.session_duration_minutes,
            weekly_routine_data: generatedRoutine.weekly_routine_data,
            fitness_level: generatedRoutine.fitness_level,
            split_type: generatedRoutine.split_type,
            equipment_available: generatedRoutine.equipment_available,
            primary_goals: generatedRoutine.primary_goals,
            generation_metadata: generatedRoutine.generation_metadata,
            created_at: generatedRoutine.created_at,
            updated_at: generatedRoutine.updated_at
          };
        }

        setPrimaryRoutine(fullRoutine);
      } else {
        setPrimaryRoutine(null);
      }
    } catch (error) {
      console.error('Error in fetchPrimaryRoutine:', error);
    }
  };

  const fetchSupplementalRoutines = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch supplemental routines from both tables
      const [aiRoutinesResponse, generatedRoutinesResponse] = await Promise.all([
        supabase
          .from('ai_routines')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('routine_type', 'supplemental'),
        supabase
          .from('ai_generated_routines')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('routine_type', 'supplemental')
      ]);

      const routines: UnifiedRoutine[] = [];

      // Add AI routines
      if (aiRoutinesResponse.data) {
        aiRoutinesResponse.data.forEach(routine => {
          routines.push({
            id: routine.id,
            routine_name: routine.routine_name,
            routine_type: routine.routine_type as 'primary' | 'supplemental',
            source: 'ai-legacy',
            is_active: routine.is_active,
            start_date: routine.start_date,
            current_week: routine.current_week,
            current_day_in_week: routine.current_day_in_week,
            days_per_week: routine.days_per_week,
            session_duration_minutes: routine.estimated_duration_minutes,
            weekly_routine_data: routine.weekly_routine_data,
            fitness_level: routine.fitness_level,
            split_type: routine.split_type,
            equipment_needed: routine.equipment_needed,
            routine_goal: routine.routine_goal,
            created_at: routine.created_at,
            updated_at: routine.updated_at
          });
        });
      }

      // Add generated routines
      if (generatedRoutinesResponse.data) {
        generatedRoutinesResponse.data.forEach(routine => {
          routines.push({
            id: routine.id,
            routine_name: routine.routine_name,
            routine_type: routine.routine_type as 'primary' | 'supplemental',
            source: 'ai-generated',
            is_active: routine.is_active,
            days_per_week: routine.days_per_week,
            session_duration_minutes: routine.session_duration_minutes,
            weekly_routine_data: routine.weekly_routine_data,
            fitness_level: routine.fitness_level,
            split_type: routine.split_type,
            equipment_available: routine.equipment_available,
            primary_goals: routine.primary_goals,
            generation_metadata: routine.generation_metadata,
            created_at: routine.created_at,
            updated_at: routine.updated_at
          });
        });
      }

      setSupplementalRoutines(routines);
    } catch (error) {
      console.error('Error fetching supplemental routines:', error);
    }
  };

  const activateRoutine = async (routineId: string, routineType: 'primary' | 'supplemental' = 'primary') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to activate routines",
          variant: "destructive"
        });
        return false;
      }

      // Determine table source
      let tableName = '';
      const aiRoutine = await supabase
        .from('ai_routines')
        .select('id')
        .eq('id', routineId)
        .single();

      if (aiRoutine.data) {
        tableName = 'ai_routines';
      } else {
        tableName = 'ai_generated_routines';
      }

      const { data, error } = await supabase.rpc('activate_routine_safely', {
        target_routine_id: routineId,
        target_table_name: tableName,
        target_user_id: user.id,
        target_routine_type: routineType
      });

      if (error) {
        console.error('Error activating routine:', error);
        toast({
          title: "Activation Failed",
          description: "Failed to activate routine. Please try again.",
          variant: "destructive"
        });
        return false;
      }

      const result = data as any;
      if (result?.success) {
        toast({
          title: routineType === 'primary' ? "Primary Routine Activated" : "Supplemental Routine Activated",
          description: `Your ${routineType} routine is now active!`
        });
        
        // Refresh both routine lists
        await Promise.all([fetchPrimaryRoutine(), fetchSupplementalRoutines()]);
        return true;
      } else {
        toast({
          title: "Activation Failed",
          description: result?.error || "Unknown error occurred",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Error in activateRoutine:', error);
      return false;
    }
  };

  const deactivateRoutine = async (routineId: string, source: 'ai-generated' | 'ai-legacy') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const tableName = source === 'ai-legacy' ? 'ai_routines' : 'ai_generated_routines';
      
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: false })
        .eq('id', routineId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deactivating routine:', error);
        return false;
      }

      // Refresh both routine lists
      await Promise.all([fetchPrimaryRoutine(), fetchSupplementalRoutines()]);
      return true;
    } catch (error) {
      console.error('Error in deactivateRoutine:', error);
      return false;
    }
  };

  useEffect(() => {
    const loadRoutines = async () => {
      setLoading(true);
      await Promise.all([fetchPrimaryRoutine(), fetchSupplementalRoutines()]);
      setLoading(false);
    };

    loadRoutines();
  }, []);

  return {
    primaryRoutine,
    supplementalRoutines,
    loading,
    activateRoutine,
    deactivateRoutine,
    refreshRoutines: () => Promise.all([fetchPrimaryRoutine(), fetchSupplementalRoutines()])
  };
};