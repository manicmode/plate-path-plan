
import React, { useState, useEffect } from 'react';
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

    // Get background gradient based on challenge type
    const getBackgroundGradient = () => {
      switch (type) {
        case 'private':
          return 'bg-gradient-to-br from-purple-500 to-purple-700';
        case 'quick':
          return 'bg-gradient-to-br from-orange-500 to-yellow-600';
        case 'public':
        default:
          return 'bg-gradient-to-br from-blue-500 to-blue-700';
      }
    };

    // Get type badge info
    const getTypeBadge = () => {
      switch (type) {
        case 'private':
          return { icon: Lock, label: 'Private', bgColor: 'bg-purple-500/20' };
        case 'quick':
          return { icon: Flame, label: 'Quick', bgColor: 'bg-orange-500/20' };
        case 'public':
        default:
          return { icon: Users, label: 'Public', bgColor: 'bg-blue-500/20' };
      }
    };

    const typeBadge = getTypeBadge();
    const timeLeft = challenge.duration_days ? `${challenge.duration_days}d` : '∞';
    
    // Get challenge details
    const challengeIcon = type === 'private' 
      ? (challenge as any).badge_icon || '🎯'
      : (challenge as any).badge_icon || '🎯';
    
    const challengeTitle = challenge.title;
    const challengeDescription = type === 'private'
      ? (challenge as any).description
      : (challenge as any).goal_description || (challenge as any).description;

    const participantCount = type === 'private'
      ? 1 // For now, private challenges show 1 participant
      : (challenge as any).participant_count || 1;

    return (
      <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
        {/* Header Section with Gradient */}
        <CardHeader className={`${getBackgroundGradient()} p-6 text-white relative`}>
          {/* Trending badge */}
          {(challenge as any).is_trending && (
            <div className="absolute top-4 right-4">
              <Badge className="bg-yellow-500 text-yellow-900 font-bold animate-pulse">
                🔥 Trending
              </Badge>
            </div>
          )}

          {/* Top badges row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge className={`${typeBadge.bgColor} text-white border-white/20`}>
                <typeBadge.icon className="w-3 h-3 mr-1" />
                {typeBadge.label}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-sm opacity-90">
              <Clock className="w-4 h-4" />
              <span>{timeLeft}</span>
            </div>
          </div>
          
          {/* Title and description */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span>{challengeIcon}</span>
              {challengeTitle}
            </h3>
            <p className="text-sm opacity-90 leading-relaxed">
              {challengeDescription}
            </p>
          </div>
        </CardHeader>

        {/* Content Section */}
        <CardContent className="p-6 space-y-4">
          {/* Progress Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your Progress</span>
              <span className="text-sm text-muted-foreground font-bold">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-3"
            />
          </div>

          {/* Participants section */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
            </div>
            {type !== 'private' && (
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span>Active</span>
              </div>
            )}
          </div>

          {/* Participant Avatars */}
          <div className="flex gap-2">
            {[...Array(Math.min(3, participantCount))].map((_, i) => (
              <div 
                key={i}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-bold border-2 border-background"
              >
                {i === 0 ? '😊' : i === 1 ? '🔥' : '💪'}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => handleShare(challengeTitle)}
              className="flex-1"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            
            <Button 
              variant="outline"
              size="sm"
              className="flex-1"
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
            >
              Leave
            </Button>
          </div>
        </CardContent>
      </Card>
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
    <div className="space-y-8">
      {/* Friend Challenges Section */}
      {privateChallenges.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-500" />
              Friend Challenges
            </h2>
            <Badge variant="secondary">{privateChallenges.length}</Badge>
          </div>
          <div className="grid gap-4">
            {privateChallenges.map((item, index) => (
              <ChallengeCard key={`private-${index}`} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Public Challenges Section */}
      {regularPublicChallenges.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              My Public Challenges
            </h2>
            <Badge variant="secondary">{regularPublicChallenges.length}</Badge>
          </div>
          <div className="grid gap-4">
            {regularPublicChallenges.map((item, index) => (
              <ChallengeCard key={`public-${index}`} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Challenges Section */}
      {quickChallenges.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              My Quick Challenges
            </h2>
            <Badge variant="secondary">{quickChallenges.length}</Badge>
          </div>
          <div className="grid gap-4">
            {quickChallenges.map((item, index) => (
              <ChallengeCard key={`quick-${index}`} item={item} />
            ))}
          </div>
        </div>
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
