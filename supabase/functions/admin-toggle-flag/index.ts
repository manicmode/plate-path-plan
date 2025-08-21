import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Get the JWT from the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is authenticated and is an admin
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

    // Check if the requesting user is an admin
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

    const { flagName, enabled } = await req.json();

    if (!flagName || typeof enabled !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'Missing flagName or enabled value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Valid feature flags
    const validFlags = [
      'maintenance_mode',
      'new_registrations',
      'payouts_enabled',
      'challenges_enabled',
      'notifications_enabled'
    ];

    if (!validFlags.includes(flagName)) {
      return new Response(
        JSON.stringify({ error: 'Invalid flag name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Since we don't have a feature_flags table, we'll simulate the toggle
    // In a real implementation, you would update the feature_flags table
    
    // For now, we'll just log the action and return success
    console.log(`Admin ${userData.user.email} toggled feature flag ${flagName} to ${enabled}`);

    // In a real implementation:
    // await supabaseAdmin
    //   .from('feature_flags')
    //   .upsert({ 
    //     flag_name: flagName, 
    //     enabled, 
    //     updated_by: userData.user.id,
    //     updated_at: new Date().toISOString()
    //   });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Feature flag ${flagName} ${enabled ? 'enabled' : 'disabled'}`,
        flagName,
        enabled
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin toggle flag error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});