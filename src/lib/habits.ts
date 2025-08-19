import { supabase } from '@/integrations/supabase/client';

export async function startHabit(slug: string, reminder?: string | null, freq: 'daily' | 'weekly' = 'daily') {
  const { error } = await supabase.rpc('rpc_start_habit', { 
    p_habit_slug: slug, 
    p_reminder_time: reminder ? reminder + 'Z' : null, 
    p_frequency: freq 
  });
  if (error) throw error;
  return slug; // Return slug since we don't get adoption_id from the compatibility layer
}

export async function pauseHabit(slug: string) {
  const { error } = await supabase.rpc('rpc_pause_habit', { p_habit_slug: slug });
  if (error) throw error;
}

export async function resumeHabit(slug: string) {
  const { error } = await supabase.rpc('rpc_resume_habit', { p_habit_slug: slug });
  if (error) throw error;
}

export async function setHabitReminder(slug: string, time: string, freq: 'daily' | 'weekly' = 'daily') {
  const { error } = await supabase.rpc('rpc_set_habit_reminder', { 
    p_habit_slug: slug, 
    p_reminder_time: time + 'Z', 
    p_frequency: freq 
  });
  if (error) throw error;
}

export async function markHabitDone(slug: string, date?: string, notes?: string) {
  const { error } = await supabase.rpc('rpc_mark_habit_done', {
    p_habit_slug: slug,
    p_date: date ?? null,
    p_notes: notes ?? null
  });
  if (error) throw error;
  return slug; // Return slug as log id
}