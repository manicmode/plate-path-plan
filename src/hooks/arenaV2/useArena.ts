import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ArenaActive = {
  id: string;
  slug: string | null;
  title: string;
  season_year: number | null;
  season_month: number | null;
  starts_at: string | null;
  ends_at: string | null;
  metadata: any;
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
      const { data, error } = await supabase.rpc('arena_get_my_membership', { p_challenge_id: challengeId ?? null });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data; // one row or null
    },
  });
}

export function useArenaEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (challengeId?: string) => {
      const { data, error } = await supabase.rpc('arena_enroll_me', { p_challenge_id: challengeId ?? null });
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
        p_challenge_id: challengeId ?? null,
        p_limit: limit,
        p_offset: offset,
      });
      if (error) throw error;
      return data as Array<{user_id:string; display_name:string|null; avatar_url:string|null; joined_at:string; status:string;}>;
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
      const { data, error } = await supabase.rpc('arena_get_leaderboard', {
        p_challenge_id: challengeId ?? null,
        p_section: section,
        p_year: year ?? undefined,
        p_month: month ?? undefined,
        p_limit: limit,
        p_offset: offset,
      });
      if (error) throw error;
      return data as Array<{ user_id:string; rank:number; score:number }>;
    },
  });
}