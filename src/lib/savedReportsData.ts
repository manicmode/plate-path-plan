import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical data access for saved reports - uses only Supabase DB with RLS
 * NO mocks, localStorage, or demo data fallbacks
 */

export async function fetchSavedReports({ limit = 25, cursor }: { limit?: number; cursor?: string | null }) {
  const before = cursor ?? new Date().toISOString();
  // @ts-ignore - New columns not in generated types yet  
  const q = supabase
    .from('nutrition_logs_clean')
    .select('id, created_at, food_name, image_url, source, calories, protein, carbs, fat, quality_score, quality_verdict')
    .lt('created_at', before)
    .order('created_at', { ascending: false })
    .limit(limit);

  const { data, error } = await q;
  if (error) throw error;
  console.log('[SAVED][QUERY]', { count: data?.length ?? 0, table: 'nutrition_logs_clean' });
  const items = data ?? [];
  const nextCursor = items.length ? items[items.length - 1].created_at : null;
  return { items, nextCursor };
}

export async function countSavedReports() {
  // @ts-ignore - New columns not in generated types yet
  const { count, error: countErr } = await supabase
    .from('nutrition_logs_clean')
    .select('*', { count: 'exact', head: true });
  
  if (countErr) {
    console.error('[SAVED][COUNT][ERROR]', countErr);
    throw countErr;
  }
  
  console.log('[SAVED][COUNT]', { count, table: 'nutrition_logs_clean' });
  return count ?? 0;
}