import { supabase } from '@/integrations/supabase/client';

export type CoachContext = any;

function inlineAsk(label: string) {
  return ` (I’m missing your ${label}—can you share it?)`;
}

export async function substituteRecoveryPlaceholders(text: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('coach-context', {} as any);
    const ctx: CoachContext | null = error ? null : data;

    const derived = ctx?.recovery?.derived || {};
    const moodStress = ctx?.recovery?.moodStress || {};
    const supplements = ctx?.recovery?.supplements || {};
    const practices = ctx?.recovery?.practices || {};

    const map: Record<string, string | number | undefined> = {
      last_sleep_hours: derived.last_sleep_hours,
      avg_sleep_7d: derived.avg_sleep_7d,
      mood_avg_7d: moodStress.moodAvg,
      stress_avg_7d: moodStress.stressAvg,
      recovery_score: ctx?.recovery?.recoveryScore,
      top_practice: derived.top_practice,
      longest_recovery_streak: derived.longest_recovery_streak,
      supp_adherence_7d: ctx?.recovery?.supplements?.adherence7dPct,
      peak_stress_day: derived.peak_stress_day,
    };

    return text.replace(/\{([^}]+)\}/g, (_m, key: string) => {
      const v = map[key];
      if (v == null || v === '') {
        // friendly inline ask based on key
        switch (key) {
          case 'last_sleep_hours':
          case 'avg_sleep_7d':
            return inlineAsk('sleep data');
          case 'mood_avg_7d':
          case 'stress_avg_7d':
            return inlineAsk('mood/stress logs');
          case 'recovery_score':
            return inlineAsk('latest recovery score');
          case 'top_practice':
            return inlineAsk('go-to recovery practice');
          case 'longest_recovery_streak':
            return inlineAsk('longest practice streak');
          case 'supp_adherence_7d':
            return inlineAsk('supplement routine');
          case 'peak_stress_day':
            return inlineAsk('stress pattern');
          default:
            return inlineAsk(key.replace(/_/g,' '));
        }
      }
      if (typeof v === 'number') {
        if (['avg_sleep_7d','mood_avg_7d','stress_avg_7d'].includes(key)) return (Math.round(v * 10) / 10).toString();
        return String(v);
      }
      return String(v);
    });
  } catch {
    // If context fails, keep placeholders but add a single inline notice at end
    return `${text} (Personalization limited—log recovery to unlock more.)`;
  }
}
