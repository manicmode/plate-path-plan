import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Globe, 
  Lock, 
  Clock, 
  Crown, 
  MessageCircle,
  UserPlus,
  UserMinus,
  Copy
} from 'lucide-react';
import { MyChallenge } from '@/hooks/useMyChallenges';
import { useToast } from '@/hooks/use-toast';
import { ChallengeChatModal } from './ChallengeChatModal';
import { useChatStore } from '@/store/chatStore';

interface ChallengeCardProps {
  challenge: MyChallenge | any; // Support both challenge types
  isParticipating?: boolean;
  onJoin?: (challengeId: string) => Promise<void>;
  onLeave?: (challengeId: string) => Promise<void>;
  isLoading?: boolean;
  onChatClick?: (challengeId: string) => void;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  isParticipating = false,
  onJoin,
  onLeave,
  isLoading = false,
  onChatClick,
}) => {
  const { toast } = useToast();
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

const { selectChatroom } = useChatStore();

  const handleChatClick = () => {
    const challengeType = challenge.visibility === 'public' ? 'public' : 'private';
    const idParam = challengeType === 'public' ? 'public_challenge_id' : 'private_challenge_id';
    const url = `/game-and-challenge?tab=billboard&type=${challengeType}&${idParam}=${challenge.id}`;
    window.location.href = url;
  };

  const handleJoinClick = async () => {
    if (onJoin) {
      await onJoin(challenge.id);
    }
  };

  const handleLeaveClick = async () => {
    if (onLeave) {
      await onLeave(challenge.id);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-lg transition-shadow relative">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg line-clamp-2 mb-2">
                {challenge.cover_emoji && (
                  <span className="mr-2">{challenge.cover_emoji}</span>
                )}
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
              {challenge.user_role === 'owner' && (
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Owner
                </Badge>
              )}
              {challenge.is_creator && (
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Creator
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
                {challenge.visibility === 'public' ? 'Public' : 'Private'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{challenge.participant_count || challenge.max_participants || 0}</span>
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
              {challenge.start_date && (
                <span className="text-xs">{formatDate(challenge.start_date)}</span>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => copyToClipboard(challenge.id, 'Challenge ID')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>

          {/* Progress (if available) */}
          {challenge.participation && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{challenge.participation.completion_percentage?.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(challenge.participation.completion_percentage || 0, 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleChatClick}
              disabled={challenge.visibility === 'private' && !isParticipating}
              className="flex-1"
              data-testid={`btn-chat-${challenge.id}`}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Billboard & Chat
            </Button>
            {challenge.user_role !== 'owner' && !challenge.is_creator && (
              isParticipating ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLeaveClick}
                  disabled={isLoading}
                  className="flex-1"
                  data-testid={`btn-leave-${challenge.id}`}
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  {isLoading ? 'Leaving...' : 'Leave'}
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleJoinClick}
                  disabled={isLoading}
                  className="flex-1"
                  data-testid={`btn-join-${challenge.id}`}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {isLoading ? 'Joining...' : 'Join'}
                </Button>
              )
            )}
          </div>

          {/* Chat Modal */}
          <ChallengeChatModal
            open={isChatModalOpen}
            onOpenChange={setIsChatModalOpen}
            challengeId={challenge.id}
            challengeName={challenge.title}
            participantCount={challenge.participant_count || challenge.max_participants || 0}
            challengeParticipants={[]}
            isPublic={challenge.visibility === 'public'}
            isParticipating={isParticipating}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
};