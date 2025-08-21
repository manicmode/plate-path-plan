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
    staleTime: 60_000, // Cache for 1 minute
    refetchOnWindowFocus: true,
  });

  // Get avatar fallback from auth user metadata or profile
  const getAvatarFallback = () => {
    return user?.user_metadata?.avatar_url || 
           user?.user_metadata?.picture ||
           `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email || 'User')}&size=200&background=random`;
  };

  // Update influencer profile
  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<InfluencerListingData>) => {
      if (!user?.id) throw new Error('Not authenticated');

      // If no avatar_url provided and none exists, use fallback
      if (!updates.avatar_url && !influencerData?.avatar_url) {
        updates.avatar_url = getAvatarFallback();
      }

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

      // Ensure avatar fallback before publishing
      const avatar_url = influencerData?.avatar_url || getAvatarFallback();

      const { data, error } = await supabase
        .from('influencer')
        .update({ 
          is_listed: true, 
          listed_at: new Date().toISOString(),
          avatar_url // Persist avatar fallback
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencer-listing', user?.id] });
      // Also invalidate the public search to show the new listing
      queryClient.invalidateQueries({ queryKey: ['influencers-public'] });
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
      // Also invalidate the public search to hide the unpublished listing
      queryClient.invalidateQueries({ queryKey: ['influencers-public'] });
    },
  });

  // Validation functions
  const validateField = (field: keyof InfluencerListingData, value: any): string | null => {
    switch (field) {
      case 'display_name':
        return !value ? 'Display name is required' : null;
      case 'handle':
        if (!value) return 'Handle is required';
        if (!/^[a-z0-9_]{3,24}$/.test(value)) return 'Handle must be 3-24 characters (letters, numbers, underscore only)';
        return null;
      case 'bio':
        if (!value) return 'Bio is required';
        if (value.length < 80) return 'Bio must be at least 80 characters';
        return null;
      case 'category_tags':
        return (!value || value.length === 0) ? 'At least one specialty tag is required' : null;
      default:
        return null;
    }
  };

  // Check if profile meets publishing requirements with detailed validation
  const getValidationErrors = (data: InfluencerListingData | null | undefined) => {
    if (!data) return { canPublish: false, errors: { general: 'Profile data not found' } };
    
    const errors: Record<string, string> = {};
    
    const displayNameError = validateField('display_name', data.display_name);
    if (displayNameError) errors.display_name = displayNameError;
    
    const handleError = validateField('handle', data.handle);
    if (handleError) errors.handle = handleError;
    
    const bioError = validateField('bio', data.bio);
    if (bioError) errors.bio = bioError;
    
    const tagsError = validateField('category_tags', data.category_tags);
    if (tagsError) errors.category_tags = tagsError;
    
    // Avatar is not required in validation since we have fallback
    
    return {
      canPublish: Object.keys(errors).length === 0,
      errors
    };
  };

  const validation = getValidationErrors(influencerData);

  return {
    influencerData,
    isLoading,
    updateProfile,
    publishToHub,
    unpublishFromHub,
    canPublish: validation.canPublish,
    validationErrors: validation.errors,
    validateField,
    getAvatarFallback,
  };
}