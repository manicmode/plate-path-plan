import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserHabit {
  id: string;
  slug: string;
  status: 'active' | 'paused' | 'completed';
  schedule: any;
  reminder_at: string | null;
  target: number | null;
  notes: string | null;
  next_due_at: string | null;
  snooze_until: string | null;
  start_date: string;
  created_at: string;
  updated_at: string;
}

export const useHabitManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const setHabitStatus = async (userHabitId: string, status: 'active' | 'paused' | 'completed') => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('rpc_set_user_habit_status' as any, {
        p_user_habit_id: userHabitId,
        p_status: status
      });

      if (error) throw error;

      const statusMessages = {
        active: "Resumed • We'll remind & track it",
        paused: "Paused • We'll stop reminders",
        completed: "Nice work! Marked complete 🎉"
      };

      toast({
        title: statusMessages[status],
        duration: 3000
      });

      return true;
    } catch (error) {
      console.error('Error updating habit status:', error);
      toast({
        title: "Failed to update habit",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateHabit = async (
    userHabitId: string, 
    updates: {
      schedule?: any;
      reminder_at?: string | null;
      target?: number | null;
      notes?: string | null;
    }
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('rpc_update_user_habit' as any, {
        p_user_habit_id: userHabitId,
        p_schedule: updates.schedule || null,
        p_reminder_at: updates.reminder_at || null,
        p_target: updates.target || null,
        p_notes: updates.notes || null
      });

      if (error) throw error;

      toast({
        title: "Saved • Schedule & reminders updated",
        duration: 3000
      });

      return true;
    } catch (error) {
      console.error('Error updating habit:', error);
      toast({
        title: "Failed to update habit",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const addHabit = async (
    slug: string,
    schedule: any = { type: 'daily' },
    reminder_at: string = '08:00',
    target?: number | null,
    notes?: string | null
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('rpc_add_user_habit' as any, {
        p_slug: slug,
        p_schedule: schedule,
        p_reminder_at: reminder_at,
        p_target: target,
        p_notes: notes
      });

      if (error) throw error;

      toast({
        title: "Added • We'll remind & track it",
        duration: 3000
      });

      return true;
    } catch (error) {
      console.error('Error adding habit:', error);
      toast({
        title: "Failed to add habit",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logHabit = async (
    slug: string,
    completed: boolean = true,
    amount?: number | null,
    duration_min?: number | null
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('rpc_log_habit' as any, {
        p_slug: slug,
        p_completed: completed,
        p_amount: amount || null,
        p_duration_min: duration_min || null,
        p_meta: {}
      });

      if (error) throw error;

      toast({
        title: "Logged • Nice work!",
        duration: 3000
      });

      return true;
    } catch (error) {
      console.error('Error logging habit:', error);
      toast({
        title: "Failed to log habit",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    setHabitStatus,
    updateHabit,
    addHabit,
    logHabit,
    loading
  };
};