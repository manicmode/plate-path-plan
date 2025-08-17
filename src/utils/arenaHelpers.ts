import { getDisplayName } from '@/lib/displayName';

// Arena helper functions for merging roster and leaderboard data

export type RosterRow = { 
  user_id: string; 
  display_name: string | null; 
  avatar_url?: string | null; 
};

export type LeaderboardRow = { 
  user_id: string; 
  display_name: string | null; 
  avatar_url?: string | null; 
  points?: number | null; 
  streak?: number | null; 
  rank?: number | null; 
};

export type MergedMemberRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  rank: number | null;
};

export function makeMembersForTabs(roster: RosterRow[], lb: LeaderboardRow[]): MergedMemberRow[] {
  const lbById = new Map(lb.map(r => [r.user_id, r]));
  
  return roster.map(r => {
    const m = lbById.get(r.user_id);
    const name = getDisplayName({
      display_name: r.display_name,
      first_name: null,
      last_name: null,
      email: null,
      user_id: r.user_id,
    });
    
    return {
      user_id: r.user_id,
      display_name: name,
      avatar_url: r.avatar_url ?? m?.avatar_url ?? null,
      points: m?.points ?? 0,
      rank: m?.rank ?? null,
    };
  }).sort((a, b) => {
    // Sort by rank (nulls last), then by display name
    const rankA = a.rank ?? 1e9;
    const rankB = b.rank ?? 1e9;
    if (rankA !== rankB) return rankA - rankB;
    return a.display_name.localeCompare(b.display_name);
  });
}