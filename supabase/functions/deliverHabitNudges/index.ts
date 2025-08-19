import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NudgeRow {
  id: string;
  user_id: string;
  habit_slug: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🚀 Starting habit nudge delivery job...');

  try {
    // Create admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1) Claim unsent nudges atomically
    console.log('📋 Claiming unsent nudges...');
    const { data: nudges, error: claimError } = await supabaseAdmin.rpc('rpc_claim_nudges', {
      p_limit: 100
    });

    if (claimError) {
      console.error('❌ Error claiming nudges:', claimError);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: claimError.message 
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const nudgeList = nudges as NudgeRow[] || [];
    console.log(`📦 Claimed ${nudgeList.length} nudges for delivery`);

    let sent = 0;
    let failed = 0;

    // 2) Process each nudge
    for (const nudge of nudgeList) {
      console.log(`📤 Processing nudge for user ${nudge.user_id}, habit: ${nudge.habit_slug}`);

      try {
        // Get user's FCM token
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .select('fcm_token')
          .eq('user_id', nudge.user_id)
          .maybeSingle();

        if (profileError) {
          console.error(`❌ Error fetching profile for user ${nudge.user_id}:`, profileError);
          await markNudgeError(supabaseAdmin, nudge.id, `profile_error: ${profileError.message}`);
          failed++;
          continue;
        }

        if (!profile?.fcm_token) {
          console.log(`⚠️ No FCM token for user ${nudge.user_id}`);
          await markNudgeError(supabaseAdmin, nudge.id, 'no_fcm_token');
          failed++;
          continue;
        }

        // 3) Send push notification via existing send-push-notification function
        const pushData = {
          token: profile.fcm_token,
          title: "Time for your habit! 🎯",
          body: prettifyHabitSlug(nudge.habit_slug),
          data: {
            habit_slug: nudge.habit_slug,
            kind: 'habit_reminder',
            action: 'open_habit_detail'
          }
        };

        console.log(`📱 Sending push notification for habit: ${nudge.habit_slug}`);
        const { error: pushError } = await supabaseAdmin.functions.invoke('send-push-notification', {
          body: pushData
        });

        if (pushError) {
          console.error(`❌ Push notification failed for user ${nudge.user_id}:`, pushError);
          await markNudgeError(supabaseAdmin, nudge.id, `push_error: ${pushError.message}`);
          failed++;
        } else {
          console.log(`✅ Push notification sent successfully for user ${nudge.user_id}`);
          await markNudgeSent(supabaseAdmin, nudge.id);
          sent++;
        }

      } catch (error) {
        console.error(`❌ Unexpected error processing nudge ${nudge.id}:`, error);
        await markNudgeError(supabaseAdmin, nudge.id, `unexpected_error: ${error.message}`);
        failed++;
      }
    }

    const result = {
      ok: true,
      timestamp: new Date().toISOString(),
      processed: nudgeList.length,
      sent,
      failed,
      summary: `Delivered ${sent}/${nudgeList.length} habit reminders`
    };

    console.log(`🎉 Delivery job completed:`, result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 Fatal error in delivery job:', error);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// Helper functions
async function markNudgeSent(supabase: any, nudgeId: string) {
  const { error } = await supabase.rpc('mark_nudge_sent', { p_id: nudgeId });
  if (error) {
    console.error(`Failed to mark nudge ${nudgeId} as sent:`, error);
  }
}

async function markNudgeError(supabase: any, nudgeId: string, errorMsg: string) {
  const { error } = await supabase.rpc('mark_nudge_error', { 
    p_id: nudgeId, 
    p_err: errorMsg.substring(0, 255) // Truncate long error messages
  });
  if (error) {
    console.error(`Failed to mark nudge ${nudgeId} error:`, error);
  }
}

function prettifyHabitSlug(slug: string): string {
  // Convert slug to user-friendly text
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/^\d+/, '') // Remove leading numbers
    .trim();
}

serve(handler);