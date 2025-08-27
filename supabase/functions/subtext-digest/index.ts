import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailyMetric {
  picked_id: string;
  category: string;
  shown: number;
  cta: number;
  users: number;
  ctr_pct: number | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[subtext-digest] Starting daily digest generation');

    // Check feature flag
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: flagData, error: flagError } = await supabase
      .rpc('is_feature_enabled', { feature_key: 'subtext_digest_enabled' });

    if (flagError) {
      console.error('[subtext-digest] Error checking feature flag:', flagError);
      return new Response(
        JSON.stringify({ error: 'Failed to check feature flag' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!flagData) {
      console.log('[subtext-digest] Feature flag disabled, returning 204');
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log(`[subtext-digest] Generating digest for ${yesterdayStr}`);

    // Fetch daily metrics for yesterday
    const { data: metrics, error: metricsError } = await supabase
      .from('v_subtext_daily_metrics')
      .select('*')
      .eq('day', yesterdayStr)
      .order('shown', { ascending: false });

    if (metricsError) {
      console.error('[subtext-digest] Error fetching metrics:', metricsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch metrics' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dailyMetrics = metrics as DailyMetric[];

    if (!dailyMetrics || dailyMetrics.length === 0) {
      console.log('[subtext-digest] No metrics found for yesterday');
      return new Response(
        JSON.stringify({ message: 'No metrics data for yesterday' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate overall stats
    const totalShown = dailyMetrics.reduce((sum, m) => sum + m.shown, 0);
    const totalCta = dailyMetrics.reduce((sum, m) => sum + m.cta, 0);
    const totalUsers = dailyMetrics.reduce((sum, m) => sum + m.users, 0);
    const overallCtr = totalShown > 0 ? ((totalCta / totalShown) * 100).toFixed(2) : '0.00';

    // Get top 5 by impressions
    const topByShown = dailyMetrics.slice(0, 5);

    // Get top 5 by CTR (minimum 10 impressions)
    const topByCtr = dailyMetrics
      .filter(m => m.shown >= 10)
      .sort((a, b) => (b.ctr_pct || 0) - (a.ctr_pct || 0))
      .slice(0, 5);

    // Prepare digest content
    const digest = {
      date: yesterdayStr,
      summary: {
        totalShown,
        totalCta,
        totalUsers,
        overallCtr: parseFloat(overallCtr),
        uniqueMessages: dailyMetrics.length
      },
      topPerformers: {
        byImpressions: topByShown.map(m => ({
          id: m.picked_id,
          category: m.category,
          shown: m.shown,
          cta: m.cta,
          ctr: m.ctr_pct || 0
        })),
        byCtr: topByCtr.map(m => ({
          id: m.picked_id,
          category: m.category,
          shown: m.shown,
          cta: m.cta,
          ctr: m.ctr_pct || 0
        }))
      }
    };

    console.log('[subtext-digest] Digest generated:', digest);

    // Send to webhook if configured
    const webhookUrl = Deno.env.get('SUBTEXT_ALERT_WEBHOOK');
    if (webhookUrl) {
      console.log('[subtext-digest] Sending to webhook');
    } else {
      console.log('[subtext-digest] No webhook configured (SUBTEXT_ALERT_WEBHOOK not set)');
    }
    
    if (webhookUrl) {
      
      const webhookPayload = {
        text: `📊 Hero Subtext Daily Digest - ${yesterdayStr}`,
        embeds: [{
          title: "Hero Subtext Performance",
          color: 0x3498db,
          fields: [
            {
              name: "📈 Overall Stats",
              value: `• **${totalShown.toLocaleString()}** impressions\n• **${totalCta.toLocaleString()}** CTAs\n• **${totalUsers.toLocaleString()}** unique users\n• **${overallCtr}%** overall CTR`,
              inline: false
            },
            {
              name: "🔥 Top by Impressions",
              value: topByShown.slice(0, 3).map(m => 
                `• \`${m.picked_id}\` - ${m.shown.toLocaleString()} shown (${(m.ctr_pct || 0).toFixed(1)}% CTR)`
              ).join('\n') || 'No data',
              inline: true
            },
            {
              name: "⚡ Top by CTR",
              value: topByCtr.slice(0, 3).map(m => 
                `• \`${m.picked_id}\` - ${(m.ctr_pct || 0).toFixed(1)}% CTR (${m.shown} shown)`
              ).join('\n') || 'No data',
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }]
      };

      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!webhookResponse.ok) {
          console.error('[subtext-digest] Webhook failed:', webhookResponse.status, await webhookResponse.text());
        } else {
          console.log('[subtext-digest] Webhook sent successfully');
        }
      } catch (webhookError) {
        console.error('[subtext-digest] Webhook error:', webhookError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        digest,
        webhookSent: !!webhookUrl
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[subtext-digest] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});