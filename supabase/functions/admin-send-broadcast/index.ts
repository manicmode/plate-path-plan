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

    const { title, message, targetAudience } = await req.json();

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing title or message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target users based on audience
    let targetUserIds: string[] = [];
    
    if (targetAudience === 'all') {
      const { data: profiles } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id');
      
      targetUserIds = profiles?.map(p => p.user_id) || [];
    } else if (targetAudience === 'influencers') {
      const { data: influencers } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'influencer');
      
      targetUserIds = influencers?.map(i => i.user_id) || [];
    }

    // Create notifications for all target users
    if (targetUserIds.length > 0) {
      const notifications = targetUserIds.map(userId => ({
        user_id: userId,
        title,
        body: message,
        kind: 'broadcast',
        meta: {
          sent_by: userData.user.id,
          sent_at: new Date().toISOString(),
          audience: targetAudience || 'all'
        }
      }));

      const { error: insertError } = await supabaseAdmin
        .from('app_notifications')
        .insert(notifications);

      if (insertError) {
        throw insertError;
      }
    }

    console.log(`Admin ${userData.user.email} sent broadcast to ${targetUserIds.length} users: ${title}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Broadcast sent to ${targetUserIds.length} users`,
        sentCount: targetUserIds.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin broadcast error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});