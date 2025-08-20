import React, { useState, useMemo } from 'react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { InfluencerFilters } from '@/components/influencers/InfluencerFilters';
import { InfluencerList } from '@/components/influencers/InfluencerList';
import { InfluencerProfile } from '@/components/influencers/InfluencerProfile';
import type { InfluencerPreview, InfluencerProfile as ProfileType, InfluencerFilters as FilterType } from '@/components/influencers/types';

// Dummy data for development
const DUMMY_INFLUENCERS: InfluencerPreview[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    handle: 'sarahfitness',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face',
    bannerUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop',
    tagline: 'Helping you build strength and confidence through sustainable fitness habits',
    verified: true,
    followerCount: 125000,
    nextChallengeStart: '2024-02-15T09:00:00Z',
    niches: ['Fitness', 'Strength Training', 'Mental Health'],
    isFollowing: false
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    handle: 'marcusnutrition',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    bannerUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=400&fit=crop',
    tagline: 'Plant-based nutrition coach transforming lives one meal at a time',
    verified: true,
    followerCount: 89500,
    nextChallengeStart: '2024-02-20T08:00:00Z',
    niches: ['Nutrition', 'Plant-Based', 'Wellness'],
    isFollowing: false
  },
  {
    id: '3',
    name: 'Luna Meditation',
    handle: 'lunaminds',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    tagline: 'Mindfulness teacher bringing peace to busy minds worldwide',
    verified: false,
    followerCount: 47800,
    nextChallengeStart: '2024-02-12T07:00:00Z',
    niches: ['Mindfulness', 'Meditation', 'Stress Relief'],
    isFollowing: false
  },
  {
    id: '4',
    name: 'Alex Rivera',
    handle: 'alexrecovery',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    tagline: 'Recovery specialist helping athletes optimize performance and prevent injury',
    verified: true,
    followerCount: 156000,
    nextChallengeStart: null,
    niches: ['Recovery', 'Sports Medicine', 'Performance'],
    isFollowing: false
  },
  {
    id: '5',
    name: 'Emma Thompson',
    handle: 'emmayoga',
    avatarUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
    tagline: 'Yoga instructor combining ancient wisdom with modern wellness approaches',
    verified: false,
    followerCount: 32100,
    nextChallengeStart: '2024-02-25T06:30:00Z',
    niches: ['Yoga', 'Flexibility', 'Mindfulness'],
    isFollowing: false
  }
];

// Dummy profiles data matching the influencers list
const DUMMY_PROFILES: Record<string, ProfileType> = {
  '1': {
    id: '1',
    name: 'Sarah Chen',
    handle: 'sarahfitness',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face',
    bannerUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop',
    tagline: 'Helping you build strength and confidence through sustainable fitness habits',
    verified: true,
    followerCount: 125000,
    nextChallengeStart: '2024-02-15T09:00:00Z',
    niches: ['Fitness', 'Strength Training', 'Mental Health'],
    isFollowing: false,
    bio: 'Certified personal trainer with 8+ years helping people transform their relationship with fitness. I believe in sustainable habits over quick fixes, and I\'m here to support you every step of the way.',
    socials: {
      instagram: 'sarahfitness',
      youtube: 'https://youtube.com/sarahfitness',
      website: 'https://sarahfitness.com'
    },
    stats: {
      totalFollowers: 125000,
      totalParticipants: 15000,
      challengesHosted: 24
    },
    highlights: [
      'Focus on compound movements for maximum efficiency',
      'Rest days are just as important as workout days',
      'Progress photos beat scale weight every time'
    ],
    challenges: {
      live: [{
        id: 'sarah-strength-1',
        title: '30-Day Strength Foundation',
        bannerUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=300&fit=crop',
        startAt: '2024-02-01T09:00:00Z',
        endAt: '2024-03-02T09:00:00Z',
        status: 'live',
        isPaid: false,
        spotsLeft: 45
      }],
      upcoming: [{
        id: 'sarah-hiit-1',
        title: 'HIIT & Core Blast Challenge',
        bannerUrl: 'https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=600&h=300&fit=crop',
        startAt: '2024-02-15T09:00:00Z',
        endAt: '2024-03-15T09:00:00Z',
        status: 'upcoming',
        isPaid: true,
        priceCents: 2999,
        spotsLeft: 100
      }]
    }
  },
  '2': {
    id: '2',
    name: 'Marcus Johnson',
    handle: 'marcusnutrition',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    bannerUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=400&fit=crop',
    tagline: 'Plant-based nutrition coach transforming lives one meal at a time',
    verified: true,
    followerCount: 89500,
    nextChallengeStart: '2024-02-20T08:00:00Z',
    niches: ['Nutrition', 'Plant-Based', 'Wellness'],
    isFollowing: false,
    bio: 'Registered dietitian specializing in plant-based nutrition. I help people transition to healthier eating patterns without sacrifice or restriction. Real food, real results.',
    socials: {
      instagram: 'marcusnutrition',
      tiktok: 'marcusnutrition',
      website: 'https://plantbasedwithmarcus.com'
    },
    stats: {
      totalFollowers: 89500,
      totalParticipants: 12500,
      challengesHosted: 18
    },
    highlights: [
      'Meal prep is the key to consistent nutrition',
      'Plants provide all the protein you need when done right',
      'Focus on adding foods, not restricting them'
    ],
    challenges: {
      live: [],
      upcoming: [{
        id: 'marcus-plant-1',
        title: '21-Day Plant-Based Reset',
        bannerUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=300&fit=crop',
        startAt: '2024-02-20T08:00:00Z',
        endAt: '2024-03-13T08:00:00Z',
        status: 'upcoming',
        isPaid: true,
        priceCents: 4999,
        spotsLeft: 75
      }]
    }
  }
  // TODO: Add more profiles for remaining influencers
};

