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
          <div key={`${type}-${challenge.id}`} className="w-full max-w-sm mx-auto">
            <div className="bg-card rounded-2xl overflow-hidden shadow-lg">
              {/* Header Section - Purple gradient like reference */}
              <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 p-4 text-white">
                {/* Top badges row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-white/20 backdrop-blur rounded-full px-2 py-1 flex items-center gap-1">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      <span className="text-xs font-medium">{typeBadge.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm opacity-80">
                    <Clock className="w-4 h-4" />
                    <span>{timeLeft}</span>
                  </div>
                </div>
                
                {/* Title and subtitle */}
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">{challenge.title} {challengeIcon}</h3>
                  <p className="text-sm opacity-90">{challengeIcon} {challengeSubtitle}</p>
                  <div className="flex items-center gap-1 text-xs opacity-75 mt-1">
                    <span>📅</span>
                    <span>Created by {type === 'private' && (challenge as any).creator_id === participation.user_id ? 'You' : 'Health Guru'} 😊</span>
                  </div>
                </div>
              </div>

              {/* Content Section - Dark background matching reference */}
              <div className="bg-slate-800 text-white p-4 space-y-4">
                {/* Group Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">Group Progress</span>
                    <span className="text-sm text-slate-300">{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-teal-400 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Participants count */}
                <div className="flex items-center gap-1 text-sm text-slate-300">
                  <Users className="w-4 h-4" />
                  <span>{participantCount} participants</span>
                </div>

                {/* Participant Avatars - Matching reference layout */}
                <div className="flex gap-2">
                  {[1, 2].slice(0, Math.min(2, participantCount)).map((i) => (
                    <div 
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-slate-700 flex items-center justify-center text-white text-sm font-bold"
                      style={{
                        background: i === 1 ? 'linear-gradient(135deg, #10b981, #059669)' : 
                                   'linear-gradient(135deg, #f59e0b, #d97706)'
                      }}
                    >
                      {i === 1 ? '😊' : '🔥'}
                    </div>
                  ))}
                </div>

                {/* Action Buttons - Matching reference exact style */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-full text-sm py-2 h-9"
                    onClick={() => {
                      // Invite functionality
                    }}
                  >
                    📨 Invite
                  </Button>
                  
                  <Button 
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-full text-sm py-2 h-9"
                    onClick={() => {
                      if (confirm("Do you want to leave this challenge?")) {
                        onLeave(challenge.id);
                      }
                    }}
                  >
                    💬 Chat
                  </Button>
                </div>
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