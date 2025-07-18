import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface MealScoreProps {
  mealId: string;
  className?: string;
}

interface MealScore {
  score: number;
  rating_text: string;
}

export const MealScoreDisplay: React.FC<MealScoreProps> = ({ mealId, className = "" }) => {
  const { user } = useAuth();
  const [mealScore, setMealScore] = useState<MealScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMealScore = async () => {
      if (!user || !mealId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('meal_scores')
          .select('score, rating_text')
          .eq('meal_id', mealId)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.log('No meal score found for meal:', mealId);
          setMealScore(null);
        } else {
          setMealScore(data);
        }
      } catch (error) {
        console.error('Error fetching meal score:', error);
        setMealScore(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMealScore();
  }, [mealId, user]);

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-muted rounded-full w-24"></div>
      </div>
    );
  }

  if (!mealScore) {
    return null;
  }

  const { score, rating_text } = mealScore;
  const roundedScore = Math.round(score);

  // Determine color and description based on score
  const getScoreDetails = (score: number) => {
    if (score >= 85) {
      return {
        emoji: '🟢',
        variant: 'default' as const,
        description: 'Excellent – Clean, nutrient-rich',
        bgColor: 'bg-green-50 border-green-200 text-green-800'
      };
    } else if (score >= 70) {
      return {
        emoji: '🟠',
        variant: 'secondary' as const,
        description: 'Okay – Slightly unbalanced',
        bgColor: 'bg-orange-50 border-orange-200 text-orange-800'
      };
    } else {
      return {
        emoji: '🔴',
        variant: 'destructive' as const,
        description: 'Poor – Ultra-processed or unhealthy',
        bgColor: 'bg-red-50 border-red-200 text-red-800'
      };
    }
  };

  const scoreDetails = getScoreDetails(roundedScore);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant={scoreDetails.variant}
        className={`text-xs font-medium ${scoreDetails.bgColor}`}
      >
        <span className="mr-1">{scoreDetails.emoji}</span>
        Score: {roundedScore}/100
      </Badge>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {scoreDetails.description}
      </span>
    </div>
  );
};