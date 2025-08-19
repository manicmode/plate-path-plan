// supabase/functions/deliverHabitNudges/index.ts
// Deno runtime, no npm. Uses URL import for supabase-js v2.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ClaimRow = { id: string; user_id: string; habit_slug: string };

Deno.serve(async (req) => {
  // 1) Gate by CRON_TOKEN
  const auth = req.headers.get("authorization") ?? "";
  const expected = Deno.env.get("CRON_TOKEN");
  if (!expected || auth !== `Bearer ${expected}`) {
    return new Response("forbidden", { status: 403 });
  }

  // 2) Supabase service client (Edge secrets)
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return new Response("missing env", { status: 500 });
  }
  const supabase = createClient(url, key);

  // Optional: re-use an existing push function instead of talking to FCM here.
  // If you have another Edge function like /send-push-notification, define:
  const SEND_PUSH_URL = Deno.env.get("SEND_PUSH_URL"); // e.g. https://.../functions/v1/send-push-notification
  const SEND_PUSH_TOKEN = Deno.env.get("SEND_PUSH_TOKEN"); // lightweight shared secret for that function

  try {
    // 3) Claim up to 100 nudges atomically
    const { data: rows, error: claimErr } = await supabase
      .rpc("rpc_claim_nudges", { p_limit: 100 }) as unknown as
      Promise<{ data: ClaimRow[] | null; error: any }>;
    if (claimErr) throw claimErr;

    let sent = 0, failed = 0;
    for (const n of rows ?? []) {
      try {
        // 4) Fetch user's FCM token from profile (adjust table/column name if singular!)
        const { data: prof, error: profErr } = await supabase
          .from("user_profiles") // or "user_profile" if that's your table
          .select("fcm_token")
          .eq("user_id", n.user_id)
          .is("fcm_token", null).not(); // shorthand: fetch only rows where token not null
        if (profErr) throw profErr;

        const token = Array.isArray(prof) && prof[0]?.fcm_token;
        if (!token) {
          await supabase.rpc("mark_nudge_error", { p_id: n.id, p_err: "no_device" });
          failed++; continue;
        }

        // 5) Send push via your existing push function
        if (!SEND_PUSH_URL || !SEND_PUSH_TOKEN) {
          // If you don't have a push function, you could call FCM directly here.
          await supabase.rpc("mark_nudge_error", { p_id: n.id, p_err: "push_endpoint_missing" });
          failed++; continue;
        }

        const resp = await fetch(SEND_PUSH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SEND_PUSH_TOKEN}`,
          },
          body: JSON.stringify({
            to: token,
            title: "Time for your habit",
            body: prettifySlug(n.habit_slug),
            data: { habit_slug: n.habit_slug, kind: "habit_reminder" },
          }),
        });

        if (!resp.ok) {
          const txt = await resp.text();
          await supabase.rpc("mark_nudge_error", { p_id: n.id, p_err: `push_fail:${resp.status}:${txt}` });
          failed++; continue;
        }

        await supabase.rpc("mark_nudge_sent", { p_id: n.id });
        sent++;
      } catch (e) {
        await supabase.rpc("mark_nudge_error", { p_id: n.id, p_err: String(e) });
        failed++;
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, failed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

function prettifySlug(slug: string) {
  return slug.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}