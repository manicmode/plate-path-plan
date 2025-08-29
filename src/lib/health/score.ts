// Safe scoring system with bounds and normalization
export type ScoreInput = {
  calories_per_serving?: number; // 0–1200 clamp
  sugar_g_per_100g?: number;     // 0–100 clamp
  satfat_g_per_100g?: number;    // 0–100 clamp
  sodium_mg_per_100g?: number;   // 0–5000 clamp
  fiber_g_per_100g?: number;     // 0–30 clamp (positive)
  protein_g_per_100g?: number;   // 0–80 clamp (positive)
  additives_count?: number;      // 0–30 clamp (penalty)
  ultra_processed?: boolean;
  // ... extend as needed
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export async function safeScore(input: ScoreInput) {
  const i = { ...input };

  // Normalize/Clamp
  i.calories_per_serving = clamp(i.calories_per_serving ?? 0, 0, 1200);
  i.sugar_g_per_100g    = clamp(i.sugar_g_per_100g ?? 0, 0, 100);
  i.satfat_g_per_100g   = clamp(i.satfat_g_per_100g ?? 0, 0, 100);
  i.sodium_mg_per_100g  = clamp(i.sodium_mg_per_100g ?? 0, 0, 5000);
  i.fiber_g_per_100g    = clamp(i.fiber_g_per_100g ?? 0, 0, 30);
  i.protein_g_per_100g  = clamp(i.protein_g_per_100g ?? 0, 0, 80);
  i.additives_count     = clamp(i.additives_count ?? 0, 0, 30);

  // Weighted components (tunable constants; keep stable now)
  const penalties =
    0.35 * (i.sugar_g_per_100g / 100) * 100 +
    0.20 * (i.satfat_g_per_100g / 100) * 100 +
    0.15 * (i.sodium_mg_per_100g / 5000) * 100 +
    0.10 * (i.calories_per_serving / 1200) * 100 +
    0.10 * (i.additives_count / 30) * 100 +
    (i.ultra_processed ? 10 : 0);

  const bonuses =
    0.06 * (i.fiber_g_per_100g / 30) * 100 +
    0.04 * (i.protein_g_per_100g / 80) * 100;

  // Start from 100, subtract penalties, add bonuses, clamp
  const raw = 100 - penalties + bonuses;
  const finalScore = clamp(Math.round(raw), 0, 100);

  return { finalScore, components: { penalties, bonuses, normalized: i } };
}

// Dev sanity tests (no UI)
export function runSanityTests() {
  if (import.meta.env.VITE_HEALTH_DEBUG_SAFE !== 'true') return;
  
  // Granola (moderate sugar, decent fiber/protein, not ultra-processed) should land ~70–85
  const granola = {
    sugar_g_per_100g: 15,
    fiber_g_per_100g: 8,
    protein_g_per_100g: 12,
    sodium_mg_per_100g: 200,
    calories_per_serving: 150,
    ultra_processed: false
  };
  
  // Sour Punch (high sugar, ultra-processed, low fiber/protein) should land ~25–45
  const sourPunch = {
    sugar_g_per_100g: 65,
    fiber_g_per_100g: 0,
    protein_g_per_100g: 0,
    sodium_mg_per_100g: 50,
    calories_per_serving: 120,
    ultra_processed: true,
    additives_count: 8
  };
  
  console.log('[HEALTH][SANITY] Granola test:', safeScore(granola));
  console.log('[HEALTH][SANITY] Sour Punch test:', safeScore(sourPunch));
}
