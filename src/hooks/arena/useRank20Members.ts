import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { requireSession } from '@/lib/ensureAuth';

type Member = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  joined_at: string;
};

export function useRank20Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      // Check auth first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMembers([]);
        setLoading(false);
        return;
      }

      await requireSession();
      const { data, error } = await supabase.rpc('my_rank20_group_members');
      if (error) setError(error.message);
      
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.info('[RPC] my_rank20_group_members', Array.isArray(data) ? data.length : data, data);
      }
      
      setMembers((data as Member[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication required');
      setMembers([]);
    }
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (async () => {
      try {
        const [{ data: user }, chosen] = await Promise.all([
          supabase.auth.getUser(),
          supabase.rpc('my_rank20_chosen_challenge_id')
        ]);
        // eslint-disable-next-line no-console
        console.info('[RPC] auth user', user?.user?.id);
        // eslint-disable-next-line no-console
        console.info('[RPC] chosen_challenge', chosen?.data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.info('[RPC] chosen_challenge error', e);
      }
    })();
  }, []);

  return { members, loading, error, refresh };
}