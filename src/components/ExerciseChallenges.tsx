import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, MessageSquare, Users, Target } from 'lucide-react';
import { useExerciseChallenges } from '@/hooks/useExerciseChallenges';
import { useSocialAccountability } from '@/hooks/useSocialAccountability';
import { MiniChallengeCard } from '@/components/MiniChallengeCard';
import { AccountabilityGroupCard } from '@/components/AccountabilityGroupCard';
import { ChallengeLeaderboard } from '@/components/ChallengeLeaderboard';

export const ExerciseChallenges: React.FC = () => {
  const { 
    miniChallenges, 
    accountabilityGroups, 
    leaderboard, 
    joinChallenge, 
    sendGroupNudge,
    generateCoachMessage 
  } = useExerciseChallenges();
  
  const { sendNudge } = useSocialAccountability();
  
  const [isNudgeModalOpen, setIsNudgeModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{groupId: string, memberId: string, memberName: string} | null>(null);
  const [customNudgeMessage, setCustomNudgeMessage] = useState('');

  const handleJoinChallenge = (challengeId: string) => {
    joinChallenge(challengeId);
    // Show success animation or toast
  };

  const handleSendNudge = (groupId: string, memberId: string) => {
    const group = accountabilityGroups.find(g => g.id === groupId);
    const member = group?.members.find(m => m.id === memberId);
    
    if (member) {
      setSelectedMember({ groupId, memberId, memberName: member.name });
      setIsNudgeModalOpen(true);
    }
  };

  // 🎭 Coach Personality Nudge - Fitness Coach: Intense, fun, gritty, motivational
  const quickNudgeMessages = [
    "CRUSH TIME! Let's GO! 💪🔥",
    "NO EXCUSES! Time to DOMINATE this week! 🏆", 
    "Your workout squad NEEDS that BEAST energy! 💯",
    "Ready to OBLITERATE today's goals?! ⚡💪",
    "Your CREW is PUMPED and waiting for you! 🚀🔥"
  ];

  const confirmNudge = (message: string) => {
    if (selectedMember) {
      sendGroupNudge(selectedMember.groupId, selectedMember.memberId, message);
      setIsNudgeModalOpen(false);
      setSelectedMember(null);
      setCustomNudgeMessage('');
    }
  };

  const coachMessage = generateCoachMessage();

  return (
    <div className="space-y-6 p-1">
      {/* AI Coach Message */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
              >
                <Sparkles className="h-6 w-6 text-primary mt-0.5" />
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">AI Fitness Coach</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Live</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {coachMessage}
                </p>
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
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
      {accountabilityGroups.length > 0 && (
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
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.2 }}
              >
                <AccountabilityGroupCard 
                  group={group} 
                  onSendNudge={handleSendNudge}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Mini Leaderboard */}
      {leaderboard.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <ChallengeLeaderboard leaderboard={leaderboard} />
        </motion.div>
      )}

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