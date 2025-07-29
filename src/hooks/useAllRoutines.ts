import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';
import { useCustomRoutines, type CustomRoutine } from './useCustomRoutines';

export interface UnifiedRoutine {
  id: string;
  title: string;
  emoji: string;
  type: string;
  routineType: string;
  duration: string;
  gradient: string;
  status: 'not-started' | 'in-progress' | 'completed';
  currentDay: number;
  weeklyPlan: any;
  notes?: string;
  createdAt: string;
  source: 'custom' | 'ai-generated' | 'ai-legacy' | 'mock';
  canDelete?: boolean;
  isActive?: boolean;
  daysPerWeek?: number;
}

interface AIGeneratedRoutine {
  id: string;
  user_id: string;
  routine_name: string;
  days_per_week: number;
  fitness_level: string;
  split_type: string;
  equipment_available: string[];
  primary_goals: string[];
  weekly_routine_data: Json;
  muscle_group_schedule: Json;
  locked_days: number[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AILegacyRoutine {
  id: string;
  user_id: string;
  routine_name: string;
  routine_goal: string;
  split_type: string;
  fitness_level: string;
  equipment_needed: string[];
  days_per_week: number;
  estimated_duration_minutes: number;
  routine_data: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAllRoutines() {
  const [allRoutines, setAllRoutines] = useState<UnifiedRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use custom routines hook
  const { routines: customRoutines, loading: customLoading, deleteRoutine: deleteCustomRoutine } = useCustomRoutines();

  const fetchAIRoutines = async () => {
    if (!user?.id) return { aiGenerated: [], aiLegacy: [] };

    try {
      // Fetch AI generated routines (new system)
      const { data: aiGenerated, error: aiGenError } = await supabase
        .from('ai_generated_routines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch AI legacy routines (old system)
      const { data: aiLegacy, error: aiLegacyError } = await supabase
        .from('ai_routines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (aiGenError) {
        console.error('Error fetching AI generated routines:', aiGenError);
      }
      if (aiLegacyError) {
        console.error('Error fetching AI legacy routines:', aiLegacyError);
      }

      return {
        aiGenerated: (aiGenerated || []) as AIGeneratedRoutine[],
        aiLegacy: (aiLegacy || []) as AILegacyRoutine[]
      };
    } catch (error) {
      console.error('Error fetching AI routines:', error);
      return { aiGenerated: [], aiLegacy: [] };
    }
  };

  const convertCustomRoutineToUnified = (routine: CustomRoutine): UnifiedRoutine => {
    const routineTypeMap: Record<string, { emoji: string; label: string; gradient: string }> = {
      strength: { emoji: "🏋️", label: "Strength", gradient: "from-red-400 to-orange-600" },
      cardio: { emoji: "🏃", label: "Cardio", gradient: "from-blue-400 to-cyan-600" },
      hiit: { emoji: "⚡", label: "HIIT", gradient: "from-yellow-400 to-orange-600" },
      fullbody: { emoji: "🔁", label: "Full Body", gradient: "from-purple-400 to-pink-600" },
      flexibility: { emoji: "🧘", label: "Flexibility", gradient: "from-green-400 to-teal-600" },
      yoga: { emoji: "🧘", label: "Yoga", gradient: "from-purple-400 to-pink-500" },
      custom: { emoji: "✏️", label: "Custom", gradient: "from-gray-400 to-slate-600" }
    };
    
    const typeInfo = routineTypeMap[routine.routine_type] || routineTypeMap.custom;
    
    return {
      id: routine.id,
      title: routine.title,
      emoji: typeInfo.emoji,
      type: typeInfo.label,
      routineType: routine.routine_type,
      duration: routine.duration,
      gradient: typeInfo.gradient,
      status: "not-started" as const,
      currentDay: 1,
      weeklyPlan: routine.weekly_plan,
      notes: routine.notes || '',
      createdAt: routine.created_at,
      source: 'custom',
      canDelete: true
    };
  };

  const convertAIGeneratedToUnified = (routine: AIGeneratedRoutine): UnifiedRoutine => {
    const splitTypeMap: Record<string, { emoji: string; gradient: string }> = {
      'push_pull_legs': { emoji: "🤖", gradient: "from-purple-400 to-indigo-600" },
      'upper_lower': { emoji: "🤖", gradient: "from-blue-400 to-purple-600" },
      'full_body': { emoji: "🤖", gradient: "from-green-400 to-blue-600" },
      'bro_split': { emoji: "🤖", gradient: "from-red-400 to-pink-600" }
    };

    const typeInfo = splitTypeMap[routine.split_type] || { emoji: "🤖", gradient: "from-purple-400 to-indigo-600" };
    
    return {
      id: routine.id,
      title: routine.routine_name,
      emoji: typeInfo.emoji,
      type: `AI ${routine.split_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
      routineType: routine.split_type,
      duration: `${Math.round(60)} minutes`,
      gradient: typeInfo.gradient,
      status: routine.is_active ? "in-progress" : "not-started",
      currentDay: 1,
      weeklyPlan: routine.weekly_routine_data,
      notes: `AI-generated ${routine.fitness_level} level routine focusing on ${routine.primary_goals.join(', ')}`,
      createdAt: routine.created_at,
      source: 'ai-generated',
      canDelete: true,
      isActive: routine.is_active,
      daysPerWeek: routine.days_per_week
    };
  };

  const convertAILegacyToUnified = (routine: AILegacyRoutine): UnifiedRoutine => {
    const splitTypeMap: Record<string, { emoji: string; gradient: string }> = {
      'push_pull_legs': { emoji: "🤖", gradient: "from-purple-400 to-indigo-600" },
      'upper_lower': { emoji: "🤖", gradient: "from-blue-400 to-purple-600" },
      'full_body': { emoji: "🤖", gradient: "from-green-400 to-blue-600" },
      'bro_split': { emoji: "🤖", gradient: "from-red-400 to-pink-600" }
    };

    const typeInfo = splitTypeMap[routine.split_type] || { emoji: "🤖", gradient: "from-purple-400 to-indigo-600" };
    
    return {
      id: routine.id,
      title: routine.routine_name,
      emoji: typeInfo.emoji,
      type: `AI ${routine.split_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
      routineType: routine.split_type,
      duration: `${routine.estimated_duration_minutes} minutes`,
      gradient: typeInfo.gradient,
      status: routine.is_active ? "in-progress" : "not-started",
      currentDay: 1,
      weeklyPlan: routine.routine_data,
      notes: `AI-generated ${routine.fitness_level} level routine for ${routine.routine_goal.replace('_', ' ')}`,
      createdAt: routine.created_at,
      source: 'ai-legacy',
      canDelete: true,
      isActive: routine.is_active,
      daysPerWeek: routine.days_per_week
    };
  };

  const getMockRoutines = (): UnifiedRoutine[] => [
    {
      id: 'mock-1',
      title: "Push/Pull/Legs Split",
      emoji: "🏋️",
      type: "Strength",
      routineType: "strength",
      duration: "60-75 minutes",
      gradient: "from-red-400 to-orange-600",
      status: "not-started",
      currentDay: 1,
      weeklyPlan: {
        Monday: "Push: Bench press 3x8, Shoulder press 3x10, Tricep dips 3x12",
        Tuesday: "Pull: Pull-ups 3x8, Rows 3x10, Bicep curls 3x12",
        Wednesday: "Legs: Squats 3x10, Deadlifts 3x8, Calf raises 3x15",
        Thursday: "Push: Incline press 3x8, Lateral raises 3x12, Push-ups 3x15",
        Friday: "Pull: Lat pulldowns 3x10, Face pulls 3x15, Hammer curls 3x12",
        Saturday: "Legs: Leg press 3x12, Romanian deadlifts 3x10, Lunges 3x12",
        Sunday: "Rest day"
      },
      notes: "Progressive overload each week. Rest 2-3 minutes between sets.",
      createdAt: "2024-01-20T10:00:00Z",
      source: 'mock',
      canDelete: false
    },
    {
      id: 'mock-2',
      title: "Morning HIIT Routine",
      emoji: "⚡",
      type: "HIIT",
      routineType: "hiit",
      duration: "25-30 minutes",
      gradient: "from-yellow-400 to-orange-600",
      status: "not-started",
      currentDay: 1,
      weeklyPlan: {
        Monday: "Burpees 30s, Rest 30s, Jump squats 30s, Rest 30s - Repeat 5 rounds",
        Tuesday: "Rest day",
        Wednesday: "Mountain climbers 30s, Rest 30s, High knees 30s, Rest 30s - Repeat 5 rounds",
        Thursday: "Rest day",
        Friday: "Jumping jacks 30s, Rest 30s, Plank 30s, Rest 30s - Repeat 5 rounds",
        Saturday: "Full body HIIT circuit - 40 minutes",
        Sunday: "Active recovery walk"
      },
      notes: "High intensity intervals for maximum fat burn. Stay hydrated!",
      createdAt: "2024-01-18T08:00:00Z",
      source: 'mock',
      canDelete: false
    },
    {
      id: 'mock-3',
      title: "Evening Yoga Flow",
      emoji: "🧘",
      type: "Flexibility",
      routineType: "yoga",
      duration: "30-45 minutes",
      gradient: "from-purple-400 to-pink-500",
      status: "not-started",
      currentDay: 1,
      weeklyPlan: {
        Monday: "Gentle morning flow: Sun salutations, warrior poses, triangle pose",
        Tuesday: "Rest day",
        Wednesday: "Restorative yoga: Child's pose, pigeon pose, savasana",
        Thursday: "Rest day", 
        Friday: "Power yoga: Vinyasa flow, arm balances, inversions",
        Saturday: "Yin yoga: Long holds, hip openers, spinal twists",
        Sunday: "Meditation & breathwork"
      },
      notes: "Focus on breath awareness and mindful movement. Modify poses as needed.",
      createdAt: "2024-01-15T18:00:00Z",
      source: 'mock',
      canDelete: false
    }
  ];

  const deleteRoutine = async (id: string, source: string): Promise<boolean> => {
    try {
      if (source === 'custom') {
        return await deleteCustomRoutine(id);
      } else if (source === 'ai-generated') {
        const { error } = await supabase
          .from('ai_generated_routines')
          .update({ is_active: false })
          .eq('id', id)
          .eq('user_id', user?.id);

        if (error) throw error;

        toast({
          title: "Success!",
          description: "AI routine has been deactivated.",
        });

        await fetchAllRoutines();
        return true;
      } else if (source === 'ai-legacy') {
        const { error } = await supabase
          .from('ai_routines')
          .update({ is_active: false })
          .eq('id', id)
          .eq('user_id', user?.id);

        if (error) throw error;

        toast({
          title: "Success!",
          description: "AI routine has been deactivated.",
        });

        await fetchAllRoutines();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting routine:', error);
      toast({
        title: "Error",
        description: "Failed to delete routine. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const fetchAllRoutines = async () => {
    if (!user?.id || customLoading) return;

    setLoading(true);
    try {
      // Fetch AI routines
      const { aiGenerated, aiLegacy } = await fetchAIRoutines();

      // Convert all routines to unified format
      const unifiedCustom = customRoutines.map(convertCustomRoutineToUnified);
      const unifiedAIGenerated = aiGenerated.map(convertAIGeneratedToUnified);
      const unifiedAILegacy = aiLegacy.map(convertAILegacyToUnified);

      // Combine all real routines
      const realRoutines = [
        ...unifiedCustom,
        ...unifiedAIGenerated,
        ...unifiedAILegacy
      ];

      // Sort by creation date (newest first)
      realRoutines.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Show mock routines only if no real routines exist
      const routinesToShow = realRoutines.length > 0 ? realRoutines : getMockRoutines();

      setAllRoutines(routinesToShow);
    } catch (error) {
      console.error('Error fetching all routines:', error);
      // Fallback to mock routines on error
      setAllRoutines(getMockRoutines());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!customLoading) {
      fetchAllRoutines();
    }
  }, [user?.id, customLoading, customRoutines]);

  return {
    routines: allRoutines,
    loading: loading || customLoading,
    deleteRoutine,
    refreshRoutines: fetchAllRoutines,
    hasRealRoutines: allRoutines.some(r => r.source !== 'mock')
  };
}