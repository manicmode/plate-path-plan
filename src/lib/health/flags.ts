// Enhanced flags engine with synonyms and robustness
export type Flag = { code: string; severity: 'low'|'med'|'high'; reason: string };

const SYN = {
  hfcs: [/high fructose corn syrup/i, /glucose[-\s]?fructose syrup/i, /corn syrup/i],
  red40: [/red\s*40/i, /allura\s*red/i, /fd&c\s*red\s*40/i],
  yellow5: [/yellow\s*5/i, /tartrazine/i, /fd&c\s*yellow\s*5/i],
  blue1: [/blue\s*1/i, /brilliant\s*blue/i, /fd&c\s*blue\s*1/i],
  aspartame: [/aspartame/i],
  sucralose: [/sucralose/i, /splenda/i],
  acesulfame: [/acesulfame\s*potassium/i, /ace-k/i],
  msg: [/monosodium\s*glutamate/i, /\bmsg\b/i],
  bht: [/\bbht\b/i, /butylated\s*hydroxytoluene/i],
  bha: [/\bbha\b/i, /butylated\s*hydroxyanisole/i],
  nitrites: [/sodium\s*nitrite/i, /potassium\s*nitrite/i],
  phosphates: [/sodium\s*phosphate/i, /potassium\s*phosphate/i, /phosphoric\s*acid/i],
  carrageenan: [/carrageenan/i],
  palm_oil: [/palm\s*oil/i, /palm\s*kernel/i],
};

export function runFlagsEngine(parsed: any): Flag[] {
  const out: Flag[] = [];
  const ingRaw = (parsed?.ingredients ?? parsed?.ingredients_text ?? '').toString();

  const norm = ingRaw
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/[().]/g,' ')
    .replace(/\s+/g,' ')
    .trim();

  const hit = (reArr: RegExp[]) => reArr.some((re) => re.test(norm));

  // Ingredient-based flags
  if (hit(SYN.hfcs)) out.push({ code: 'hfcs', severity: 'high', reason: 'High-fructose corn syrup detected' });
  if (hit(SYN.red40)) out.push({ code: 'red40', severity: 'med', reason: 'Artificial color (Red 40)' });
  if (hit(SYN.yellow5)) out.push({ code: 'yellow5', severity: 'med', reason: 'Artificial color (Yellow 5)' });
  if (hit(SYN.blue1)) out.push({ code: 'blue1', severity: 'med', reason: 'Artificial color (Blue 1)' });
  if (hit(SYN.aspartame)) out.push({ code: 'aspartame', severity: 'med', reason: 'Artificial sweetener (Aspartame)' });
  if (hit(SYN.sucralose)) out.push({ code: 'sucralose', severity: 'low', reason: 'Artificial sweetener (Sucralose)' });
  if (hit(SYN.acesulfame)) out.push({ code: 'acesulfame', severity: 'low', reason: 'Artificial sweetener (Acesulfame K)' });
  if (hit(SYN.msg)) out.push({ code: 'msg', severity: 'med', reason: 'Monosodium glutamate (MSG)' });
  if (hit(SYN.bht)) out.push({ code: 'bht', severity: 'med', reason: 'Preservative (BHT)' });
  if (hit(SYN.bha)) out.push({ code: 'bha', severity: 'med', reason: 'Preservative (BHA)' });
  if (hit(SYN.nitrites)) out.push({ code: 'nitrites', severity: 'high', reason: 'Sodium/Potassium nitrite' });
  if (hit(SYN.phosphates)) out.push({ code: 'phosphates', severity: 'low', reason: 'Added phosphates' });
  if (hit(SYN.carrageenan)) out.push({ code: 'carrageenan', severity: 'low', reason: 'Carrageenan (thickener)' });
  if (hit(SYN.palm_oil)) out.push({ code: 'palm_oil', severity: 'low', reason: 'Palm oil (environmental concern)' });

  // Nutritional fact-based flags
  const facts = parsed?.facts || parsed?.per100 || parsed?.nutritionData || {};
  const sugar100 = facts?.sugar_g_per_100g ?? facts?.sugar_g ?? facts?.sugars_g ?? 0;
  if (sugar100 >= 22) out.push({ code: 'high_sugar', severity: 'high', reason: 'High sugar content (>22g/100g)' });
  else if (sugar100 >= 15) out.push({ code: 'med_sugar', severity: 'med', reason: 'Moderate sugar content (15-22g/100g)' });

  const satfat100 = facts?.satfat_g_per_100g ?? facts?.satfat_g ?? facts?.saturated_fat_g ?? 0;
  if (satfat100 >= 5) out.push({ code: 'high_satfat', severity: 'med', reason: 'High saturated fat (>5g/100g)' });

  const sodium100 = facts?.sodium_mg_per_100g ?? facts?.sodium_mg ?? facts?.sodium ?? 0;
  if (sodium100 >= 600) out.push({ code: 'high_sodium', severity: 'med', reason: 'High sodium content (>600mg/100g)' });
  else if (sodium100 >= 400) out.push({ code: 'med_sodium', severity: 'low', reason: 'Moderate sodium content (400-600mg/100g)' });

  const calories = facts?.energyKcal ?? facts?.calories ?? 0;
  if (calories >= 400) out.push({ code: 'high_calorie', severity: 'low', reason: 'High calorie density (>400kcal/100g)' });

  return dedupeFlags(out);
}

function dedupeFlags(f: Flag[]) {
  const seen = new Set<string>();
  return f.filter((x) => (seen.has(x.code) ? false : (seen.add(x.code), true)));
}