import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache per function instance (best-effort)
const cache = new Map<string, { data: any; expiresAt: number }>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create client authorized as the caller
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });

    // Identify user
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = authData.user.id;

    // Check cache (5 minutes TTL)
    const now = Date.now();
    const cached = cache.get(userId);
    if (cached && cached.expiresAt > now) {
      return new Response(JSON.stringify(cached.data), { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'max-age=60' } });
    }

    // Build context snapshot
    const context: any = { asOf: new Date().toISOString() };

    // Profile
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, primary_goal, diet_preferences, injuries')
        .eq('user_id', userId)
        .single();
      if (profile) {
        context.profile = {
          firstName: profile.first_name || undefined,
          goal: profile.primary_goal || undefined,
          diet: profile.diet_preferences || undefined,
          injuries: Array.isArray(profile.injuries) ? profile.injuries : undefined,
        };
      }
    } catch (_) {}

    // Nutrition today (targets table if available)
    try {
      const { data: todayTarget } = await supabase
        .from('daily_nutrition_targets')
        .select('calories, protein, carbs, fat, hydration_ml, supplement_count')
        .eq('user_id', userId)
        .eq('target_date', new Date().toISOString().slice(0, 10))
        .maybeSingle();
      if (todayTarget) {
        context.nutrition = context.nutrition || {};
        context.nutrition.today = {
          cals: Number(todayTarget.calories) || 0,
          protein: Number(todayTarget.protein) || 0,
          carbs: Number(todayTarget.carbs) || 0,
          fat: Number(todayTarget.fat) || 0,
          waterMl: Number(todayTarget.hydration_ml) || 0,
        };
      }
    } catch (_) {}

    // Exercise this week
    try {
      const startOfWeek = new Date();
      const day = startOfWeek.getDay();
      const diff = (day === 0 ? -6 : 1) - day; // Monday as start of week
      startOfWeek.setDate(startOfWeek.getDate() + diff);
      startOfWeek.setHours(0,0,0,0);

      const { data: workouts } = await supabase
        .from('exercise_logs')
        .select('duration_minutes, calories_burned, created_at')
        .eq('user_id', userId)
        .gte('created_at', startOfWeek.toISOString());

      if (workouts && workouts.length) {
        const totalMinutes = workouts.reduce((s, w) => s + (Number(w.duration_minutes) || 0), 0);
        const totalCalories = workouts.reduce((s, w) => s + (Number(w.calories_burned) || 0), 0);
        context.exercise = {
          thisWeek: { workouts: workouts.length, minutes: totalMinutes, calories: totalCalories },
        };
      }
    } catch (_) {}

    // Recovery streaks (best-effort)
    try {
      const streaks: any = {};
      const tables = [
        { key: 'breathing', table: 'breathing_streaks' },
        { key: 'meditation', table: 'meditation_streaks' },
        { key: 'sleep', table: 'sleep_streaks' },
        { key: 'yoga', table: 'yoga_streaks' },
      ];
      for (const t of tables) {
        const { data } = await supabase
          .from(t.table)
          .select('current_streak')
          .eq('user_id', userId)
          .maybeSingle();
        if (data?.current_streak != null) streaks[t.key] = Number(data.current_streak) || 0;
      }
      if (Object.keys(streaks).length) {
        context.recovery = context.recovery || {};
        context.recovery.practices = { streaks };
      }
    } catch (_) {}

    // Supplements adherence (best-effort)
    try {
      const todayStr = new Date().toISOString().slice(0,10);
      const sevenDaysAgo = new Date(Date.now() - 6*24*60*60*1000).toISOString();
      const { data: suppToday } = await supabase
        .from('supplement_logs')
        .select('id, created_at')
        .eq('user_id', userId)
        .gte('created_at', `${todayStr}T00:00:00Z`);
      const { data: supp7 } = await supabase
        .from('supplement_logs')
        .select('id, created_at')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo);
      const daysWithSupp = new Set((supp7||[]).map(r => new Date(r.created_at).toDateString()));
      if (suppToday || supp7) {
        context.recovery = context.recovery || {};
        context.recovery.supplements = {
          takenToday: (suppToday||[]).length,
          adherence7dPct: Math.round((daysWithSupp.size/7)*100)
        };
      }
    } catch (_) {}

    // Minimal insights placeholder (omit if nothing)
    if (context.exercise?.thisWeek || context.nutrition?.today) {
      context.insights = [];
    }

    cache.set(userId, { data: context, expiresAt: Date.now() + 5 * 60 * 1000 });

    return new Response(JSON.stringify(context), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('coach-context error', e);
    return new Response(JSON.stringify({ error: 'Failed to build context' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
