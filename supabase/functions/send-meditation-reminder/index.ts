import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MeditationReminder {
  id: string;
  user_id: string;
  time_of_day: string;
  recurrence: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current time and day
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();

    console.log(`Checking reminders for time: ${currentTime}, day: ${currentDay}`);

    // Fetch all active meditation reminders for the current time
    const { data: reminders, error } = await supabase
      .from('meditation_reminders')
      .select('*')
      .eq('time_of_day', currentTime);

    if (error) {
      console.error('Error fetching reminders:', error);
      throw error;
    }

    console.log(`Found ${reminders?.length || 0} reminders for ${currentTime}`);

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No reminders found for current time' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter reminders based on recurrence
    const applicableReminders = reminders.filter((reminder: MeditationReminder) => {
      switch (reminder.recurrence) {
        case 'daily':
          return true;
        case 'weekdays':
          return !['sat', 'sun'].includes(currentDay);
        case 'weekends':
          return ['sat', 'sun'].includes(currentDay);
        default:
          // Custom days format: "mon,wed,fri"
          return reminder.recurrence.split(',').includes(currentDay);
      }
    });

    console.log(`Found ${applicableReminders.length} applicable reminders`);

    // Process each applicable reminder
    const results = [];
    for (const reminder of applicableReminders) {
      try {
        // Check user's nudge preferences
        const { data: preferences } = await supabase
          .from('meditation_nudge_preferences')
          .select('push_notifications_enabled')
          .eq('user_id', reminder.user_id)
          .single();

        // Skip if user has disabled push notifications
        if (preferences && !preferences.push_notifications_enabled) {
          console.log(`Skipping reminder for user ${reminder.user_id} - push notifications disabled`);
          continue;
        }

        // TODO: Implement actual push notification logic here
        // For now, just log the reminder that would be sent
        const reminderMessage = "🧘 It's time to recenter your mind. Let's meditate.";
        
        console.log(`Would send push notification to user ${reminder.user_id}: ${reminderMessage}`);

        // Log the nudge in history
        const { error: historyError } = await supabase
          .from('meditation_nudge_history')
          .insert({
            user_id: reminder.user_id,
            nudge_type: 'daily_reminder',
            nudge_reason: 'scheduled',
            user_action: 'sent', // Will be updated when user responds
            nudge_message: reminderMessage
          });

        if (historyError) {
          console.error('Error logging nudge history:', historyError);
        }

        results.push({
          user_id: reminder.user_id,
          message: reminderMessage,
          status: 'sent'
        });

      } catch (error) {
        console.error(`Error processing reminder for user ${reminder.user_id}:`, error);
        results.push({
          user_id: reminder.user_id,
          status: 'error',
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${results.length} reminders`,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-meditation-reminder function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});