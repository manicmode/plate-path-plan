import { getDisplayName } from '@/lib/displayName';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useCallback } from 'react';
import { useRuntimeFlag } from './useRuntimeFlag';
import { toast } from '@/hooks/use-toast';

// Helper function to enrich member data with user profiles
async function enrichMembersWithProfiles(members: any[]) {
  if (!members || members.length === 0) return members;
  
  const userIds = members.map(m => m.user_id).filter(Boolean);
  if (userIds.length === 0) return members;
  
  console.debug('[enrichMembersWithProfiles] Fetching profiles for', userIds.length, 'users');
  
  console.log('[ArenaProfiles] table', 'user_profiles');
  const q = supabase
    .from('user_profiles')
    .select('user_id, first_name, last_name, avatar_url')
    .in('user_id', userIds);

  const { data: profiles, error } = await q;
  console.log('[ArenaProfiles] rows', profiles?.length ?? 0, 'error', error?.message ?? null);
  
  console.debug('[enrichMembersWithProfiles] Found', profiles?.length || 0, 'profiles');
  
  const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
  
  return members.map(member => {
    const profile = profilesMap.get(member.user_id);
    let avatarUrl = member.avatar_url || profile?.avatar_url;
    
    // Convert storage paths to public URLs
    if (avatarUrl && !avatarUrl.startsWith('http')) {
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(avatarUrl);
      avatarUrl = publicUrlData.publicUrl;
    }
    
    // Create display name from first_name + last_name
    const profileDisplayName = profile?.first_name || profile?.last_name 
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      : '';
    
    return {
      ...member,
      display_name: profileDisplayName || member.display_name || `User ${member.user_id.slice(0, 8)}`,
      avatar_url: avatarUrl,
    };
  });
}

// Re-export types for compatibility
export type LeaderboardMode = "global" | "friends";

// V2 Active Arena Hook
export function useArenaActive(): { 
  groupId: string | null; 
  isLoading: boolean; 
  error?: Error; 
} {
  const query = useQuery({
    queryKey: ['arena', 'active-group'],
    queryFn: async () => {
      console.debug('[useArenaActive] Fetching active group ID');
      try {
        const { data, error } = await supabase.rpc('arena_get_active_group_id');
        if (error) {
          console.error('[useArenaActive] RPC error:', error);
          const { ArenaEvents } = await import('@/lib/telemetry');
          ArenaEvents.activeResolve(false, null);
          throw error;
        }
        console.debug('[useArenaActive] Active group ID:', data);
        // 🔎 DEBUG: Step 0 - Print groupId to console
        console.log('🔎 DEBUG - Active Group ID:', data);
        const { ArenaEvents } = await import('@/lib/telemetry');
        ArenaEvents.activeResolve(true, data);
        return data as string | null;
      } catch (error) {
        const { ArenaEvents } = await import('@/lib/telemetry');
        ArenaEvents.activeResolve(false, null);
        throw error;
      }
    },
    retry: 2,
    staleTime: 30000, // 30 seconds
  });

  return {
    groupId: query.data || null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : undefined,
  };
}

export async function fetchArenaLeaderboard(opts?: {
  mode?: LeaderboardMode;
  challengeId?: string | null;
  section?: string;
  limit?: number;
}) {
  const section = opts?.section ?? "global";
  const limit = opts?.limit ?? 20;

  const rpcName =
    opts?.mode === "friends"
      ? "arena_get_friends_leaderboard_with_profiles"
      : "arena_get_leaderboard_with_profiles";

  const { data, error } = await supabase.rpc(rpcName, {
    challenge_id_param: opts?.challengeId ?? null,
    section_param: section,
    limit_param: limit,
  });
  
  if (error) {
    console.warn("[Arena] RPC error:", error.message);
    throw error;
  }
  
  return { rows: data ?? [], source: rpcName };
}

export type ArenaActive = {
  id: string;
  slug: string | null;
  title: string;
  season: number;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
};

// Legacy Arena Active (rename to avoid conflicts)
export function useArenaActiveChallenge() {
  return useQuery({
    queryKey: ['arena','active'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('arena_get_active_challenge');
      if (error) throw error;
      // rpc returns one row or null; normalize to object or null
      return (Array.isArray(data) ? data[0] : data) as ArenaActive | null;
    },
  });
}

