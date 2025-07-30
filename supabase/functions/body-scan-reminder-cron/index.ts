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
    console.log('Starting body scan reminder CRON job...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current date
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Find users who need body scan reminders
    const { data: usersNeedingReminders, error: queryError } = await supabaseClient
      .from('body_scan_reminders')
      .select(`
        user_id,
        next_due_scan_at,
        reminder_sent_at,
        scan_streak,
        user_profiles!inner(first_name, last_name)
      `)
      .lte('next_due_scan_at', currentDate)
      .or(`reminder_sent_at.is.null,reminder_sent_at.lt.${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`);

    if (queryError) {
      console.error('Error fetching users needing reminders:', queryError);
      throw queryError;
    }

    console.log(`Found ${usersNeedingReminders?.length || 0} users needing body scan reminders`);

    let remindersSent = 0;
    let errors = 0;

    for (const user of usersNeedingReminders || []) {
      try {
        const userName = user.user_profiles?.first_name || 'there';
        const streakText = user.scan_streak > 1 ? ` Keep your ${user.scan_streak}-scan streak going!` : '';
        
        // Create notification
        const { error: notificationError } = await supabaseClient
          .from('user_notifications')
          .insert({
            user_id: user.user_id,
            type: 'body_scan_reminder',
            title: '🔁 Monthly Body Scan Due',
            message: `Hey ${userName}! Time for your monthly Body Scan to track posture, balance & progress.${streakText}`,
            data: {
              scan_streak: user.scan_streak,
              reminder_type: 'monthly_body_scan'
            }
          });

        if (notificationError) {
          console.error(`Error creating notification for user ${user.user_id}:`, notificationError);
          errors++;
          continue;
        }

        // Update reminder_sent_at
        const { error: updateError } = await supabaseClient
          .from('body_scan_reminders')
          .update({ 
            reminder_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.user_id);

        if (updateError) {
          console.error(`Error updating reminder timestamp for user ${user.user_id}:`, updateError);
          errors++;
          continue;
        }

        remindersSent++;
        console.log(`Sent body scan reminder to user ${user.user_id}`);

      } catch (error) {
        console.error(`Error processing reminder for user ${user.user_id}:`, error);
        errors++;
      }
    }

    console.log(`Body scan reminder CRON job completed. Sent: ${remindersSent}, Errors: ${errors}`);

    return new Response(
      JSON.stringify({
        success: true,
        remindersSent,
        errors,
        totalUsersChecked: usersNeedingReminders?.length || 0
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
    console.error('Error in body scan reminder CRON job:', error);
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