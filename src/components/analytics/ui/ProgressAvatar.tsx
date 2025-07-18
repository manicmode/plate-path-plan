import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Flame, Calendar } from 'lucide-react';

interface ProgressAvatarProps {
  avatar: string;
  nickname: string;
  weeklyProgress: number;
  dailyStreak: number;
  weeklyStreak: number;
  size?: 'sm' | 'md' | 'lg';
  showStats?: boolean;
}

export const ProgressAvatar: React.FC<ProgressAvatarProps> = ({
  avatar,
  nickname,
  weeklyProgress,
  dailyStreak,
  weeklyStreak,
  size = 'md',
  showStats = true
}) => {
  const sizeClasses = {
    sm: { avatar: 'h-10 w-10', progress: 'h-12 w-12', stroke: 3, text: 'text-xs' },
    md: { avatar: 'h-12 w-12', progress: 'h-16 w-16', stroke: 4, text: 'text-sm' },
    lg: { avatar: 'h-16 w-16', progress: 'h-20 w-20', stroke: 5, text: 'text-base' }
  };

  const { avatar: avatarSize, progress: progressSize, stroke, text } = sizeClasses[size];
  const circumference = Math.PI * (64 - stroke * 2);
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (weeklyProgress / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      {/* Progress Ring with Avatar */}
      <div className="relative">
        <div className={`${progressSize} relative`}>
          {/* Background Circle */}
          <svg 
            className="absolute inset-0 transform -rotate-90" 
            width="100%" 
            height="100%"
            viewBox="0 0 64 64"
          >
            <circle
              cx="32"
              cy="32"
              r={32 - stroke}
              stroke="hsl(var(--muted))"
              strokeWidth={stroke}
              fill="none"
              opacity="0.3"
            />
            {/* Progress Circle */}
            <circle
              cx="32"
              cy="32"
              r={32 - stroke}
              stroke="hsl(var(--primary))"
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{
                filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.4))'
              }}
            />
          </svg>
          
          {/* Avatar in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Avatar className={`${avatarSize} text-2xl border-2 border-background shadow-sm`}>
              <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-secondary/20">
                {avatar}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Progress percentage badge */}
        <Badge 
          variant="secondary" 
          className="absolute -top-1 -right-1 h-6 w-8 text-xs font-bold bg-primary text-primary-foreground"
        >
          {weeklyProgress}%
        </Badge>
      </div>

      {/* Stats */}
      {showStats && (
        <div className="flex flex-col gap-1">
          <div className="font-semibold text-sm">{nickname}</div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-orange-500" />
              <span>{dailyStreak}d</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-blue-500" />
              <span>{weeklyStreak}w</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};