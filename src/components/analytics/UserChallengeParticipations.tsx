import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, Target, Trophy, Flame, Plus, Lock, Users } from 'lucide-react';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';
import { PrivateChallengeCreationModal } from './PrivateChallengeCreationModal';
import { PrivateChallengeCard } from './PrivateChallengeCard';

export const UserChallengeParticipations: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  
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
    loading: privateLoading
  } = usePrivateChallenges();

  const loading = publicLoading || privateLoading;

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

  // Combine all challenges into one unified list
  const allActiveChallenges = [
    // Private challenges
    ...challengesWithParticipation.map(({ participation, ...challenge }) => ({
      type: 'private',
      challenge,
      participation: participation!,
      onLeave: async (challengeId: string) => {
        console.log('Leave private challenge:', challengeId);
        return true;
      }
    })),
    // Public challenges  
    ...userParticipations.map((participation) => {
      const challenge = challenges.find(c => c.id === participation.challenge_id);
      if (!challenge) return null;
      
      const challengeType = challenge.duration_days <= 3 ? 'quick' : 'public';
      
      return {
        type: challengeType,
        challenge,
        participation,
        onLeave: async (challengeId: string) => {
          return leaveChallenge(challengeId);
        }
      };
    }).filter(Boolean)
  ];

  if (allActiveChallenges.length === 0) {
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
    <div className="space-y-4">
      {/* Challenge Cards - Stacked vertically with exact style match */}
      {allActiveChallenges.map((item) => {
        if (!item) return null;
        
        const { type, challenge, participation, onLeave } = item;
        
        const progressPercentage = type === 'private'
          ? (participation as any).completion_pct || 0
          : participation.completion_percentage || 0;

        // Get background gradient based on challenge type
        const getBackgroundGradient = () => {
          switch (type) {
            case 'private':
              return 'bg-gradient-to-br from-purple-600 to-purple-800';
            case 'quick':
              return 'bg-gradient-to-br from-orange-500 to-yellow-600';
            case 'public':
            default:
              return 'bg-gradient-to-br from-blue-600 to-purple-700';
          }
        };

        // Get type badge info
        const getTypeBadge = () => {
          switch (type) {
            case 'private':
              return { icon: '🔒', label: 'Private' };
            case 'quick':
              return { icon: '⚡', label: 'Quick' };
            case 'public':
            default:
              return { icon: '🌐', label: 'Public' };
          }
        };

        const typeBadge = getTypeBadge();
        const timeLeft = challenge.duration_days ? `${challenge.duration_days}d` : '∞';
        
        // Get challenge details
        const challengeIcon = type === 'private' 
          ? (challenge as any).emoji_icon || '🎯'
          : (challenge as any).badge_icon || '🎯';
        
        const challengeSubtitle = type === 'private'
          ? (challenge as any).challenge_type || (challenge as any).description
          : (challenge as any).goal_description || (challenge as any).description;

        const participantCount = type === 'private'
          ? (challenge as any).max_participants || 1
          : (challenge as any).participant_count || 1;

        const maxParticipants = type === 'private'
          ? (challenge as any).max_participants || 1
          : 10; // Default for public challenges

        return (
          <div key={`${type}-${challenge.id}`} className="rounded-2xl overflow-hidden shadow-lg">
            {/* Header Section - Matches second image exactly */}
            <div className={`${getBackgroundGradient()} p-4 text-white relative`}>
              {/* Top row with badges */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/20 text-white text-xs px-2 py-1 border-0">
                    {typeBadge.icon} {typeBadge.label}
                  </Badge>
                  {progressPercentage > 70 && (
                    <Badge className="bg-yellow-500/30 text-yellow-100 text-xs px-2 py-1 border-0">
                      🔥 Trending
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm opacity-90">
                  <Clock className="w-4 h-4" />
                  <span>{timeLeft}</span>
                </div>
              </div>
              
              {/* Challenge title and subtitle */}
              <div className="space-y-1">
                <h3 className="text-xl font-bold">{challenge.title} {challengeIcon}</h3>
                <p className="text-sm opacity-90">{challengeIcon} {challengeSubtitle}</p>
                {type === 'private' && (
                  <div className="flex items-center gap-1 text-xs opacity-75">
                    <span>📝</span>
                    <span>Created by {(challenge as any).creator_id === participation.user_id ? 'You' : 'Friend'} ⭐</span>
                  </div>
                )}
              </div>
            </div>

            {/* Content Section - Clean white background */}
            <div className="bg-card p-4 space-y-4">
              {/* Group Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Group Progress</span>
                  <span className="text-sm text-muted-foreground">{Math.round(progressPercentage)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{participantCount} participants / {maxParticipants}</span>
                  </div>
                  {participation.streak_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      {participation.streak_count} day streak
                    </span>
                  )}
                </div>
              </div>

              {/* Participant Avatars */}
              <div className="flex -space-x-2">
                {[1, 2, 3].slice(0, Math.min(3, participantCount)).map((i) => (
                  <div 
                    key={i}
                    className="w-10 h-10 rounded-full border-2 border-card flex items-center justify-center text-white text-sm font-bold"
                    style={{
                      background: i === 1 ? 'linear-gradient(135deg, #10b981, #059669)' : 
                                 i === 2 ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 
                                 'linear-gradient(135deg, #f59e0b, #d97706)'
                    }}
                  >
                    {i === 1 ? '⭐' : i === 2 ? '❄️' : '🔥'}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  onClick={() => {
                    if (confirm('Do you want to leave this challenge?')) {
                      onLeave(challenge.id);
                    }
                  }}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Joined
                </Button>
                
                <Button 
                  variant="outline" 
                  className="border-muted-foreground text-foreground hover:bg-muted"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Add floating create button */}
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