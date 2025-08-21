import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify user is authenticated and is an admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: userData, error: userError } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: adminCheck } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .single();

    if (!adminCheck) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code, percent_off } = await req.json();

    if (!code || !percent_off || percent_off < 1 || percent_off > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid code or percent_off (must be 1-100)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create coupon (upsert to handle duplicates)
    const { data: coupon, error: couponError } = await supabaseAdmin
      .from('coupon')
      .upsert({
        code: code.toUpperCase(),
        percent_off,
        created_by: userData.user.id,
        active: true
      })
      .select()
      .single();

    if (couponError) {
      throw couponError;
    }

    // Log the action
    await supabaseAdmin
      .from('admin_audit')
      .insert({
        actor_user_id: userData.user.id,
        action: 'coupon_create',
        target_id: coupon.id,
        meta: { code: coupon.code, percent_off: coupon.percent_off }
      });

    console.log(`Admin ${userData.user.email} created coupon: ${coupon.code} (${percent_off}% off)`);

    return new Response(
      JSON.stringify({
        success: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          percent_off: coupon.percent_off,
          active: coupon.active,
          created_at: coupon.created_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin coupon creation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});