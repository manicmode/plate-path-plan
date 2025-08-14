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
      await requireSession();
      const { data, error } = await supabase.rpc('my_rank20_group_members');
      if (error) setError(error.message);
      setMembers((data as Member[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication required');
      setMembers([]);
    }
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);
  return { members, loading, error, refresh };
}