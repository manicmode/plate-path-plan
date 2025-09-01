import { analyzeLyfV1 } from './detectorClient';
import { looksFoodish, rankSource } from './filters';
import { mapVisionNameToFood } from './mapToNutrition';

export async function analyzePhotoForLyfV1(supabase: any, base64: string) {
  const { items, _debug } = await analyzeLyfV1(supabase, base64);
  const candidates = [...items].filter(i=>i?.name && looksFoodish(i.name)).sort(rankSource);
  const mapped: any[] = [];
  for (const c of candidates) {
    const hit = await mapVisionNameToFood(c.name);
    if (hit) mapped.push({ vision: c.name, hit, source: c.source });
  }
  console.info('[LYF] mapped', mapped.map(m=>({vision:m.vision, to:m.hit?.name, src:m.source})));
  return { mapped, _debug };
}