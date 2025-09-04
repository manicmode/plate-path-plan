import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SavedIndividualLog {
  id: string;
  food_name: string;
  serving_size: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  image_url: string | null;
  barcode: string | null;
  brand: string | null;
  source: string | null;
  created_at: string;
  confidence: number | null;
}

export const useSavedIndividualLogs = () => {
  const [logs, setLogs] = useState<SavedIndividualLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('nutrition_logs')
        .select(`
          id,
          food_name,
          serving_size,
          calories,
          protein,
          carbs,
          fat,
          fiber,
          sugar,
          sodium,
          image_url,
          barcode,
          brand,
          source,
          created_at,
          confidence
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setLogs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const relogItem = async (log: SavedIndividualLog) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('nutrition_logs')
        .insert({
          food_name: log.food_name,
          serving_size: log.serving_size,
          calories: log.calories,
          protein: log.protein,
          carbs: log.carbs,
          fat: log.fat,
          fiber: log.fiber,
          sugar: log.sugar,
          sodium: log.sodium,
          image_url: log.image_url,
          barcode: log.barcode,
          brand: log.brand,
          source: log.source,
          confidence: log.confidence,
          user_id: user.id
        });

      if (error) throw error;
      
      // Refresh the logs after relogging
      await fetchLogs();
      
      return true;
    } catch (error) {
      console.error('Failed to re-log item:', error);
      return false;
    }
  };

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
    relogItem
  };
};