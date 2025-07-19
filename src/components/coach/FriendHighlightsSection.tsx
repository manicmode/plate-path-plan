import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useDailyDigest } from '@/hooks/useDailyDigest';
import { Loader2, Users, TrendingUp, Award, AlertTriangle } from 'lucide-react';

export const FriendHighlightsSection: React.FC = () => {
  const { digest, isLoading, refreshDigest } = useDailyDigest();

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            What Your Friends Are Up To
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading friend updates...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!digest) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            What Your Friends Are Up To
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No friends found. Connect with friends to see their activity!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          What Your Friends Are Up To
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={refreshDigest}
          className="ml-auto"
        >
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Daily Activity Summary */}
        {digest.friends_logged_today > 0 && (
          <div className="p-4 rounded-lg bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-medium">Daily Activity</span>
            </div>
            <p className="text-sm">
              <span className="font-semibold text-primary">{digest.friends_logged_today}</span> of your friends logged today. 
              You're in the top <span className="font-semibold text-primary">{digest.user_percentile}%</span>! 💪
            </p>
          </div>
        )}

        {/* Top Friend Streak */}
        {digest.top_friend_streak && digest.top_friend_streak.current_streak >= 3 && (
          <>
            <Separator />
            <div className="p-4 rounded-lg bg-orange-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-orange-500" />
                <span className="font-medium">Friend Achievement</span>
              </div>
              <p className="text-sm">
                <span className="font-semibold">{digest.top_friend_streak.friend_name}</span> is on a{' '}
                <Badge variant="secondary" className="mx-1">
                  {digest.top_friend_streak.current_streak}-day streak
                </Badge>
                in {digest.top_friend_streak.streak_type}! 🔥
              </p>
            </div>
          </>
        )}

        {/* Mutual Motivation */}
        {digest.mutual_motivation_friend && (
          <>
            <Separator />
            <div className="p-4 rounded-lg bg-green-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="font-medium">Motivation Insight</span>
              </div>
              <p className="text-sm">
                <span className="font-semibold">{digest.mutual_motivation_friend}</span> logs more consistently when you do. 
                You're both great motivators! 🤝
              </p>
            </div>
          </>
        )}

        {/* Flagged Ingredient Alerts */}
        {digest.flagged_ingredient_alerts.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="font-medium">Friend Alerts</span>
              </div>
              {digest.flagged_ingredient_alerts.slice(0, 2).map((alert, index) => (
                <div key={index} className="p-3 rounded-lg bg-amber-500/5 border border-amber-200">
                  <p className="text-sm">
                    👀 <span className="font-semibold">{alert.friend_name}</span> logged a flagged ingredient
                    ({alert.ingredient}). Want to remind them to stay clean?
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(alert.logged_at).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Quick Stats */}
        <Separator />
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">{digest.friends_logged_today}</div>
            <div className="text-xs text-muted-foreground">Friends Active Today</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">{digest.user_percentile}%</div>
            <div className="text-xs text-muted-foreground">Your Percentile</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};