export function useArenaMyMembership(challengeId?: string) {
  return useQuery({
    queryKey: ['arena','me','membership', challengeId ?? 'active'],
    enabled: true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('arena_get_my_membership', { challenge_id_param: challengeId ?? null });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data; // one row or null
    },
  });
}

// V2 Enrollment hook
export function useArenaEnroll(): {
  enroll: () => Promise<string | null>;
  isEnrolling: boolean;
  error?: Error;
} {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const queryClient = useQueryClient();

  const enroll = useCallback(async (): Promise<string | null> => {
    setIsEnrolling(true);
    setError(undefined);

    try {
      // Check hard disable flag before enrollment
      try {
        const { data: flagData } = await (supabase as any)
          .from('runtime_flags')
          .select('enabled')
          .eq('name', 'arena_v2_hard_disable')
          .maybeSingle();

        if (flagData?.enabled === true) {
          toast({
            title: "Arena is under maintenance",
            description: "Please try again later.",
            variant: "destructive",
          });
          return null;
        }
      } catch (flagError) {
        // Ignore flag check errors, allow enrollment to proceed
        console.debug('[useArenaEnroll] Flag check failed, proceeding:', flagError);
      }

      console.debug('[useArenaEnroll] Starting enrollment');
      const { data, error } = await supabase.rpc('arena_enroll_me');
      
      if (error) {
        const { ArenaEvents } = await import('@/lib/telemetry');
        ArenaEvents.enroll(false, undefined, error.message);
        throw new Error(error.message);
      }
      
      // Handle the response - V2 arena_enroll_me returns UUID directly
      let groupId: string | null = null;
      if (data) {
        // The RPC returns a UUID string directly
        groupId = data as string;
      }
      
      if (!groupId) {
        const { ArenaEvents } = await import('@/lib/telemetry');
        ArenaEvents.enroll(false, undefined, 'No group ID returned');
        throw new Error('Enrollment failed: no group ID returned');
      }
      
      const { ArenaEvents } = await import('@/lib/telemetry');
      ArenaEvents.enroll(true, groupId);
      
      // Immediately revalidate useArenaActive so groupId becomes non-null
      await queryClient.invalidateQueries({ queryKey: ['arena', 'active-group'] });
      
      return groupId;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Enrollment failed');
      setError(error);
      return null;
    } finally {
      setIsEnrolling(false);
    }
  }, [queryClient]);

  return { enroll, isEnrolling, error };
}

// Legacy enrollment hook
export function useArenaEnrollLegacy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (challengeId?: string) => {
      const { data, error } = await supabase.rpc('arena_enroll_me');
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['arena'] });
    },
  });
}

