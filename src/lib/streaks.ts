import { supabase } from '@/integrations/supabase/client';
import { StreakRow, StreakMap } from '@/types/streaks';

export const getStreaksBySlug = async (): Promise<StreakMap> => {
  try {
    const { data, error } = await supabase
      .from('v_habit_streaks')
      .select('*');

    if (error) throw error;

    // Convert array to map keyed by habit_slug
    const streakMap: StreakMap = {};
    data?.forEach((streak: StreakRow) => {
      streakMap[streak.habit_slug] = streak;
    });

    return streakMap;
  } catch (error) {
    console.error('Error fetching habit streaks:', error);
    return {};
  }
};

export const getStreakBySlug = async (slug: string): Promise<StreakRow | null> => {
  try {
    const { data, error } = await supabase
      .from('v_habit_streaks')
      .select('*')
      .eq('habit_slug', slug)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching habit streak:', error);
    return null;
  }
};

export const formatStreakDisplay = (currentStreak: number): string => {
  if (currentStreak === 0) return '';
  return `🔥 ${currentStreak}d`;
};

export const formatLastDone = (lastDoneOn: string | null, doneToday: boolean): string => {
  if (doneToday) return "Completed today";
  if (!lastDoneOn) return "Not completed yet";
  
  const lastDate = new Date(lastDoneOn);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (lastDate.toDateString() === yesterday.toDateString()) {
    return "You're on pace — logged yesterday";
  }
  
  return `Last completed: ${lastDate.toLocaleDateString()}`;
};