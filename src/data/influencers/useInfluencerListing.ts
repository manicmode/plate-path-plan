import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface InfluencerListingData {
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
  is_listed: boolean;
  listed_at: string | null;
}

export function useInfluencerListing() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get current influencer data
  const { data: influencerData, isLoading } = useQuery({
    queryKey: ['influencer-listing', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('influencer')
        .select('id, handle, display_name, avatar_url, headline, bio, category_tags, location_city, location_country, social_links, is_listed, listed_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as InfluencerListingData | null;
    },
    enabled: !!user?.id,
  });

  // Update influencer profile
  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<InfluencerListingData>) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('influencer')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencer-listing', user?.id] });
    },
  });

  // Publish to hub (set is_listed = true)
  const publishToHub = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('influencer')
        .update({ 
          is_listed: true, 
          listed_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencer-listing', user?.id] });
    },
  });

  // Unpublish from hub (set is_listed = false) 
  const unpublishFromHub = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('influencer')
        .update({ is_listed: false })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencer-listing', user?.id] });
    },
  });

  // Check if profile meets publishing requirements
  const canPublish = (data: InfluencerListingData | null | undefined): boolean => {
    if (!data) return false;
    
    return !!(
      data.display_name &&
      data.handle &&
      data.avatar_url &&
      data.bio && data.bio.length >= 80 &&
      data.category_tags && data.category_tags.length > 0
    );
  };

  return {
    influencerData,
    isLoading,
    updateProfile,
    publishToHub,
    unpublishFromHub,
    canPublish: canPublish(influencerData),
  };
}