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

export async function createMealSet({
  name,
  items,
}: {
  name: string;
  items: Array<{ name: string; canonicalName?: string; grams: number }>;
}): Promise<MealSet> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Authentication required to save meal sets');

  const insertPayload = {
    user_id: user.id,
    name,
    items: JSON.parse(JSON.stringify(items)),
  };

  console.log('[MEAL_SET][CREATE:REQUEST]', insertPayload);

  const { data, error } = await supabase
    .from('meal_sets')
    .insert(insertPayload)
    .select()
    .single();

  console.log('[MEAL_SET][CREATE:RESPONSE]', { ok: !error, id: data?.id, error });

  if (error) throw new Error(error.message || 'Failed to save meal set');
  return { ...data, items: (data.items as unknown) as MealSetItem[] };
}

export async function saveMealSet(name: string, items: MealSetItem[]): Promise<void> {
  await createMealSet({ name, items });
}

export async function listMealSets(limit = 20, offset = 0): Promise<MealSet[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return [];

  console.log('[MEAL_SET][LIST:REQUEST]', { userId: user.id, limit, offset });

  const { data, error } = await supabase
    .from('meal_sets')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  console.log('[MEAL_SET][LIST:RESPONSE]', { count: data?.length ?? 0, error });

  if (error) {
    console.error('Failed to load meal sets:', error);
    return [];
  }

  return (data || []).map(row => ({
    ...row,
    items: (row.items as unknown) as MealSetItem[],
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