import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2 } from 'lucide-react';
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

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card className={`relative overflow-hidden border border-border/50 bg-gradient-to-br ${challenge.gradient} group hover:shadow-lg transition-all duration-300`}>
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        
        <CardContent className="relative p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{challenge.emoji}</span>
              <div>
                <h3 className="font-semibold text-foreground">{challenge.name}</h3>
                <p className="text-sm text-muted-foreground">{challenge.duration}</p>
              </div>
            </div>
            
            {challenge.isJoined && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 text-green-600 dark:text-green-400"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">Joined!</span>
              </motion.div>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {challenge.description}
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className={getDifficultyColor(challenge.difficulty)}>
              {challenge.difficulty}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {challenge.type}
            </Badge>
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
              {challenge.isJoined ? 'Joined' : 'Join Challenge'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};