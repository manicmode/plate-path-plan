import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ToxinData {
  name: string;
  icon: string;
  current: number;
  threshold: number;
  unit: string;
}

const TOXIN_THRESHOLDS = {
  inflammatory_foods: { name: "Inflammatory Foods", icon: "🔥", threshold: 2, unit: "servings" },
  artificial_sweeteners: { name: "Artificial Sweeteners", icon: "🧪", threshold: 1, unit: "servings" },
  preservatives: { name: "Preservatives", icon: "⚗️", threshold: 3, unit: "servings" },
  dyes: { name: "Dyes", icon: "🎨", threshold: 1, unit: "servings" },
  seed_oils: { name: "Seed Oils", icon: "🌻", threshold: 2, unit: "servings" },
  gmos: { name: "GMOs", icon: "🧬", threshold: 2, unit: "servings" }
};

export const useToxinDetections = () => {
  const [toxinData, setToxinData] = useState<ToxinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchToxinData();
  }, [user]);

  const fetchToxinData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Fetch today's toxin detections
      const { data: detections, error: fetchError } = await supabase
        .from('toxin_detections')
        .select('toxin_type, serving_count')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (fetchError) {
        throw fetchError;
      }

      // Aggregate data by toxin type
      const aggregatedData: { [key: string]: number } = {};
      
      detections?.forEach(detection => {
        if (!aggregatedData[detection.toxin_type]) {
          aggregatedData[detection.toxin_type] = 0;
        }
        aggregatedData[detection.toxin_type] += Number(detection.serving_count);
      });

      // Convert to ToxinData format
      const toxinArray: ToxinData[] = Object.entries(TOXIN_THRESHOLDS).map(([key, config]) => ({
        name: config.name,
        icon: config.icon,
        current: aggregatedData[key] || 0,
        threshold: config.threshold,
        unit: config.unit
      }));

      setToxinData(toxinArray);
    } catch (err) {
      console.error('Error fetching toxin data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch toxin data');
    } finally {
      setLoading(false);
    }
  };

  // Function to trigger toxin detection for a new food log
  const detectToxinsForFood = async (nutritionLogId: string, foodName: string, ingredients?: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('detect-toxins', {
        body: {
          nutrition_log_id: nutritionLogId,
          food_name: foodName,
          ingredients: ingredients || '',
          user_id: user.id
        }
      });

      if (error) {
        console.error('Error detecting toxins:', error);
        return;
      }

      console.log('Toxin detection result:', data);
      
      // Refresh data after detection
      await fetchToxinData();
      
      return data;
    } catch (err) {
      console.error('Error calling detect-toxins function:', err);
    }
  };

  return {
    toxinData,
    loading,
    error,
    refetch: fetchToxinData,
    detectToxinsForFood
  };
};