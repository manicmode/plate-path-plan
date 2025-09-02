import { supabase } from '@/integrations/supabase/client';

interface MealSetItem {
  name: string;
  canonicalName: string;
  grams: number;
}

export async function saveMealSet(name: string, items: MealSetItem[]) {
  const { data, error } = await supabase
    .from('meal_sets' as any)
    .insert([{ 
      name: name.trim(), 
      items 
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMealSets() {
  const { data, error } = await supabase
    .from('meal_sets' as any)
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function deleteMealSet(id: string) {
  const { error } = await supabase
    .from('meal_sets' as any)
    .delete()
    .eq('id', id);

  if (error) throw error;
}