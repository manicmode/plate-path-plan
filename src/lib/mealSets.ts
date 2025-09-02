import { supabase } from '@/integrations/supabase/client';

export interface MealSetItem {
  name: string;
  canonicalName: string;
  grams: number;
}

export interface MealSet {
  id: string;
  user_id: string;
  name: string;
  items: MealSetItem[];
  created_at: string;
  updated_at: string;
}

export async function createMealSet({ name, items }: { name: string; items: Array<{name: string; canonicalName?: string; grams: number}> }): Promise<MealSet> {
  // Use type assertion to bypass the user_id requirement - the trigger will set it
  const { data, error } = await supabase
    .from('meal_sets')
    .insert({
      name,
      items: JSON.parse(JSON.stringify(items)) // Ensure proper JSON serialization
    } as any)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save meal set: ${error.message}`);
  }

  console.info('[MEAL_SETS] saved:', { id: data.id, name: data.name, count: items.length });
  
  return {
    ...data,
    items: (data.items as unknown) as MealSetItem[]
  };
}

export async function saveMealSet(name: string, items: MealSetItem[]): Promise<void> {
  await createMealSet({ name, items });
}

export async function listMealSets(): Promise<MealSet[]> {
  const { data, error } = await supabase
    .from('meal_sets')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch meal sets: ${error.message}`);
  }

  console.info('[MEAL_SETS] loaded:', data?.length || 0);

  // Type cast the Json items back to MealSetItem[]
  return (data || []).map(row => ({
    ...row,
    items: (row.items as unknown) as MealSetItem[]
  }));
}

export async function getMealSets(): Promise<MealSet[]> {
  return listMealSets();
}

export async function deleteMealSet(id: string): Promise<void> {
  const { error } = await supabase
    .from('meal_sets')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete meal set: ${error.message}`);
  }
}

export async function renameMealSet(id: string, newName: string): Promise<void> {
  const { error } = await supabase
    .from('meal_sets')
    .update({ name: newName })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to rename meal set: ${error.message}`);
  }
}