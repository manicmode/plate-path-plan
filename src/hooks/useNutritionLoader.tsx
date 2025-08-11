
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { safeGetJSON, safeSetJSON } from '@/lib/safeStorage';
import { getLocalDateString, getLocalDayBounds } from '@/lib/dateUtils';

// Resilient fetch helpers to avoid blank UI on 4xx
const sleep = (ms:number)=>new Promise(r=>setTimeout(r,ms));

async function safeSelect<T>(q: any, {retries=2, delay=400}:{retries?:number, delay?:number} = {}): Promise<T[]> {
  for (let i=0;i<=retries;i++){
    const { data, error, status } = await q;
    if (!error) return (data ?? []) as T[];
    console.warn('[nutri] select warn', { status, error });
    if (status >= 500 && i < retries) await sleep(delay);
    else return [] as T[]; // 4xx → empty
  }
  return [] as T[];
}

async function safeSingle<T>(q: any, {retries=2, delay=400}:{retries?:number, delay?:number} = {}): Promise<T | null> {
  for (let i=0;i<=retries;i++){
    const { data, error, status } = await (q.single?.() ?? q);
    if (!error) return (data ?? null) as T | null;
    console.warn('[nutri] single warn', { status, error });
    if (status >= 500 && i < retries) await sleep(delay);
    else return null; // 4xx → null
  }
  return null;
}

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
      
      // Load foods from nutrition_logs using local day bounds
      const foodsRows = await safeSelect<any>(
        supabase
          .from('nutrition_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: true })
      );
      
      console.log(`🍽️ Found ${foodsRows?.length || 0} food logs for ${date}`);
      if (foodsRows && foodsRows.length > 0) {
        console.log('📋 Food logs:', foodsRows.map((f: any) => ({ name: f.food_name, created_at: f.created_at })));
      }

      // Load hydration from hydration_logs using local day bounds
      const hydrationRows = await safeSelect<any>(
        supabase
          .from('hydration_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: true })
      );
      
      console.log(`💧 Found ${hydrationRows?.length || 0} hydration logs for ${date}`);

      // Load supplements from supplement_logs using local day bounds
      const supplementsRows = await safeSelect<any>(
        supabase
          .from('supplement_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: true })
      );
      
      console.log(`💊 Found ${supplementsRows?.length || 0} supplement logs for ${date}`);

      // Transform database data to context format
      const foods: FoodItem[] = (foodsRows || []).map((item: any) => ({
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

      const hydration: HydrationItem[] = (hydrationRows || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        volume: item.volume,
        type: item.type as 'water' | 'other',
        image: item.image_url || undefined,
        timestamp: new Date(item.created_at)
      }));

      const supplements: SupplementItem[] = (supplementsRows || []).map((item: any) => ({
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
