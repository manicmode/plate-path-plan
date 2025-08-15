import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRank20Members(userId?: string) {
  return useQuery({
    queryKey: ['rank20Members', userId],
    queryFn: async () => {
      // Prefer RPC if it exists
      const rpc = await supabase.rpc('my_rank20_members');
      if (!rpc.error && Array.isArray(rpc.data)) {
        console.info('[Arena] rows:', rpc.data.length);
        return rpc.data;
      }
      
      // Fallback: safe select from a view/table the UI expects
      const { data, error } = await supabase
        .from('rank20_members_view') // if this view doesn't exist, fallback below
        .select('*');
      if (!error && data) {
        console.info('[Arena] rows:', data.length);
        return data;
      }
      
      // Final fallback: raw table
      const raw = await supabase.from('rank20_members').select('*');
      console.info('[Arena] rows:', raw.data?.length ?? 0);
      return raw.data ?? [];
    },
    enabled: !!userId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });
}