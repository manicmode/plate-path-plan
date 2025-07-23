
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Users, Target } from 'lucide-react';
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

  const quickNudgeMessages = [
    "You got this! 💪",
    "Let's finish this week strong together! 🔥", 
    "Missing your workout buddy energy! 🤗",
    "Ready to crush today's goals? ⚡",
    "Your squad is cheering you on! 🎉"
  ];

  const confirmNudge = (message: string) => {
    if (selectedMember) {
      sendGroupNudge(selectedMember.groupId, selectedMember.memberId, message);
      setIsNudgeModalOpen(false);
      setSelectedMember(null);
      setCustomNudgeMessage('');
    }
  };

  return (
    <div className="space-y-6 p-1">
      {/* Exercise Challenges Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-[#FFD580] to-[#FF8C66] p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/20 hover:brightness-110 hover:scale-[1.02]"
        style={{
          boxShadow: '0 8px 32px rgba(255, 140, 102, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative flex items-center gap-4">
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3
            }}
            className="text-4xl"
          >
            🚀
          </motion.div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-1">
              Exercise Challenges
            </h1>
            <p className="text-white/90 text-sm">
              Join challenges, track progress, and stay motivated together!
            </p>
          </div>
        </div>
        
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-pulse" />
        </div>
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

      {/* Mini Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
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
};
