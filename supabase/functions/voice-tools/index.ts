// supabase/functions/voice-tools/index.ts
// Deno Deploy (Supabase Edge Function)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.4";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ---------- Schemas ----------
const baseArgs = z.object({ when: z.string().datetime().optional() });

const WaterArgs = baseArgs.extend({
  amount_ml: z.number().positive().max(10000),
});
const MealArgs = baseArgs.extend({
  meal_text: z.string().min(2).max(2000),
});
const WorkoutArgs = baseArgs.extend({
  summary: z.string().min(2).max(2000),
});
const GoalArgs = z.object({
  name: z.enum(["protein", "calories", "steps", "water_ml"]),
  value: z.number().positive().max(1_000_000),
});

const BodySchema = z.object({
  tool: z.enum(["log_water", "log_meal", "log_workout", "set_goal"]),
  args: z.record(z.any()),
});

// ---------- Helpers ----------
function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, content-type",
      "access-control-allow-methods": "POST, OPTIONS",
    },
  });
}

async function getUserId(sbUser: ReturnType<typeof createClient>) {
  const {
    data: { user },
    error,
  } = await sbUser.auth.getUser();
  if (error || !user) throw new Error("unauthorized");
  return user.id;
}

async function rateLimit(
  sbService: ReturnType<typeof createClient>,
  userId: string,
) {
  // 10 writes / 5 minutes / user
  const { data, error } = await sbService
    .from("voice_action_audit")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

  if (error) throw error;
  const count = (data as unknown as { count?: number } | null)?.count ?? 0;
  if (count >= 10) {
    const e = new Error("rate_limit");
    // @ts-ignore
    e.code = 429;
    throw e;
  }
}

async function audit(
  sbService: ReturnType<typeof createClient>,
  userId: string,
  tool: string,
  args: unknown,
  ok: boolean,
  errorText?: string,
) {
  await sbService.from("voice_action_audit").insert({
    user_id: userId,
    tool,
    args_json: args,
    ok,
    error_text: errorText ?? null,
  });
}

// ---------- Main ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });

  try {
    const auth = req.headers.get("authorization") ?? "";
    if (!auth.toLowerCase().startsWith("bearer "))
      return json(401, { ok: false, code: "no_jwt", error: "Missing JWT" });

    // RLS-bound client (writes happen as the user)
    const sbUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });

    // Service client for auditing (INSERT policy is service_role-only)
    const sbService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const userId = await getUserId(sbUser);
    await rateLimit(sbService, userId);

    const body = BodySchema.parse(await req.json());
    const nowIso = new Date().toISOString();

    let ok = false;
    let result: unknown;
    let errorText: string | undefined;

    try {
      switch (body.tool) {
        case "log_water": {
          const args = WaterArgs.parse(body.args);
          const when = args.when ?? nowIso;

          // —— WRITE: pick your canonical hydration table here ——
          // If you already have one, use it. Otherwise, call a SECURITY DEFINER RPC.
          const { error } = await sbUser
            .from("hydration_logs")
            .insert({ user_id: userId, amount_ml: args.amount_ml, logged_at: when })
            .select()
            .single();
          if (error) throw error;

          ok = true;
          result = { message: "Water logged" };
          break;
        }
        case "log_meal": {
          const args = MealArgs.parse(body.args);
          const when = args.when ?? nowIso;

          const { error } = await sbUser
            .from("meal_logs")
            .insert({ user_id: userId, notes: args.meal_text, logged_at: when })
            .select()
            .single();
          if (error) throw error;

          ok = true;
          result = { message: "Meal logged" };
          break;
        }
        case "log_workout": {
          const args = WorkoutArgs.parse(body.args);
          const when = args.when ?? nowIso;

          const { error } = await sbUser
            .from("workout_logs")
            .insert({ user_id: userId, summary: args.summary, logged_at: when })
            .select()
            .single();
          if (error) throw error;

          ok = true;
          result = { message: "Workout logged" };
          break;
        }
        case "set_goal": {
          const args = GoalArgs.parse(body.args);

          const { error } = await sbUser
            .from("user_goals")
            .upsert(
              { user_id: userId, name: args.name, value: args.value },
              { onConflict: "user_id,name" },
            )
            .select()
            .single();
          if (error) throw error;

          ok = true;
          result = { message: "Goal updated" };
          break;
        }
      }
    } catch (e) {
      errorText = e instanceof Error ? e.message : String(e);
      ok = false;
    }

    // Always audit
    await audit(sbService, userId, body.tool, body.args, ok, errorText);

    if (!ok) {
      // @ts-ignore
      if (errorText === "rate_limit" || (e && e.code === 429)) {
        return json(429, { ok: false, code: "rate_limited", error: "Too many requests" });
      }
      return json(400, { ok: false, code: "write_failed", error: errorText ?? "Write failed" });
    }

    return json(200, { ok: true, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // @ts-ignore
    const code = e?.code === 429 ? 429 : 500;
    return json(code, { ok: false, code: code === 429 ? "rate_limited" : "server_error", error: msg });
  }
});