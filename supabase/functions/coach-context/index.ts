import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache per function instance (best-effort)
const cache = new Map<string, { data: any; expiresAt: number }>();

function fmt(n: any, d = 1) {
  const num = Number(n);
  if (!isFinite(num)) return undefined;
  return Number(num.toFixed(d));
}

function dayKey(date: Date) {
  return date.toISOString().slice(0,10);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

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
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = authData.user.id;

    // Check cache (5 minutes TTL)
    const now = Date.now();
    const cached = cache.get(userId);
    if (cached && cached.expiresAt > now) {
      return new Response(JSON.stringify(cached.data), { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'max-age=60' } });
    }

    const context: any = { asOf: new Date().toISOString() };

    // -------- Profile --------
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, primary_goal, diet_preferences, injuries, wake_time_local, sleep_time_local')
        .eq('user_id', userId)
        .single();
      if (profile) {
        context.profile = {
          firstName: profile.first_name || undefined,
          goal: profile.primary_goal || undefined,
          diet: profile.diet_preferences || undefined,
          injuries: Array.isArray(profile.injuries) ? profile.injuries : undefined,
          wakeWindow: profile.wake_time_local || undefined,
          sleepWindow: profile.sleep_time_local || undefined,
        };
      }
    } catch (_) {}

    // Utilities for date ranges
    const today = new Date();
    const todayStr = dayKey(today);
    const sevenDaysAgo = addDays(today, -6);
    const fourteenDaysAgo = addDays(today, -13);
    const twentyEightDaysAgo = addDays(today, -27);

    // -------- Nutrition --------
    try {
      // Today totals from nutrition_logs
      const { data: foods } = await supabase
        .from('nutrition_logs')
        .select('calories, protein, carbs, fat, food_name, created_at')
        .eq('user_id', userId)
        .gte('created_at', `${todayStr}T00:00:00Z`);

      const totalsToday = (foods || []).reduce((acc: any, f: any) => {
        acc.cals += Number(f.calories) || 0;
        acc.protein += Number(f.protein) || 0;
        acc.carbs += Number(f.carbs) || 0;
        acc.fat += Number(f.fat) || 0;
        acc.names.push(f.food_name);
        return acc;
      }, { cals: 0, protein: 0, carbs: 0, fat: 0, names: [] as string[] });

      // Hydration today and target
      const { data: hyd } = await supabase
        .from('hydration_logs')
        .select('volume, created_at')
        .eq('user_id', userId)
        .gte('created_at', `${todayStr}T00:00:00Z`);

      const waterMl = (hyd || []).reduce((s: number, r: any) => s + (Number(r.volume) || 0), 0);

      const { data: todayTarget } = await supabase
        .from('daily_nutrition_targets')
        .select('calories, protein, carbs, fat, hydration_ml')
        .eq('user_id', userId)
        .eq('target_date', todayStr)
        .maybeSingle();

      const hydrationPct = todayTarget?.hydration_ml ? Math.round((waterMl / Number(todayTarget.hydration_ml)) * 100) : undefined;

      // 7d protein goal hits & net calories trend tag
      const { data: last7Foods } = await supabase
        .from('nutrition_logs')
        .select('calories, protein, created_at')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString());

      const { data: last7Targets } = await supabase
        .from('daily_nutrition_targets')
        .select('target_date, calories, protein')
        .eq('user_id', userId)
        .gte('target_date', dayKey(sevenDaysAgo));

      const perDayTotals: Record<string, { cals: number; protein: number }> = {};
      for (const f of (last7Foods || [])) {
        const d = dayKey(new Date(f.created_at));
        perDayTotals[d] = perDayTotals[d] || { cals: 0, protein: 0 };
        perDayTotals[d].cals += Number(f.calories) || 0;
        perDayTotals[d].protein += Number(f.protein) || 0;
      }
      let proteinGoalHitDays = 0;
      let diffSum = 0;
      let countedDays = 0;
      for (let i = 0; i < 7; i++) {
        const d = dayKey(addDays(today, -i));
        const totals = perDayTotals[d];
        const target = (last7Targets || []).find((t: any) => t.target_date === d);
        if (totals && target) {
          countedDays++;
          if ((totals.protein || 0) >= Number(target.protein || 0)) proteinGoalHitDays++;
          const diff = (totals.cals || 0) - Number(target.calories || 0);
          diffSum += diff;
        }
      }
      let calorieBalance: string | undefined;
      if (countedDays > 0) {
        const avgDiff = diffSum / countedDays;
        if (avgDiff < -100) calorieBalance = `${Math.round(Math.abs(avgDiff))} deficit`;
        else if (avgDiff > 100) calorieBalance = `${Math.round(avgDiff)} surplus`;
        else calorieBalance = 'neutral';
      }

      // Top foods (today)
      const nameCounts: Record<string, number> = {};
      for (const n of totalsToday.names) {
        if (!n) continue;
        nameCounts[n] = (nameCounts[n] || 0) + 1;
      }
      const topFoods = Object.entries(nameCounts).sort((a,b) => b[1]-a[1]).slice(0,3).map(([n]) => n);

      context.nutrition = {
        today: { cals: totalsToday.cals, protein: totalsToday.protein, carbs: totalsToday.carbs, fat: totalsToday.fat, waterMl },
        week: {
          proteinGoalHitDays,
          avgProtein: fmt(Object.values(perDayTotals).reduce((s,v)=>s+v.protein,0)/(Object.keys(perDayTotals).length||1)) || 0,
          calorieBalance,
          hydrationPct,
          topFoods,
        }
      };
    } catch (_) {}

    // -------- Exercise --------
    try {
      const { data: workouts } = await supabase
        .from('exercise_logs')
        .select('duration_minutes, calories_burned, created_at')
        .eq('user_id', userId)
        .gte('created_at', twentyEightDaysAgo.toISOString());

      const thisWeek = (workouts || []).filter(w => new Date(w.created_at) >= addDays(today, -6));
      const totalMinutes = thisWeek.reduce((s, w) => s + (Number(w.duration_minutes) || 0), 0);
      const totalCalories = thisWeek.reduce((s, w) => s + (Number(w.calories_burned) || 0), 0);

      // Consistency over last 28 days
      const daysWithWorkout = new Set((workouts || []).map((w: any) => dayKey(new Date(w.created_at))));
      const consistencyPct = Math.round((daysWithWorkout.size / 28) * 100);

      // Simple current/best streak over last 60 days (best-effort)
      const past60Ago = addDays(today, -59);
      const { data: w60 } = await supabase
        .from('exercise_logs')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', past60Ago.toISOString());
      const days = new Set((w60 || []).map((r: any) => dayKey(new Date(r.created_at))));
      let current = 0, best = 0;
      for (let i = 0; i < 60; i++) {
        const d = dayKey(addDays(today, -i));
        if (days.has(d)) { current++; best = Math.max(best, current); }
        else { if (i === 0) current = 0; else current = 0; }
      }

      context.exercise = {
        thisWeek: { workouts: thisWeek.length, minutes: totalMinutes, calories: totalCalories },
        consistency: { ratePct: consistencyPct, streakDays: current, bestStreakDays: best },
        // muscleCoverage: omitted if unavailable
      };
    } catch (_) {}

    // -------- Recovery --------
    try {
      // Streaks from dedicated tables
      const streaks: any = {};
      const tables = [
        { key: 'breathing', table: 'breathing_streaks' },
        { key: 'meditation', table: 'meditation_streaks' },
        { key: 'sleep', table: 'sleep_streaks' },
        { key: 'yoga', table: 'yoga_streaks' }
      ];
      let longestName: string | undefined;
      let longestDays = 0;
      for (const t of tables) {
        try {
          const { data } = await supabase
            .from(t.table)
            .select('current_streak')
            .eq('user_id', userId)
            .maybeSingle();
          const v = Number(data?.current_streak) || 0;
          streaks[t.key] = v;
          if (v > longestDays) { longestDays = v; longestName = t.key; }
        } catch (_) {}
      }

      // Practice mix last 14d from recovery_session_logs
      let practiceMix: any;
      try {
        const { data: sessions } = await supabase
          .from('recovery_session_logs')
          .select('category, completed_at, duration_minutes')
          .eq('user_id', userId)
          .gte('completed_at', fourteenDaysAgo.toISOString());
        if (sessions && sessions.length) {
          const counts: Record<string, number> = {};
          for (const s of sessions) {
            counts[s.category] = (counts[s.category] || 0) + 1;
          }
          const total = Object.values(counts).reduce((a: number,b: number)=>a+b,0) || 1;
          practiceMix = Object.fromEntries(Object.entries(counts).map(([k,v]) => [k, Math.round((Number(v)/total)*100)]));
        }
      } catch (_) {}

      // Mood/stress last 7d
      let moodAvg: number | undefined, stressAvg: number | undefined, trend: string | undefined, peakStressDay: string | undefined;
      try {
        const { data: moodLogs } = await supabase
          .from('mood_logs')
          .select('mood_score, stress_score, created_at')
          .eq('user_id', userId)
          .gte('created_at', sevenDaysAgo.toISOString());
        if (moodLogs && moodLogs.length) {
          const byDay: Record<string, { mood: number[]; stress: number[] }> = {};
          for (const m of moodLogs) {
            const d = dayKey(new Date(m.created_at));
            byDay[d] = byDay[d] || { mood: [], stress: [] };
            if (m.mood_score != null) byDay[d].mood.push(Number(m.mood_score));
            if (m.stress_score != null) byDay[d].stress.push(Number(m.stress_score));
          }
          const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
          let maxStress = -1, maxStressDayIdx = 0;
          const dailyStress: Array<{ day: string; avg: number }> = [];
          let moodSum = 0, moodCount = 0, stressSum = 0, stressCount = 0;
          Object.entries(byDay).forEach(([d, vals]) => {
            const avgMood = vals.mood.length ? vals.mood.reduce((a,b)=>a+b,0)/vals.mood.length : 0;
            const avgStress = vals.stress.length ? vals.stress.reduce((a,b)=>a+b,0)/vals.stress.length : 0;
            const dt = new Date(d);
            dailyStress.push({ day: dayNames[dt.getDay()], avg: avgStress });
            if (avgStress > maxStress) { maxStress = avgStress; maxStressDayIdx = dt.getDay(); }
            if (avgMood) { moodSum += avgMood; moodCount++; }
            if (avgStress) { stressSum += avgStress; stressCount++; }
          });
          moodAvg = fmt(moodSum / (moodCount||1));
          stressAvg = fmt(stressSum / (stressCount||1));
          peakStressDay = dayNames[maxStressDayIdx];
          // Simple trend: compare last 3 days vs prev 3
          const sorted = dailyStress.slice(-6);
          const first3 = sorted.slice(0,3).reduce((s,v)=>s+v.avg,0)/Math.max(1,Math.min(3,sorted.length));
          const last3 = sorted.slice(-3).reduce((s,v)=>s+v.avg,0)/Math.max(1,Math.min(3,sorted.length));
          if (isFinite(first3) && isFinite(last3)) {
            trend = last3 < first3 ? 'stress down recent' : last3 > first3 ? 'stress up recent' : 'stable';
          }
        }
      } catch (_) {}

      // Sleep metrics from sleep_streaks or logs table if exists (best-effort)
      let lastSleepHours: number | undefined, avgSleep7d: number | undefined;
      try {
        const { data: sleepLogs } = await supabase
          .from('sleep_logs')
          .select('hours, created_at')
          .eq('user_id', userId)
          .gte('created_at', sevenDaysAgo.toISOString());
        if (sleepLogs && sleepLogs.length) {
          const sorted = [...sleepLogs].sort((a:any,b:any)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
          lastSleepHours = fmt(sorted[0].hours, 1);
          const total = sleepLogs.reduce((s:any,r:any)=>s+(Number(r.hours)||0),0);
          avgSleep7d = fmt(total / sleepLogs.length, 1);
        }
      } catch (_) {}

      // Supplements adherence already computed later but ensure present
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();
      const { data: supp7 } = await supabase
        .from('supplement_logs')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgoISO);
      const daysWithSupp = new Set((supp7||[]).map(r => new Date(r.created_at).toDateString()));
      const adherence7dPct = Math.round((daysWithSupp.size/7)*100);

      context.recovery = {
        recoveryScore: undefined, // omit if not in DB
        moodStress: { moodAvg, stressAvg, trend },
        practices: { mix: practiceMix, streaks },
        supplements: { takenToday: undefined, adherence7dPct },
        derived: {
          last_sleep_hours: lastSleepHours,
          avg_sleep_7d: avgSleep7d,
          peak_stress_day: undefined as string | undefined, // set below if available
          top_practice: undefined as string | undefined,
          longest_recovery_streak: longestName && longestDays ? `${longestName} ${longestDays}d` : undefined,
        }
      };
      if ((context as any).recovery?.moodStress) {
        (context as any).recovery.derived.peak_stress_day = (context as any).recovery.moodStress?.trend ? peakStressDay : peakStressDay;
      }
      if (practiceMix) {
        const top = Object.entries(practiceMix as Record<string, number>).sort((a,b)=>b[1]-a[1])[0];
        if (top) (context as any).recovery.derived.top_practice = top[0];
      } else if (longestName) {
        (context as any).recovery.derived.top_practice = longestName;
      }
    } catch (_) {}

    // -------- Supplements today (taken count) --------
    try {
      const { data: suppToday } = await supabase
        .from('supplement_logs')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', `${todayStr}T00:00:00Z`);
      if (!context.recovery) context.recovery = {};
      if (!context.recovery.supplements) context.recovery.supplements = {} as any;
      (context.recovery.supplements as any).takenToday = (suppToday||[]).length;
    } catch (_) {}

    // -------- Insights (best-effort simple strings) --------
    try {
      const insights: string[] = [];
      if (context.nutrition?.week?.proteinGoalHitDays != null) insights.push(`Protein hits ${context.nutrition.week.proteinGoalHitDays}/7`);
      if (context.exercise?.thisWeek?.workouts != null) insights.push(`Workouts ${context.exercise.thisWeek.workouts} this week`);
      if (context.recovery?.moodStress?.stressAvg != null) insights.push(`Stress avg ${context.recovery.moodStress.stressAvg}/10`);
      if (insights.length) context.insights = insights.slice(0,4);
    } catch (_) {}

    cache.set(userId, { data: context, expiresAt: Date.now() + 5 * 60 * 1000 });

    return new Response(JSON.stringify(context), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('coach-context error', e);
    return new Response(JSON.stringify({ error: 'Failed to build context' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
