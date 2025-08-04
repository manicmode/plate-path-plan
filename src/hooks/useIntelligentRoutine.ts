import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useBodyScanResults } from './useBodyScanResults';

interface RoutinePreferences {
  fitness_level: string;
  primary_goals: string[];
  preferred_split: string;
  days_per_week: number;
  session_duration_minutes: number;
  available_equipment: string[];
}

interface CurrentRoutine {
  id: string;
  routine_name: string;
  days_per_week: number;
  weekly_routine_data: any;
  muscle_group_schedule: any;
  locked_days: number[];
  primary_goals: string[];
  fitness_level: string;
  equipment_available: string[];
  created_at: string;
  is_active: boolean;
}

export function useIntelligentRoutine() {
  const [currentRoutine, setCurrentRoutine] = useState<CurrentRoutine | null>(null);
  const [preferences, setPreferences] = useState<RoutinePreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { latestResults: bodyScanResults, weakMuscleGroups, isLoading: bodyScanLoading } = useBodyScanResults();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load current routine and preferences in parallel
      const [routineResult, preferencesResult] = await Promise.all([
        supabase
          .from('ai_generated_routines')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('user_fitness_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      if (routineResult.data) {
        setCurrentRoutine(routineResult.data);
      }

      if (preferencesResult.data) {
        setPreferences(preferencesResult.data);
      }
    } catch (error) {
      console.error('Error loading routine data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRoutine = async (newPreferences?: Partial<RoutinePreferences>) => {
    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update preferences if provided
      if (newPreferences) {
        const updatedPreferences = { ...preferences, ...newPreferences };
        await supabase
          .from('user_fitness_preferences')
          .upsert({
            user_id: user.id,
            ...updatedPreferences,
            updated_at: new Date().toISOString()
          });
        setPreferences(updatedPreferences);
      }

      // Deactivate current routine
      if (currentRoutine) {
        await supabase
          .from('ai_generated_routines')
          .update({ is_active: false })
          .eq('id', currentRoutine.id);
      }

      // Generate new routine
      const { data, error } = await supabase.functions.invoke('generate-intelligent-routine', {
        body: {
          user_id: user.id,
          regenerate_type: 'full_week',
          locked_days: [],
          current_routine_data: currentRoutine,
          preferences: newPreferences || preferences,
          body_scan_results: bodyScanResults,
          weak_muscle_groups: weakMuscleGroups
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setCurrentRoutine(data.routine);
      
      toast({
        title: "🎯 New Routine Generated!",
        description: "Your intelligent workout plan is ready",
      });

      return data.routine;

    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate routine. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateDay = async (day: string, dayIndex: number) => {
    if (!currentRoutine) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (currentRoutine.locked_days.includes(dayIndex)) {
        toast({
          title: "Day is Locked",
          description: "Unlock the day first to regenerate it",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-intelligent-routine', {
        body: {
          user_id: user.id,
          regenerate_type: 'single_day',
          target_day: day,
          locked_days: currentRoutine.locked_days,
          current_routine_data: currentRoutine,
          body_scan_results: bodyScanResults,
          weak_muscle_groups: weakMuscleGroups
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setCurrentRoutine(data.routine);
      
      toast({
        title: `✨ ${day.charAt(0).toUpperCase() + day.slice(1)} Regenerated!`,
        description: "New exercises added with intelligent variation",
      });

      return data.routine;

    } catch (error) {
      console.error('Day regeneration error:', error);
      toast({
        title: "Regeneration Failed",
        description: error.message || "Failed to regenerate day. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const toggleDayLock = async (dayIndex: number) => {
    if (!currentRoutine) return;

    const newLockedDays = currentRoutine.locked_days.includes(dayIndex)
      ? currentRoutine.locked_days.filter(d => d !== dayIndex)
      : [...currentRoutine.locked_days, dayIndex];

    try {
      await supabase
        .from('ai_generated_routines')
        .update({ locked_days: newLockedDays })
        .eq('id', currentRoutine.id);

      setCurrentRoutine(prev => prev ? { ...prev, locked_days: newLockedDays } : null);

      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const day = daysOfWeek[dayIndex];

      toast({
        title: `${day.charAt(0).toUpperCase() + day.slice(1)} ${newLockedDays.includes(dayIndex) ? 'Locked' : 'Unlocked'}`,
        description: newLockedDays.includes(dayIndex) ? "Day is protected from changes" : "Day can now be regenerated",
      });

    } catch (error) {
      console.error('Error toggling day lock:', error);
      toast({
        title: "Error",
        description: "Failed to update day lock status",
        variant: "destructive",
      });
    }
  };

  const savePreferences = async (newPreferences: Partial<RoutinePreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updatedPreferences = { ...preferences, ...newPreferences };
      
      await supabase
        .from('user_fitness_preferences')
        .upsert({
          user_id: user.id,
          ...updatedPreferences,
          updated_at: new Date().toISOString()
        });

      setPreferences(updatedPreferences);
      
      toast({
        title: "Preferences Saved",
        description: "Your workout preferences have been updated",
      });

    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    currentRoutine,
    preferences,
    isLoading: isLoading || bodyScanLoading,
    isGenerating,
    generateRoutine,
    regenerateDay,
    toggleDayLock,
    savePreferences,
    refreshData: loadData,
    bodyScanResults,
    weakMuscleGroups
  };
}