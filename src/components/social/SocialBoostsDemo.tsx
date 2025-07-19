import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSocialBoosts } from '@/hooks/useSocialBoosts';
import { Heart, Users, Trophy, Sparkles, MessageCircle } from 'lucide-react';

export const SocialBoostsDemo = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { 
    handleFriendRequestSent, 
    handleFriendRequestAccepted,
    showTrendingChallengeToast,
    showMomentumBoostToast,
    showDailyMotivationToast 
  } = useSocialBoosts();

  const demoActions = [
    {
      id: 'friend-request-sent',
      title: '🎯 Friend Request Sent',
      description: 'Triggers: Challenge suggestion toast + trending challenge suggestion',
      icon: <Users className="h-5 w-5" />,
      action: () => handleFriendRequestSent('demo-friend-1', 'Sarah'),
    },
    {
      id: 'friend-request-accepted',
      title: '🤝 Friend Request Accepted',
      description: 'Triggers: "Pick your next challenge together" modal',
      icon: <Heart className="h-5 w-5" />,
      action: async () => {
        const result = await handleFriendRequestAccepted('demo-friend-2', 'Alex');
        if (result.showModal) {
          // Trigger the modal via the global function
          (window as any).triggerFriendConnectionModal?.('demo-friend-2', 'Alex');
        }
      },
    },
    {
      id: 'trending-challenge',
      title: '🔥 Trending Challenge',
      description: 'Shows trending challenge with friends already in it',
      icon: <Sparkles className="h-5 w-5" />,
      action: () => showTrendingChallengeToast('7-Day Clean Eating', 5),
    },
    {
      id: 'momentum-boost',
      title: '💪 Momentum Boost',
      description: 'Suggests another challenge after mutual completion',
      icon: <Trophy className="h-5 w-5" />,
      action: () => showMomentumBoostToast('Jordan'),
    },
    {
      id: 'daily-motivation',
      title: '🌟 Daily Motivation',
      description: 'Motivational message 1 day after team-up',
      icon: <MessageCircle className="h-5 w-5" />,
      action: () => showDailyMotivationToast('Maya'),
    },
  ];

  const handleDemoAction = async (action: () => void | Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Social Boosts Demo
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Try out the social boost features that trigger after team-up interactions
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {demoActions.map((demo) => (
          <div
            key={demo.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-primary/10 rounded-full">
                {demo.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">{demo.title}</h4>
                <p className="text-sm text-muted-foreground">{demo.description}</p>
              </div>
            </div>
            
            <Button
              size="sm"
              onClick={() => handleDemoAction(demo.action)}
              disabled={isLoading}
              className="ml-4"
            >
              {isLoading ? 'Triggering...' : 'Try It'}
            </Button>
          </div>
        ))}

        <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg">
          <div className="flex items-start gap-2 mb-2">
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              Integration Ready
            </Badge>
          </div>
          <p className="text-sm">
            <strong>How it works:</strong> These social boosts automatically trigger when users interact 
            with the team-up system. The timing logic ensures they only show at optimal moments 
            when users are most engaged.
          </p>
          
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <div>• <strong>Toast Suggestions:</strong> Immediate feedback after actions</div>
            <div>• <strong>Modal Prompts:</strong> Deeper engagement for accepted friend requests</div>
            <div>• <strong>Smart Timing:</strong> Respects user activity and engagement state</div>
            <div>• <strong>Anti-Spam:</strong> Prevents overwhelming users with too many prompts</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};