import { supabase } from '@/integrations/supabase/client';

export async function migrateAllRoutineFormats() {
  try {
    const { data, error } = await supabase.functions.invoke('migrate-routine-formats', {
      body: { run_migration: true }
    });

    if (error) {
      throw error;
    }

    console.log('Migration completed:', data);
    return data;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}