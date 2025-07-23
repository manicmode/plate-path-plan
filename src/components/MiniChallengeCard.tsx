import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, CheckCircle2, Target, Calendar } from 'lucide-react';
import { MiniChallenge } from '@/hooks/useExerciseChallenges';

interface MiniChallengeCardProps {
  challenge: MiniChallenge;
  onJoin: (challengeId: string) => void;
}

export const MiniChallengeCard: React.FC<MiniChallengeCardProps> = ({ challenge, onJoin }) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const progressPercentage = challenge.targetWorkouts > 0 ? 
    (challenge.completedWorkouts / challenge.targetWorkouts) * 100 : 0;

  const isCompleted = challenge.completedWorkouts >= challenge.targetWorkouts;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      layout
    >
      <Card className={`relative overflow-hidden border border-border/50 bg-gradient-to-br ${challenge.gradient} group hover:shadow-lg transition-all duration-300`}>
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        
        <CardContent className="relative p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <motion.span 
                className="text-3xl"
                animate={challenge.isJoined ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5 }}
              >
                {challenge.emoji}
              </motion.span>
              <div>
                <h3 className="font-semibold text-foreground">{challenge.name}</h3>
                <p className="text-sm text-muted-foreground">{challenge.duration}</p>
              </div>
            </div>
            
            <AnimatePresence>
              {challenge.isJoined && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex items-center gap-1 text-green-600 dark:text-green-400"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-medium">
                    {isCompleted ? 'Completed!' : 'Joined!'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {challenge.description}
          </p>

          {/* Progress Bar (only show if joined) */}
          <AnimatePresence>
            {challenge.isJoined && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-primary" />
                    <span className="text-muted-foreground">Progress</span>
                  </div>
                  <span className="font-medium">
                    {challenge.completedWorkouts}/{challenge.targetWorkouts}
                  </span>
                </div>
                <Progress 
                  value={progressPercentage} 
                  className="h-2"
                />
                {isCompleted && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-sm font-medium text-green-600 dark:text-green-400"
                  >
                    🎉 Challenge Completed! Amazing work!
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className={getDifficultyColor(challenge.difficulty)}>
              {challenge.difficulty}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {challenge.type}
            </Badge>
            {challenge.startDate && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Started {new Date(challenge.startDate).toLocaleDateString()}
              </Badge>
            )}
          </div>

          {/* Participants & Action */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">{challenge.participantCount}</span>
              <span className="text-xs">joined</span>
            </div>

            <Button
              size="sm"
              variant={challenge.isJoined ? "outline" : "default"}
              onClick={() => onJoin(challenge.id)}
              disabled={challenge.isJoined}
              className="group-hover:scale-105 transition-transform"
            >
              {isCompleted ? '✅ Completed' : challenge.isJoined ? 'Joined' : 'Join Challenge'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};