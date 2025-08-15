import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Globe, 
  Lock, 
  Clock, 
  Crown, 
  UserCheck,
  Plus,
  MessageCircle,
  Target
} from 'lucide-react';
import { useMyChallenges } from '@/hooks/useMyChallenges';
import { useChatModal } from '@/contexts/ChatModalContext';
import { ChallengeCreationModal } from './ChallengeCreationModal';


export const MyChallengesFeed: React.FC = () => {
  const { data: challenges, isLoading, error, refresh } = useMyChallenges();
  const { setIsChatModalOpen } = useChatModal();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const navigate = useNavigate();
  const handleChatClick = (challengeId: string, challengeTitle: string) => {
    console.info('[Billboard] nav: type=private id=' + challengeId);
    navigate(`/game-and-challenge?tab=billboard&type=private&private_challenge_id=${challengeId}`);
  };

  const handleChallengeCreated = () => {
    setShowCreateModal(false);
    refresh();
  };

  if (isLoading) {
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

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">Error: {error.message}</p>
        <Button onClick={refresh}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">My Challenges</h2>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create New
        </Button>
      </div>

      {/* Empty State */}
      {challenges.length === 0 ? (
        <div className="text-center py-12">
          <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Active Challenges</h3>
          <p className="text-muted-foreground mb-6">
            Create your first challenge or join an existing one to get started!
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Challenge
            </Button>
          </div>
        </div>
      ) : (
        /* Challenges Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map((challenge, index) => (
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
                        {challenge.cover_emoji && (
                          <span className="mr-2">{challenge.cover_emoji}</span>
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
                      {challenge.user_role === 'owner' && (
                        <Badge variant="secondary" className="text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Owner
                        </Badge>
                      )}
                      <Badge 
                        variant={challenge.visibility === 'public' ? 'default' : 'outline'} 
                        className="text-xs"
                      >
                        {challenge.visibility === 'public' ? (
                          <Globe className="h-3 w-3 mr-1" />
                        ) : (
                          <Lock className="h-3 w-3 mr-1" />
                        )}
                        {challenge.visibility}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{challenge.participant_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{challenge.duration_days}d</span>
                      </div>
                      {challenge.category && (
                        <Badge variant="outline" className="text-xs">
                          {challenge.category}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleChatClick(challenge.id, challenge.title)}
                      className="flex-1"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Billboard & Chat
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Challenge Modal */}
      <ChallengeCreationModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        defaultVisibility="public"
        onChallengeCreated={handleChallengeCreated}
      />
    </div>
  );
};