
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, Target, Trophy, Flame, Plus, Lock, Users, Share2, MessageCircle, Zap } from 'lucide-react';
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

    // Get modern background gradient with glassmorphism
    const getBackgroundGradient = () => {
      switch (type) {
        case 'private':
          return 'bg-gradient-to-br from-purple-500/30 via-purple-600/25 to-purple-700/20 backdrop-blur-xl border border-purple-300/20';
        case 'quick':
          return 'bg-gradient-to-br from-orange-400/30 via-orange-500/25 to-orange-600/20 backdrop-blur-xl border border-orange-300/20';
        case 'public':
        default:
          return 'bg-gradient-to-br from-blue-500/30 via-blue-600/25 to-purple-600/20 backdrop-blur-xl border border-blue-300/20';
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
        <Card className="w-full overflow-hidden bg-card/50 backdrop-blur-xl border border-border/30 shadow-2xl hover:shadow-3xl transition-all duration-300 h-80">
          {/* Header Section with Gradient - modern glassmorphism design */}
          <div className={`${getBackgroundGradient()} p-6 text-white relative rounded-t-2xl h-32`}>
            {/* Type badge and time in top row */}
            <div className="flex items-center justify-between mb-4">
              <Badge className="bg-white/25 text-white border-white/40 text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                <typeBadge.icon className="w-3 h-3 mr-1" />
                {typeBadge.label}
              </Badge>
              <div className="flex items-center gap-2 text-sm bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{timeLeft}</span>
              </div>
            </div>
            
            {/* Title with emoji */}
            <h3 className="text-xl font-bold flex items-center gap-3 mb-2">
              <span className="text-2xl">{challengeIcon}</span>
              <span className="truncate">{challengeTitle}</span>
            </h3>
            
            {/* Description */}
            <p className="text-sm text-white/95 line-clamp-2">
              {challengeDescription}
            </p>
          </div>

          {/* Modern bottom section with glassmorphism */}
          <div className="bg-card/80 backdrop-blur-xl p-6 space-y-5 h-48">
            {/* Progress section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-semibold">Your Progress</span>
                <span className="text-muted-foreground font-medium">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-muted/40 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Participants count and status */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="font-medium">{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <Trophy className="w-4 h-4" />
                <span className="font-semibold">Active</span>
              </div>
            </div>

            {/* Participant avatar */}
            <div className="flex gap-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <span className="text-xl">😊</span>
              </div>
            </div>

            {/* Action buttons - modern design with better spacing */}
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => handleShare(challengeTitle)}
                className="flex-1 bg-muted/50 border-border/50 hover:bg-muted/70 transition-all duration-200"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              
              <Button 
                variant="outline"
                size="sm"
                className="flex-1 bg-muted/50 border-border/50 hover:bg-muted/70 transition-all duration-200"
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
                className="bg-red-500/80 hover:bg-red-500 backdrop-blur-sm transition-all duration-200"
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
      <div className="space-y-6">
        <h2 className="text-xl font-bold flex items-center justify-center gap-2 px-4">
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
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
              
              {/* Right fade indicator with peeking card edge */}
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background via-background/80 to-transparent pointer-events-none z-10" />
              
              {/* Scroll indicator dots */}
              <div className="flex justify-center mt-4 gap-2">
                {challenges.map((_, index) => (
                  <div 
                    key={index}
                    className="w-2 h-2 rounded-full bg-muted-foreground/40 transition-colors"
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
    <div className="space-y-8 min-h-screen">
      {/* Centered Create Challenge Button */}
      <div className="flex justify-center pt-4 pb-2">
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white px-8 py-4 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create New Challenge
        </Button>
      </div>

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
