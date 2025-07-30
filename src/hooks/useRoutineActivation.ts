import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface ActivationResult {
  success: boolean;
  previous_active_routine?: {
    id: string;
    name: string;
    type: string;
    table_source: string;
  } | null;
  error?: string;
}

export function useRoutineActivation() {
  const { user } = useAuth();
  const [isActivating, setIsActivating] = useState(false);
  const activationInProgress = useRef(false);

  const activateRoutine = async (
    routineId: string,
    tableName: 'ai_routines' | 'ai_generated_routines',
    routineName: string
  ): Promise<ActivationResult> => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    // Prevent race conditions and double activations
    if (activationInProgress.current) {
      return { success: false, error: 'Activation already in progress' };
    }

    try {
      activationInProgress.current = true;
      setIsActivating(true);

      // Use the safe activation function from the database
      const { data, error } = await supabase.functions.invoke('activate-routine-safely', {
        body: {
          routine_id: routineId,
          table_name: tableName,
          user_id: user.id
        }
      });

      if (error) {
        console.error('Error activating routine:', error);
        return { success: false, error: error.message || 'Failed to activate routine' };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Failed to activate routine' };
      }

      return {
        success: true,
        previous_active_routine: data.previous_active_routine
      };

    } catch (error) {
      console.error('Error in routine activation:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      activationInProgress.current = false;
      setIsActivating(false);
    }
  };

  const getActiveRoutine = async () => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      // Call the database function to get active routine
      const { data: activeRoutineData, error: activeError } = await supabase.rpc(
        'get_user_active_routine',
        { user_id_param: user.id }
      );

      if (activeError) {
        console.error('Error fetching active routine:', activeError);
        return null;
      }

      return activeRoutineData?.[0] || null;
    } catch (error) {
      console.error('Error in getActiveRoutine:', error);
      return null;
    }
  };

  // Legacy activation for older components that use direct database updates
  const activateRoutineLegacy = async (
    routineId: string,
    tableName: 'ai_routines' | 'ai_generated_routines'
  ): Promise<boolean> => {
    if (!user?.id || activationInProgress.current) {
      return false;
    }

    try {
      activationInProgress.current = true;
      setIsActivating(true);

      // Get current active routine first
      const activeRoutine = await getActiveRoutine();

      // Update the target routine
      const updateData = tableName === 'ai_routines' 
        ? {
            is_active: true,
            start_date: new Date().toISOString().split('T')[0],
            current_week: 1,
            current_day_in_week: 1,
            updated_at: new Date().toISOString()
          }
        : {
            is_active: true,
            updated_at: new Date().toISOString()
          };

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', routineId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error activating routine:', error);
        toast.error('Failed to activate routine');
        return false;
      }

      // Show appropriate success message
      if (activeRoutine) {
        toast.success(`Routine activated! Previous routine "${activeRoutine.routine_name}" has been paused.`);
      } else {
        toast.success('Routine activated successfully! 🚀');
      }

      return true;
    } catch (error) {
      console.error('Error in legacy activation:', error);
      toast.error('Failed to activate routine');
      return false;
    } finally {
      activationInProgress.current = false;
      setIsActivating(false);
    }
  };

  return {
    activateRoutine,
    activateRoutineLegacy,
    getActiveRoutine,
    isActivating,
    isActivationInProgress: () => activationInProgress.current
  };
}