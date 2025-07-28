import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Lock, Plus, Users, Calendar, Trophy, Flame, MessageCircle, Heart, Clock, Target, Star } from 'lucide-react';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';
import { PrivateChallengeCreationModal } from './PrivateChallengeCreationModal';
import { ChallengeChatModal } from './ChallengeChatModal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PrivateRecoveryChallengesProps {
  className?: string;
}

interface RecoverySessionLog {
  id: string;
  user_id: string;
  session_id: string;
  category: string;
  duration_minutes: number;
  completed_at: string;
  created_at: string;
  is_favorite: boolean;
}

// Recovery challenge type emojis and themes
const recoveryTypeEmojis: Record<string, string> = {
  meditation: '🧘‍♀️',
  breathing: '🌬️',
  yoga: '🧎‍♀️',
  sleep: '😴',
  thermotherapy: '🔥❄️',
  stretching: '🤸',
  muscle_recovery: '🧪',
  mindfulness: '🌿'
};

const recoveryTypeNames: Record<string, string> = {
  meditation: 'Meditation',
  breathing: 'Breathing',
  yoga: 'Yoga',
  sleep: 'Sleep',
  thermotherapy: 'Thermotherapy',
  stretching: 'Stretching',
  muscle_recovery: 'Muscle Recovery',
  mindfulness: 'Mindfulness'
};

const getRecoveryGradient = (type: string) => {
  switch (type) {
    case 'meditation':
      return 'from-purple-500 to-indigo-600';
    case 'breathing':
      return 'from-cyan-500 to-teal-600';
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
    case 'mindfulness':
      return 'from-emerald-500 to-teal-600';
    default:
      return 'from-purple-500 to-teal-600';
  }
};

const getTimeRemaining = (endDate: string) => {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return { days: 0, hours: 0, expired: true };
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  return { days, hours, expired: false };
};

