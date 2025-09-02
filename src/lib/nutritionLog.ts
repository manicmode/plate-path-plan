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

export async function createNutritionLogBatch(entries: NutritionLogEntry[], userId: string): Promise<void> {
  const logEntries = entries.map(entry => ({
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
  }));

  const { error } = await supabase
    .from('nutrition_logs')
    .insert(logEntries);

  if (error) {
    throw new Error(`Failed to batch log nutrition entries: ${error.message}`);
  }
}