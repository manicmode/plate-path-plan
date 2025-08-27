import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QAReportRequest {
  sinceHours?: number;
}

interface QAReport {
  window: { from: string; to: string };
  totals: { eligible: number; shown: number; dismissed: number; cta: number };
  byNudge: Array<{
    nudge_id: string;
    shown: number;
    dismissed: number;
    cta: number;
    last_shown?: string;
    cooldown_breaches: number;
  }>;
  overFiring: Array<{
    nudge_id: string;
    user_id: string;
    count: number;
    details: string[];
  }>;
  caps: {
    dailyExceeded: Array<{
      nudge_id: string;
      user_id: string;
      day: string;
      shows: number;
    }>;
  };
  sample: Array<{
    ts: string;
    user_id: string;
    nudge_id: string;
    event: string;
    reason: string;
    run_id: string;
  }>;
  pass: boolean;
  notes: string[];
}

const NUDGE_RULES = {
  'time_to_breathe': { cooldownDays: 4, maxPer7d: 2, dailyCap: 1 },
  'daily_checkin': { cooldownDays: 1, maxPer7d: 7, dailyCap: 1 },
  'hydration_reminder': { cooldownDays: 2, maxPer7d: 3, dailyCap: 1 },
  'movement_break': { cooldownDays: 2, maxPer7d: 3, dailyCap: 1 },
  'sleep_prep': { cooldownDays: 3, maxPer7d: 2, dailyCap: 1 }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { sinceHours = 24 }: QAReportRequest = await req.json().catch(() => ({}));

    // Calculate time window
    const now = new Date();
    const fromTime = new Date(now.getTime() - sinceHours * 60 * 60 * 1000);

    console.log(`Generating QA report from ${fromTime.toISOString()} to ${now.toISOString()}`);

    // Get all QA events in the time window
    const { data: qaEvents, error } = await supabase
      .from('nudge_events')
      .select('*')
      .like('run_id', 'qa-%')
      .gte('ts', fromTime.toISOString())
      .order('ts', { ascending: false });

    if (error) {
      console.error('Error fetching QA events:', error);
      throw error;
    }

    console.log(`Found ${qaEvents?.length || 0} QA events`);

    // Calculate totals
    const totals = {
      eligible: 0, // Would need to track this separately
      shown: qaEvents?.filter(e => e.event === 'shown').length || 0,
      dismissed: qaEvents?.filter(e => e.event === 'dismissed').length || 0,
      cta: qaEvents?.filter(e => e.event === 'cta').length || 0
    };

    // Group by nudge for analysis
    const nudgeGroups = qaEvents?.reduce((acc, event) => {
      if (!acc[event.nudge_id]) {
        acc[event.nudge_id] = [];
      }
      acc[event.nudge_id].push(event);
      return acc;
    }, {} as Record<string, any[]>) || {};

    // Analyze each nudge
    const byNudge = Object.entries(nudgeGroups).map(([nudgeId, events]) => {
      const shownEvents = events.filter(e => e.event === 'shown');
      const dismissedEvents = events.filter(e => e.event === 'dismissed');
      const ctaEvents = events.filter(e => e.event === 'cta');
      
      // Check for cooldown breaches
      let cooldownBreaches = 0;
      const rule = NUDGE_RULES[nudgeId];
      if (rule) {
        const sortedShown = shownEvents.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
        for (let i = 1; i < sortedShown.length; i++) {
          const timeDiff = new Date(sortedShown[i].ts).getTime() - new Date(sortedShown[i-1].ts).getTime();
          const cooldownMs = rule.cooldownDays * 24 * 60 * 60 * 1000;
          if (timeDiff < cooldownMs) {
            cooldownBreaches++;
          }
        }
      }

      return {
        nudge_id: nudgeId,
        shown: shownEvents.length,
        dismissed: dismissedEvents.length,
        cta: ctaEvents.length,
        last_shown: shownEvents.length > 0 ? 
          shownEvents.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())[0].ts : 
          undefined,
        cooldown_breaches: cooldownBreaches
      };
    });

    // Check for over-firing (same nudge to same user multiple times beyond caps)
    const overFiring: QAReport['overFiring'] = [];
    const userNudgeCounts = qaEvents?.reduce((acc, event) => {
      if (event.event !== 'shown') return acc;
      
      const key = `${event.user_id}-${event.nudge_id}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(event);
      return acc;
    }, {} as Record<string, any[]>) || {};

    Object.entries(userNudgeCounts).forEach(([key, events]) => {
      const [userId, nudgeId] = key.split('-');
      const rule = NUDGE_RULES[nudgeId];
      
      if (rule && events.length > rule.maxPer7d) {
        overFiring.push({
          nudge_id: nudgeId,
          user_id: userId,
          count: events.length,
          details: events.map(e => new Date(e.ts).toISOString())
        });
      }
    });

    // Check daily caps
    const dailyExceeded: QAReport['caps']['dailyExceeded'] = [];
    const dailyCounts = qaEvents?.reduce((acc, event) => {
      if (event.event !== 'shown') return acc;
      
      const day = event.ts.split('T')[0];
      const key = `${event.user_id}-${event.nudge_id}-${day}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    Object.entries(dailyCounts).forEach(([key, count]) => {
      const [userId, nudgeId, day] = key.split('-');
      const rule = NUDGE_RULES[nudgeId];
      
      if (rule && count > rule.dailyCap) {
        dailyExceeded.push({
          nudge_id: nudgeId,
          user_id: userId,
          day: day,
          shows: count
        });
      }
    });

    // Determine pass/fail and generate notes
    const notes: string[] = [];
    let pass = true;

    // Check for cooldown breaches
    const totalCooldownBreaches = byNudge.reduce((sum, n) => sum + n.cooldown_breaches, 0);
    if (totalCooldownBreaches > 0) {
      pass = false;
      notes.push(`Found ${totalCooldownBreaches} cooldown breaches`);
    }

    // Check for daily cap violations
    if (dailyExceeded.length > 0) {
      pass = false;
      notes.push(`Found ${dailyExceeded.length} daily cap violations`);
    }

    // Check for over-firing
    if (overFiring.length > 0) {
      pass = false;
      notes.push(`Found ${overFiring.length} over-firing violations`);
    }

    // Check global daily cap (max 2 nudges per scenario)
    const scenarioNudgeCounts = qaEvents?.reduce((acc, event) => {
      if (event.event !== 'shown') return acc;
      
      // Extract scenario from run_id (format: qa-date-user-scenario)
      const runIdParts = event.run_id.split('-');
      if (runIdParts.length >= 4) {
        const scenarioKey = runIdParts.slice(0, 4).join('-'); // qa-date-user-scenario
        acc[scenarioKey] = (acc[scenarioKey] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    const globalCapViolations = Object.entries(scenarioNudgeCounts).filter(([_, count]) => count > 2);
    if (globalCapViolations.length > 0) {
      pass = false;
      notes.push(`Found ${globalCapViolations.length} global daily cap violations (>2 nudges per scenario)`);
    }

    if (pass) {
      notes.push('All rules passed successfully');
    }

    // Sample of recent events (last 50)
    const sample = qaEvents?.slice(0, 50).map(event => ({
      ts: event.ts,
      user_id: event.user_id,
      nudge_id: event.nudge_id,
      event: event.event,
      reason: event.reason,
      run_id: event.run_id
    })) || [];

    const report: QAReport = {
      window: {
        from: fromTime.toISOString(),
        to: now.toISOString()
      },
      totals,
      byNudge,
      overFiring,
      caps: { dailyExceeded },
      sample,
      pass,
      notes
    };

    console.log(`QA Report generated: ${pass ? 'PASS' : 'FAIL'}, ${notes.length} notes`);

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in nudges-qa-report function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})