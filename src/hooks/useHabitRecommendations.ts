import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth/useAuth';

export type HabitDomain = 'nutrition'|'exercise'|'recovery';
export type HabitDifficulty = 'easy'|'medium'|'hard';

type TemplateRec = {
  id: string;
  slug: string;
  name: string;
  domain: HabitDomain;
  category: string;
  summary: string;
  goal_type: 'count'|'duration'|'bool';
  estimated_minutes: number;
  difficulty: string;
  tags: string;
  score: number;
  reason: string;
};

export function useHabitRecommendations(params: {
  domain?: HabitDomain;
  maxMinutes?: number;
  maxDifficulty?: HabitDifficulty;
  limit?: number;
}) {
  const { domain, maxMinutes = 20, maxDifficulty = 'medium', limit = 12 } = params || {};
  const { user } = useAuth();
  const [data, setData] = useState<TemplateRec[]|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user) return;
      setLoading(true); setError(null);
      const { data, error } = await supabase.rpc('habit_template_recommend', {
        p_user: user.id,
        p_domain: domain ?? null,
        p_max_minutes: maxMinutes,
        p_max_difficulty: maxDifficulty,
        p_limit: limit
      });
      if (cancelled) return;
      if (error) setError(error.message);
      else setData(data || []);
      setLoading(false);
    }
    run();
    return () => { cancelled = true; };
  }, [user?.id, domain, maxMinutes, maxDifficulty, limit]);

  return { data, loading, error };
}