import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📊 Voice minutes request started');

    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current month key
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Get or create quota record for current month
    let { data: quota, error } = await supabase
      .from('voice_quota')
      .select('*')
      .eq('user_id', user.id)
      .eq('month_key', currentMonth)
      .single();

    if (error && error.code === 'PGRST116') {
      // No record exists, create one with defaults
      const { data: newQuota, error: insertError } = await supabase
        .from('voice_quota')
        .insert({
          user_id: user.id,
          plan_minutes: 200, // Default plan minutes
          used_seconds_month: 0,
          month_key: currentMonth
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create quota record: ${insertError.message}`);
      }

      quota = newQuota;
    } else if (error) {
      throw new Error(`Failed to fetch quota: ${error.message}`);
    }

    // Calculate remaining seconds
    const totalSeconds = quota.plan_minutes * 60;
    const remainingSeconds = Math.max(0, totalSeconds - quota.used_seconds_month);

    const response = {
      plan_minutes: quota.plan_minutes,
      used_seconds_month: quota.used_seconds_month,
      remaining_seconds: remainingSeconds,
      month_key: quota.month_key
    };

    console.log('✅ Voice minutes response:', response);
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Voice minutes error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to get voice minutes' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});