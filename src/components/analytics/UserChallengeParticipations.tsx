
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, Target, Trophy, Flame, Plus, Lock, Users, Share2, MessageCircle } from 'lucide-react';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';
import { PrivateChallengeCreationModal } from './PrivateChallengeCreationModal';
import { useToast } from '@/hooks/use-toast';

export const UserChallengeParticipations: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();
  
  const { 
    userParticipations, 
    challenges,
    updateProgress,
    leaveChallenge,
    loading: publicLoading 
  } = usePublicChallenges();

  const {
    challengesWithParticipation,
    updatePrivateProgress,
    loading: privateLoading,
    refreshData
  } = usePrivateChallenges();

  const loading = publicLoading || privateLoading;

  // Auto-refresh on mount to get latest data after RLS fix
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshData();
    }, 1000);
    return () => clearTimeout(timer);
  }, [refreshData]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-t-2xl h-20"></div>
            <div className="bg-card/80 backdrop-blur rounded-b-2xl p-4 space-y-3">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Separate challenges by type
  const publicChallenges = userParticipations.map((participation) => {
    const challenge = challenges.find(c => c.id === participation.challenge_id);
    if (!challenge) return null;
    
    return {
      type: challenge.duration_days <= 3 ? 'quick' : 'public',
      challenge,
      participation,
      onLeave: async (challengeId: string) => {
        return leaveChallenge(challengeId);
      }
    };
  }).filter(Boolean);

  const privateChallenges = challengesWithParticipation.map(({ participation, ...challenge }) => ({
    type: 'private',
    challenge,
    participation: participation!,
    onLeave: async (challengeId: string) => {
      console.log('Leave private challenge:', challengeId);
      return true;
    }
  }));

  const quickChallenges = publicChallenges.filter(item => item?.type === 'quick');
  const regularPublicChallenges = publicChallenges.filter(item => item?.type === 'public');

  const handleShare = (challengeName: string) => {
    const shareText = `Join me in the "${challengeName}" challenge! 💪`;
    if (navigator.share) {
      navigator.share({
        title: challengeName,
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Challenge Link Copied! 🔗",
        description: "Share this with your friends",
      });
    }
  };

  const ChallengeCard = ({ item }: { item: any }) => {
    if (!item) return null;
    
    const { type, challenge, participation, onLeave } = item;
    
    const progressPercentage = type === 'private'
      ? (participation as any).completion_percentage || 0
      : participation.completion_percentage || 0;

    // Get background gradient based on challenge type - matching reference images
    const getBackgroundGradient = () => {
      switch (type) {
        case 'private':
          return 'bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700';
        case 'quick':
          return 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600';
        case 'public':
        default:
          return 'bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600';
      }
    };

    // Get type badge info
    const getTypeBadge = () => {
      switch (type) {
        case 'private':
          return { icon: Lock, label: 'Private' };
        case 'quick':
          return { icon: Flame, label: 'Quick' };
        case 'public':
        default:
          return { icon: Users, label: 'Public' };
      }
    };

    const typeBadge = getTypeBadge();
    const timeLeft = challenge.duration_days ? `${challenge.duration_days}d` : '∞';
    
    // Get challenge details
    const challengeIcon = type === 'private' 
      ? (challenge as any).badge_icon || '🧘'
      : type === 'quick' 
        ? (challenge as any).badge_icon || '🏃'
        : (challenge as any).badge_icon || '🧘';
    
    const challengeTitle = challenge.title;
    const challengeDescription = type === 'private'
      ? (challenge as any).description
      : (challenge as any).goal_description || (challenge as any).description;

    const participantCount = type === 'private'
      ? 1 // For now, private challenges show 1 participant
      : (challenge as any).participant_count || 1;

    return (
      <div className="min-w-full px-4 scroll-snap-align-start">
        <Card className="w-full overflow-hidden bg-gray-800 border-gray-700">
          {/* Header Section with Gradient - exactly matching reference */}
          <div className={`${getBackgroundGradient()} p-4 text-white relative rounded-t-lg`}>
            {/* Type badge and time in top row */}
            <div className="flex items-center justify-between mb-3">
              <Badge className="bg-white/20 text-white border-white/30 text-xs">
                <typeBadge.icon className="w-3 h-3 mr-1" />
                {typeBadge.label}
              </Badge>
              <div className="flex items-center gap-1 text-sm">
                <Clock className="w-4 h-4" />
                <span>{timeLeft}</span>
              </div>
            </div>
            
            {/* Title with emoji */}
            <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
              {challengeIcon} {challengeTitle}
            </h3>
            
            {/* Description */}
            <p className="text-sm text-white/90">
              {challengeDescription}
            </p>
          </div>

          {/* Dark bottom section - matching reference exactly */}
          <div className="bg-gray-800 p-4 space-y-4">
            {/* Progress section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white font-medium">Your Progress</span>
                <span className="text-gray-400">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-teal-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Participants count and status */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Users className="w-4 h-4" />
                <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-400">
                <Trophy className="w-4 h-4" />
                <span>Active</span>
              </div>
            </div>

            {/* Participant avatar */}
            <div className="flex gap-2">
              <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center">
                <span className="text-lg">😊</span>
              </div>
            </div>

            {/* Action buttons - exactly matching reference */}
            <div className="flex gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => handleShare(challengeTitle)}
                className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              
              <Button 
                variant="outline"
                size="sm"
                className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </Button>

              <Button 
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm("Do you want to leave this challenge?")) {
                    onLeave(challenge.id);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Leave
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // Swipeable Carousel Section Component
  const SwipeableCarousel = ({ 
    title, 
    icon: Icon, 
    iconColor, 
    challenges 
  }: {
    title: string;
    icon: any;
    iconColor: string;
    challenges: any[];
  }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2 px-4">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          {title}
        </h2>
        
        <div className="relative">
          {/* Swipeable container with smooth scrolling */}
          <div 
            ref={scrollRef}
            className="overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <div className="flex gap-4 px-4">
              {challenges.map((item, index) => (
                <ChallengeCard key={`${title}-${index}`} item={item} />
              ))}
            </div>
          </div>

          {/* Subtle fade indicators for more cards */}
          {challenges.length > 1 && (
            <>
              {/* Left fade indicator */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-900 to-transparent pointer-events-none" />
              
              {/* Right fade indicator with peeking card edge */}
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-900 via-gray-900/80 to-transparent pointer-events-none" />
              
              {/* Scroll indicator dots */}
              <div className="flex justify-center mt-4 gap-2">
                {challenges.map((_, index) => (
                  <div 
                    key={index}
                    className="w-2 h-2 rounded-full bg-gray-600 transition-colors"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const hasAnyChallenges = privateChallenges.length > 0 || regularPublicChallenges.length > 0 || quickChallenges.length > 0;

  if (!hasAnyChallenges) {
    return (
      <div className="text-center py-12">
        <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Active Challenges</h3>
        <p className="text-muted-foreground mb-6">
          Browse public challenges or create a private one with friends!
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline">Browse Public</Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Private
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-gray-900 min-h-screen">
      {/* My Public Challenges Section */}
      {regularPublicChallenges.length > 0 && (
        <SwipeableCarousel
          title="My Public Challenges"
          icon={Users}
          iconColor="text-blue-500"
          challenges={regularPublicChallenges}
        />
      )}

      {/* My Quick Challenges Section */}
      {quickChallenges.length > 0 && (
        <SwipeableCarousel
          title="My Quick Challenges"
          icon={Flame}
          iconColor="text-orange-500"
          challenges={quickChallenges}
        />
      )}

      {/* My Private Challenges Section */}
      {privateChallenges.length > 0 && (
        <SwipeableCarousel
          title="My Private Challenges"
          icon={Lock}
          iconColor="text-purple-500"
          challenges={privateChallenges}
        />
      )}

      {/* Floating Create Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 shadow-lg"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Creation Modal */}
      <PrivateChallengeCreationModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};
