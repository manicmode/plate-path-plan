import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserLevel } from '@/hooks/useUserLevel';
import { Zap, Star } from 'lucide-react';

interface LevelProgressBarProps {
  className?: string;
}

export const LevelProgressBar: React.FC<LevelProgressBarProps> = ({ className = '' }) => {
  const { userLevel, loading } = useUserLevel();

  if (loading || !userLevel) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-16 h-8 bg-muted rounded-full"></div>
          <div className="flex-1 h-4 bg-muted rounded-full"></div>
          <div className="w-20 h-4 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const progressPercentage = Math.min((userLevel.current_xp / userLevel.xp_to_next_level) * 100, 100);
  const xpToNext = userLevel.xp_to_next_level - userLevel.current_xp;

  return (
    <TooltipProvider>
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-3">
          {/* Level Badge */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="secondary" 
                className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-indigo-400/20 animate-pulse"></div>
                <Star className="w-3 h-3 mr-1 relative z-10" />
                <span className="font-bold relative z-10">Lv. {userLevel.level}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Current Level: {userLevel.level}</p>
            </TooltipContent>
          </Tooltip>

          {/* XP Progress Bar */}
          <div className="flex-1 relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Progress 
                    value={progressPercentage} 
                    className="h-3 bg-gradient-to-r from-muted via-muted/80 to-muted border border-border/50 shadow-inner"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-emerald-500/20 rounded-full animate-pulse opacity-50"></div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>You need {xpToNext} more XP to reach Level {userLevel.level + 1}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* XP Text */}
          <div className="flex items-center gap-1 text-sm font-semibold text-muted-foreground">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {userLevel.current_xp}/{userLevel.xp_to_next_level} XP
            </span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};