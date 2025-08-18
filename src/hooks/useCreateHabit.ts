import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateHabitData {
  name: string;
  domain: 'nutrition' | 'exercise' | 'recovery';
  goal_type: 'count' | 'duration' | 'bool';
  target_value?: number;
  time_windows?: any[];
  suggested_rules?: any[];
  min_viable?: string;
  tags?: string;
  template_id?: string; // Add template_id for duplicate prevention
}

export const useCreateHabit = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createHabit = async (habitData: CreateHabitData) => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('habit')
        .insert({
          user_id: user.id,
          name: habitData.name,
          category: habitData.domain,
          template_id: habitData.template_id || null,
          goal_type: habitData.goal_type,
          goal_target: habitData.target_value || null,
          min_viable: false, // This seems to be boolean in the schema
          start_date: new Date().toISOString().split('T')[0],
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation (duplicate habit)
        if (error.code === '23505' && error.message.includes('user_habit_unique')) {
          toast({
            title: "Already Added",
            description: "This habit is already in your list",
            variant: "default",
          });
          return null; // Don't throw, just return null for duplicates
        }
        throw error;
      }

      toast({
        title: "Success!",
        description: "Added to My Habits",
      });

      return data;
    } catch (error) {
      console.error('Error creating habit:', error);
      toast({
        title: "Error",
        description: "Failed to add habit. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    createHabit,
    loading
  };
};