import { useMemo } from 'react';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';

// Unified active challenge IDs sourced from the exact hooks powering the "My" sections
export function useActiveChallengeIds() {
  const { userParticipations, challenges: publicChallenges, loading: lp } = usePublicChallenges();
  const { challengesWithParticipation, loading: lpr } = usePrivateChallenges();

  const ids = useMemo(() => {
    // Public: derive from current user participations and cross-check against active public list when available
    const activePublicSet = new Set((publicChallenges ?? []).map((c: any) => c.id));
    const pubIds = (userParticipations ?? [])
      .map((p: any) => p.challenge_id)
      .filter((id: string) => !activePublicSet.size || activePublicSet.has(id));

    // Private: use the same list used by "My Private Challenges"
    const prvIds = (challengesWithParticipation ?? []).map((c: any) => c.id);

    // Dedup and preserve order (public first then private)
    const seen = new Set<string>();
    const ordered = [...pubIds, ...prvIds].filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    return ordered;
  }, [userParticipations, publicChallenges, challengesWithParticipation]);

  return {
    ids,
    isLoading: lp || lpr,
  };
}
