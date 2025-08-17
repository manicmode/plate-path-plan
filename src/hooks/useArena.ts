import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Re-export types for compatibility
export type LeaderboardMode = "global" | "friends";

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

export function useArenaActive() {
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

export function useArenaEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (challengeId?: string) => {
      const { data, error } = await supabase.rpc('arena_enroll_me', { challenge_id_param: challengeId ?? null });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['arena'] });
    },
  });
}

export function useArenaMembers(challengeId?: string, limit = 200, offset = 0) {
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

export function useArenaLeaderboardWithProfiles(args?: {
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