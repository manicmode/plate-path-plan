import React, { useState, useMemo } from 'react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { InfluencerFilters } from '@/components/influencers/InfluencerFilters';
import { InfluencerList } from '@/components/influencers/InfluencerList';
import type { InfluencerPreview, InfluencerFilters as FilterType } from '@/components/influencers/types';

// Dummy data for development
const DUMMY_INFLUENCERS: InfluencerPreview[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    handle: 'sarahfitness',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face',
    tagline: 'Helping you build strength and confidence through sustainable fitness habits',
    verified: true,
    followerCount: 125000,
    nextChallengeStart: '2024-02-15T09:00:00Z',
    niches: ['Fitness', 'Strength Training', 'Mental Health']
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    handle: 'marcusnutrition',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    tagline: 'Plant-based nutrition coach transforming lives one meal at a time',
    verified: true,
    followerCount: 89500,
    nextChallengeStart: '2024-02-20T08:00:00Z',
    niches: ['Nutrition', 'Plant-Based', 'Wellness']
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
    niches: ['Mindfulness', 'Meditation', 'Stress Relief']
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
    niches: ['Recovery', 'Sports Medicine', 'Performance']
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
    niches: ['Yoga', 'Flexibility', 'Mindfulness']
  },
  {
    id: '6',
    name: 'David Kim',
    handle: 'davidhiit',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    tagline: 'HIIT specialist making fitness accessible and fun for everyone',
    verified: true,
    followerCount: 198000,
    nextChallengeStart: '2024-02-18T10:00:00Z',
    niches: ['HIIT', 'Cardio', 'Fat Loss']
  },
  {
    id: '7',
    name: 'Maya Patel',
    handle: 'mayawellness',
    avatarUrl: 'https://images.unsplash.com/photo-1559548331-f9cb98001426?w=150&h=150&fit=crop&crop=face',
    tagline: 'Holistic wellness coach integrating nutrition, movement, and mental health',
    verified: false,
    followerCount: 67200,
    nextChallengeStart: '2024-02-22T09:30:00Z',
    niches: ['Holistic Health', 'Nutrition', 'Lifestyle']
  },
  {
    id: '8',
    name: 'Jake Wilson',
    handle: 'jakestrongman',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face',
    tagline: 'Strength athlete sharing the journey to becoming your strongest self',
    verified: true,
    followerCount: 234000,
    nextChallengeStart: '2024-02-14T11:00:00Z',
    niches: ['Strength Training', 'Powerlifting', 'Motivation']
  },
  {
    id: '9',
    name: 'Sophia Rodriguez',
    handle: 'sophiamindful',
    avatarUrl: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face',
    tagline: 'Mindfulness coach helping busy professionals find balance and clarity',
    verified: false,
    followerCount: 28900,
    nextChallengeStart: '2024-02-28T08:00:00Z',
    niches: ['Mindfulness', 'Work-Life Balance', 'Productivity']
  },
  {
    id: '10',
    name: 'Tyler Brooks',
    handle: 'tylerrecovery',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&h=150&fit=crop&crop=face',
    tagline: 'Recovery and mobility expert helping you move better and feel stronger',
    verified: true,
    followerCount: 112000,
    nextChallengeStart: '2024-02-16T07:30:00Z',
    niches: ['Mobility', 'Recovery', 'Injury Prevention']
  },
  {
    id: '11',
    name: 'Ava Martinez',
    handle: 'avanutrition',
    avatarUrl: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=150&h=150&fit=crop&crop=face',
    tagline: 'Registered dietitian making nutrition simple and sustainable for real life',
    verified: true,
    followerCount: 93700,
    nextChallengeStart: '2024-02-21T09:00:00Z',
    niches: ['Nutrition', 'Meal Planning', 'Health Education']
  },
  {
    id: '12',
    name: 'Ryan Foster',
    handle: 'ryanfunctional',
    avatarUrl: 'https://images.unsplash.com/photo-1507919962325-9e5f24b1e495?w=150&h=150&fit=crop&crop=face',
    tagline: 'Functional movement specialist bringing real-world strength to everyone',
    verified: false,
    followerCount: 41500,
    nextChallengeStart: '2024-02-26T10:30:00Z',
    niches: ['Functional Training', 'Movement', 'Athletic Performance']
  }
];

const InfluencersPage = () => {
  useScrollToTop();

  const [filters, setFilters] = useState<FilterType>({
    query: '',
    category: 'all',
    sort: 'trending',
    verifiedOnly: false
  });

  const [loading] = useState(false); // TODO: Replace with actual loading state

  // Client-side filtering and sorting logic
  const filteredInfluencers = useMemo(() => {
    let result = [...DUMMY_INFLUENCERS];

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
        mindfulness: ['Mindfulness', 'Meditation', 'Stress Relief', 'Work-Life Balance', 'Yoga'],
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
  }, [filters]);

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
        />
      </div>
    </div>
  );
};

export default InfluencersPage;