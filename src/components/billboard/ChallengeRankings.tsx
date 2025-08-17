import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Users } from 'lucide-react';
// V2: Use Arena hooks instead of legacy useChallengeRankings
import { useArenaLeaderboardWithProfiles } from '@/hooks/useArena';
import { cn } from '@/lib/utils';
import { useFriendStatuses } from '@/hooks/useFriendStatuses';
import { useFriendActions } from '@/hooks/useFriendActions';
import { FriendCTA } from '@/components/social/FriendCTA';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useFriendRealtime } from '@/hooks/useFriendRealtime';
import { useMutualFriends } from '@/hooks/useMutualFriends';

// Legacy interface maintained for compatibility
export interface ChallengeParticipant {
  user_id: string;
  user_email: string;
  score: number;
  rank: number;
}

interface ChallengeRankingsProps {
  challengeId: string | null;
}

export const ChallengeRankings: React.FC<ChallengeRankingsProps> = ({ challengeId }) => {
  // V2: Use Arena leaderboard instead of legacy challenge rankings
  const { leaderboard, isLoading: loading } = useArenaLeaderboardWithProfiles(challengeId, 'combined');
  
  // Transform Arena leaderboard data to match legacy participant interface
  const participants = React.useMemo(() => {
    return leaderboard.map(entry => ({
      user_id: entry.user_id,
      user_email: entry.display_name || `User ${entry.user_id.slice(0, 8)}`,
      score: entry.score,
      rank: entry.rank
    }));
  }, [leaderboard]);
  
  // Feature flag for friend CTAs
  const { enabled: friendCtasEnabled } = useFeatureFlag('friend_ctas');

  // Friend status management with realtime updates
  useFriendRealtime({
    onUserIdsChanged: (userIds) => {
      // Refresh statuses for affected users if they're in our participants
      const affectedIds = userIds.filter(id => participants.some(p => p.user_id === id));
      if (affectedIds.length > 0) {
        // Trigger a re-render by updating the friend statuses
        updateStatus('__refresh__', 'none');
      }
    },
    enabled: friendCtasEnabled
  });

  // Friend management
  const participantIds = React.useMemo(() => participants.map(p => p.user_id), [participants]);
  const { statusMap, loading: statusLoading, updateStatus } = useFriendStatuses(participantIds);
  const friendActions = useFriendActions({ onStatusUpdate: updateStatus });
  
  // Mutual friends
  const { getMutualCount } = useMutualFriends(participantIds);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 2: return <Medal className="h-4 w-4 text-gray-400" />;
      case 3: return <Award className="h-4 w-4 text-amber-600" />;
      default: return <span className="text-xs font-medium text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 3: return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!challengeId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select a challenge to view rankings
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Live Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Live Rankings
          <Badge variant="outline" className="ml-auto">
            <Users className="h-3 w-3 mr-1" />
            {participants.length} members
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {participants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No participants yet
          </div>
        ) : (
          <div className="space-y-3">
            {participants.map((participant) => (
              <div
                key={participant.user_id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  participant.rank <= 3 ? "bg-gradient-to-r from-muted/30 to-transparent" : "hover:bg-muted/50"
                )}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-8">
                  {participant.rank <= 3 ? (
                    getRankIcon(participant.rank)
                  ) : (
                    <Badge variant="secondary" className={getRankBadgeColor(participant.rank)}>
                      #{participant.rank}
                    </Badge>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate text-sm">
                      {participant.user_email}
                    </p>
                    {(() => {
                      const mutualCount = getMutualCount(participant.user_id);
                      return mutualCount > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          · {mutualCount} mutual
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Participant
                  </p>
                </div>

                {/* Score and Friend CTA */}
                <div className="flex items-center gap-3">
                  {/* Friend CTA */}
                   {friendCtasEnabled && (
                     <FriendCTA
                       userId={participant.user_id}
                       relation={statusMap.get(participant.user_id)?.relation || 'none'}
                       requestId={statusMap.get(participant.user_id)?.requestId}
                       variant="compact"
                       onSendRequest={friendActions.sendFriendRequest}
                       onAcceptRequest={friendActions.acceptFriendRequest}
                       onRejectRequest={friendActions.rejectFriendRequest}
                       onCancelRequest={friendActions.cancelFriendRequest}
                       isPending={friendActions.isPending(participant.user_id)}
                       isOnCooldown={friendActions.isOnCooldown(participant.user_id)}
                       isLoading={statusLoading}
                     />
                   )}
                  
                  {/* Score */}
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">
                      {participant.score.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      points
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}