const InfluencersPage = () => {
  useScrollToTop();

  const [filters, setFilters] = useState<FilterType>({
    query: '',
    category: 'all',
    sort: 'trending',
    verifiedOnly: false
  });

  const [loading] = useState(false); // TODO: Replace with actual loading state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<InfluencerPreview[]>(DUMMY_INFLUENCERS);
  
  const selectedProfile = selectedId ? DUMMY_PROFILES[selectedId] : null;

  const handleSelect = (id: string) => setSelectedId(id);
  
  const handleToggleFollow = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isFollowing: !item.isFollowing } : item
    ));
  };
  
  const handleNotify = (challengeId: string) => {
    console.log('Notify requested for challenge:', challengeId);
  };

  // Client-side filtering and sorting logic
  const filteredInfluencers = useMemo(() => {
    let result = [...items];

    // Apply search filter
    if (filters.query.trim()) {
      const searchTerm = filters.query.toLowerCase();
      result = result.filter(influencer =>
        influencer.name.toLowerCase().includes(searchTerm) ||
        influencer.handle.toLowerCase().includes(searchTerm) ||
        influencer.tagline?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply category filter
    if (filters.category !== 'all') {
      const categoryMap = {
        fitness: ['Fitness', 'Strength Training', 'HIIT', 'Cardio', 'Fat Loss', 'Powerlifting', 'Functional Training'],
        nutrition: ['Nutrition', 'Plant-Based', 'Meal Planning', 'Health Education'],
        mindfulness: ['Mindfulness', 'Meditation', 'Stress Relief', 'Work-Life Balance', 'Yoga', 'Flexibility'],
        recovery: ['Recovery', 'Sports Medicine', 'Performance', 'Mobility', 'Injury Prevention']
      };
      
      const relevantNiches = categoryMap[filters.category] || [];
      result = result.filter(influencer =>
        influencer.niches?.some(niche => relevantNiches.includes(niche))
      );
    }

    // Apply verified filter
    if (filters.verifiedOnly) {
      result = result.filter(influencer => influencer.verified);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (filters.sort) {
        case 'followers':
          return (b.followerCount || 0) - (a.followerCount || 0);
        case 'upcoming':
          // Sort by next challenge date (upcoming first)
          if (!a.nextChallengeStart && !b.nextChallengeStart) return 0;
          if (!a.nextChallengeStart) return 1;
          if (!b.nextChallengeStart) return -1;
          return new Date(a.nextChallengeStart).getTime() - new Date(b.nextChallengeStart).getTime();
        case 'new':
          // For now, sort by reverse follower count as a proxy for "new"
          return (a.followerCount || 0) - (b.followerCount || 0);
        case 'trending':
        default:
          // Mix of followers and having upcoming challenges
          const aScore = (a.followerCount || 0) + (a.nextChallengeStart ? 50000 : 0);
          const bScore = (b.followerCount || 0) + (b.nextChallengeStart ? 50000 : 0);
          return bScore - aScore;
      }
    });

    return result;
  }, [filters, items]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Page Header */}
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Discover Influencers
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Follow creators and join their challenges to level up your wellness journey.
          </p>
        </div>
      </div>

      {/* Filters */}
      <InfluencerFilters value={filters} onChange={setFilters} />

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <InfluencerList
          items={filteredInfluencers}
          loading={loading}
          emptyHint="Try adjusting your filters to discover more influencers."
          onSelect={handleSelect}
          onToggleFollow={handleToggleFollow}
        />
      </div>
      
      {/* Profile Modal/Drawer */}
      <InfluencerProfile
        open={!!selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
        profile={selectedProfile}
        onToggleFollow={handleToggleFollow}
        onNotify={handleNotify}
      />
    </div>
  );
};

export default InfluencersPage;