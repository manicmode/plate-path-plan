import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Lock, 
  Clock, 
  Crown,
  MessageCircle,
  Target,
  Plus,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';
import { useChatModal } from '@/contexts/ChatModalContext';
import { ChallengeCreationModal } from './ChallengeCreationModal';

export const PrivateChallengesFeed: React.FC = () => {
  const { 
    privateChallenges,
    userActiveChallenges,
    challengesWithParticipation,
    loading,
    updatePrivateProgress
  } = usePrivateChallenges();
  
  const { setIsChatModalOpen } = useChatModal();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const navigate = useNavigate();
  const handleChatClick = (challengeId: string, challengeTitle: string) => {
    console.info('[Billboard] nav: type=private id=' + challengeId);
    navigate(`/game-and-challenge?tab=billboard&type=private&private_challenge_id=${challengeId}`);
  };

  const handleProgressUpdate = async (challengeId: string) => {
    setLoadingStates(prev => ({ ...prev, [challengeId]: true }));
    try {
      await updatePrivateProgress(challengeId, 10); // Example progress value
    } finally {
      setLoadingStates(prev => ({ ...prev, [challengeId]: false }));
    }
  };

  const handleChallengeCreated = () => {
    setShowCreateModal(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  // Remove error handling since it's not available in the hook

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Private Challenges</h2>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Private
        </Button>
      </div>

      {/* Empty State */}
      {challengesWithParticipation.length === 0 ? (
        <div className="text-center py-12">
          <Lock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Private Challenges</h3>
          <p className="text-muted-foreground mb-6">
            Create a private challenge to compete with friends and family!
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Private Challenge
          </Button>
        </div>
      ) : (
        /* Challenges Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challengesWithParticipation.map((challenge, index) => {
            const isLoading = loadingStates[challenge.id];
            const participation = challenge.participation;
            const isCreator = participation?.is_creator;

            return (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2 mb-2">
                          {challenge.badge_icon && (
                            <span className="mr-2">{challenge.badge_icon}</span>
                          )}
                          {challenge.title}
                        </CardTitle>
                        {challenge.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {challenge.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 ml-3">
                        {isCreator && (
                          <Badge variant="secondary" className="text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            Creator
                          </Badge>
                        )}
                        <Badge variant={getStatusColor(challenge.status)} className="text-xs">
                          {challenge.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Challenge Info */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{challenge.max_participants} max</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{challenge.duration_days}d</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(challenge.start_date)}</span>
                        </div>
                      </div>

                      {/* Progress (if participating) */}
                      {participation && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progress</span>
                            <span className="font-medium">{participation.completion_percentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(participation.completion_percentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{participation.completed_days} days completed</span>
                            <span>{participation.streak_count} day streak</span>
                          </div>
                        </div>
                      )}

                      {/* Challenge Details */}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          {challenge.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {challenge.challenge_type}
                        </Badge>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleChatClick(challenge.id, challenge.title)}
                          className="flex-1"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Billboard & Chat
                        </Button>
                        {participation && challenge.status === 'active' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleProgressUpdate(challenge.id)}
                            disabled={isLoading}
                            className="flex-1"
                          >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            {isLoading ? 'Updating...' : 'Log Progress'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Challenge Modal */}
      <ChallengeCreationModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        defaultVisibility="private"
        onChallengeCreated={handleChallengeCreated}
      />
    </div>
  );
};