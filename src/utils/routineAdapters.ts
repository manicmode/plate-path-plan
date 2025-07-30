import type { UnifiedRoutine } from '@/hooks/useAllRoutines';

export interface AIRoutineCardProps {
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
}

export function convertUnifiedToAIRoutineCard(routine: UnifiedRoutine): AIRoutineCardProps {
  return {
    id: routine.id,
    routine_name: routine.title,
    routine_goal: routine.routineType || 'general_fitness',
    split_type: routine.routineType || 'full_body',
    days_per_week: routine.daysPerWeek || 3,
    estimated_duration_minutes: parseInt(routine.duration) || 60,
    fitness_level: 'intermediate', // Default since not in UnifiedRoutine
    equipment_needed: [], // Default since not in UnifiedRoutine
    start_date: routine.status === 'in-progress' ? new Date().toISOString().split('T')[0] : null,
    current_week: 1,
    current_day_in_week: routine.currentDay || 1,
    is_active: routine.status === 'in-progress',
    locked_days: {},
    routine_data: routine.weeklyPlan || { weeks: [] },
    created_at: routine.createdAt
  };
}