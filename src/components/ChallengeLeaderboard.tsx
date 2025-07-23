import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Award } from 'lucide-react';
import { LeaderboardEntry } from '@/hooks/useExerciseChallenges';

interface ChallengeLeaderboardProps {
  leaderboard: LeaderboardEntry[];
}

export const ChallengeLeaderboard: React.FC<ChallengeLeaderboardProps> = ({ leaderboard }) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 border-yellow-300 dark:border-yellow-700';
      case 2: return 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800/30 dark:to-gray-700/30 border-gray-300 dark:border-gray-600';
      case 3: return 'bg-gradient-to-r from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 border-amber-300 dark:border-amber-700';
      default: return 'bg-muted/30 border-border';
    }
  };

  return (
    <Card className="border border-border/50 bg-gradient-to-br from-background/80 to-muted/20 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Weekly Champions
          <span className="text-sm font-normal text-muted-foreground ml-auto">This Week</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {leaderboard.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-lg border ${getRankBg(entry.rank)} transition-all duration-200 hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8">
                  {getRankIcon(entry.rank)}
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{entry.avatar}</span>
                  <div>
                    <div className="font-medium text-foreground">{entry.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {entry.workouts} workouts • {entry.minutes} min
                    </div>
                  </div>
                </div>
              </div>

              {entry.rank <= 3 && (
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3 
                  }}
                  className="text-2xl"
                >
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
        
        {/* Motivational Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center pt-2"
        >
          <p className="text-xs text-muted-foreground italic">
            "Every workout counts! You could be next! 💪"
          </p>
        </motion.div>
      </CardContent>
    </Card>
  );
};