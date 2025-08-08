
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry function with exponential backoff
async function retryWithBackoff(fn: () => Promise<Response>, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fn();
      if (response.ok || response.status !== 429) {
        return response;
      }
      
      // If rate limited, wait before retrying
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`Request attempt ${attempt + 1} failed:`, error);
      if (attempt === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Token substitution for {{token}} patterns
function substituteTokens(text: string, tokens: Record<string, any>) {
  if (!text) return text;
  return text.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_m, key: string) => {
    const v = tokens[key];
    if (v === null || v === undefined || v === '') return '';
    return String(v);
  });
}

function buildTokenMap(ctx: any, coachType: string) {
  const profile = ctx?.profile || {};
  const goals = ctx?.goals || {};
  const nutrition = ctx?.nutrition || {};
  const exercise = ctx?.exercise || {};
  const recovery = ctx?.recovery || {};
  const map: Record<string, any> = {
    goal_primary: goals.primary,
    goal_secondary: goals.secondary,
    weight_kg: profile.weight_kg,
    height_cm: profile.height_cm,
    age: profile.age,
    sex: profile.sex,

    avg_cals_7d: nutrition.avg_cals_7d,
    protein_g_7d: nutrition.protein_g_7d,
    fiber_g_7d: nutrition.fiber_g_7d,

    workouts_7d: exercise.workouts_7d,
    avg_duration_min_7d: exercise.avg_duration_min_7d,
    consistency_pct_30d: exercise.consistency_pct_30d,
    current_streak_days: exercise.current_streak_days,
    best_streak_days: exercise.best_streak_days,

    sleep_avg_7d: recovery.sleep_avg_7d,
    stress_avg_7d: recovery.stress_avg_7d,
    recovery_score: recovery.recovery_score,
    med_sessions_7d: recovery.med_sessions_7d,
    breath_sessions_7d: recovery.breath_sessions_7d,
    supp_days_7d: recovery.supp_days_7d,
  };
  return map;
}

function buildClosingLine(coach: 'nutrition'|'exercise'|'recovery', t: Record<string, any>) {
  if (coach === 'nutrition') {
    const parts: string[] = [];
    if (t.avg_cals_7d != null) parts.push(`This week you averaged ${t.avg_cals_7d} kcal`);
    if (t.protein_g_7d != null) parts.push(`and ${t.protein_g_7d}g protein`);
    const base = parts.join(' ') || undefined;
    // protein_target_g may be unavailable; omit if missing
    return base ? `Closing: ${base}.` : '';
  }
  if (coach === 'exercise') {
    const frags: string[] = [];
    if (t.workouts_7d != null) frags.push(`${t.workouts_7d} workouts`);
    if (t.avg_duration_min_7d != null) frags.push(`avg ${t.avg_duration_min_7d} min`);
    if (t.consistency_pct_30d != null) frags.push(`consistency ${t.consistency_pct_30d}%`);
    return frags.length ? `Closing: ${frags.join(', ')}.` : '';
  }
  // recovery
  const segs: string[] = [];
  if (t.sleep_avg_7d != null) segs.push(`Sleep ${t.sleep_avg_7d}h`);
  if (t.stress_avg_7d != null) segs.push(`stress ${t.stress_avg_7d}/10`);
  if (t.recovery_score != null) segs.push(`recovery ${t.recovery_score}/100`);
  return segs.length ? `Closing: ${segs.join(', ')}.` : '';
}

