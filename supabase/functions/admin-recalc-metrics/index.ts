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

    // Recalculate metrics (same logic as get-metrics but explicitly refresh any cached data)
    const [usersResult, profilesResult, challengesResult, ordersResult, couponsResult, notificationsResult] = await Promise.all([
      supabaseAdmin.from('user_profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('user_profiles').select('id').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabaseAdmin.from('private_challenges').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('challenge_order').select('total_amount_cents').not('total_amount_cents', 'is', null),
      supabaseAdmin.from('coupon').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true })
    ]);

    const totalUsers = usersResult.count || 0;
    const newUsers7d = profilesResult.data?.length || 0;
    const totalChallenges = challengesResult.count || 0;
    const totalCoupons = couponsResult.count || 0;
    const totalNotifications = notificationsResult.count || 0;
    
    const totalRevenue = ordersResult.data?.reduce((sum, order) => sum + (order.total_amount_cents || 0), 0) || 0;

    // Log the recalculation
    await supabaseAdmin
      .from('admin_audit')
      .insert({
        actor_user_id: userData.user.id,
        action: 'metrics_recalc',
        meta: { 
          recalculatedAt: new Date().toISOString(),
          counts: { totalUsers, newUsers7d, totalChallenges, totalCoupons, totalNotifications }
        }
      });

    console.log(`Admin ${userData.user.email} recalculated metrics: ${totalUsers} users, ${totalChallenges} challenges`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Metrics recalculated successfully',
        summary: {
          totalUsers,
          newUsers7d,
          totalChallenges,
          totalCoupons,
          totalNotifications,
          totalRevenue,
          recalculatedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin recalc metrics error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});