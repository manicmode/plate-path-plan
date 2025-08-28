/**
 * Canonical saved reports data access - NO MOCKS, DB ONLY
 * Uses public.nutrition_logs with RLS filtering to auth.uid()
 */

import { supabase } from '@/integrations/supabase/client';

export async function fetchSavedReports({ limit = 25, cursor }: { limit?: number; cursor?: string | null } = {}) {
  // DEV-only session diagnostics
  if (import.meta.env.DEV) {
    const { data: sess } = await supabase.auth.getSession();
    console.log('[SAVED-REPORTS][FETCH-SESSION]', { 
      hasSession: !!sess?.session, 
      user: sess?.session?.user?.id,
      timestamp: new Date().toISOString()
    });
  }

  const before = cursor ?? new Date().toISOString();
  const q = supabase
    .from('nutrition_logs')
    .select(`
      id, created_at, food_name, image_url, source,
      calories, protein, carbs, fat,
      quality_score, quality_verdict, user_id
    `)
    .lt('created_at', before)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Log the exact query being executed
  if (import.meta.env.DEV) {
    console.log('[SAVED-REPORTS][QUERY]', {
      table: 'nutrition_logs',
      filters: { before, limit },
      rls: 'Applied (user_id = auth.uid())'
    });
  }

  const { data, error } = await q;
  if (error) {
    console.error('[SAVED-REPORTS][QUERY-ERROR]', error);
    throw error;
  }
  
  const items = data ?? [];
  const nextCursor = items.length ? items[items.length - 1].created_at : null;
  
  // Log data source (must be db only)
  console.log('[SAVED-REPORTS][DATASOURCE]', { 
    source: 'db', // MUST BE DB ONLY
    count: items.length,
    actualData: items.length > 0 ? items.slice(0, 3).map(item => ({
      id: item.id,
      name: item.food_name,
      user_id: item.user_id,
      created: item.created_at
    })) : []
  });
  
  return { items, nextCursor };
}

export async function countSavedReports() {
  // DEV-only session diagnostics
  if (import.meta.env.DEV) {
    const { data: sess } = await supabase.auth.getSession();
    console.log('[SAVED-REPORTS][COUNT-SESSION]', { 
      hasSession: !!sess?.session, 
      user: sess?.session?.user?.id,
      timestamp: new Date().toISOString()
    });
  }

  const { count, error } = await supabase
    .from('nutrition_logs')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('[SAVED-REPORTS][COUNT-ERROR]', error);
    throw error;
  }
  
  const totalCount = count ?? 0;
  console.log('[SAVED-REPORTS][COUNT]', { 
    source: 'db', 
    count: totalCount,
    query: 'SELECT COUNT(*) FROM nutrition_logs WHERE user_id = auth.uid()'
  });
  
  return totalCount;
}