function logEvent(event: string, payload: Record<string, any> = {}) {
  try {
    console.log(JSON.stringify({ event, ...payload }));
  } catch (_) {
    console.log(`event:${event}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== AI Coach Chat Function Started ===');
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  // Create supabase client authorized as caller to get user id for rate limiting
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } })
    : null;

  // In-memory rate limit store per user (best-effort)
  const rateStore = (globalThis as any).__ai_rate__ || ((globalThis as any).__ai_rate__ = new Map<string, number[]>());
  // Daily cap store per user+coach (best-effort)
  const dailyStore = (globalThis as any).__ai_daily_rate__ || ((globalThis as any).__ai_daily_rate__ = new Map<string, { date: string; count: number }>());

  try {
    const requestBody = await req.json();
    console.log('Request body received:', JSON.stringify({
      messageLength: requestBody.message?.length,
      hasUserContext: !!requestBody.userContext,
      coachType: requestBody.coachType || requestBody.userContext?.coachType,
    }));

    const { message, userContext, flaggedIngredients, coachType: coachTypeFromBody } = requestBody;
    const coachType = coachTypeFromBody || userContext?.coachType || 'nutrition';
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    // Get user id for rate limit
    let userId: string | null = null;
    if (supabase) {
      try {
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id || null;
      } catch (_) {}
    }

    // Rate limit: 8/min per user and 40/day per coach
    if (userId) {
      const now = Date.now();
      const windowMs = 60 * 1000;
      const maxReqPerMin = 8;
      const arr = rateStore.get(userId) || [];
      const recent = arr.filter(ts => now - ts < windowMs);
      if (recent.length >= maxReqPerMin) {
        return new Response(JSON.stringify({ error: 'Rate limit: Please wait a moment before asking again.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      recent.push(now);
      rateStore.set(userId, recent);

      const today = new Date().toISOString().slice(0,10);
      const dailyKey = `${userId}:${coachType}`;
      const entry = dailyStore.get(dailyKey);
      if (!entry || entry.date !== today) {
        dailyStore.set(dailyKey, { date: today, count: 0 });
      }
      const current = dailyStore.get(dailyKey)!;
      if (current.count >= 40) {
        return new Response(JSON.stringify({ error: "You’ve hit today’s limit. Try again tomorrow." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // We'll increment after request succeeds
    }

    // Enhanced API key validation
    if (!openAIApiKey) {
      console.error('CRITICAL: OpenAI API key not found in environment variables');
      console.log('Available env vars:', Object.keys(Deno.env.toObject()));
      return new Response(JSON.stringify({ 
        error: 'AI service configuration error. OpenAI API key is missing. Please contact support.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!message || message.trim().length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Please provide a valid message to continue our conversation.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Personalization toggle
    const useContext = requestBody.useContext !== false;

    // Fetch compact context if enabled
    let contextPayload: any = null;
    if (useContext) {
      try {
        logEvent('coach_context_fetch_started', { coachType });
        contextPayload = userContext?.context || userContext?.contextSnapshot || null;
        if (!contextPayload && supabase) {
          const { data, error } = await (supabase as any).functions.invoke('coach-context', {} as any);
          if (error) throw error;
          contextPayload = data;
        }
        logEvent('coach_context_fetch_succeeded', { coachType, hasContext: !!contextPayload });
      } catch (err) {
        logEvent('coach_context_fetch_failed', { coachType, reason: (err as Error)?.message || String(err) });
        contextPayload = null;
      }
    }

    const tokens = useContext && contextPayload ? buildTokenMap(contextPayload, coachType) : {};

    // Role-specific prompt per spec
    const roleIntro = {
      nutrition: "You are VOYAGE’s Nutrition Coach. Always personalize using context when available. Prioritize protein, fiber, calories, hydration. Offer 1–2 actionable next steps, sized to the user’s history. Avoid medical claims.",
      exercise: "You are VOYAGE’s Exercise Coach. Personalize plans using frequency, streaks, consistency, and avg duration. Propose 1 quick win and 1 next workout suggestion aligned with goal.",
      recovery: "You are VOYAGE’s Recovery Coach. Personalize using sleep, stress, recovery score, meditation/breathing/supplement history. Suggest 1 habit and 1 today-action (≤10 min) aligned with goal."
    }[coachType as 'nutrition'|'exercise'|'recovery'];

    const safety = 'Stay strictly within your specialty; no medical diagnosis.';
    const numbersRule = 'Always reference 2–4 concrete numbers from context when relevant.';
    const closingRule = 'End with a concise one-line summary as the final line.';

    const contextString = useContext && contextPayload
      ? JSON.stringify(contextPayload).slice(0, 5000)
      : 'Personalization off or no context available.';

    let systemPrompt = `${roleIntro}\n${numbersRule}\n${closingRule}\n${safety}\n\ncontext:* ${contextString}`;
    if (useContext) {
      systemPrompt = substituteTokens(systemPrompt, tokens);
    }

    const finalUserMessage = useContext ? substituteTokens(message, tokens) : message;

    const requestPayload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: finalUserMessage }
      ],
      max_tokens: 500,
      temperature: 0.7,
    };
    const makeOpenAIRequest = async () => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });
      return response;
    };

    const response = await retryWithBackoff(makeOpenAIRequest);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', errorText);
      return new Response(JSON.stringify({ error: 'AI service temporarily unavailable. Please try again.' }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    let aiResponse = data?.choices?.[0]?.message?.content || 'I\'m here to help.';

    // Append metric-based closing line
    const closing = buildClosingLine(coachType as any, tokens);
    if (closing) {
      aiResponse = `${aiResponse}\n\n${closing}`;
    }

    // Increment daily cap after success
    try {
      if (userId) {
        const today = new Date().toISOString().slice(0,10);
        const dailyKey = `${userId}:${coachType}`;
        const current = dailyStore.get(dailyKey) || { date: today, count: 0 };
        if (current.date !== today) {
          dailyStore.set(dailyKey, { date: today, count: 1 });
        } else {
          current.count += 1;
          dailyStore.set(dailyKey, current);
        }
      }
    } catch (_) {}

    logEvent('coach_message_sent', { coachType, usingContext: !!(useContext && contextPayload), inLen: (message||'').length, outLen: aiResponse.length });

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logEvent('coach_message_failed', { coachType: undefined, reason: (error as any)?.message });
    console.error('=== CRITICAL ERROR in ai-coach-chat function ===', error);
    const errorMessage = error.message?.includes('AI service') 
      ? error.message 
      : "I'm having trouble connecting right now. Please try again in a moment! 🤖";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

