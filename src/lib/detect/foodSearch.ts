// thin wrapper around your existing food-search edge/function
// return top candidates with score (0..1)
import { supabase } from '@/integrations/supabase/client';

export type FoodSearchHit = { name: string; score?: number; cats?: string[] };

export async function foodSearchCandidates(query: string, max = 5): Promise<FoodSearchHit[]> {
  try {
    const { data, error } = await supabase.functions.invoke('food-search', {
      body: { q: query, limit: max }
    });
    if (error) {
      console.warn('[FoodSearch] error', error);
      return [];
    }
    // Normalize shape defensively
    const arr = Array.isArray(data) ? data : (data?.results ?? []);
    return arr.map((r: any) => ({
      name: r?.name ?? r?.title ?? '',
      score: Number(r?.score ?? r?.similarity ?? 0.5),
      cats: r?.cats ?? r?.categories ?? [],
    }));
  } catch (error) {
    console.warn('[FoodSearch] exception', error);
    return [];
  }
}