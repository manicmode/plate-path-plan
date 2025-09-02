import { analyzeLyfV1 } from './detectorClient';
import { looksFoodish, rankSource, VEG_LABELS } from './filters';
import { mapVisionNameToFood } from './mapToNutrition';

function dedupePreferSpecific(items: any[]): any[] {
  const seen = new Set();
  const result = [];
  
  // Sort to prefer specific over generic (salmon over fish)
  const sorted = items.sort((a, b) => {
    const aGeneric = /^(fish|meat|seafood|protein|vegetable|fruit)$/i.test(a.name);
    const bGeneric = /^(fish|meat|seafood|protein|vegetable|fruit)$/i.test(b.name);
    if (aGeneric && !bGeneric) return 1;
    if (!aGeneric && bGeneric) return -1;
    return (b.confidence || 0) - (a.confidence || 0);
  });
  
  for (const item of sorted) {
    const key = item.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  
  return result;
}

export async function analyzePhotoForLyfV1(supabase: any, base64: string) {
  const response = await analyzeLyfV1(supabase, base64);
  const { items, _debug, labelsKeptRaw } = response;
  
  // Main items from server choice
  const main = [...items].filter(i => i?.name && looksFoodish(i.name));
  
  // Union vegetables from kept labels when objects were chosen
  let veg: any[] = [];
  if (_debug?.from === 'objects' || _debug?.from === 'labels') {
    veg = (labelsKeptRaw ?? [])
      .map((x: any) => (typeof x === 'string' ? {name: x} : x))
      .filter((x: any) => VEG_LABELS.test(String(x.name).toLowerCase()))
      .map((x: any) => ({ 
        name: String(x.name), 
        source: 'label' as const, 
        confidence: x.score ?? 0.7, 
        score: x.score ?? 0.7 
      }));
  }
  
  // Combine and dedupe, preferring specific over generic
  const union = dedupePreferSpecific([...main, ...veg]);
  const candidates = union.slice(0, 8).sort(rankSource);
  
  if (import.meta.env.DEV && veg.length > 0) {
    console.info('[LYF][v1] union-labels:', veg.map(v => v.name));
  }
  
  const mapped: any[] = [];
  for (const c of candidates) {
    const hit = await mapVisionNameToFood(c.name);
    if (hit) mapped.push({ vision: c.name, hit, source: c.source });
  }
  console.info('[LYF][v1] keep:', candidates.map(c => c.name));
  return { mapped, _debug };
}
