import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Lock, Plus, Users, Calendar, Trophy, Flame, MessageCircle, Heart } from 'lucide-react';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';
import { PrivateChallengeCreationModal } from './PrivateChallengeCreationModal';
import { PrivateChallengeCard } from './PrivateChallengeCard';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface PrivateRecoveryChallengesProps {
  className?: string;
}

// Recovery challenge type emojis and themes
const recoveryTypeEmojis: Record<string, string> = {
  meditation: '🧘‍♀️',
  breathing: '🌬️',
  yoga: '🧎‍♀️',
  sleep: '😴',
  stretching: '🤸',
  thermotherapy: '🔥❄️',
  muscle_recovery: '🧪',
  mindfulness: '🌿'
};

const getRecoveryGradient = (type: string) => {
  switch (type) {
    case 'meditation':
      return 'from-purple-500 to-indigo-600';
    case 'breathing':
      return 'from-cyan-500 to-blue-600';
    case 'yoga':
      return 'from-pink-500 to-rose-600';
    case 'sleep':
      return 'from-slate-600 to-blue-800';
    case 'stretching':
      return 'from-green-500 to-emerald-600';
    case 'thermotherapy':
      return 'from-orange-500 to-red-600';
    case 'muscle_recovery':
      return 'from-teal-500 to-cyan-600';
    default:
      return 'from-purple-500 to-pink-600';
  }
};

export const PrivateRecoveryChallenges: React.FC<PrivateRecoveryChallengesProps> = ({ 
  className 
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();
  
  const {
    challengesWithParticipation,
    pendingInvitations,
    acceptInvitation,
    declineInvitation,
    updatePrivateProgress,
    loading,
    refreshData
  } = usePrivateChallenges();

  // Filter for recovery-type challenges only
  const recoveryChallenges = challengesWithParticipation.filter(
    (challengeData) => 
      challengeData.category === 'meditation' || 
      challengeData.category === 'breathing' || 
      challengeData.category === 'yoga' || 
      challengeData.category === 'sleep' || 
      challengeData.category === 'stretching' || 
      challengeData.category === 'thermotherapy' || 
      challengeData.category === 'muscle_recovery' || 
      challengeData.category === 'mindfulness'
  );

  // Filter for recovery-specific pending invitations
  const recoveryInvitations = pendingInvitations.filter(invitation => {
    const challenge = challengesWithParticipation.find(
      (challengeData) => challengeData.id === invitation.private_challenge_id
    );
    return challenge && (
      challenge.category === 'meditation' || 
      challenge.category === 'breathing' || 
      challenge.category === 'yoga' || 
      challenge.category === 'sleep' || 
      challenge.category === 'stretching' || 
      challenge.category === 'thermotherapy' || 
      challenge.category === 'muscle_recovery' || 
      challenge.category === 'mindfulness'
    );
  });

  const handleAcceptInvitation = async (invitationId: string) => {
    const success = await acceptInvitation(invitationId);
    if (success) {
      toast({
        title: "Recovery Challenge Joined! 🧘‍♂️",
        description: "You're now part of this healing journey!",
      });
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    const success = await declineInvitation(invitationId);
    if (success) {
      toast({
        title: "Invitation Declined",
        description: "Maybe next time!",
      });
    }
  };

  const handleProgressUpdate = async (challengeId: string, value: number) => {
    const success = await updatePrivateProgress(challengeId, value);
    if (success) {
      toast({
        title: "Recovery Progress Updated! 🌟",
        description: "Your healing journey continues!",
      });
    }
    return success;
  };

  useEffect(() => {
    if (!loading) {
      refreshData();
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Section with Recovery Theme */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20">
            <Heart className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Private Recovery Challenges
            </h2>
            <p className="text-muted-foreground text-sm">
              Heal together, grow together 🧘‍♀️✨
            </p>
          </div>
        </div>

        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Recovery Challenge
        </Button>
      </motion.div>

      {/* Pending Recovery Invitations */}
      <AnimatePresence>
        {recoveryInvitations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h3 className="font-semibold text-lg text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Recovery Invitations
            </h3>
            {recoveryInvitations.map((invitation) => (
              <motion.div
                key={invitation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 border border-purple-200 dark:border-purple-800 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🧘‍♀️</span>
                    <div>
                      <p className="font-medium">Recovery Challenge Invitation</p>
                      <p className="text-sm text-muted-foreground">Join your friend's healing journey</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvitation(invitation.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeclineInvitation(invitation.id)}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Recovery Challenges */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-purple-700 dark:text-purple-300 flex items-center gap-2">
          <Lock className="h-5 w-5" />
          My Recovery Challenges ({recoveryChallenges.length})
        </h3>

        <AnimatePresence>
          {recoveryChallenges.length > 0 ? (
            <div className="grid gap-4">
              {recoveryChallenges.map((challengeData, index) => (
                <motion.div
                  key={challengeData.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="group"
                >
                  <Card className={`overflow-hidden border-2 transition-all duration-300 hover:shadow-lg bg-gradient-to-r ${getRecoveryGradient(challengeData.category)}/5 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-600`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-r ${getRecoveryGradient(challengeData.category)} text-white`}>
                            <span className="text-lg">
                              {recoveryTypeEmojis[challengeData.category] || '🧘‍♀️'}
                            </span>
                          </div>
                          <div>
                            <CardTitle className="text-lg">{challengeData.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {challengeData.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                            <Calendar className="h-3 w-3 mr-1" />
                            {challengeData.duration_days}d
                          </Badge>
                          {challengeData.participation.is_creator && (
                            <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-600 dark:text-purple-300">
                              Creator
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Progress Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Recovery Progress</span>
                          <span className="text-purple-600 dark:text-purple-400 font-semibold">
                            {Math.round(challengeData.participation.completion_percentage)}%
                          </span>
                        </div>
                        <Progress 
                          value={challengeData.participation.completion_percentage} 
                          className="h-2"
                        />
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-4 pt-2">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-purple-600 dark:text-purple-400">
                            <Flame className="h-4 w-4" />
                            <span className="font-bold">{challengeData.participation.streak_count}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Streak</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                            <Trophy className="h-4 w-4" />
                            <span className="font-bold">{challengeData.participation.completed_days}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Days Done</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
                            <Users className="h-4 w-4" />
                            <span className="font-bold">1+</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Participants</p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        {challengeData.participation.completion_percentage >= 100 ? (
                          <Badge variant="secondary" className="w-full justify-center py-2 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                            <Trophy className="h-4 w-4 mr-2" />
                            Challenge Completed! 🏆
                          </Badge>
                        ) : (
                          <Button
                            onClick={() => handleProgressUpdate(challengeData.id, 1)}
                            className={`w-full bg-gradient-to-r ${getRecoveryGradient(challengeData.category)} hover:opacity-90 text-white`}
                          >
                            <Heart className="h-4 w-4 mr-2" />
                            Log Recovery Session
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Card className="border-2 border-dashed border-purple-300 dark:border-purple-700">
                <CardContent className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Heart className="h-10 w-10 text-purple-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-purple-700 dark:text-purple-300">
                    No Recovery Challenges Yet
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Start your healing journey with friends! Create private recovery challenges and support each other's wellness goals. 🧘‍♀️✨
                  </p>
                  <Button 
                    onClick={() => setShowCreateModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Recovery Challenge
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recovery Challenge Creation Modal */}
      <PrivateChallengeCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};