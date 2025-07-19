import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDailyDigest } from '@/hooks/useDailyDigest';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Bell, BellOff, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const CoachDailyDigest: React.FC = () => {
  const { digest } = useDailyDigest();
  const { hasPermission, requestPermission } = usePushNotifications();
  const { toast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    setNotificationsEnabled(hasPermission);
  }, [hasPermission]);

  const handleToggleNotifications = async () => {
    if (!hasPermission) {
      const token = await requestPermission();
      if (token) {
        setNotificationsEnabled(true);
        toast({
          title: "Notifications Enabled! 🔔",
          description: "You'll now receive daily digest updates from your AI coach.",
          duration: 5000,
        });
      }
    } else {
      setNotificationsEnabled(!notificationsEnabled);
      toast({
        title: notificationsEnabled ? "Notifications Disabled" : "Notifications Enabled",
        description: notificationsEnabled 
          ? "You won't receive daily digest notifications." 
          : "You'll receive daily digest updates from your AI coach.",
        duration: 3000,
      });
    }
  };

  const sendTestNotification = () => {
    if (digest?.friends_logged_today) {
      toast({
        title: "🤖 Daily Coach Update",
        description: `${digest.friends_logged_today} friends logged today. You're in the top ${digest.user_percentile}%! Keep it up! 💪`,
        duration: 8000,
      });
    } else {
      toast({
        title: "🤖 Daily Coach Update",
        description: "Stay consistent with your logging - your friends are counting on you! 💪",
        duration: 8000,
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Daily Coach Digest
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {notificationsEnabled ? (
              <Bell className="h-4 w-4 text-green-500" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              Daily Notifications
            </span>
            <Badge variant={notificationsEnabled ? "default" : "secondary"}>
              {notificationsEnabled ? "ON" : "OFF"}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleNotifications}
          >
            {notificationsEnabled ? "Disable" : "Enable"}
          </Button>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
          <h4 className="font-medium mb-2">🤖 Your AI Coach Says:</h4>
          <p className="text-sm text-muted-foreground mb-3">
            "I'll send you daily updates about your friends' progress, achievements, and motivation insights. 
            These personalized notifications help you stay connected and motivated!"
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={sendTestNotification}
            className="w-full"
          >
            Preview Daily Digest
          </Button>
        </div>

        {digest && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Today's Highlights:</h4>
            
            {digest.friends_logged_today > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>{digest.friends_logged_today} friends logged today</span>
              </div>
            )}

            {digest.top_friend_streak && digest.top_friend_streak.current_streak >= 3 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <span>{digest.top_friend_streak.friend_name} has a {digest.top_friend_streak.current_streak}-day streak</span>
              </div>
            )}

            {digest.flagged_ingredient_alerts.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                <span>{digest.flagged_ingredient_alerts.length} friend alert(s)</span>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          📅 Daily digest notifications are sent at 7:00 PM based on your friends' activity throughout the day.
        </div>
      </CardContent>
    </Card>
  );
};