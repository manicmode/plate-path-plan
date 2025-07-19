import React from 'react';
import { UserPlus, X, Trophy, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTeamUpPrompts } from '@/hooks/useTeamUpPrompts';

export const SmartTeamUpPrompt = () => {
  const { 
    currentPrompt, 
    sendFriendRequestFromPrompt, 
    dismissPrompt 
  } = useTeamUpPrompts();

  if (!currentPrompt) return null;

  const handleSendRequest = () => {
    sendFriendRequestFromPrompt(currentPrompt);
  };

  const handleDismiss = () => {
    dismissPrompt(currentPrompt);
  };

  const formatChallengeName = (challengeId: string) => {
    // Convert challenge ID to a more readable format
    return challengeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRankingBadgeText = () => {
    if (currentPrompt.shared_ranking_group) {
      const rankDiff = Math.abs(currentPrompt.current_user_rank_position - currentPrompt.buddy_rank_position);
      if (rankDiff <= 10) return "Similar Rank";
      if (rankDiff <= 25) return "Close Rank";
      return "Same League";
    }
    return "Different League";
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm mx-4 animate-scale-in">
      <Card className="bg-gradient-to-br from-primary/10 via-blue-500/10 to-purple-500/10 border-primary/30 shadow-xl backdrop-blur-sm">
        <CardContent className="p-6">
          {/* Header with close button */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Team-Up Opportunity!</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 hover:bg-muted/50"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Main content */}
          <div className="space-y-4">
            {/* User info and achievement */}
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                <AvatarFallback className="text-lg bg-gradient-to-br from-primary/20 to-blue-500/20">
                  {currentPrompt.buddy_name?.charAt(0) || '👤'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm truncate">
                    {currentPrompt.buddy_name}
                  </h4>
                  <Badge 
                    variant={currentPrompt.shared_ranking_group ? "default" : "outline"} 
                    className="text-xs"
                  >
                    {getRankingBadgeText()}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Target className="h-3 w-3" />
                  <span>Rank #{currentPrompt.buddy_rank_position}</span>
                </div>
              </div>
            </div>

            {/* Achievement message */}
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-sm">
                <span className="font-medium">You and {currentPrompt.buddy_name}</span> both crushed the{' '}
                <span className="font-semibold text-primary">
                  {formatChallengeName(currentPrompt.challenge_name)}
                </span>{' '}
                💪
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Want to team up as accountability buddies?
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleSendRequest}
                className="flex-1 bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white font-medium"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Send Friend Request
              </Button>
              
              <Button
                variant="outline"
                onClick={handleDismiss}
                className="px-4"
              >
                Maybe Later
              </Button>
            </div>

            {/* Additional context */}
            {currentPrompt.shared_ranking_group && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  🎯 You're both in the same ranking group - perfect accountability partners!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};