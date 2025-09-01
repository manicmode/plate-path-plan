import { analyzeLyfV1 } from './detectorClient';
import { looksFoodish, rankSource } from './filters';
import { mapVisionNameToFood } from './mapToNutrition';

export async function analyzePhotoForLyfV1(supabase: any, base64: string) {
  const { items, _debug } = await analyzeLyfV1(supabase, base64);
  
  console.info('[LYF][v1] items before map', items);
  
  const candidates = [...items].filter(i=>i?.name && looksFoodish(i.name)).sort(rankSource);
  
  console.info('[LYF][v1] items after filter', candidates);
  
  const mapped: any[] = [];
  for (const c of candidates) {
    const hit = await mapVisionNameToFood(c.name);
    if (hit) mapped.push({ vision: c.name, hit, source: c.source });
  }
  
  if (import.meta.env.DEV) console.info('[LYF][v1] mapped', mapped);
  
  return { mapped, _debug };
}