import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';

export const useFlaggedIngredientNotifications = () => {
  const { user } = useAuth();
  const { hasPermission } = usePushNotifications();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !hasPermission) return;

    // Set up real-time listener for toxin detections from friends
    const channel = supabase
      .channel('flagged-ingredients-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'toxin_detections'
        },
        async (payload) => {
          try {
            // Check if this toxin detection is from a friend
            const { data: friendship } = await supabase
              .from('user_friends')
              .select('friend_id')
              .eq('user_id', user.id)
              .eq('friend_id', payload.new.user_id)
              .eq('status', 'accepted')
              .single();

            if (friendship) {
              // Get friend's profile for name
              const { data: friendProfile } = await supabase
                .from('user_profiles')
                .select('first_name, last_name')
                .eq('user_id', payload.new.user_id)
                .single();

              const friendName = friendProfile 
                ? `${friendProfile.first_name || ''} ${friendProfile.last_name || ''}`.trim() || 'Your friend'
                : 'Your friend';

              const flaggedIngredient = payload.new.detected_ingredients?.[0] || 'unknown ingredient';

              // Show toast notification
              toast({
                title: "Friend Alert 👀",
                description: `${friendName} just logged a flagged ingredient (${flaggedIngredient}). Want to remind them to stay clean?`,
                duration: 10000,
              });

              // Send push notification
              try {
                await supabase.functions.invoke('send-push-notification', {
                  body: {
                    title: 'Friend Alert 👀',
                    body: `${friendName} logged a flagged ingredient: ${flaggedIngredient}`,
                    data: {
                      type: 'flagged_ingredient',
                      friend_id: payload.new.user_id,
                      friend_name: friendName,
                      ingredient: flaggedIngredient
                    }
                  }
                });
              } catch (error) {
                console.error('Error sending push notification:', error);
              }
            }
          } catch (error) {
            console.error('Error processing flagged ingredient notification:', error);
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, hasPermission, toast]);

  return null; // This hook doesn't return anything, it just sets up notifications
};