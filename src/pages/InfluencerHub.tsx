import React, { useState } from 'react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { InfluencerFilters } from '@/components/influencers/InfluencerFilters';
import { InfluencerList } from '@/components/influencers/InfluencerList';
import { InfluencerProfile } from '@/components/influencers/InfluencerProfile';
import { useInfluencerSearchPublic } from '@/data/influencers/useInfluencerSearchPublic';
import { useInfluencerProfile } from '@/data/influencers/useInfluencerProfile';
import { useFollowMutation } from '@/data/influencers/useFollowMutation';
import { useToast } from '@/hooks/use-toast';
import type { InfluencerPreview, InfluencerFilters as FilterType } from '@/components/influencers/types';

const InfluencerHub = () => {
  useScrollToTop();
  const { toast } = useToast();

  // Initialize filters from URL params
  const getInitialFilters = (): FilterType => {
    const params = new URLSearchParams(window.location.search);
    return {
      query: params.get('q') || '',
      category: (params.get('tags') as FilterType['category']) || 'all',
      sort: (params.get('sort') as FilterType['sort']) || 'trending',
      verifiedOnly: params.get('verified') === '1',
    };
  };

  const [filters, setFilters] = useState<FilterType>(getInitialFilters());
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null);

  // Update URL when filters change
  const updateFilters = (newFilters: FilterType) => {
    setFilters(newFilters);
    
    // Update URL without reload
    const params = new URLSearchParams();
    if (newFilters.query) params.set('q', newFilters.query);
    if (newFilters.category !== 'all') params.set('tags', newFilters.category);
    if (newFilters.sort !== 'trending') params.set('sort', newFilters.sort);
    if (newFilters.verifiedOnly) params.set('verified', '1');
    
    const newUrl = `/influencer-hub${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  };

  // Fetch influencers with real data from public view
  const { 
    data: influencersData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfluencerSearchPublic(filters);

  // Fetch selected influencer profile
  const { data: selectedProfile, isLoading: profileLoading } = useInfluencerProfile(
    { handle: selectedHandle || undefined },
  );

  // Follow mutation
  const followMutation = useFollowMutation();

  // Flatten paginated results
  const influencers = influencersData?.pages.flatMap(page => page.data) || [];

  const handleSelect = (influencerId: string) => {
    const influencer = influencers.find(i => i.id === influencerId);
    if (!influencer) return;
    
    setSelectedHandle(influencer.handle);
    // Update URL with shallow routing - simplified approach
    window.history.pushState({}, '', `/influencer-hub/${influencer.handle}`);
  };

  const handleToggleFollow = (influencerId: string) => {
    const influencer = influencers.find(i => i.id === influencerId);
    if (!influencer) return;

    followMutation.mutate({
      influencerId,
      isFollowing: influencer.isFollowing || false,
    });
  };

  const handleNotify = (challengeId: string) => {
    // TODO: Implement notification scheduling
    toast({
      title: 'Notification Set',
      description: 'You will be notified when this challenge starts.',
    });
  };

  const handleCloseProfile = () => {
    setSelectedHandle(null);
    window.history.pushState({}, '', '/influencer-hub');
  };

  // Handle deep link - extract handle from URL and highlight parameter
  React.useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    
    // Handle profile deep link
    const match = path.match(/^\/influencer-hub\/([^\/]+)$/);
    if (match) {
      setSelectedHandle(match[1]);
    }
    
    // Handle highlight parameter (for newly published profiles)
    if (params.get('highlight') === 'me') {
      // TODO: Scroll to and highlight user's own card
      // This would require getting the current user's influencer data
      // and finding their card in the list to highlight it
      toast({
        title: '🎉 Welcome to the Hub!',
        description: 'Your profile is now live and discoverable.',
      });
      
      // Clean URL after showing message
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Handle profile not found
  React.useEffect(() => {
    if (selectedHandle && selectedProfile === undefined && !profileLoading) {
      toast({
        title: 'Influencer not found',
        description: 'The requested influencer could not be found.',
        variant: 'destructive',
      });
      handleCloseProfile();
    }
  }, [selectedHandle, selectedProfile, profileLoading]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <p className="text-muted-foreground">Failed to load influencers. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Page Header */}
        <div className="max-w-6xl mx-auto px-4 pt-8 pb-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-3">
              Influencer Hub
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Follow creators and join their challenges to level up your wellness journey.
            </p>
          </div>
        </div>

        {/* Filters */}
        <InfluencerFilters value={filters} onChange={updateFilters} />

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <InfluencerList
            items={influencers}
            loading={isLoading}
            emptyHint="Try adjusting your filters to discover more influencers."
            onSelect={handleSelect}
            onToggleFollow={handleToggleFollow}
            onLoadMore={hasNextPage ? fetchNextPage : undefined}
            loadingMore={isFetchingNextPage}
          />
        </div>
        
        {/* Profile Modal/Drawer */}
        <InfluencerProfile
          open={!!selectedHandle}
          onOpenChange={(open) => !open && handleCloseProfile()}
          profile={selectedProfile}
          onToggleFollow={handleToggleFollow}
          onNotify={handleNotify}
        />
      </div>
  );
};

export default InfluencerHub;