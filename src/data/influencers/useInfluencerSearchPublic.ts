import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InfluencerPreview, InfluencerFilters } from '@/components/influencers/types';

interface PublicInfluencerData {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  category_tags: string[];
  location_city: string | null;
  location_country: string | null;
  social_links: Record<string, string>;
  verified: boolean;
  listed_at: string;
}

const ITEMS_PER_PAGE = 12;

export function useInfluencerSearchPublic(filters: InfluencerFilters) {
  return useInfiniteQuery({
    queryKey: ['influencers-public', filters],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('v_influencer_public_cards')
        .select('*');

      // Apply search filter
      if (filters.query) {
        query = query.or(`display_name.ilike.%${filters.query}%,handle.ilike.%${filters.query}%,bio.ilike.%${filters.query}%`);
      }

      // Apply category filter
      if (filters.category !== 'all') {
        query = query.contains('category_tags', [filters.category]);
      }

      // Apply verified filter
      if (filters.verifiedOnly) {
        query = query.eq('verified', true);
      }

      // Apply sorting
      switch (filters.sort) {
        case 'followers':
          // For now, just sort by listed_at desc since we don't have follower count in the view
          query = query.order('listed_at', { ascending: false });
          break;
        case 'new':
          query = query.order('listed_at', { ascending: false });
          break;
        case 'trending':
        case 'upcoming':
        default:
          query = query.order('listed_at', { ascending: false });
          break;
      }

      // Pagination
      const from = pageParam * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Search error:', error);
        throw error;
      }

      // Transform to InfluencerPreview format
      const influencers: InfluencerPreview[] = (data || []).map((item: PublicInfluencerData) => ({
        id: item.id,
        name: item.display_name,
        handle: item.handle,
        avatarUrl: item.avatar_url || '',
        tagline: item.headline || undefined,
        verified: item.verified,
        niches: item.category_tags,
        // We don't have follower count or following status in the public view yet
        followerCount: undefined,
        isFollowing: false, // Will be handled separately if needed
        nextChallengeStart: null, // Not in the public view yet
      }));

      return {
        data: influencers,
        nextCursor: data?.length === ITEMS_PER_PAGE ? pageParam + 1 : null,
        hasNextPage: data?.length === ITEMS_PER_PAGE,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 60_000, // Cache for 1 minute
    refetchOnWindowFocus: true,
  });
}