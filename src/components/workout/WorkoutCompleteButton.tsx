import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Zap, Trophy, CheckCircle } from 'lucide-react';
import { useXP } from '@/hooks/useXP';
import { useToast } from '@/hooks/use-toast';

interface WorkoutCompleteButtonProps {
  routine_id: string;
  intensity?: 'low' | 'medium' | 'high';
  duration_minutes?: number;
  difficulty_multiplier?: number;
  onComplete?: () => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

export function WorkoutCompleteButton({
  routine_id,
  intensity = 'medium',
  duration_minutes = 45,
  difficulty_multiplier = 1.0,
  onComplete,
  disabled = false,
  className = '',
  compact = false
}: WorkoutCompleteButtonProps) {
  const { logWorkoutXP, submitting } = useXP();
  const { toast } = useToast();
  const [completed, setCompleted] = useState(false);

  const handleCompleteWorkout = async () => {
    try {
      const result = await logWorkoutXP(routine_id, intensity, duration_minutes, difficulty_multiplier);
      
      if (result) {
        setCompleted(true);
        
        // Call onComplete callback if provided
        if (onComplete) {
          onComplete();
        }

        // Additional celebration for level ups
        if (result.leveled_up) {
          // You could trigger confetti or other celebration effects here
          console.log('🎉 Level up celebration!', result);
        }
      }
    } catch (error) {
      console.error('Error completing workout:', error);
      toast({
        title: "Error",
        description: "Failed to complete workout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getIntensityColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500 hover:bg-green-600';
      case 'medium': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'high': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-primary hover:bg-primary/90';
    }
  };

  const getIntensityEmoji = (level: string) => {
    switch (level) {
      case 'low': return '🌱';
      case 'medium': return '🔥';
      case 'high': return '⚡';
      default: return '💪';
    }
  };

  const estimatedXP = () => {
    // Simple estimation based on our XP calculation formula
    const baseXP = 20;
    const intensityMultipliers = { low: 1.0, medium: 1.5, high: 2.0 };
    const durationBonus = Math.min(duration_minutes || 45, 60);
    const intensityBonus = Math.floor(baseXP * (intensityMultipliers[intensity] - 1));
    const difficultyBonus = Math.floor(baseXP * (difficulty_multiplier - 1));
    
    return baseXP + intensityBonus + durationBonus + difficultyBonus;
  };

  if (completed) {
    return (
      <Button
        disabled
        className={`${className} bg-green-500 hover:bg-green-500 text-white`}
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        Workout Completed!
      </Button>
    );
  }

  const button = (
    <Button
      onClick={handleCompleteWorkout}
      disabled={disabled || submitting}
      className={`${className} ${getIntensityColor(intensity)} text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
    >
      {submitting ? (
        <>
          <Zap className="h-4 w-4 mr-2 animate-spin" />
          Logging XP...
        </>
      ) : (
        <>
          <Star className="h-4 w-4 mr-2" />
          Complete Workout
        </>
      )}
    </Button>
  );

  if (compact) {
    return button;
  }

  return (
    <div className="space-y-2">
      {button}
      
      {/* XP Preview */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Trophy className="h-3 w-3" />
        <span>Earn ~{estimatedXP()} XP</span>
        <Badge variant="outline" className="text-xs">
          {getIntensityEmoji(intensity)} {intensity.toUpperCase()}
        </Badge>
      </div>
    </div>
  );
}