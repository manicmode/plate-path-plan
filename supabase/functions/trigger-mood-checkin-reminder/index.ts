import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting mood check-in reminder CRON job...');

    // Verify this is called with service role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.includes('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract JWT and verify it's service role
    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'service_role') {
        console.error('Function requires service role, got:', payload.role);
        return new Response(JSON.stringify({ error: 'Forbidden - service role required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } catch (e) {
      console.error('Invalid JWT token:', e);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date().toISOString().split('T')[0];
    
    // Get users with enabled mood check-in preferences
    const { data: userPrefs, error: prefsError } = await supabaseClient
      .from('mood_checkin_prefs')
      .select('user_id, reminder_time_local, timezone, enabled')
      .eq('enabled', true);

    if (prefsError) {
      console.error('Error fetching user preferences:', prefsError);
      throw prefsError;
    }

    console.log(`Found ${userPrefs?.length || 0} users with enabled mood reminders`);

    let remindersSent = 0;
    let errors = 0;

    for (const pref of userPrefs || []) {
      try {
        // Parse reminder time (format: "20:30")
        const [hours, minutes] = pref.reminder_time_local.split(':').map(Number);
        
        // Get current time in user's timezone (simplified - use UTC for now)
        const now = new Date();
        const currentHour = now.getUTCHours();
        const currentMinute = now.getUTCMinutes();
        
        // Check if we're within ±10 minutes of reminder time
        const reminderTotalMinutes = hours * 60 + minutes;
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        const timeDiff = Math.abs(currentTotalMinutes - reminderTotalMinutes);
        
        // Account for day boundaries (e.g., 23:55 vs 00:05)
        const adjustedTimeDiff = Math.min(timeDiff, 1440 - timeDiff);
        
        if (adjustedTimeDiff > 10) {
          // Not within reminder window
          continue;
        }

        // Check if user already has a mood log for today
        const { data: existingMoodLog } = await supabaseClient
          .from('mood_logs')
          .select('id')
          .eq('user_id', pref.user_id)
          .eq('date', today)
          .maybeSingle();

        if (existingMoodLog) {
          // User already logged today
          continue;
        }

        // Check if we already sent a reminder today
        const { data: existingSend } = await supabaseClient
          .from('mood_checkin_sends')
          .select('id')
          .eq('user_id', pref.user_id)
          .eq('date_key', today)
          .maybeSingle();

        if (existingSend) {
          // Already sent reminder today
          continue;
        }

        // Get user profile for notification
        const { data: userProfile } = await supabaseClient
          .from('user_profiles')
          .select('first_name')
          .eq('user_id', pref.user_id)
          .maybeSingle();

        const userName = userProfile?.first_name || 'there';

        // Create notification
        const { error: notificationError } = await supabaseClient
          .from('user_notifications')
          .insert({
            user_id: pref.user_id,
            type: 'mood_checkin_reminder',
            title: '🌙 Daily Check-In Time',
            message: `Hey ${userName}! Time for your daily mood & wellness check-in.`,
            data: {
              reminder_type: 'daily_mood_checkin',
              local_time: pref.reminder_time_local
            }
          });

        if (notificationError) {
          console.error(`Error creating notification for user ${pref.user_id}:`, notificationError);
          errors++;
          continue;
        }

        // Log that we sent the reminder
        const { error: sendLogError } = await supabaseClient
          .from('mood_checkin_sends')
          .insert({
            user_id: pref.user_id,
            date_key: today,
            sent_at: new Date().toISOString()
          });

        if (sendLogError) {
          console.error(`Error logging send for user ${pref.user_id}:`, sendLogError);
          errors++;
          continue;
        }

        remindersSent++;
        console.log(`Sent mood check-in reminder to user ${pref.user_id}`);

      } catch (error) {
        console.error(`Error processing reminder for user ${pref.user_id}:`, error);
        errors++;
      }
    }

    console.log(`Mood check-in reminder CRON job completed. Sent: ${remindersSent}, Errors: ${errors}`);

    return new Response(
      JSON.stringify({
        success: true,
        remindersSent,
        errors,
        totalUsersChecked: userPrefs?.length || 0
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in mood check-in reminder CRON job:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        remindersSent: 0,
        errors: 1
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);