
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: 'challenge_complete' | 'challenge_invite' | 'leaderboard_shift' | 'team_update' | 'milestone_reached';
  title: string;
  message: string;
  data?: any;
  created_at: string;
  is_read: boolean;
}

export const useNotificationSystem = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Load existing notifications
    loadNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel(`user-${user.id}`)
      .on('broadcast', { event: 'notification' }, (payload) => {
        const notification = payload.payload as Notification;
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show toast notification
        toast.success(notification.title, {
          description: notification.message,
          action: notification.data?.actionUrl ? {
            label: 'View',
            onClick: () => window.location.href = notification.data.actionUrl
          } : undefined
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading notifications:', error);
      return;
    }

    setNotifications(data || []);
    setUnreadCount(data?.filter(n => !n.is_read).length || 0);
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user?.id);

    if (error) {
      console.error('Error marking notification as read:', error);
      return;
    }

    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const sendNotification = async (
    userId: string, 
    type: Notification['type'], 
    title: string, 
    message: string, 
    data?: any
  ) => {
    try {
      await supabase.functions.invoke('challenge-notification-sender', {
        body: {
          notifications: [{
            user_id: userId,
            type,
            title,
            message,
            data,
            icon: getNotificationIcon(type)
          }]
        }
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'challenge_complete': return '🏆';
      case 'challenge_invite': return '🎯';
      case 'leaderboard_shift': return '📈';
      case 'team_update': return '👥';
      case 'milestone_reached': return '🎉';
      default: return '🔔';
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    sendNotification,
    loadNotifications
  };
};
