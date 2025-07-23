
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface AICoachCardProps {
  coachMessage: string;
  workoutStats: {
    weeklyCount: number;
    totalMinutes: number;
  };
}

export const AICoachCard: React.FC<AICoachCardProps> = React.memo(({ coachMessage, workoutStats }) => {
  return (
    <motion.div
      layoutId="ai-coach-card-stable"
      transition={{ type: "spring", stiffness: 100, damping: 18 }}
    >
      <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <motion.div
              layoutId="ai-coach-sparkles-stable"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                repeatDelay: 5,
                type: "spring",
                stiffness: 100,
                damping: 18
              }}
            >
              <Sparkles className="h-6 w-6 text-primary mt-0.5" />
            </motion.div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-foreground">AI Fitness Coach</span>
                <motion.span 
                  layoutId="live-badge-stable"
                  className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                >
                  Live
                </motion.span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {coachMessage}
              </p>
              {workoutStats.weeklyCount > 0 && (
                <motion.div 
                  layoutId="workout-stats-stable"
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
  );
});

AICoachCard.displayName = 'AICoachCard';
