import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ArenaWinner = {
  season_month: string;
  user_id: string;
  rank: number;
  score: number;
  trophy_level: 'gold' | 'silver' | 'bronze';
  display_name: string;
  avatar_url: string | null;
};

export function useArenaWinners() {
  const [winners, setWinners] = useState<ArenaWinner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from('arena_last_month_winners')
        .select('*')
        .order('rank', { ascending: true });
      if (!mounted) return;
      if (!error && data) setWinners(data as ArenaWinner[]);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  return { winners, loading };
}