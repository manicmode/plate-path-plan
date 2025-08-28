import { supabase } from '@/integrations/supabase/client';
import { toNutritionLogRow } from '@/adapters/nutritionLogs';

export async function saveScanToNutritionLogs(scan: any, source: 'barcode' | 'photo' | 'manual') {
  const payload = toNutritionLogRow(scan, source);

  // Note: user_id will be auto-filled by the trigger we created, but TypeScript requires it
  // Cast to any to bypass the type requirement since our trigger handles user_id
  const { data, error } = await supabase
    .from('nutrition_logs')
    .insert(payload as any)
    .select('*')               // helpful for confirming write + UI
    .single();

  if (error) {
    // dev diag hook
    if (import.meta.env.DEV) console.error('DB insert error', { payload, error });
    throw error;
  }
  return data;
}