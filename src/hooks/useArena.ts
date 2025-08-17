import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useCallback } from 'react';

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
    try {
      setIsEnrolling(true);
      setError(undefined);
      
      const { data, error: rpcError } = await supabase.rpc('arena_enroll_me');
      
      if (rpcError) {
        const { ArenaEvents } = await import('@/lib/telemetry');
        ArenaEvents.enroll(false, undefined, rpcError.message);
        throw new Error(rpcError.message);
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
      return (data || []).map((member: any) => ({
        user_id: member.user_id,
        display_name: member.display_name || `User ${member.user_id.slice(0, 8)}`,
        avatar_url: member.avatar_url,
      }));
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
export function useArenaLeaderboardWithProfiles(groupId?: string | null): { 
  leaderboard: Array<{ user_id: string; score: number; display_name: string; avatar_url?: string; rank: number }>; 
  isLoading: boolean; 
  error?: Error; 
} {
  const query = useQuery({
    queryKey: ['arena', 'leaderboard-v2', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      if (!groupId) return [];
      console.debug('[useArenaLeaderboardWithProfiles] Fetching leaderboard for group:', groupId);
      const { data, error } = await supabase.rpc('arena_get_leaderboard_with_profiles', {
        challenge_id_param: null, // V2 uses group-based leaderboard
        section_param: 'global',
        year_param: null,
        month_param: null,
        limit_param: 100,
        offset_param: 0,
      });
      if (error) {
        console.error('[useArenaLeaderboardWithProfiles] RPC error:', error);
        throw error;
      }
      console.debug('[useArenaLeaderboardWithProfiles] Found', data?.length || 0, 'entries');
      return (data || []).map((entry: any) => ({
        user_id: entry.user_id,
        score: entry.points || 0,
        display_name: entry.display_name || `User ${entry.user_id.slice(0, 8)}`,
        avatar_url: entry.avatar_url,
        rank: entry.rank || 0,
      }));
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