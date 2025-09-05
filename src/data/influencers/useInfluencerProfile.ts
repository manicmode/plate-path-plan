import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InfluencerProfile, ChallengePreview } from '@/components/influencers/types';

interface InfluencerProfileData {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  tagline: string | null;
  bio: string | null;
  verified: boolean | null;
  niches: string[] | null;
  socials: any | null;
}

export function useInfluencerProfile(params: { id?: string; handle?: string }) {
  return useQuery({
    queryKey: ['influencer', params.id || params.handle],
    queryFn: async () => {
      if (!params.id && !params.handle) {
        throw new Error('Either id or handle must be provided');
      }

      // Get influencer data
      let influencerQuery = supabase
        .from('influencer')
        .select('*');

      if (params.id) {
        influencerQuery = influencerQuery.eq('id', params.id);
      } else {
        influencerQuery = influencerQuery.eq('handle', params.handle);
      }

      const { data: influencer, error: influencerError } = await influencerQuery.single();
      
      if (influencerError) {
        if (influencerError.code === 'PGRST116') {
          throw new Error('Influencer not found');
        }
        throw influencerError;
      }

      // Get follower count
      const { count: followerCount } = await supabase
        .from('influencer_follow')
        .select('id', { count: 'exact' })
        .eq('influencer_id', influencer.id)
        .limit(1);

      // Get participant count (total across all challenges)
      const { count: participantCount } = await supabase
        .from('challenge_join')
        .select('challenge_id, challenge!inner(influencer_id)', { count: 'exact' })
        .eq('challenge.influencer_id', influencer.id)
        .limit(1);

      // Get challenges hosted count
      const { count: challengesHosted } = await supabase
        .from('challenge')
        .select('id', { count: 'exact' })
        .eq('influencer_id', influencer.id)
        .not('published_at', 'is', null)
        .limit(1);

      // Get live challenges
      const { data: liveChallenges } = await supabase
        .from('challenge')
        .select('id, title, banner_url, start_at, end_at, is_paid, price_cents, max_participants')
        .eq('influencer_id', influencer.id)
        .not('published_at', 'is', null)
        .lte('start_at', new Date().toISOString())
        .gte('end_at', new Date().toISOString())
        .limit(5);

      // Get upcoming challenges
      const { data: upcomingChallenges } = await supabase
        .from('challenge')
        .select('id, title, banner_url, start_at, end_at, is_paid, price_cents, max_participants')
        .eq('influencer_id', influencer.id)
        .not('published_at', 'is', null)
        .gt('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(5);

      // Transform challenges to ChallengePreview format
      const transformChallenge = (challenge: any): ChallengePreview => ({
        id: challenge.id,
        title: challenge.title,
        bannerUrl: challenge.banner_url || undefined,
        startAt: challenge.start_at,
        endAt: challenge.end_at,
        status: new Date(challenge.start_at) <= new Date() ? 'live' : 'upcoming',
        isPaid: challenge.is_paid || false,
        priceCents: challenge.price_cents || undefined,
        spotsLeft: challenge.max_participants || null,
      });

      // Check if current user follows this influencer
      const { data: followData } = await supabase
        .from('influencer_follow')
        .select('id')
        .eq('influencer_id', influencer.id)
        .eq('follower_id', (await supabase.auth.getUser()).data.user?.id || '')
        .maybeSingle();

      const profile: InfluencerProfile = {
        id: influencer.id,
        name: influencer.display_name,
        handle: influencer.handle,
        avatarUrl: influencer.avatar_url || '',
        bannerUrl: influencer.banner_url || undefined,
        tagline: influencer.tagline || undefined,
        bio: influencer.bio || undefined,
        verified: influencer.verified || false,
        followerCount: followerCount || 0,
        niches: influencer.niches || [],
        socials: influencer.socials as { instagram?: string; tiktok?: string; youtube?: string; website?: string; } || undefined,
        isFollowing: !!followData,
        stats: {
          totalFollowers: followerCount || 0,
          totalParticipants: participantCount || 0,
          challengesHosted: challengesHosted || 0,
        },
        challenges: {
          live: (liveChallenges || []).map(transformChallenge),
          upcoming: (upcomingChallenges || []).map(transformChallenge),
        },
        highlights: [], // TODO: Add highlights if needed
      };

      return profile;
    },
    enabled: !!(params.id || params.handle),
  });
}