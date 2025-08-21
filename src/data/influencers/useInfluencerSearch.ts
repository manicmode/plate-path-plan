import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InfluencerPreview, InfluencerFilters } from '@/components/influencers/types';

const ITEMS_PER_PAGE = 12;

interface InfluencerSearchResult {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  tagline: string | null;
  verified: boolean | null;
  niches: string[] | null;
  follower_count: number;
  next_challenge_start: string | null;
  is_following: boolean;
}

export function useInfluencerSearch(filters: InfluencerFilters) {
  return useInfiniteQuery({
    queryKey: ['influencers', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('influencer')
        .select(`
          id,
          handle,
          display_name,
          avatar_url,
          banner_url,
          tagline,
          verified,
          niches,
          follower_count:influencer_follow(count),
          next_challenge_start:challenge!challenge_influencer_id_fkey(
            start_at
          ),
          is_following:influencer_follow!left(
            follower_id
          )
        `)
        .range(from, to);

      // Apply search query
      if (filters.query) {
        query = query.or(`display_name.ilike.%${filters.query}%,handle.ilike.%${filters.query}%`);
      }

      // Apply category filter
      if (filters.category !== 'all') {
        query = query.contains('niches', [filters.category]);
      }

      // Apply verified filter
      if (filters.verifiedOnly) {
        query = query.eq('verified', true);
      }

      // Apply sorting
      switch (filters.sort) {
        case 'trending':
          query = query.order('created_at', { ascending: false });
          break;
        case 'followers':
          // Note: This is a simplified sort. In production, you'd want a computed column
          query = query.order('display_name', { ascending: true });
          break;
        case 'upcoming':
          query = query.order('display_name', { ascending: true });
          break;
        case 'new':
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform to InfluencerPreview format
      const transformedData: InfluencerPreview[] = (data as any[]).map((item: any) => ({
        id: item.id,
        name: item.display_name,
        handle: item.handle,
        avatarUrl: item.avatar_url || '',
        bannerUrl: item.banner_url || undefined,
        tagline: item.tagline || undefined,
        verified: item.verified || false,
        followerCount: item.follower_count?.[0]?.count || 0,
        nextChallengeStart: item.next_challenge_start?.[0]?.start_at || null,
        niches: item.niches || [],
        isFollowing: item.is_following?.some((f: any) => f.follower_id) || false,
      }));

      return {
        data: transformedData,
        nextCursor: data.length === ITEMS_PER_PAGE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
  });
}