import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

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
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type, user_id, scan_type } = await req.json();

    // Ensure user can only access their own data
    if (user_id && user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`Processing notification: ${type} for user ${user_id}`);

    // Get user profile for personalization
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('first_name')
      .eq('user_id', user_id)
      .single();

    const userName = profile?.first_name || 'there';

    if (type === 'scan_completed') {
      await handleScanCompleted(supabaseClient, user_id, userName, scan_type);
    } else if (type === 'check_reminders') {
      await checkAndSendReminders(supabaseClient);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in body-scan-notifications:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleScanCompleted(supabaseClient: any, userId: string, userName: string, scanType: string) {
  console.log(`Handling scan completion for user ${userId}, scan type: ${scanType}`);
  
  // Get all scans from the last 24 hours to check if this is a session
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const { data: recentScans } = await supabaseClient
    .from('body_scans')
    .select('type, created_at')
    .eq('user_id', userId)
    .gte('created_at', twentyFourHoursAgo.toISOString())
    .order('created_at', { ascending: false });

  if (!recentScans) return;

  const scanTypes = [...new Set(recentScans.map(scan => scan.type))];
  const scanCount = scanTypes.length;

  let title = '';
  let message = '';
  let notificationType = '';

  if (scanCount === 3) {
    // All 3 scans completed in one session
    title = '🎉 Full Body Scan Complete!';
    message = `Amazing work, ${userName}! You've completed your full-body scan set ✅ Keep this up and watch your transformation week by week 💪`;
    notificationType = 'scan_complete_praise';
  } else if (scanCount === 1 || scanCount === 2) {
    // Partial completion - encourage to finish
    const remaining = ['front', 'side', 'back'].filter(type => !scanTypes.includes(type));
    title = '📸 Almost There!';
    
    if (remaining.length === 1) {
      message = `Great start, ${userName}! Don't forget to capture your ${remaining[0]} scan too for the full picture 👀`;
    } else {
      message = `Nice work, ${userName}! Complete your ${remaining.join(' and ')} scans to get the full picture 👀`;
    }
    notificationType = 'scan_encourage_completion';
  }

  if (title && message) {
    await createNotification(supabaseClient, userId, title, message, notificationType);
  }
}

async function checkAndSendReminders(supabaseClient: any) {
  console.log('Checking for users who need scan reminders...');
  
  // Get all users who haven't completed a full scan set in the last 14 days
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // Get all users with profiles
  const { data: users } = await supabaseClient
    .from('user_profiles')
    .select('user_id, first_name');

  if (!users) return;

  for (const user of users) {
    // Check their recent scans
    const { data: recentScans } = await supabaseClient
      .from('body_scans')
      .select('type, created_at')
      .eq('user_id', user.user_id)
      .gte('created_at', fourteenDaysAgo.toISOString());

    if (!recentScans) continue;

    // Group scans by week to see if they have complete sets
    const weeklyScans = groupScansByWeek(recentScans);
    const hasCompleteSetInLast14Days = weeklyScans.some(week => 
      week.scanTypes.includes('front') && 
      week.scanTypes.includes('side') && 
      week.scanTypes.includes('back')
    );

    if (!hasCompleteSetInLast14Days) {
      // Check if we already sent a reminder recently (don't spam)
      const { data: recentReminders } = await supabaseClient
        .from('user_notifications')
        .select('created_at')
        .eq('user_id', user.user_id)
        .eq('type', 'scan_reminder')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .limit(1);

      if (!recentReminders || recentReminders.length === 0) {
        const userName = user.first_name || 'there';
        await createNotification(
          supabaseClient,
          user.user_id,
          '📸 Time for Your Progress Check!',
          `Haven't scanned in a while, ${userName}! Step into the scanner and track your progress 📸`,
          'scan_reminder'
        );
      }
    }
  }
}

function groupScansByWeek(scans: any[]) {
  const weeks: { [key: string]: { scanTypes: string[], dates: string[] } } = {};
  
  scans.forEach(scan => {
    const scanDate = new Date(scan.created_at);
    const weekStart = new Date(scanDate);
    weekStart.setDate(scanDate.getDate() - scanDate.getDay()); // Start of week (Sunday)
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeks[weekKey]) {
      weeks[weekKey] = { scanTypes: [], dates: [] };
    }
    
    if (!weeks[weekKey].scanTypes.includes(scan.type)) {
      weeks[weekKey].scanTypes.push(scan.type);
    }
    weeks[weekKey].dates.push(scan.created_at);
  });
  
  return Object.values(weeks);
}

async function createNotification(supabaseClient: any, userId: string, title: string, message: string, type: string) {
  try {
    const { error } = await supabaseClient
      .from('user_notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        is_read: false,
        data: { source: 'body_scan_system' }
      });

    if (error) {
      console.error('Error creating notification:', error);
    } else {
      console.log(`Created notification for user ${userId}: ${title}`);
    }
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}