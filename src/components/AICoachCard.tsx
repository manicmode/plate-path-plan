
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface AICoachCardProps {
  coachMessage: string;
  workoutStats: {
    weeklyCount: number;
    totalMinutes: number;
  };
}

export const AICoachCard: React.FC<AICoachCardProps> = ({ coachMessage, workoutStats }) => {
  console.log('🔍 AICoachCard rendering with:', { coachMessage, workoutStats });
  
  // Add fallback for undefined props
  const safeCoachMessage = coachMessage || "Let's get started with your fitness journey! 🚀";
  const safeWorkoutStats = workoutStats || { weeklyCount: 0, totalMinutes: 0 };
  
  return (
    <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-6 w-6 text-primary mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-foreground">AI Fitness Coach</span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                Live
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {safeCoachMessage}
            </p>
            {safeWorkoutStats.weeklyCount > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                📊 This week: {safeWorkoutStats.weeklyCount} workouts • {safeWorkoutStats.totalMinutes} minutes
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

AICoachCard.displayName = 'AICoachCard';
