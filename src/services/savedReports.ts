import { supabase } from '@/integrations/supabase/client';

export interface SavedReportItem {
  id: string;
  created_at: string;
  food_name: string;
  image_url: string | null;
  source: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quality_score: number;
  quality_verdict: string;
}

export interface SavedReportsResponse {
  items: SavedReportItem[];
  nextCursor: string | null;
}

/**
 * Canonical fetch for saved reports with cursor pagination
 * Uses Supabase client (user context) - NO fallbacks, NO mocks
 */
export async function fetchSavedReports({ 
  limit = 25, 
  cursor 
}: { 
  limit?: number; 
  cursor?: string | null 
}): Promise<SavedReportsResponse> {
  console.log('[FORENSIC_QA] fetchSavedReports called - cursor:', cursor, 'limit:', limit);
  
  // cursor is an ISO string for keyset pagination; when absent, start from now
  const before = cursor ?? new Date().toISOString();
  
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select(`
      id, created_at, food_name, image_url, source,
      calories, protein, carbs, fat,
      quality_score, quality_verdict
    `)
    .lt('created_at', before)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[FORENSIC_QA] Fetch error:', error);
    throw error;
  }

  const nextCursor = data?.length ? data[data.length - 1].created_at : null;
  
  console.log(`[FORENSIC_QA] Fetched ${data?.length || 0} items from nutrition_logs, nextCursor: ${nextCursor}`);
  
  return { 
    items: data ?? [], 
    nextCursor 
  };
}

/**
 * Badge count source of truth - DB count for this user
 */
export async function countSavedReports(): Promise<number> {
  console.log('[FORENSIC_QA] countSavedReports called - querying nutrition_logs');
  
  const { count, error } = await supabase
    .from('nutrition_logs')
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.error('[FORENSIC_QA] Count error:', error);
    throw error;
  }
  
  const totalCount = count ?? 0;
  console.log(`[FORENSIC_QA] nutrition_logs count for user: ${totalCount}`);
  
  return totalCount;
}