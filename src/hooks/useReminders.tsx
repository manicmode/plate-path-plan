import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

export interface Reminder {
  id: string;
  user_id: string;
  label: string;
  type: 'supplement' | 'hydration' | 'meal' | 'custom';
  frequency_type: 'daily' | 'every_x_days' | 'weekly' | 'custom_days';
  frequency_value?: number;
  custom_days?: number[];
  reminder_time: string;
  is_active: boolean;
  food_item_data?: any;
  created_at: string;
  updated_at: string;
  last_triggered_at?: string;
  next_trigger_at?: string;
}

export interface ReminderLog {
  id: string;
  reminder_id: string;
  user_id: string;
  logged_at: string;
  status: 'taken' | 'snoozed' | 'missed';
  notes?: string;
}

export const useReminders = () => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReminders((data || []) as Reminder[]);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  const createReminder = async (reminderData: Omit<Reminder, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'last_triggered_at' | 'next_trigger_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reminders')
        .insert({
          ...reminderData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      setReminders(prev => [data as Reminder, ...prev]);
      toast.success('Reminder created successfully');
      return data;
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error('Failed to create reminder');
      throw error;
    }
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setReminders(prev => prev.map(reminder => 
        reminder.id === id ? { ...reminder, ...data as Reminder } : reminder
      ));
      toast.success('Reminder updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating reminder:', error);
      toast.error('Failed to update reminder');
      throw error;
    }
  };

  const deleteReminder = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setReminders(prev => prev.filter(reminder => reminder.id !== id));
      toast.success('Reminder deleted successfully');
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast.error('Failed to delete reminder');
      throw error;
    }
  };

  const logReminderAction = async (reminderId: string, status: 'taken' | 'snoozed' | 'missed', notes?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('reminder_logs')
        .insert({
          reminder_id: reminderId,
          user_id: user.id,
          status,
          notes,
        });

      if (error) throw error;

      // Update last_triggered_at for the reminder
      await supabase
        .from('reminders')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('id', reminderId);

      toast.success(`Reminder marked as ${status}`);
    } catch (error) {
      console.error('Error logging reminder action:', error);
      toast.error('Failed to log reminder action');
    }
  };

  const toggleReminderActive = async (id: string, isActive: boolean) => {
    await updateReminder(id, { is_active: isActive });
  };

  useEffect(() => {
    fetchReminders();
  }, [user]);

  const groupedReminders = reminders.reduce((acc, reminder) => {
    if (!acc[reminder.type]) {
      acc[reminder.type] = [];
    }
    acc[reminder.type].push(reminder);
    return acc;
  }, {} as Record<string, Reminder[]>);

  return {
    reminders,
    groupedReminders,
    loading,
    createReminder,
    updateReminder,
    deleteReminder,
    logReminderAction,
    toggleReminderActive,
    refreshReminders: fetchReminders,
  };
};