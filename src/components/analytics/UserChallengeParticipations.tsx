
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, Target, Trophy, Flame, Plus, Lock, Users, Share2, MessageCircle, Zap } from 'lucide-react';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { useMyActivePrivateChallenges } from '@/hooks/challenges/useMyActivePrivateChallenges';
import { PrivateChallengeCreationModal } from './PrivateChallengeCreationModal';
import { PrivateRecoveryChallenges } from './PrivateRecoveryChallenges';
import { useToast } from '@/hooks/use-toast';
import { useChatStore } from '@/store/chatStore';
import { filterByArenaSection, type ArenaSection } from '@/lib/arenaSections';

interface UserChallengeParticipationsProps {
  challengeMode?: ArenaSection;
}

export const UserChallengeParticipations: React.FC<UserChallengeParticipationsProps> = ({ 
  challengeMode = 'combined' 
}) => {
  // Move ALL hooks to the top level
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();
  const { selectChatroom } = useChatStore();
  
  const { 
    userParticipations, 
    challenges,
    updateProgress,
    leaveChallenge,
    loading: publicLoading 
  } = usePublicChallenges();

  // Use the new dedicated hook for active private challenges (excludes rank_of_20)
  const { items: activePrivateChallenges, isLoading: privateLoading } = useMyActivePrivateChallenges();

  const loading = publicLoading || privateLoading;

  // Remove auto-refresh since we're now using RPC
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     refreshData();
  //   }, 1000);
  //   return () => clearTimeout(timer);
  // }, [refreshData]);

  // Define the loading UI component - but don't return early
  const LoadingUI = () => (
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

  // Process all user participations and categorize them properly
  const allPublicChallenges = userParticipations.map((participation) => {
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

  const privateChallenges = activePrivateChallenges.map(challenge => ({
    type: 'private',
    challenge,
    participation: { completion_percentage: 0 }, // Mock participation for now
    onLeave: async (challengeId: string) => {
      console.log('Leave private challenge:', challengeId);
      return true;
    }
  }));

  // Filter challenges based on challenge mode
  const filterChallengesByMode = (challengeList: any[]) => {
    if (challengeMode === 'combined') return challengeList;
    
    return challengeList.filter(item => {
      if (!item?.challenge) return false;
      
      if (challengeMode === 'recovery') {
        return ['meditation', 'breathing', 'yoga', 'sleep', 'thermotherapy'].includes(item.challenge.category);
      }
      
      return item.challenge.category === challengeMode;
    });
  };

  // Separate by type and apply filters
  const quickChallenges = filterChallengesByMode(allPublicChallenges.filter(item => item?.type === 'quick'));
  const regularPublicChallenges = filterChallengesByMode(allPublicChallenges.filter(item => item?.type === 'public'));
  const filteredPrivateChallenges = filterChallengesByMode(privateChallenges);
  
  // Log filtering results
  React.useEffect(() => {
    const totalChallenges = allPublicChallenges.length + privateChallenges.length;
    const filteredTotal = quickChallenges.length + regularPublicChallenges.length + filteredPrivateChallenges.length;
    console.log('[MyChallenges] section:', challengeMode, 'filtered:', filteredTotal, 'total:', totalChallenges);
  }, [challengeMode, allPublicChallenges, privateChallenges, quickChallenges, regularPublicChallenges, filteredPrivateChallenges]);

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

    const handleChatFromMyCard = () => {
      console.info('[chat] open from my card', challenge.id);
      selectChatroom(challenge.id);
      window.dispatchEvent(new CustomEvent('switch-to-chat-tab', {
        detail: { challengeId: challenge.id }
      }));
    };

    return (
      <Card className="w-full overflow-hidden bg-card/50 backdrop-blur-xl border border-border/30 shadow-2xl hover:shadow-3xl transition-all duration-300 mb-4">
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
        <div className="bg-card/80 backdrop-blur-xl p-6 space-y-5">
          {/* Progress section with improved visibility */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground font-semibold">Your Progress</span>
              <span className="text-emerald-600 font-bold">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-full h-3 overflow-hidden border border-emerald-300/30">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500 ease-out shadow-lg relative"
                style={{ 
                  width: progressPercentage > 0 ? `${progressPercentage}%` : '8%',
                  minWidth: '8%',
                  opacity: progressPercentage > 0 ? 1 : 0.6
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full animate-pulse opacity-50"></div>
              </div>
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
                onClick={handleChatFromMyCard}
                data-testid={`my-chat-${challenge.id}`}
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
     );
   };

  // Vertical Stack Section Component
  const VerticalStack = ({ 
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
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold flex items-center justify-center gap-2 px-4">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          {title}
        </h2>
        
        <div className="space-y-6 px-4">
          {challenges.map((item, index) => (
            <ChallengeCard key={`${title}-${index}`} item={item} />
          ))}
        </div>
      </div>
    );
  };

  const hasAnyChallenges = filteredPrivateChallenges.length > 0 || regularPublicChallenges.length > 0 || quickChallenges.length > 0;

  // Define empty state UI component
  const EmptyStateUI = () => (
    <div className="text-center py-12">
      <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">
        {challengeMode === 'recovery' ? 'No Active Recovery Challenges' : 'No Active Challenges'}
      </h3>
      <p className="text-muted-foreground mb-6">
        {challengeMode === 'recovery' 
          ? 'Join recovery challenges for meditation, breathing, yoga, sleep, and thermotherapy!'
          : 'Browse public challenges or create a private one with friends!'
        }
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

  // Render different content based on state, but always show the same structure
  if (loading) {
    return <LoadingUI />;
  }

  if (!hasAnyChallenges) {
    return <EmptyStateUI />;
  }

  // If challenge mode is recovery, show specialized component
  if (challengeMode === 'recovery') {
    return <PrivateRecoveryChallenges />;
  }

  return (
    <div className="space-y-6">
      {/* Create Challenge Button - Centered */}
      <div className="flex justify-center">
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg px-6 py-2"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Challenge
        </Button>
      </div>
      
      <div className="space-y-8 min-h-screen">

      {/* My Public Challenges Section */}
      {regularPublicChallenges.length > 0 && (
        <VerticalStack
          title="My Public Challenges"
          icon={Users}
          iconColor="text-blue-500"
          challenges={regularPublicChallenges}
        />
      )}

      {/* My Quick Challenges Section */}
      {quickChallenges.length > 0 && (
        <VerticalStack
          title="My Quick Challenges"
          icon={Flame}
          iconColor="text-orange-500"
          challenges={quickChallenges}
        />
      )}

      {/* My Private Challenges Section */}
      {filteredPrivateChallenges.length > 0 && (
        <VerticalStack
          title="My Private Challenges"
          icon={Lock}
          iconColor="text-purple-500"
          challenges={filteredPrivateChallenges}
        />
      )}

      {/* Private Challenge Creation Modal */}
      <PrivateChallengeCreationModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      </div>
    </div>
  );
};

export default UserChallengeParticipations;