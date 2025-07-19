import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  user_id: string;
  type: 'challenge_complete' | 'challenge_invite' | 'leaderboard_shift' | 'team_update' | 'milestone_reached';
  title: string;
  message: string;
  data?: any;
  icon?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { notifications } = await req.json() as { notifications: NotificationPayload[] };

    console.log(`Processing ${notifications.length} notification(s)`);

    const results = [];

    for (const notification of notifications) {
      try {
        // Store notification in database
        const { data: storedNotification, error: storeError } = await supabase
          .from('user_notifications')
          .insert({
            user_id: notification.user_id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data || {},
            is_read: false
          })
          .select()
          .single();

        if (storeError) {
          console.error('Error storing notification:', storeError);
          results.push({ user_id: notification.user_id, success: false, error: storeError.message });
          continue;
        }

        // Send real-time notification via Supabase realtime
        const channel = supabase.channel(`user-${notification.user_id}`);
        await channel.send({
          type: 'broadcast',
          event: 'notification',
          payload: {
            id: storedNotification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            icon: notification.icon || '🎯',
            timestamp: new Date().toISOString()
          }
        });

        // For challenge completion notifications, also update challenge stats
        if (notification.type === 'challenge_complete') {
          await updateChallengeCompletionStats(supabase, notification);
        }

        // For leaderboard shift notifications, update user rankings
        if (notification.type === 'leaderboard_shift') {
          await updateUserRankings(supabase, notification);
        }

        results.push({ 
          user_id: notification.user_id, 
          success: true, 
          notification_id: storedNotification.id 
        });

      } catch (error) {
        console.error(`Error processing notification for user ${notification.user_id}:`, error);
        results.push({ 
          user_id: notification.user_id, 
          success: false, 
          error: error.message 
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      success: true,
      processed: notifications.length,
      successful,
      failed,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in notification sender:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function updateChallengeCompletionStats(supabase: any, notification: NotificationPayload) {
  try {
    const challengeId = notification.data?.challenge_id;
    if (!challengeId) return;

    // Increment completion count for the challenge
    const { error } = await supabase
      .rpc('increment_challenge_completions', {
        challenge_id_param: challengeId
      });

    if (error) {
      console.error('Error updating challenge completion stats:', error);
    }
  } catch (error) {
    console.error('Error in updateChallengeCompletionStats:', error);
  }
}

async function updateUserRankings(supabase: any, notification: NotificationPayload) {
  try {
    const userId = notification.user_id;
    const newRank = notification.data?.new_rank;
    const oldRank = notification.data?.old_rank;

    if (!newRank || !oldRank) return;

    // Update user's ranking history
    const { error } = await supabase
      .from('user_ranking_history')
      .insert({
        user_id: userId,
        old_rank: oldRank,
        new_rank: newRank,
        rank_change: oldRank - newRank,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating user ranking history:', error);
    }
  } catch (error) {
    console.error('Error in updateUserRankings:', error);
  }
}