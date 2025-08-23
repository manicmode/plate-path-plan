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
          
          // Convert oz to ml if needed (1 fl oz ≈ 29.5735 ml)  
          // Voice agent should pass ml directly, but handle conversion if needed
          const volumeMl = args.amount_ml;
          const timestamp = args.when ? new Date(args.when).toISOString() : nowIso;
          
          // Runtime idempotency: check for existing row with same user, type='water', volume, within same minute
          const minuteStart = new Date(timestamp);
          minuteStart.setSeconds(0, 0);
          const minuteEnd = new Date(minuteStart.getTime() + 60000);
          
          const { data: existing } = await sbUser
            .from("hydration_logs")
            .select("id")
            .eq("user_id", userId)
            .eq("type", "water")
            .eq("volume", volumeMl)
            .gte("created_at", minuteStart.toISOString())
            .lt("created_at", minuteEnd.toISOString())
            .limit(1);
          
          if (existing && existing.length > 0) {
            ok = true;
            result = { message: "Water logged", volume_ml: volumeMl, duplicate: true };
            break;
          }
          
          // Write to canonical table that UI reads: hydration_logs
          const { error } = await sbUser
            .from("hydration_logs")
            .insert({ 
              user_id: userId, 
              name: `${Math.round(volumeMl)}ml Water`,
              volume: volumeMl,
              type: 'water',
              created_at: timestamp
            })
            .select()
            .single();
          if (error) throw error;

          ok = true;
          result = { message: "Water logged", volume_ml: volumeMl };
          break;
        }
        case "log_meal": {
          const args = MealArgs.parse(body.args);
          const timestamp = args.when ? new Date(args.when).toISOString() : nowIso;

          // Write to canonical table that UI reads: nutrition_logs
          const { error } = await sbUser
            .from("nutrition_logs")
            .insert({ 
              user_id: userId, 
              food_name: args.meal_text,
              notes: args.meal_text,
              // Default nutritional values - could be enhanced with AI estimation later
              calories: 300, // Reasonable default for voice logging
              protein: 15,
              carbs: 30,
              fat: 10,
              fiber: 5,
              sugar: 8,
              sodium: 400,
              saturated_fat: 3,
              confidence: 50, // Low confidence since it's voice-estimated
              created_at: timestamp
            })
            .select()
            .single();
          if (error) throw error;

          ok = true;
          result = { message: "Meal logged", meal: args.meal_text };
          break;
        }
        case "log_workout": {
          const args = WorkoutArgs.parse(body.args);
          const timestamp = args.when ? new Date(args.when).toISOString() : nowIso;

          // Write to canonical table that UI reads: exercise_logs
          const { error } = await sbUser
            .from("exercise_logs")
            .insert({ 
              user_id: userId, 
              summary: args.summary,
              name: args.summary,
              // Default values for voice logging
              duration_minutes: 30, // Reasonable default
              calories_burned: 200, // Reasonable default 
              intensity_level: 'moderate',
              activity_type: 'general',
              created_at: timestamp
            })
            .select()
            .single();
          if (error) throw error;

          ok = true;
          result = { message: "Workout logged", workout: args.summary };
          break;
        }
        case "set_goal": {
          const args = GoalArgs.parse(body.args);

          // Write to canonical table that UI reads: user_goals
          const { error } = await sbUser
            .from("user_goals")
            .upsert(
              { 
                user_id: userId, 
                name: args.name, 
                value: args.value,
                updated_at: nowIso
              },
              { onConflict: "user_id,name" },
            )
            .select()
            .single();
          if (error) throw error;

          ok = true;
          result = { message: "Goal updated", goal: args.name, value: args.value };
          break;
        }
      }
    } catch (e) {
      errorText = e instanceof Error ? e.message : String(e);
      ok = false;
      console.error("Voice tools write error:", errorText);
    }

    // Always audit
    await audit(sbService, userId, body.tool, body.args, ok, errorText);

    if (!ok) {
      if (errorText === "rate_limit") {
        return json(429, { ok: false, code: "rate_limited", message: "Please try again in a few minutes." });
      }
      return json(400, { ok: false, code: "write_failed", message: errorText ?? "Write failed" });
    }

    return json(200, { ok: true, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isRateLimit = msg === "rate_limit" || (e instanceof Error && (e as any).code === 429);
    const code = isRateLimit ? 429 : 500;
    
    console.error("Voice tools error:", msg, e);
    
    return json(code, { 
      ok: false, 
      code: isRateLimit ? "rate_limited" : "server_error", 
      message: isRateLimit ? "Please try again in a few minutes." : msg 
    });
  }
});