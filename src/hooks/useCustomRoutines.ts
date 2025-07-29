import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface CustomRoutine {
  id: string;
  user_id: string;
  title: string;
  routine_type: string;
  duration: string;
  weekly_plan: Json;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomRoutineData {
  title: string;
  routine_type: string;
  duration: string;
  weekly_plan: Json;
  notes?: string;
}

export function useCustomRoutines() {
  const [routines, setRoutines] = useState<CustomRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchRoutines = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('custom_routines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoutines((data || []) as CustomRoutine[]);
    } catch (error) {
      console.error('Error fetching custom routines:', error);
      toast({
        title: "Error",
        description: "Failed to load your routines. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createRoutine = async (routineData: CreateCustomRoutineData): Promise<CustomRoutine | null> => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create routines.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('custom_routines')
        .insert([{
          user_id: user.id,
          title: routineData.title,
          routine_type: routineData.routine_type,
          duration: routineData.duration,
          weekly_plan: routineData.weekly_plan,
          notes: routineData.notes || null,
        }])
        .select()
        .single();

      if (error) throw error;

      const newRoutine = data as CustomRoutine;
      setRoutines(prev => [newRoutine, ...prev]);

      toast({
        title: "Success!",
        description: "Your custom routine has been created.",
      });

      return newRoutine;
    } catch (error) {
      console.error('Error creating custom routine:', error);
      toast({
        title: "Error",
        description: "Failed to create routine. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateRoutine = async (id: string, routineData: Partial<CreateCustomRoutineData>): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to update routines.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('custom_routines')
        .update({
          ...routineData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      const updatedRoutine = data as CustomRoutine;
      setRoutines(prev => prev.map(routine => 
        routine.id === id ? updatedRoutine : routine
      ));

      toast({
        title: "Success!",
        description: "Your routine has been updated.",
      });

      return true;
    } catch (error) {
      console.error('Error updating custom routine:', error);
      toast({
        title: "Error",
        description: "Failed to update routine. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteRoutine = async (id: string): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to delete routines.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('custom_routines')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setRoutines(prev => prev.filter(routine => routine.id !== id));

      toast({
        title: "Success!",
        description: "Your routine has been deleted.",
      });

      return true;
    } catch (error) {
      console.error('Error deleting custom routine:', error);
      toast({
        title: "Error",
        description: "Failed to delete routine. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const duplicateRoutine = async (routine: CustomRoutine): Promise<CustomRoutine | null> => {
    const duplicateData: CreateCustomRoutineData = {
      title: `${routine.title} (Copy)`,
      routine_type: routine.routine_type,
      duration: routine.duration,
      weekly_plan: routine.weekly_plan,
      notes: routine.notes,
    };

    return await createRoutine(duplicateData);
  };

  useEffect(() => {
    fetchRoutines();
  }, [user?.id]);

  return {
    routines,
    loading,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    duplicateRoutine,
    refreshRoutines: fetchRoutines,
  };
}