import { supabase } from '@/integrations/supabase/client';

interface BatchFoodItem {
  name: string;
  canonicalName?: string;
  grams: number;
  source?: string;
  imageId?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export async function createFoodLogsBatch(items: BatchFoodItem[], userId: string) {
  if (!items.length) return [];
  
  const now = new Date();
  const insertData = items.map(item => ({
    user_id: userId,
    food_name: item.canonicalName || item.name,
    calories: item.calories || estimateCaloriesFromGrams(item.grams, item.name),
    protein: item.protein || estimateProteinFromGrams(item.grams, item.name),
    carbs: item.carbs || estimateCarbsFromGrams(item.grams, item.name),
    fat: item.fat || estimateFatFromGrams(item.grams, item.name),
    fiber: item.fiber || estimateFiberFromGrams(item.grams, item.name),
    sugar: item.sugar || 0,
    sodium: item.sodium || 0,
    saturated_fat: (item.fat || estimateFatFromGrams(item.grams, item.name)) * 0.3,
    confidence: 85, // Good confidence for photo detection
    source: item.source || 'photo_v1',
    serving_size: `${item.grams}g`,
    image_url: item.imageId ? `/images/${item.imageId}` : null,
    created_at: now.toISOString()
  }));

  const { data, error } = await supabase
    .from('nutrition_logs')
    .insert(insertData)
    .select();

  if (error) throw error;
  return data || [];
}

// Simple nutrient estimation based on food type and grams
function estimateCaloriesFromGrams(grams: number, name: string): number {
  const nameLC = name.toLowerCase();
  
  // Proteins (4 cal/g protein, ~20-25g protein per 100g)
  if (/salmon|fish/.test(nameLC)) return Math.round(grams * 2.0); // ~200 cal/100g
  if (/chicken|beef|protein/.test(nameLC)) return Math.round(grams * 1.8);
  
  // Vegetables (low calorie)
  if (/asparagus|broccoli|spinach/.test(nameLC)) return Math.round(grams * 0.25);
  if (/tomato/.test(nameLC)) return Math.round(grams * 0.18);
  
  // Citrus (low-medium calorie)
  if (/lemon|lime/.test(nameLC)) return Math.round(grams * 0.3);
  
  // Default moderate calorie foods
  return Math.round(grams * 1.0);
}

function estimateProteinFromGrams(grams: number, name: string): number {
  const nameLC = name.toLowerCase();
  
  if (/salmon|fish/.test(nameLC)) return Math.round(grams * 0.25); // 25g protein per 100g
  if (/chicken|beef/.test(nameLC)) return Math.round(grams * 0.22);
  if (/asparagus/.test(nameLC)) return Math.round(grams * 0.02);
  if (/tomato|lemon/.test(nameLC)) return Math.round(grams * 0.01);
  
  return Math.round(grams * 0.05); // Default 5%
}

function estimateCarbsFromGrams(grams: number, name: string): number {
  const nameLC = name.toLowerCase();
  
  if (/salmon|fish|chicken|beef/.test(nameLC)) return 0; // Proteins have minimal carbs
  if (/asparagus/.test(nameLC)) return Math.round(grams * 0.02);
  if (/tomato/.test(nameLC)) return Math.round(grams * 0.04);
  if (/lemon/.test(nameLC)) return Math.round(grams * 0.09);
  
  return Math.round(grams * 0.03);
}

function estimateFatFromGrams(grams: number, name: string): number {
  const nameLC = name.toLowerCase();
  
  if (/salmon/.test(nameLC)) return Math.round(grams * 0.12); // Fatty fish
  if (/fish/.test(nameLC)) return Math.round(grams * 0.05); // Lean fish
  if (/chicken|beef/.test(nameLC)) return Math.round(grams * 0.08);
  
  // Vegetables/fruits have minimal fat
  return Math.round(grams * 0.01);
}

function estimateFiberFromGrams(grams: number, name: string): number {
  const nameLC = name.toLowerCase();
  
  if (/salmon|fish|chicken|beef/.test(nameLC)) return 0; // Proteins have no fiber
  if (/asparagus/.test(nameLC)) return Math.round(grams * 0.02);
  if (/tomato/.test(nameLC)) return Math.round(grams * 0.012);
  if (/lemon/.test(nameLC)) return Math.round(grams * 0.048);
  
  return Math.round(grams * 0.02);
}