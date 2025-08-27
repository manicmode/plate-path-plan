import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DailyMetric {
  day: string;
  nudge_id: string;
  shown: number;
  cta: number;
  dismissed: number;
  users: number;
  ctr_pct: number;
  dismiss_pct: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting daily nudge digest...");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate yesterday in PT timezone
    const now = new Date();
    const yesterdayPT = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const yesterdayDateStr = yesterdayPT.toISOString().split('T')[0];

    console.log(`Fetching metrics for ${yesterdayDateStr}`);

    // Query daily metrics for yesterday
    const { data: metrics, error } = await supabase
      .from('v_nudge_daily_metrics')
      .select('*')
      .eq('day', yesterdayDateStr)
      .order('nudge_id');

    if (error) {
      console.error("Error fetching metrics:", error);
      throw new Error(`Failed to fetch metrics: ${error.message}`);
    }

    console.log(`Found ${metrics?.length || 0} metric records`);

    // Generate digest content
    let digestContent: string;
    
    if (!metrics || metrics.length === 0) {
      digestContent = `# Daily Nudge Digest - ${yesterdayDateStr}\n\nNo nudge events recorded yesterday.`;
    } else {
      // Calculate totals
      const totals = metrics.reduce((acc, m) => ({
        shown: acc.shown + (m.shown || 0),
        cta: acc.cta + (m.cta || 0),
        dismissed: acc.dismissed + (m.dismissed || 0),
        users: acc.users + (m.users || 0)
      }), { shown: 0, cta: 0, dismissed: 0, users: 0 });

      const overallCTR = totals.shown > 0 ? ((totals.cta / totals.shown) * 100).toFixed(2) : '0.00';
      const overallDismissRate = totals.shown > 0 ? ((totals.dismissed / totals.shown) * 100).toFixed(2) : '0.00';

      // Build markdown table
      digestContent = `# Daily Nudge Digest - ${yesterdayDateStr}

## Summary
- **Total Events**: ${totals.shown} shown, ${totals.cta} CTAs, ${totals.dismissed} dismissed
- **Unique Users**: ${totals.users}
- **Overall CTR**: ${overallCTR}%
- **Overall Dismiss Rate**: ${overallDismissRate}%

## By Nudge Type

| Nudge ID | Shown | CTA | CTR% | Dismissed | Dismiss% | Users |
|----------|-------|-----|------|-----------|----------|-------|`;

      metrics.forEach((m: DailyMetric) => {
        digestContent += `\n| ${m.nudge_id} | ${m.shown || 0} | ${m.cta || 0} | ${m.ctr_pct || 0}% | ${m.dismissed || 0} | ${m.dismiss_pct || 0}% | ${m.users || 0} |`;
      });
    }

    console.log("Generated digest content");

    // Check for webhook and email configurations
    const webhookUrl = Deno.env.get("NUDGE_ALERT_WEBHOOK");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const digestToEmail = Deno.env.get("NUDGE_ALERT_EMAIL");

    let webhookSent = false;
    let emailSent = false;

    // Try webhook first
    if (webhookUrl) {
      try {
        console.log("Sending digest to webhook...");
        const webhookResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: digestContent,
            username: "Nudge Digest Bot",
            icon_emoji: ":chart_with_upwards_trend:"
          }),
        });

        if (webhookResponse.ok) {
          console.log("Webhook sent successfully");
          webhookSent = true;
        } else {
          console.error(`Webhook failed: ${webhookResponse.status} ${await webhookResponse.text()}`);
        }
      } catch (error) {
        console.error("Webhook error:", error);
      }
    } else {
      console.log("No webhook URL configured");
    }

    // Try email if configured
    if (resendApiKey && digestToEmail) {
      try {
        console.log("Sending digest via email...");
        const resend = new Resend(resendApiKey);
        
        const { error: emailError } = await resend.emails.send({
          from: "Nudge System <notifications@resend.dev>",
          to: [digestToEmail],
          subject: `Daily Nudge Digest - ${yesterdayDateStr}`,
          text: digestContent,
        });

        if (emailError) {
          console.error("Email error:", emailError);
        } else {
          console.log("Email sent successfully");
          emailSent = true;
        }
      } catch (error) {
        console.error("Email sending error:", error);
      }
    } else {
      console.log("Digest email disabled - missing RESEND_API_KEY or NUDGE_ALERT_EMAIL");
    }

    // Response summary
    const deliveryMethods = [];
    if (webhookSent) deliveryMethods.push("webhook");
    if (emailSent) deliveryMethods.push("email");
    
    const responseMessage = deliveryMethods.length > 0 
      ? `Daily digest sent via: ${deliveryMethods.join(", ")}`
      : "Daily digest generated but no delivery methods available";

    console.log(responseMessage);

    return new Response(
      JSON.stringify({
        success: true,
        message: responseMessage,
        date: yesterdayDateStr,
        metrics_count: metrics?.length || 0,
        webhook_sent: webhookSent,
        email_sent: emailSent,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in nudge-daily-digest function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);