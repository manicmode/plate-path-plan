
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { safeGetJSON, safeSetJSON } from '@/lib/safeStorage';
import { getLocalDateString, getLocalDayBounds } from '@/lib/dateUtils';
import { toast } from '@/hooks/use-toast';

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
  saturated_fat: number;
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
      
      console.log(`🔄 Loading nutrition data for local date: ${date}`);
      
      // Get local day bounds for filtering
      const { start, end } = getLocalDayBounds(date);
      
      console.log(`🔍 Querying nutrition logs between:`);
      console.log(`  Start: ${start}`);
      console.log(`  End: ${end}`);
      
      // Load from localStorage as fallback
      const localKey = `nutrition_${user.id}_${date}`;
      const localData = safeGetJSON(localKey, null);
      
      // Retry wrapper function
      const retryQuery = async (queryFn: () => Promise<any>, name: string, maxRetries = 3) => {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await queryFn();
            if (attempt > 1) {
              console.log(`✅ ${name} succeeded on attempt ${attempt}`);
            }
            return result;
          } catch (error) {
            lastError = error;
            console.error(`❌ ${name} failed on attempt ${attempt}/${maxRetries}:`, error);
            
            if (attempt < maxRetries) {
              const backoffMs = attempt * 1000; // 1s, 2s, 3s
              console.log(`⏳ Retrying ${name} in ${backoffMs}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoffMs));
            }
          }
        }
        throw lastError;
      };

      // Load foods from nutrition_logs using local day bounds with retry
      let foodsData;
      try {
        const result = await retryQuery(
          async () => {
            const queryResult = await supabase
              .from('nutrition_logs')
              .select('*')
              .eq('user_id', user.id)
              .gte('created_at', start)
              .lte('created_at', end)
              .order('created_at', { ascending: true });
            return queryResult;
          },
          'nutrition_logs query'
        );
        if (result.error) throw result.error;
        foodsData = result.data;
      } catch (foodsError) {
        console.error('❌ Final failure loading nutrition logs:', foodsError);
        toast({
          title: "Data Loading Issue",
          description: "Some nutrition data may be unavailable. Using cached data where possible.",
          variant: "default"
        });
        foodsData = [];
      }
      
      console.log(`🍽️ Found ${foodsData?.length || 0} food logs for ${date}`);
      if (foodsData && foodsData.length > 0) {
        console.log('📋 Food logs:', foodsData.map(f => ({ name: f.food_name, created_at: f.created_at })));
      }

      // Load hydration from hydration_logs using local day bounds with retry
      let hydrationData;
      try {
        const result = await retryQuery(
          async () => {
            const queryResult = await supabase
              .from('hydration_logs')
              .select('*')
              .eq('user_id', user.id)
              .gte('created_at', start)
              .lte('created_at', end)
              .order('created_at', { ascending: true });
            return queryResult;
          },
          'hydration_logs query'
        );
        if (result.error) throw result.error;
        hydrationData = result.data;
      } catch (hydrationError) {
        console.error('❌ Final failure loading hydration logs:', hydrationError);
        hydrationData = [];
      }
      
      console.log(`💧 Found ${hydrationData?.length || 0} hydration logs for ${date}`);

      // Load supplements from supplement_logs using local day bounds with retry
      let supplementsData;
      try {
        const result = await retryQuery(
          async () => {
            const queryResult = await supabase
              .from('supplement_logs')
              .select('*')
              .eq('user_id', user.id)
              .gte('created_at', start)
              .lte('created_at', end)
              .order('created_at', { ascending: true });
            return queryResult;
          },
          'supplement_logs query'
        );
        if (result.error) throw result.error;
        supplementsData = result.data;
      } catch (supplementsError) {
        console.error('❌ Final failure loading supplement logs:', supplementsError);
        supplementsData = [];
      }
      
      console.log(`💊 Found ${supplementsData?.length || 0} supplement logs for ${date}`);

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
        saturated_fat: Number(item.saturated_fat) || (Number(item.fat) * 0.3), // Fallback: 30% of total fat
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

      // Calculate totals for debugging with type guard
      const totalCalories = Array.isArray(foods) 
        ? foods.reduce((sum, food) => sum + food.calories, 0) 
        : 0;
      console.log(`📊 Total calories loaded: ${totalCalories}`);

      // Update localStorage cache
      safeSetJSON(localKey, loadedData);

    } catch (error) {
      console.error('❌ Error loading nutrition data:', error);
      
      // Fallback to localStorage if available
      const localKey = `nutrition_${user.id}_${date}_backup`;
      const localData = safeGetJSON(localKey, { foods: [], hydration: [], supplements: [] });
      setData(localData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Use local date string instead of UTC
    const today = getLocalDateString();
    console.log(`🚀 useNutritionLoader initializing for local date: ${today}`);
    loadTodaysData(today);
  }, [user]);

  return {
    data,
    isLoading,
    loadTodaysData
  };
};
