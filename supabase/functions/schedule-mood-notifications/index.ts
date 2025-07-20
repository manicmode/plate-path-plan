import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MoodNotificationRequest {
  user_id: string;
  fcm_token?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, fcm_token }: MoodNotificationRequest = await req.json();
    
    if (!user_id) {
      throw new Error('User ID is required');
    }

    // Check if user has daily mood check-in enabled
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.50.2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user preferences (this would need to be stored in database)
    // For now, we'll assume the notification is enabled if this endpoint is called

    // Check if user has already logged mood today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingLog } = await supabase
      .from('mood_logs')
      .select('id')
      .eq('user_id', user_id)
      .eq('date', today)
      .maybeSingle();

    if (existingLog) {
      return new Response(
        JSON.stringify({ message: 'User has already logged mood today' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Send push notification if FCM token is provided
    if (fcm_token) {
      const notificationData = {
        token: fcm_token,
        title: '🌙 Time for your daily check-in!',
        body: 'How are you feeling today? Log your mood and wellness.',
        data: {
          type: 'mood_checkin',
          action: 'open_mood_modal',
        },
      };

      const pushResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify(notificationData),
      });

      if (!pushResponse.ok) {
        console.error('Failed to send push notification');
      }
    }

    return new Response(
      JSON.stringify({ message: 'Mood check-in notification sent successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in mood notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);