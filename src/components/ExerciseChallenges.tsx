import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, MessageSquare, Users, Target, Bell } from 'lucide-react';
import { useExerciseChallenges } from '@/hooks/useExerciseChallenges';
import { useSocialAccountability } from '@/hooks/useSocialAccountability';
import { MiniChallengeCard } from '@/components/MiniChallengeCard';
import { AccountabilityGroupCard } from '@/components/AccountabilityGroupCard';
import { ChallengeLeaderboard } from '@/components/ChallengeLeaderboard';
import { NotificationPanel } from '@/components/NotificationPanel';

interface ExerciseChallengesProps {
  workouts?: any[];
}

export const ExerciseChallenges: React.FC<ExerciseChallengesProps> = React.memo(({ workouts = [] }) => {
  const { 
    miniChallenges, 
    accountabilityGroups, 
    leaderboard,
    notifications,
    workoutStats,
    joinChallenge, 
    sendGroupNudge,
    generateCoachMessage,
    markNotificationAsRead,
    clearAllNotifications
  } = useExerciseChallenges(workouts);
  
  const { sendNudge } = useSocialAccountability();
  
  const [isNudgeModalOpen, setIsNudgeModalOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{groupId: string, memberId: string, memberName: string} | null>(null);
  const [customNudgeMessage, setCustomNudgeMessage] = useState('');

  const coachMessage = useMemo(() => generateCoachMessage(), [generateCoachMessage]);
  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  // Auto-open notifications if there are unread ones
  useEffect(() => {
    if (unreadCount > 0 && unreadCount <= 2) {
      setShowNotifications(true);
    }
  }, [unreadCount]);

  const handleJoinChallenge = useCallback((challengeId: string) => {
    joinChallenge(challengeId);
    // Show success animation or toast
  }, [joinChallenge]);

  const handleSendNudge = useCallback((groupId: string, memberId: string) => {
    const group = accountabilityGroups.find(g => g.id === groupId);
    const member = group?.members.find(m => m.id === memberId);
    
    if (member) {
      setSelectedMember({ groupId, memberId, memberName: member.name });
      setIsNudgeModalOpen(true);
    }
  }, [accountabilityGroups]);

  const quickNudgeMessages = [
    "You got this! 💪",
    "Let's finish this week strong together! 🔥", 
    "Missing your workout buddy energy! 🤗",
    "Ready to crush today's goals? ⚡",
    "Your squad is cheering you on! 🎉"
  ];

  const confirmNudge = useCallback((message: string) => {
    if (selectedMember) {
      sendGroupNudge(selectedMember.groupId, selectedMember.memberId, message);
      setIsNudgeModalOpen(false);
      setSelectedMember(null);
      setCustomNudgeMessage('');
    }
  }, [selectedMember, sendGroupNudge]);

  const handleNotificationAction = useCallback((notification: any) => {
    if (notification.type === 'team_nudge' && notification.groupId && notification.targetUserId) {
      handleSendNudge(notification.groupId, notification.targetUserId);
    } else if (notification.type === 'challenge_reminder' && notification.challengeId) {
      // Could navigate to the specific challenge or show workout suggestions
      console.log(`Take action on challenge: ${notification.challengeId}`);
    }
  }, [handleSendNudge]);


  return (
    <div className="space-y-6 p-1">
      {/* Notifications Toggle Button */}
      <motion.div
        className="flex justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative"
        >
          <Bell className="h-4 w-4 mr-2" />
          Notifications
          {unreadCount > 0 && (
            <motion.div
              className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {unreadCount}
            </motion.div>
          )}
        </Button>
      </motion.div>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <NotificationPanel
              notifications={notifications}
              onMarkAsRead={markNotificationAsRead}
              onClearAll={clearAllNotifications}
              onActionTaken={handleNotificationAction}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {/* AI Coach Message */}
      <motion.div
        layoutId="ai-coach-card"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100, damping: 15 }}
      >
        <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <motion.div
                layoutId="ai-coach-sparkles"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
              >
                <Sparkles className="h-6 w-6 text-primary mt-0.5" />
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">AI Fitness Coach</span>
                  <motion.span 
                    layoutId="live-badge"
                    className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                  >
                    Live
                  </motion.span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {coachMessage}
                </p>
                {/* Workout Stats Summary */}
                {workoutStats.weeklyCount > 0 && (
                  <motion.div 
                    layoutId="workout-stats"
                    className="mt-2 text-xs text-muted-foreground"
                  >
                    📊 This week: {workoutStats.weeklyCount} workouts • {workoutStats.totalMinutes} minutes
                  </motion.div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Public Mini Challenges */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Public Challenges</h2>
          <span className="text-sm text-muted-foreground">Join the fun!</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {miniChallenges.map((challenge, index) => (
            <motion.div
              key={challenge.id}
              layoutId={`challenge-${challenge.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 100, damping: 15 }}
            >
              <MiniChallengeCard 
                challenge={challenge} 
                onJoin={handleJoinChallenge} 
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Accountability Groups */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Your Squad</h2>
          <span className="text-sm text-muted-foreground">Private groups</span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {accountabilityGroups.map((group, index) => (
            <motion.div
              key={group.id}
              layoutId={`group-${group.id}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2, type: "spring", stiffness: 100, damping: 15 }}
            >
              <AccountabilityGroupCard 
                group={group} 
                onSendNudge={handleSendNudge}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mini Leaderboard */}
      <motion.div
        layoutId="challenge-leaderboard"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 100, damping: 15 }}
      >
        <ChallengeLeaderboard leaderboard={leaderboard} />
      </motion.div>

      {/* Nudge Modal */}
      <Dialog open={isNudgeModalOpen} onOpenChange={setIsNudgeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Send Motivation to {selectedMember?.memberName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose a quick message or write your own supportive note:
            </p>
            
            {/* Quick Messages */}
            <div className="grid grid-cols-1 gap-2">
              {quickNudgeMessages.map((message, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => confirmNudge(message)}
                  className="justify-start text-left h-auto p-3 hover:bg-primary/5 hover:border-primary/50"
                >
                  {message}
                </Button>
              ))}
            </div>
            
            {/* Custom Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Message:</label>
              <textarea
                value={customNudgeMessage}
                onChange={(e) => setCustomNudgeMessage(e.target.value)}
                placeholder="Write your own encouraging message..."
                className="w-full p-3 rounded-lg border border-border bg-background text-sm resize-none"
                rows={3}
              />
              {customNudgeMessage.trim() && (
                <Button 
                  onClick={() => confirmNudge(customNudgeMessage)}
                  className="w-full"
                >
                  Send Custom Message
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});