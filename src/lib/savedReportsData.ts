import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical data access for saved reports - uses only Supabase DB with RLS
 * NO mocks, localStorage, or demo data fallbacks
 */

export async function fetchSavedReports({ limit = 25, cursor }: { limit?: number; cursor?: string | null }) {
  const before = cursor ?? new Date().toISOString();
  const q = supabase
    .from('nutrition_logs')
    .select(`
      id, created_at, food_name, image_url, source,
      calories, protein, carbs, fat,
      quality_score, quality_verdict
    `)
    .lt('created_at', before)
    .order('created_at', { ascending: false })
    .limit(limit);

  const { data, error } = await q;
  if (error) throw error;
  const items = data ?? [];
  const nextCursor = items.length ? items[items.length - 1].created_at : null;
  return { items, nextCursor };
}

export async function countSavedReports() {
  const { count, error } = await supabase
    .from('nutrition_logs')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}