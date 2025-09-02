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

export async function saveMealSet(name: string, items: MealSetItem[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to save meal sets');
  }

  const { error } = await supabase
    .from('meal_sets')
    .insert({
      name,
      user_id: user.id,
      items: JSON.parse(JSON.stringify(items)) // Ensure proper JSON serialization
    });

  if (error) {
    throw new Error(`Failed to save meal set: ${error.message}`);
  }
}

export async function getMealSets(): Promise<MealSet[]> {
  const { data, error } = await supabase
    .from('meal_sets')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch meal sets: ${error.message}`);
  }

  // Type cast the Json items back to MealSetItem[]
  return (data || []).map(row => ({
    ...row,
    items: (row.items as unknown) as MealSetItem[]
  }));
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