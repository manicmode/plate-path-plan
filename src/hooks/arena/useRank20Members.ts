import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useArenaMembership() {
  return useQuery({
    queryKey: ['arena-membership'],
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc('my_rank20_members');
      
      if (error) {
        console.error('[Arena] Error fetching membership:', error);
        return { members: [], groupId: null, isInArena: false };
      }
      
      const members = rows || [];
      const groupId = members[0]?.group_id ?? null;
      const isInArena = !!groupId && members.length > 0;
      
      console.info('[Arena] membership check:', { 
        groupId, 
        memberCount: members.length, 
        isInArena,
        rawRows: rows,
        error: error?.message 
      });
      
      return { members, groupId, isInArena };
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}

// Legacy hook for backward compatibility
export function useRank20Members(userId?: string) {
  const membership = useArenaMembership();
  
  return {
    ...membership,
    data: membership.data?.members || [],
    isLoading: membership.isLoading,
    isError: membership.isError,
  };
}