import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Bot, RefreshCw, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { useMotivationMessage } from '@/hooks/useMotivationMessage';

interface MotivationCardProps {
  className?: string;
}

export const MotivationCard = ({ className }: MotivationCardProps) => {
  const { motivationData, isLoading, error, refreshMotivation } = useMotivationMessage();

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className={`relative overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Bot className="h-5 w-5 text-primary animate-pulse" />
            <span>Coach Says</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Message skeleton */}
          <div className="space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded-md w-3/4"></div>
            <div className="h-4 bg-muted animate-pulse rounded-md w-full"></div>
            <div className="h-4 bg-muted animate-pulse rounded-md w-2/3"></div>
          </div>
          
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <div className="space-y-2">
              <div className="h-3 bg-muted animate-pulse rounded-md w-1/2"></div>
              <div className="h-6 bg-muted animate-pulse rounded-md w-3/4"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-muted animate-pulse rounded-md w-1/2"></div>
              <div className="h-6 bg-muted animate-pulse rounded-md w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !motivationData) {
    return (
      <Card className={`bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20 ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <MessageCircle className="h-5 w-5 text-destructive" />
            <span>Coach Says</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Unable to load your motivation message right now.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshMotivation}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!motivationData) return null;

  // Category-based styling and icons
  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'onTrack':
        return {
          gradient: 'from-green-500/10 to-emerald-500/10',
          border: 'border-green-500/20',
          badge: 'bg-green-500/10 text-green-700 border-green-500/20',
          icon: TrendingUp,
          badgeText: 'On Track! 🔥'
        };
      case 'almostThere':
        return {
          gradient: 'from-yellow-500/10 to-orange-500/10',
          border: 'border-yellow-500/20',
          badge: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
          icon: Target,
          badgeText: 'Almost There! 🎯'
        };
      case 'behind':
      default:
        return {
          gradient: 'from-blue-500/10 to-cyan-500/10',
          border: 'border-blue-500/20',
          badge: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
          icon: TrendingUp,
          badgeText: "Let's Go! 🚀"
        };
    }
  };

  const config = getCategoryConfig(motivationData.category);
  const CategoryIcon = config.icon;

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br ${config.gradient} ${config.border} !border-2 !border-emerald-500/60 bg-gradient-to-r from-emerald-500/30 to-green-500/30 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Bot className="h-5 w-5 text-primary" />
            <span>Coach Says</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshMotivation}
            className="h-8 w-8 p-0 hover:bg-primary/10"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-2">
          {/* Category Badge */}
          <Badge 
            variant="outline" 
            className={`${config.badge} flex items-center gap-1 w-fit`}
          >
            <CategoryIcon className="h-3 w-3" />
            {config.badgeText}
          </Badge>

          {/* Motivational Message */}
          <blockquote className="text-base font-medium leading-relaxed text-foreground/90 relative">
            <div className="absolute -left-2 -top-1 text-3xl text-primary/30 font-serif">"</div>
            <div className="pl-6">
              {motivationData.message}
            </div>
            <div className="absolute -right-2 -bottom-2 text-3xl text-primary/30 font-serif">"</div>
          </blockquote>

          {/* Progress Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">This Week</p>
              <p className="text-lg font-bold text-foreground">
                {motivationData.completion.totalMinutesThisWeek}
                <span className="text-sm font-normal text-muted-foreground ml-1">min</span>
              </p>
              <p className="text-xs text-muted-foreground">
                of {motivationData.completion.goalMinutes} goal
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Sessions</p>
              <p className="text-lg font-bold text-foreground">
                {motivationData.completion.sessionsThisWeek}
                <span className="text-sm font-normal text-muted-foreground ml-1">done</span>
              </p>
              <p className="text-xs text-muted-foreground">
                of {motivationData.completion.goalSessions} target
              </p>
            </div>
          </div>

          {/* Completion Percentage */}
          <div className="text-center pt-2">
            <p className="text-2xl font-bold text-primary">
              {motivationData.completion.completionPercentage}%
            </p>
            <p className="text-xs text-muted-foreground">
              Weekly Goal Progress
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};