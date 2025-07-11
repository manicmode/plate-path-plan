import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { safeGetJSON, safeSetJSON } from '@/lib/safeStorage';

interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  image?: string;
  confidence?: number;
  timestamp: Date;
  confirmed: boolean;
}

interface HydrationItem {
  id: string;
  name: string;
  volume: number; // in ml
  type: 'water' | 'other';
  image?: string;
  timestamp: Date;
}

interface SupplementItem {
  id: string;
  name: string;
  dosage: number;
  unit: string;
  frequency?: string;
  notifications: { time: string; frequency: string }[];
  image?: string;
  timestamp: Date;
}

export interface LoadedNutritionData {
  foods: FoodItem[];
  hydration: HydrationItem[];
  supplements: SupplementItem[];
}

export const useNutritionLoader = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<LoadedNutritionData>({
    foods: [],
    hydration: [],
    supplements: []
  });

  const loadTodaysData = async (date: string) => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Load from localStorage as fallback
      const localKey = `nutrition_${user.id}_${date}`;
      const localData = safeGetJSON(localKey, null);
      
      // Load foods from nutrition_logs
      const { data: foodsData, error: foodsError } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${date}T00:00:00.000Z`)
        .lt('created_at', `${date}T23:59:59.999Z`)
        .order('created_at', { ascending: true });

      if (foodsError) throw foodsError;

      // Load hydration from hydration_logs
      const { data: hydrationData, error: hydrationError } = await supabase
        .from('hydration_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${date}T00:00:00.000Z`)
        .lt('created_at', `${date}T23:59:59.999Z`)
        .order('created_at', { ascending: true });

      if (hydrationError) throw hydrationError;

      // Load supplements from supplement_logs
      const { data: supplementsData, error: supplementsError } = await supabase
        .from('supplement_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${date}T00:00:00.000Z`)
        .lt('created_at', `${date}T23:59:59.999Z`)
        .order('created_at', { ascending: true });

      if (supplementsError) throw supplementsError;

      // Transform database data to context format
      const foods: FoodItem[] = (foodsData || []).map(item => ({
        id: item.id,
        name: item.food_name,
        calories: item.calories || 0,
        protein: Number(item.protein) || 0,
        carbs: Number(item.carbs) || 0,
        fat: Number(item.fat) || 0,
        fiber: Number(item.fiber) || 0,
        sugar: Number(item.sugar) || 0,
        sodium: Number(item.sodium) || 0,
        image: item.image_url || undefined,
        confidence: item.confidence || undefined,
        timestamp: new Date(item.created_at),
        confirmed: true
      }));

      const hydration: HydrationItem[] = (hydrationData || []).map(item => ({
        id: item.id,
        name: item.name,
        volume: item.volume,
        type: item.type as 'water' | 'other',
        image: item.image_url || undefined,
        timestamp: new Date(item.created_at)
      }));

      const supplements: SupplementItem[] = (supplementsData || []).map(item => ({
        id: item.id,
        name: item.name,
        dosage: Number(item.dosage),
        unit: item.unit,
        frequency: item.frequency || undefined,
        notifications: [], // Empty for now, notifications are handled separately
        image: item.image_url || undefined,
        timestamp: new Date(item.created_at)
      }));

      const loadedData = { foods, hydration, supplements };
      setData(loadedData);

      // Update localStorage cache
      safeSetJSON(localKey, loadedData);

    } catch (error) {
      console.error('Error loading nutrition data:', error);
      
      // Fallback to localStorage if available
      const localKey = `nutrition_${user.id}_${date}`;
      const localData = safeGetJSON(localKey, { foods: [], hydration: [], supplements: [] });
      setData(localData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    loadTodaysData(today);
  }, [user]);

  return {
    data,
    isLoading,
    loadTodaysData
  };
};