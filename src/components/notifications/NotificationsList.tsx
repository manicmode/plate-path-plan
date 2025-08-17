import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Bell, UserPlus, Users, CheckCircle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  payload: any;
  read_at: string | null;
  created_at: string;
  user_id: string;
}

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 border-b last:border-b-0">
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2 mb-1" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case 'friend_request_incoming':
      return <UserPlus className="w-5 h-5 text-blue-600" />;
    case 'friend_request_accepted':
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    default:
      return <Bell className="w-5 h-5 text-muted-foreground" />;
  }
}

function NotificationItem({ notification, onRead }: { 
  notification: Notification; 
  onRead: (id: string) => void;
}) {
  const navigate = useNavigate();
  const isUnread = !notification.read_at;

  const handleClick = () => {
    // Mark as read if unread
    if (isUnread) {
      onRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'friend_request_incoming' || notification.type === 'friend_request_accepted') {
      navigate('/friends');
    }
  };

  return (
    <div 
      className={`flex items-start gap-3 p-4 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors ${
        isUnread ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        <NotificationIcon type={notification.type} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <h4 className={`font-medium text-sm ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
            {notification.title}
          </h4>
          {isUnread && (
            <div className="w-2 h-2 bg-blue-600 rounded-full ml-2 flex-shrink-0" />
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {notification.body}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export function NotificationsList() {
  const { rows: notifications, loading, markAsRead, markAllAsRead } = useNotifications(50);
  const unreadCount = notifications.filter(n => !n.read_at).length;

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead([notificationId]);
  };

  const handleMarkAllAsRead = () => {
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
    if (unreadIds.length > 0) {
      markAllAsRead();
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </h3>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={handleMarkAsRead}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}