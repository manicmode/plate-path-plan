import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Row = {
  user_id: string;
  slug: string;
  reminder_at: string | null; // "HH:MM:SS" or null
};

type PushResult = { ok: boolean; sent: number; skipped: number; items: number };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Create supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Matching logic:
 * - Treat reminder_at as a wall time (HH:MM:SS) in app tz (assume UTC for MVP).
 * - Fire if reminder_at is within [now .. now+5min) (by minute).
 */
function withinWindow(reminder_at: string, now: Date): boolean {
  const [hh, mm] = reminder_at.split(":").map(Number);
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const remMin = hh * 60 + mm;
  // 5-minute window
  return remMin >= nowMin && remMin < nowMin + 5;
}

async function fetchCandidates(now: Date): Promise<Row[]> {
  console.log('Fetching candidates for reminder dispatch at:', now.toISOString());
  
  // Pull active habits with reminder_at set
  const { data, error } = await supabase
    .from('user_habit')
    .select('user_id, slug, reminder_at')
    .eq('status', 'active')
    .not('reminder_at', 'is', null);

  if (error) {
    console.error('Error fetching candidates:', error);
    throw error;
  }

  // Transform reminder_at to string format
  const candidates: Row[] = (data || []).map(row => ({
    user_id: row.user_id,
    slug: row.slug,
    reminder_at: row.reminder_at ? row.reminder_at : null
  }));

  console.log(`Found ${candidates.length} habits with reminders set`);
  return candidates;
}

async function alreadyLoggedToday(user_id: string, slug: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const { data, error } = await supabase
    .from('habit_log')
    .select('id')
    .eq('user_id', user_id)
    .gte('ts', `${today}T00:00:00.000Z`)
    .lt('ts', `${today}T23:59:59.999Z`)
    .limit(1);

  if (error) {
    console.error('Error checking today logs:', error);
    return false; // If unsure, allow the nudge
  }

  // Also check via the join approach to be sure
  const { data: joinData, error: joinError } = await supabase.rpc('custom_sql', {
    query: `
      SELECT 1
      FROM public.habit_log hl
      JOIN public.user_habit uh ON uh.id = hl.habit_id
      WHERE uh.user_id = $1 AND uh.slug = $2
        AND hl.ts::date = CURRENT_DATE
      LIMIT 1
    `,
    args: [user_id, slug]
  });

  if (joinError) {
    console.log('Join query failed, using simpler check');
    return (data || []).length > 0;
  }

  return (joinData || []).length > 0;
}

// Placeholder push — replace with your push pipeline.
// For now, fallback: insert into habit_nudges.
async function sendFallbackNudge(user_id: string, slug: string, scheduled_for: Date) {
  console.log(`Sending fallback nudge for user ${user_id}, habit ${slug}`);
  
  const { error } = await supabase
    .from('habit_nudges')
    .insert({
      user_id,
      habit_slug: slug,
      scheduled_for: scheduled_for.toISOString(),
      channel: 'fallback',
      meta: { reason: 'reminder_dispatch', timestamp: scheduled_for.toISOString() }
    });

  if (error) {
    console.error('Error inserting nudge:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== Habit Reminder Dispatch Started ===');
  
  try {
    const now = new Date(); // treat as UTC for MVP
    console.log('Current time (UTC):', now.toISOString());
    
    const all = await fetchCandidates(now);
    const due = all.filter(r => r.reminder_at && withinWindow(r.reminder_at, now));

    console.log(`Found ${due.length} habits due for reminders in current 5-min window`);

    let sent = 0, skipped = 0;
    for (const row of due) {
      console.log(`Processing reminder for user ${row.user_id}, habit ${row.slug}`);
      
      const logged = await alreadyLoggedToday(row.user_id, row.slug);
      if (logged) { 
        console.log(`Skipping - already logged today: ${row.slug}`);
        skipped++; 
        continue; 
      }

      // TODO: replace with real push integration if available
      await sendFallbackNudge(row.user_id, row.slug, now);
      sent++;
    }

    const result: PushResult = { ok: true, sent, skipped, items: due.length };
    console.log('=== Dispatch completed ===', result);
    
    return new Response(JSON.stringify(result), { 
      status: 200, 
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (e) {
    console.error('=== Dispatch failed ===', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { 
      status: 500,
      headers: {
        "Content-Type": "application/json", 
        ...corsHeaders
      }
    });
  }
});