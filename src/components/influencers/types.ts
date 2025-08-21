export type InfluencerPreview = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  bannerUrl?: string;
  tagline?: string;
  verified?: boolean;
  followerCount?: number;
  nextChallengeStart?: string | null; // ISO string
  niches?: string[];
  isFollowing?: boolean;
};

export type ChallengePreview = {
  id: string;
  title: string;
  bannerUrl?: string;
  startAt: string; // ISO
  endAt: string;   // ISO
  status: 'live' | 'upcoming' | 'completed';
  isPaid?: boolean;
  priceCents?: number;
  spotsLeft?: number | null;
};

export type InfluencerProfile = InfluencerPreview & {
  bio?: string;
  socials?: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    website?: string;
  };
  stats?: {
    totalFollowers?: number;
    totalParticipants?: number;
    challengesHosted?: number;
  };
  highlights?: string[]; // 3 quick tips
  challenges?: {
    live: ChallengePreview[];
    upcoming: ChallengePreview[];
    past?: ChallengePreview[];
  };
};

export type InfluencerFilters = {
  query: string;
  category: 'all' | 'fitness' | 'nutrition' | 'mindfulness' | 'recovery';
  sort: 'trending' | 'followers' | 'upcoming' | 'new';
  verifiedOnly: boolean;
};