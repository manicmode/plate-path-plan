import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ARENA_ENABLED } from '@/lib/featureFlags';

export function useArenaMembership() {
  return useQuery({
    queryKey: ['arena-membership'],
    queryFn: async () => {
      if (!ARENA_ENABLED) {
        return { members: [], groupId: null, isInArena: false, error: null };
      }

      // Check auth session first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { members: [], groupId: null, isInArena: false, error: null };
      }

      try {
        // Auto-enroll user into rank20 group
        const { error: enrollError } = await supabase.rpc('ensure_rank20_membership');
        if (enrollError) {
          console.error('[Arena] Auto-enrollment failed:', enrollError);
        }

        const { data: rows, error } = await supabase.rpc('my_rank20_members');
        
        if (error) {
          console.error('[Arena] Error fetching membership:', error);
          return { members: [], groupId: null, isInArena: false, error: 'Arena temporarily unavailable — try again shortly.' };
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
        
        return { members, groupId, isInArena, error: null };
      } catch (err) {
        console.error('[Arena] Membership query failed:', err);
        return { members: [], groupId: null, isInArena: false, error: 'Arena temporarily unavailable — try again shortly.' };
      }
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    enabled: ARENA_ENABLED,
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