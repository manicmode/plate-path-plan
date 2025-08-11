import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Target } from 'lucide-react';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { PublicChallengeCard } from '@/components/analytics/PublicChallengeCard';

import { useAuth } from '@/contexts/auth';

export const ExerciseChallenges: React.FC = () => {
  const {
    challenges: publicChallenges,
    loading,
    error,
    joinChallenge,
    isUserParticipating,
    refreshData
  } = usePublicChallenges();
  
  const { user } = useAuth();
  
  const handleJoinChallenge = async (challengeId: string): Promise<boolean> => {
    const success = await joinChallenge(challengeId);
    if (success) {
      await refreshData();
    }
    return success;
  };

  
  // Debug logging - console.log when publicChallenges changes
  React.useEffect(() => {
    console.log("publicChallenges", publicChallenges);
  }, [publicChallenges]);

  // Debug logging
  console.log('Active Challenges Debug:', {
    publicChallenges,
    loading,
    error,
    challengesLength: publicChallenges.length
  });

  const coachMessages = [
    "💪 Ready to crush your fitness goals today? Let's make it happen!",
    "🔥 I see you eyeing those challenges! Time to turn that motivation into ACTION!",
    "⚡ Your body is capable of amazing things. Show it what you're made of!",
    "🚀 Champions don't wait for motivation - they CREATE it. Let's GO!",
    "🎯 Every rep, every step, every challenge brings you closer to your best self!",
  ];
  
  const coachMessage = coachMessages[Math.floor(Math.random() * coachMessages.length)];

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

      {/* Active Challenges */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Active Challenges</h2>
          <span className="text-sm text-muted-foreground">Join the community!</span>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : publicChallenges.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No public challenges yet. Create one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publicChallenges.map((challenge, index) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <PublicChallengeCard
                  challenge={challenge}
                  participation={null}
                  onJoin={handleJoinChallenge}
                  onUpdateProgress={async () => false}
                  onLeave={async () => false}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Debug Info - temporary */}
      <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
        Debug: items: {publicChallenges.length}, error: {error?.message || "none"}, user: {user?.id || "none"}
      </div>
    </div>
  );
};