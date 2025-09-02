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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to log food');
  }

  const logEntries = items.map(item => ({
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
  }));

  const { error } = await supabase
    .from('nutrition_logs')
    .insert(logEntries);

  if (error) {
    throw new Error(`Failed to log nutrition entries: ${error.message}`);
  }
}