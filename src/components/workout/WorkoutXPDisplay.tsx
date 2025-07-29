import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Zap, Star, Target } from 'lucide-react';
import { useXP } from '@/hooks/useXP';

interface WorkoutXPDisplayProps {
  routine_id?: string;
  intensity?: 'low' | 'medium' | 'high';
  duration_minutes?: number;
  onXPLogged?: (result: any) => void;
  showCompleteButton?: boolean;
}

export function WorkoutXPDisplay({ 
  routine_id, 
  intensity = 'medium', 
  duration_minutes = 45,
  onXPLogged,
  showCompleteButton = false
}: WorkoutXPDisplayProps) {
  const { userLevel, loading, submitting, logWorkoutXP, getXPProgress } = useXP();

  const handleCompleteWorkout = async () => {
    if (!routine_id) return;
    
    const result = await logWorkoutXP(routine_id, intensity, duration_minutes);
    if (result && onXPLogged) {
      onXPLogged(result);
    }
  };

  const getIntensityColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getIntensityIcon = (level: string) => {
    switch (level) {
      case 'low': return '🌱';
      case 'medium': return '🔥';
      case 'high': return '⚡';
      default: return '💪';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userLevel) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <Trophy className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">Sign in to track your workout XP!</p>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = getXPProgress();
  const totalXP = (userLevel.level - 1) * 100 + userLevel.current_xp;

  return (
    <Card className="w-full bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-indigo-200 dark:border-indigo-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
          <Trophy className="h-5 w-5" />
          Fitness Level {userLevel.level}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* XP Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {userLevel.current_xp} / {userLevel.current_xp + userLevel.xp_to_next_level} XP
            </span>
            <Badge variant="outline" className="text-xs">
              {progressPercentage.toFixed(0)}%
            </Badge>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-3 bg-gray-200 dark:bg-gray-700"
          />
          <div className="text-xs text-center text-gray-500 dark:text-gray-400">
            {userLevel.xp_to_next_level} XP to level {userLevel.level + 1}
          </div>
        </div>

        {/* Workout Info */}
        {routine_id && (
          <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-lg">{getIntensityIcon(intensity)}</span>
                <Badge 
                  variant="secondary" 
                  className={`${getIntensityColor(intensity)} text-white border-0`}
                >
                  {intensity.toUpperCase()}
                </Badge>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {duration_minutes} min workout
              </div>
            </div>
            
            {showCompleteButton && (
              <Button
                onClick={handleCompleteWorkout}
                disabled={submitting}
                size="sm"
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
              >
                {submitting ? (
                  <>
                    <Zap className="h-4 w-4 mr-1 animate-spin" />
                    Logging...
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-1" />
                    Complete & Earn XP
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {totalXP}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total XP</div>
          </div>
          <div className="p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {userLevel.level}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Current Level</div>
          </div>
        </div>

        {/* Motivation message */}
        <div className="text-center text-sm text-gray-600 dark:text-gray-400 italic">
          {progressPercentage > 80 
            ? "🔥 So close to leveling up! Keep pushing!" 
            : progressPercentage > 50 
            ? "💪 Great progress! You're halfway there!" 
            : "🌟 Every workout counts towards your next level!"
          }
        </div>
      </CardContent>
    </Card>
  );
}