export const PrivateRecoveryChallenges: React.FC<PrivateRecoveryChallengesProps> = ({ 
  className 
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedChatChallenge, setSelectedChatChallenge] = useState<string | null>(null);
  const [sessionLogs, setSessionLogs] = useState<RecoverySessionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
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
      challenge.category === 'thermotherapy' || 
      challenge.category === 'muscle_recovery' || 
      challenge.category === 'mindfulness'
    );
  });

  // Fetch recovery session logs for progress tracking
  const fetchRecoveryLogs = async () => {
    if (!user) return;
    setLoadingLogs(true);
    
    try {
      const { data, error } = await supabase
        .from('recovery_session_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      setSessionLogs(data || []);
    } catch (error) {
      console.error('Error fetching recovery logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Calculate real progress based on recovery session logs
  const calculateRealProgress = (challengeData: any) => {
    const challengeStart = new Date(challengeData.start_date);
    const challengeEnd = new Date(challengeStart);
    challengeEnd.setDate(challengeEnd.getDate() + challengeData.duration_days);
    
    const relevantLogs = sessionLogs.filter(log => 
      log.category === challengeData.category &&
      new Date(log.completed_at) >= challengeStart &&
      new Date(log.completed_at) <= challengeEnd
    );

    const uniqueDays = new Set(
      relevantLogs.map(log => log.completed_at.split('T')[0])
    );

    const completedDays = uniqueDays.size;
    const targetDays = challengeData.duration_days;
    const progressPercentage = Math.min(100, (completedDays / targetDays) * 100);

    // Calculate streak (consecutive days)
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < targetDays; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const hasLogForDay = relevantLogs.some(log => 
        log.completed_at.split('T')[0] === dateStr
      );

      if (hasLogForDay) {
        streak++;
      } else {
        break;
      }
    }

    return {
      completedDays,
      progressPercentage,
      streak,
      totalSessions: relevantLogs.length,
      totalMinutes: relevantLogs.reduce((sum, log) => sum + log.duration_minutes, 0)
    };
  };

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

  const handleLogSession = async (challengeId: string, category: string) => {
    // Create a session log entry
    try {
      const { error } = await supabase
        .from('recovery_session_logs')
        .insert({
          user_id: user!.id,
          session_id: `manual-${Date.now()}`,
          category: category,
          duration_minutes: 10, // Default manual session duration
        });

      if (error) throw error;

      // Update private challenge progress
      const success = await updatePrivateProgress(challengeId, 1);
      if (success) {
        toast({
          title: "Recovery Session Logged! 🌟",
          description: "Your healing journey continues!",
        });
        // Refresh logs to get updated progress
        await fetchRecoveryLogs();
      }
    } catch (error) {
      console.error('Error logging session:', error);
      toast({
        title: "Error",
        description: "Failed to log session",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecoveryLogs();
    }
  }, [user]);

  useEffect(() => {
    if (!loading) {
      refreshData();
    }
  }, []);

  if (loading || loadingLogs) {
    return (
      <div className="space-y-4 animate-fade-in">
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
    <div className={cn("space-y-6", className)}>
      {/* Header Section with Recovery Theme */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-gradient-to-r from-teal-500/20 to-purple-500/20">
            <Heart className="h-8 w-8 text-teal-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-purple-600 bg-clip-text text-transparent">
              Private Recovery Challenges
            </h2>
            <p className="text-muted-foreground text-sm">
              Heal together, grow together 🧘‍♀️✨
            </p>
          </div>
        </div>

        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-teal-600 to-purple-600 hover:from-teal-700 hover:to-purple-700 text-white shadow-lg hover-scale"
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
            <h3 className="font-semibold text-lg text-teal-700 dark:text-teal-300 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Recovery Invitations
            </h3>
            {recoveryInvitations.map((invitation) => (
              <motion.div
                key={invitation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 border border-teal-200 dark:border-teal-800 rounded-lg bg-gradient-to-r from-teal-50 to-purple-50 dark:from-teal-950/30 dark:to-purple-950/30"
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
        <h3 className="font-semibold text-lg text-teal-700 dark:text-teal-300 flex items-center gap-2">
          <Lock className="h-5 w-5" />
          My Recovery Challenges ({recoveryChallenges.length})
        </h3>

        <AnimatePresence>
          {recoveryChallenges.length > 0 ? (
            <div className="grid gap-4">
              {recoveryChallenges.map((challengeData, index) => {
                const realProgress = calculateRealProgress(challengeData);
                const timeRemaining = getTimeRemaining(
                  new Date(new Date(challengeData.start_date).getTime() + 
                  challengeData.duration_days * 24 * 60 * 60 * 1000).toISOString()
                );

                return (
                  <motion.div
                    key={challengeData.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className="group"
                  >
                    <Card className={`overflow-hidden border-2 transition-all duration-300 hover:shadow-lg bg-gradient-to-r ${getRecoveryGradient(challengeData.category)}/5 border-teal-200 dark:border-teal-800 hover:border-teal-300 dark:hover:border-teal-600 hover-scale`}>
                      {/* Top bar with challenge info */}
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-lg bg-gradient-to-r ${getRecoveryGradient(challengeData.category)} text-white shadow-lg`}>
                              <span className="text-xl">
                                {recoveryTypeEmojis[challengeData.category] || '🧘‍♀️'}
                              </span>
                            </div>
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                {challengeData.title}
                                {challengeData.participation.is_creator && (
                                  <Star className="h-4 w-4 text-yellow-500" />
                                )}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {challengeData.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                                  {recoveryTypeNames[challengeData.category]}
                                </Badge>
                                <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-600 dark:text-purple-300">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {challengeData.duration_days}d
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {!timeRemaining.expired ? (
                              <div className="text-sm">
                                <div className="font-semibold text-teal-600 dark:text-teal-400">
                                  {timeRemaining.days}d {timeRemaining.hours}h left
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Time remaining
                                </div>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
                                Completed
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
                            <span className="text-teal-600 dark:text-teal-400 font-semibold">
                              {Math.round(realProgress.progressPercentage)}%
                            </span>
                          </div>
                          <Progress 
                            value={realProgress.progressPercentage} 
                            className="h-2"
                          />
                          <div className="text-xs text-muted-foreground">
                            {realProgress.completedDays} of {challengeData.duration_days} days completed
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-4 gap-3 pt-2">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-teal-600 dark:text-teal-400">
                              <Flame className="h-4 w-4" />
                              <span className="font-bold">{realProgress.streak}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Streak</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                              <Trophy className="h-4 w-4" />
                              <span className="font-bold">{realProgress.completedDays}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Days</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
                              <Target className="h-4 w-4" />
                              <span className="font-bold">{realProgress.totalSessions}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Sessions</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-purple-600 dark:text-purple-400">
                              <Clock className="h-4 w-4" />
                              <span className="font-bold">{realProgress.totalMinutes}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Minutes</p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          {realProgress.progressPercentage >= 100 ? (
                            <Badge variant="secondary" className="w-full justify-center py-2 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                              <Trophy className="h-4 w-4 mr-2" />
                              Challenge Completed! 🏆
                            </Badge>
                          ) : (
                            <>
                              <Button
                                onClick={() => handleLogSession(challengeData.id, challengeData.category)}
                                className={`flex-1 bg-gradient-to-r ${getRecoveryGradient(challengeData.category)} hover:opacity-90 text-white`}
                              >
                                <Heart className="h-4 w-4 mr-2" />
                                Log Session
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedChatChallenge(challengeData.id)}
                                className="border-teal-300 hover:bg-teal-50 dark:border-teal-600 dark:hover:bg-teal-950/50"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="animate-fade-in"
            >
              <Card className="border-2 border-dashed border-teal-300 dark:border-teal-700">
                <CardContent className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-r from-teal-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Heart className="h-10 w-10 text-teal-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-teal-700 dark:text-teal-300">
                    No Recovery Challenges Yet
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Start your healing journey with friends! Create private recovery challenges and support each other's wellness goals. 🧘‍♀️✨
                  </p>
                  <Button 
                    onClick={() => setShowCreateModal(true)}
                    className="bg-gradient-to-r from-teal-600 to-purple-600 hover:from-teal-700 hover:to-purple-700 hover-scale"
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

      {/* Modals */}
      <PrivateChallengeCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {selectedChatChallenge && (
        <ChallengeChatModal
          open={!!selectedChatChallenge}
          onOpenChange={(open) => !open && setSelectedChatChallenge(null)}
          challengeId={selectedChatChallenge}
          challengeName={recoveryChallenges.find(c => c.id === selectedChatChallenge)?.title || 'Recovery Challenge'}
          participantCount={1}
          challengeParticipants={[]}
          showChatroomSelector={false}
        />
      )}
    </div>
  );
};