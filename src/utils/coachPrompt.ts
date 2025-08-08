// Shared prompt utils for tests (mirrors edge function behavior)
export type CoachType = 'nutrition' | 'exercise' | 'recovery';

export function substituteTokens(text: string, tokens: Record<string, any>) {
  if (!text) return text;
  return text.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_m, key: string) => {
    const v = tokens[key];
    if (v === null || v === undefined || v === '') return '';
    return String(v);
  });
}

export function buildClosingLine(coach: CoachType, t: Record<string, any>) {
  if (coach === 'nutrition') {
    const parts: string[] = [];
    if (t.avg_cals_7d != null) parts.push(`This week you averaged ${t.avg_cals_7d} kcal`);
    if (t.protein_g_7d != null) parts.push(`and ${t.protein_g_7d}g protein`);
    const base = parts.join(' ') || undefined;
    return base ? `Closing: ${base}.` : '';
  }
  if (coach === 'exercise') {
    const frags: string[] = [];
    if (t.workouts_7d != null) frags.push(`${t.workouts_7d} workouts`);
    if (t.avg_duration_min_7d != null) frags.push(`avg ${t.avg_duration_min_7d} min`);
    if (t.consistency_pct_30d != null) frags.push(`consistency ${t.consistency_pct_30d}%`);
    let line = frags.length ? `Closing: ${frags.join(', ')}.` : '';
    if (t.next_small_goal) {
      line = line ? `${line} Next step: ${t.next_small_goal}.` : `Closing: Next step: ${t.next_small_goal}.`;
    }
    return line;
  }
  const segs: string[] = [];
  if (t.sleep_avg_7d != null) segs.push(`Sleep ${t.sleep_avg_7d}h`);
  if (t.stress_avg_7d != null) segs.push(`stress ${t.stress_avg_7d}/10`);
  if (t.recovery_score != null) segs.push(`recovery ${t.recovery_score}/100`);
  return segs.length ? `Closing: ${segs.join(', ')}.` : '';
}

export function buildSystemPrompt(coach: CoachType, useContext: boolean, contextPayload: any) {
  const roleIntro = {
    nutrition: "You are VOYAGE’s Nutrition Coach.",
    exercise: "You are VOYAGE’s Exercise Coach.",
    recovery: "You are VOYAGE’s Recovery Coach."
  }[coach];
  const numbersRule = 'Always reference 2–4 concrete numbers from context when relevant.';
  const closingRule = 'End with a concise one-line summary as the final line.';
  const safety = 'Stay strictly within your specialty; no medical diagnosis.';
  const contextString = useContext && contextPayload ? JSON.stringify(contextPayload).slice(0, 5000) : 'Personalization off or no context available.';
  return `${roleIntro}\n${numbersRule}\n${closingRule}\n${safety}\n\ncontext:* ${contextString}`;
}