// V2 Arena Members Hook (by group ID)
export function useArenaMembers(groupId?: string | null): { 
  members: Array<{ user_id: string; display_name: string; avatar_url?: string }>; 
  isLoading: boolean; 
  error?: Error; 
} {
  const query = useQuery({
    queryKey: ['arena', 'members-v2', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      if (!groupId) return [];
      console.debug('[useArenaMembers] Fetching members for group:', groupId);
      const { data, error } = await supabase.rpc('arena_get_members', {
        challenge_id_param: null, // V2 uses group-based membership
        limit_param: 200,
        offset_param: 0,
      });
      if (error) {
        console.error('[useArenaMembers] RPC error:', error);
        throw error;
      }
      console.debug('[useArenaMembers] Found', data?.length || 0, 'members');
      console.debug('[useArenaMembers] Raw member data:', data);
      
      const basicMembers = (data || []).map((member: any) => ({
        user_id: member.user_id,
        display_name: member.display_name || `User ${member.user_id.slice(0, 8)}`,
        avatar_url: member.avatar_url,
      }));
      
      return await enrichMembersWithProfiles(basicMembers);
    },
  });

  return {
    members: query.data || [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : undefined,
  };
}

// Legacy Arena Members Hook (by challenge ID)
export function useArenaLegacyMembers(challengeId?: string, limit = 200, offset = 0) {
  return useQuery({
    queryKey: ['arena','members', challengeId ?? 'active', limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('arena_get_members', {
        challenge_id_param: challengeId ?? null,
        limit_param: limit,
        offset_param: offset,
      });
      if (error) throw error;
      return data as Array<{user_id:string; display_name:string|null; avatar_url:string|null;}>;
    },
  });
}

export function useArenaLeaderboard(args?: {
  challengeId?: string;
  section?: 'global'|'friends'|'local';
  year?: number;
  month?: number;
  limit?: number;
  offset?: number;
}) {
  const { challengeId, section='global', year, month, limit=100, offset=0 } = args ?? {};
  return useQuery({
    queryKey: ['arena','leaderboard', challengeId ?? 'active', section, year, month, limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('arena_get_leaderboard_with_profiles', {
        challenge_id_param: challengeId ?? null,
        section_param: section,
        year_param: year ?? null,
        month_param: month ?? null,
        limit_param: limit,
        offset_param: offset,
      });
      if (error) throw error;
      return data as Array<{ user_id:string; display_name:string; avatar_url:string; rank:number; points:number; streak:number }>;
    },
  });
}

// V2 Arena Leaderboard Hook (by group ID)
export function useArenaLeaderboardWithProfiles(groupId?: string | null, domain?: string): { 
  leaderboard: Array<{ user_id: string; score: number; display_name: string; avatar_url?: string; rank: number }>; 
  isLoading: boolean; 
  error?: Error; 
} {
  const query = useQuery({
    queryKey: ['arena', 'leaderboard-v2', groupId, domain],
    enabled: !!groupId,
    queryFn: async () => {
      if (!groupId) return [];
      
      
      try {
        const { data: leaderboardData, error } = await supabase.rpc(
          'arena_get_leaderboard_by_domain',
          { 
            p_group_id: groupId, 
            p_domain: domain || 'combined',
            p_limit: 50,
            p_offset: 0
          }
        );
        
        if (error) {
          console.error('Leaderboard RPC error:', error);
          throw error;
        }

        if (!leaderboardData?.length) {
          return [];
        }

        // Get user IDs for profile enrichment
        const userIds = leaderboardData.map((row: any) => row.user_id);

        // Fetch user profiles in a single query
        console.log('[ArenaProfiles] table', 'user_profiles');
        const q = supabase
          .from('user_profiles')
          .select('user_id, first_name, last_name, avatar_url')
          .in('user_id', userIds);

        const { data: profiles, error: profileError } = await q;

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          throw profileError;
        }


        // Create enriched leaderboard with proper name resolution
        const enrichedLeaderboard = leaderboardData.map((row: any) => {
          const profile = profiles?.find((p: any) => p.user_id === row.user_id);
          
          // Use unified display name logic
          const displayName = getDisplayName({
            display_name: null, // user_profiles doesn't have display_name
            first_name: profile?.first_name,
            last_name: profile?.last_name,
            email: null, // user_profiles doesn't have email
            user_id: row.user_id,
          });
          
          // Resolve avatar URL from storage path to public URL
          let avatarUrl = profile?.avatar_url;
          if (avatarUrl && !avatarUrl.startsWith('http')) {
            avatarUrl = supabase.storage.from('avatars').getPublicUrl(avatarUrl).data.publicUrl;
          }


          return {
            user_id: row.user_id,
            score: Number(row.score) || 0,
            display_name: displayName,
            avatar_url: avatarUrl,
            rank: Number(row.rank) || 0
          };
        });

        
        return enrichedLeaderboard;
      } catch (error) {
        console.error('Leaderboard fetch failed:', error);
        throw error;
      }
    },
  });

  return {
    leaderboard: query.data || [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : undefined,
  };
}

// Legacy Arena Leaderboard Hook (by challenge ID)  
export function useArenaLegacyLeaderboardWithProfiles(args?: {
  challengeId?: string;
  section?: 'global'|'friends'|'local';
  year?: number;
  month?: number;
  limit?: number;
  offset?: number;
}) {
  const { challengeId, section='global', year, month, limit=100, offset=0 } = args ?? {};
  return useQuery({
    queryKey: ['arena','leaderboard+profiles', challengeId ?? 'active', section, year, month, limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('arena_get_leaderboard_with_profiles', {
        challenge_id_param: challengeId ?? null,
        section_param: section,
        year_param: year ?? null,
        month_param: month ?? null,
        limit_param: limit,
        offset_param: offset,
      });
      if (error) throw error;
      return data as Array<{ user_id:string; display_name:string|null; avatar_url:string|null; rank:number; points:number; streak:number }>;
    },
  });
}