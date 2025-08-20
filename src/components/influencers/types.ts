export type InfluencerPreview = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  tagline?: string;
  verified?: boolean;
  followerCount?: number;
  nextChallengeStart?: string | null; // ISO string
  niches?: string[];
};

export type InfluencerFilters = {
  query: string;
  category: 'all' | 'fitness' | 'nutrition' | 'mindfulness' | 'recovery';
  sort: 'trending' | 'followers' | 'upcoming' | 'new';
  verifiedOnly: boolean;
};