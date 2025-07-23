import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X, ExternalLink, MessageSquare, Trophy, Target } from 'lucide-react';
import { MotivationalNotification } from '@/hooks/useExerciseChallenges';

interface NotificationPanelProps {
  notifications: MotivationalNotification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onActionTaken?: (notification: MotivationalNotification) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onMarkAsRead,
  onClearAll,
  onActionTaken
}) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'challenge_reminder': return <Target className="h-4 w-4 text-orange-500" />;
      case 'team_nudge': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'streak_celebration': return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'progress_update': return <Target className="h-4 w-4 text-green-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationBg = (type: string, isRead: boolean) => {
    const opacity = isRead ? 'bg-muted/30' : 'bg-background';
    switch (type) {
      case 'challenge_reminder': return `${opacity} border-orange-200 dark:border-orange-800`;
      case 'team_nudge': return `${opacity} border-blue-200 dark:border-blue-800`;
      case 'streak_celebration': return `${opacity} border-yellow-200 dark:border-yellow-800`;
      case 'progress_update': return `${opacity} border-green-200 dark:border-green-800`;
      default: return `${opacity} border-border`;
    }
  };

  if (notifications.length === 0) {
    return (
      <Card className="border border-border/50">
        <CardContent className="p-6 text-center">
          <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No notifications yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            We'll let you know when there's something exciting!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50 bg-gradient-to-br from-background/80 to-muted/20 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="default" className="text-xs px-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-xs"
            >
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${getNotificationBg(notification.type, notification.isRead)}`}
              onClick={() => !notification.isRead && onMarkAsRead(notification.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-medium text-sm text-foreground">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {notification.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{notification.emoji}</span>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  {notification.actionable && !notification.isRead && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3"
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onActionTaken?.(notification);
                          onMarkAsRead(notification.id);
                        }}
                        className="text-xs h-7 px-3"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Take Action
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};