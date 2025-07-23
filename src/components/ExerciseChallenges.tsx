import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Users, Target, Bell } from 'lucide-react';
import { useExerciseChallenges } from '@/hooks/useExerciseChallenges';
import { useSocialAccountability } from '@/hooks/useSocialAccountability';
import { MiniChallengeCard } from '@/components/MiniChallengeCard';
import { AccountabilityGroupCard } from '@/components/AccountabilityGroupCard';
import { ChallengeLeaderboard } from '@/components/ChallengeLeaderboard';
import { NotificationPanel } from '@/components/NotificationPanel';
import { AICoachCard } from '@/components/AICoachCard';

interface ExerciseChallengesProps {
  workouts?: any[];
}

export const ExerciseChallenges: React.FC<ExerciseChallengesProps> = ({ workouts = [] }) => {
  console.log('🔍 ExerciseChallenges rendering with workouts:', workouts);
  
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
  
  // Log all hook return values
  console.log('🔍 Hook returned data:', {
    miniChallenges: miniChallenges?.length || 0,
    accountabilityGroups: accountabilityGroups?.length || 0,
    leaderboard: leaderboard?.length || 0,
    notifications: notifications?.length || 0,
    workoutStats,
    hasJoinChallenge: !!joinChallenge,
    hasSendGroupNudge: !!sendGroupNudge,
    hasGenerateCoachMessage: !!generateCoachMessage
  });
  
  const { sendNudge } = useSocialAccountability();
  
  const [isNudgeModalOpen, setIsNudgeModalOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{groupId: string, memberId: string, memberName: string} | null>(null);
  const [customNudgeMessage, setCustomNudgeMessage] = useState('');

  // Memoize coach message with fallback
  const coachMessage = useMemo(() => {
    try {
      const message = generateCoachMessage();
      console.log('🔍 Generated coach message:', message);
      return message || "Let's get started with your fitness journey! 🚀";
    } catch (error) {
      console.error('🔍 Error generating coach message:', error);
      return "Ready to crush your fitness goals? Let's do this! 💪";
    }
  }, [generateCoachMessage]);

  // Ensure unread count has fallback
  const unreadCount = useMemo(() => {
    const count = notifications?.filter(n => !n.isRead).length || 0;
    console.log('🔍 Unread notifications count:', count);
    return count;
  }, [notifications]);

  // Auto-open notifications if there are unread ones
  useEffect(() => {
    if (unreadCount > 0 && unreadCount <= 2) {
      setShowNotifications(true);
    }
  }, [unreadCount]);

  const handleJoinChallenge = useCallback((challengeId: string) => {
    joinChallenge(challengeId);
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
      console.log(`Take action on challenge: ${notification.challengeId}`);
    }
  }, [handleSendNudge]);

  // Add safety checks for rendering
  if (!workoutStats) {
    console.log('🔍 No workoutStats, showing loading state');
    return (
      <div className="space-y-6 p-1">
        <div className="text-center text-muted-foreground">
          Loading your fitness data...
        </div>
      </div>
    );
  }

  console.log('🔍 About to render main content');

  return (
    <div className="space-y-6 p-1">
      {/* Notifications Toggle Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative"
        >
          <Bell className="h-4 w-4 mr-2" />
          Notifications
          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </div>
          )}
        </Button>
      </div>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <div>
            <NotificationPanel
              notifications={notifications || []}
              onMarkAsRead={markNotificationAsRead}
              onClearAll={clearAllNotifications}
              onActionTaken={handleNotificationAction}
            />
          </div>
        )}
      </AnimatePresence>

      {/* AI Coach Card */}
      <div>
        <AICoachCard 
          coachMessage={coachMessage}
          workoutStats={workoutStats}
        />
      </div>

      {/* Public Mini Challenges */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Public Challenges</h2>
          <span className="text-sm text-muted-foreground">Join the fun!</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(miniChallenges || []).map((challenge, index) => (
            <div key={challenge.id}>
              <MiniChallengeCard 
                challenge={challenge} 
                onJoin={handleJoinChallenge} 
              />
            </div>
          ))}
        </div>
        
        {(!miniChallenges || miniChallenges.length === 0) && (
          <div className="text-center text-muted-foreground py-8">
            No challenges available right now. Check back soon!
          </div>
        )}
      </div>

      {/* Accountability Groups */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Your Squad</h2>
          <span className="text-sm text-muted-foreground">Private groups</span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(accountabilityGroups || []).map((group, index) => (
            <div key={group.id}>
              <AccountabilityGroupCard 
                group={group} 
                onSendNudge={handleSendNudge}
              />
            </div>
          ))}
        </div>
        
        {(!accountabilityGroups || accountabilityGroups.length === 0) && (
          <div className="text-center text-muted-foreground py-8">
            No accountability groups yet. Create one to get started!
          </div>
        )}
      </div>

      {/* Mini Leaderboard */}
      <div>
        <ChallengeLeaderboard leaderboard={leaderboard || []} />
      </div>

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
};

ExerciseChallenges.displayName = 'ExerciseChallenges';
