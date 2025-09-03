import { supabase } from '@/integrations/supabase/client';

export interface NutritionLogEntry {
  name: string;
  canonicalName: string;
  grams: number;
  source: string;
}

export async function createNutritionLogEntry(entry: NutritionLogEntry, userId: string): Promise<void> {
  const { error } = await supabase
    .from('nutrition_logs')
    .insert({
      food_name: entry.name,
      serving_size: `${entry.grams}g`,
      source: entry.source,
      user_id: userId,
      // Default nutritional values - these should ideally come from the food database
      calories: Math.round(entry.grams * 2), // Rough estimate
      protein: Math.round(entry.grams * 0.1), 
      carbs: Math.round(entry.grams * 0.2),
      fat: Math.round(entry.grams * 0.05),
      fiber: Math.round(entry.grams * 0.02),
      sugar: Math.round(entry.grams * 0.1),
      sodium: Math.round(entry.grams * 5),
      confidence: 85
    });

  if (error) {
    throw new Error(`Failed to log nutrition entry: ${error.message}`);
  }
}

export async function oneTapLog(items: Array<{ name: string; canonicalName?: string; grams: number }>) {
  const LOG_DEBUG = import.meta.env.VITE_LOG_DEBUG === 'true';
  
  if (LOG_DEBUG) {
    console.info('[LOG][PIPELINE][START]', { 
      count: items.length, 
      items: items.map(i => ({ name: i.name, grams: i.grams })) 
    });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to log food');
  }

  const logEntries = items.map(item => {
    const row = {
      food_name: item.canonicalName || item.name,
      serving_size: `${item.grams}g`,
      source: 'photo_v1',
      user_id: user.id,
      // Default nutritional values - these should ideally come from the food database
      calories: Math.round(item.grams * 2), // Rough estimate
      protein: Math.round(item.grams * 0.1), 
      carbs: Math.round(item.grams * 0.2),
      fat: Math.round(item.grams * 0.05),
      fiber: Math.round(item.grams * 0.02),
      sugar: Math.round(item.grams * 0.1),
      sodium: Math.round(item.grams * 5),
      confidence: 85
    };

    if (LOG_DEBUG) {
      console.info('[LOG][PREPARED_ROW]', { 
        name: row.food_name, 
        grams: item.grams, 
        calories: row.calories 
      });
    }

    return row;
  });

  const { data, error } = await supabase
    .from('nutrition_logs')
    .insert(logEntries)
    .select('id, food_name, serving_size, calories');

  if (error) {
    if (LOG_DEBUG) console.error('[LOG][INSERT][ERROR]', error);
    throw new Error(`Failed to log nutrition entries: ${error.message}`);
  }

  if (LOG_DEBUG) {
    // per-row confirmation
    data?.forEach((r: any) => {
      const grams = r.serving_size?.replace('g', '') || '0';
      console.info('[LOG][INSERT][OK]', { 
        id: r.id, 
        name: r.food_name, 
        grams: grams, 
        calories: r.calories 
      });
    });
    console.info('[LOG][PIPELINE][DONE]', { inserted: data?.length ?? 0 });
  }
}

// Dev-only helper to fetch recent logs for debugging
export async function debugFetchLatestLogs() {
  const LOG_DEBUG = import.meta.env.VITE_LOG_DEBUG === 'true';
  if (!LOG_DEBUG) return;
  
  const startOfDay = new Date(); 
  startOfDay.setHours(0,0,0,0);
  
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('id, food_name, serving_size, calories, created_at')
    .gte('created_at', startOfDay.toISOString())
    .order('created_at', { ascending: false })
    .limit(8);
    
  if (error) {
    console.error('[LOG][DEBUG_FETCH][ERROR]', error);
  } else {
    console.table(data);
  }
}