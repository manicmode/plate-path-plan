import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { safeGetJSON, safeSetJSON } from '@/lib/safeStorage';
import { toast } from 'sonner';

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

export interface DailyTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number | null;
  sodium: number | null;
  saturated_fat: number | null;
	hydration_ml: number;
	supplement_count: number;
}

interface NutritionContextType {
  foods: FoodItem[];
  hydration: HydrationItem[];
  supplements: SupplementItem[];
  targets: DailyTargets;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
  loading: boolean;
  date: string;
  setDate: (date: string) => void;
  addFood: (food: Omit<FoodItem, 'id' | 'timestamp' | 'confirmed'>) => Promise<void>;
  addHydration: (hydrationItem: Omit<HydrationItem, 'id' | 'timestamp'>) => Promise<void>;
  addSupplement: (supplement: Omit<SupplementItem, 'id' | 'timestamp'>) => Promise<void>;
  updateFood: (id: string, updates: Partial<FoodItem>) => void;
  removeFood: (id: string) => Promise<void>;
  removeHydration: (id: string) => Promise<void>;
  removeSupplement: (id: string) => Promise<void>;
  loadTodaysData: (date: string) => Promise<void>;
  // Missing properties that components expect
  getTodaysProgress: () => {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    hydration: number;
    supplements: number;
  };
  getHydrationGoal: () => number;
  getSupplementGoal: () => number;
  currentDay: any;
  currentCoachCta: any;
  clearCoachCta: () => void;
  weeklyData: any[];
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

export const useNutrition = () => {
  const context = useContext(NutritionContext);
  if (context === undefined) {
    throw new Error('useNutrition must be used within a NutritionProvider');
  }
  return context;
};

interface NutritionProviderProps {
  children: ReactNode;
}

export const NutritionProvider: React.FC<NutritionProviderProps> = ({ children }) => {
  const nutritionStartTime = performance.now();
  console.log('🔍 NutritionProvider: Starting initialization at', nutritionStartTime.toFixed(2) + 'ms');

  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [hydration, setHydration] = useState<HydrationItem[]>([]);
  const [supplements, setSupplements] = useState<SupplementItem[]>([]);
  const [targets, setTargets] = useState<DailyTargets>({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65,
    fiber: 25,
    sugar: null,
    sodium: null,
    saturated_fat: null,
    hydration_ml: 2000,
    supplement_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { user } = useAuth();

  // Load data function with timing diagnostics
  const loadTodaysData = async (targetDate: string) => {
    const loadStartTime = performance.now();
    console.log('🔍 NutritionProvider: Starting data load at', loadStartTime.toFixed(2) + 'ms for date:', targetDate);

    if (!user) {
      console.log('🔍 NutritionProvider: No user, skipping data load');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Load from localStorage as fallback
      const localKey = `nutrition_${user.id}_${targetDate}`;
      const localStartTime = performance.now();
      const localData = safeGetJSON(localKey, null);
      console.log('🔍 NutritionProvider: Local storage check completed in', (performance.now() - localStartTime).toFixed(2) + 'ms');
      
      // Load foods from nutrition_logs
      const foodsStartTime = performance.now();
      const { data: foodsData, error: foodsError } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${targetDate}T00:00:00.000Z`)
        .lt('created_at', `${targetDate}T23:59:59.999Z`)
        .order('created_at', { ascending: true });

      console.log('🔍 NutritionProvider: Foods query completed in', (performance.now() - foodsStartTime).toFixed(2) + 'ms');

      if (foodsError) throw foodsError;

      // Load hydration from hydration_logs
      const hydrationStartTime = performance.now();
      const { data: hydrationData, error: hydrationError } = await supabase
        .from('hydration_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${targetDate}T00:00:00.000Z`)
        .lt('created_at', `${targetDate}T23:59:59.999Z`)
        .order('created_at', { ascending: true });

      console.log('🔍 NutritionProvider: Hydration query completed in', (performance.now() - hydrationStartTime).toFixed(2) + 'ms');

      if (hydrationError) throw hydrationError;

      // Load supplements from supplement_logs
      const supplementsStartTime = performance.now();
      const { data: supplementsData, error: supplementsError } = await supabase
        .from('supplement_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${targetDate}T00:00:00.000Z`)
        .lt('created_at', `${targetDate}T23:59:59.999Z`)
        .order('created_at', { ascending: true });

      console.log('🔍 NutritionProvider: Supplements query completed in', (performance.now() - supplementsStartTime).toFixed(2) + 'ms');

      if (supplementsError) throw supplementsError;

      // Transform database data to context format
      const transformStartTime = performance.now();
      const transformedFoods: FoodItem[] = (foodsData || []).map(item => ({
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

      const transformedHydration: HydrationItem[] = (hydrationData || []).map(item => ({
        id: item.id,
        name: item.name,
        volume: item.volume,
        type: item.type as 'water' | 'other',
        image: item.image_url || undefined,
        timestamp: new Date(item.created_at)
      }));

      const transformedSupplements: SupplementItem[] = (supplementsData || []).map(item => ({
        id: item.id,
        name: item.name,
        dosage: Number(item.dosage),
        unit: item.unit,
        frequency: item.frequency || undefined,
        notifications: [], // Empty for now, notifications are handled separately
        image: item.image_url || undefined,
        timestamp: new Date(item.created_at)
      }));

      console.log('🔍 NutritionProvider: Data transformation completed in', (performance.now() - transformStartTime).toFixed(2) + 'ms');

      setFoods(transformedFoods);
      setHydration(transformedHydration);
      setSupplements(transformedSupplements);

      // Update localStorage cache
      const cacheStartTime = performance.now();
      const cacheData = { 
        foods: transformedFoods, 
        hydration: transformedHydration, 
        supplements: transformedSupplements 
      };
      safeSetJSON(localKey, cacheData);
      console.log('🔍 NutritionProvider: Cache update completed in', (performance.now() - cacheStartTime).toFixed(2) + 'ms');

    } catch (error) {
      console.error('Error loading nutrition data:', error);
      
      // Fallback to localStorage if available
      const fallbackStartTime = performance.now();
      const localKey = `nutrition_${user.id}_${targetDate}`;
      const localData = safeGetJSON(localKey, { foods: [], hydration: [], supplements: [] });
      setFoods(localData.foods || []);
      setHydration(localData.hydration || []);
      setSupplements(localData.supplements || []);
      console.log('🔍 NutritionProvider: Fallback data loaded in', (performance.now() - fallbackStartTime).toFixed(2) + 'ms');
    } finally {
      setLoading(false);
      const totalLoadTime = performance.now() - loadStartTime;
      console.log('🔍 NutritionProvider: TOTAL DATA LOAD COMPLETED in', totalLoadTime.toFixed(2) + 'ms');
    }
  };

  // Load daily targets with timing diagnostics
  const loadDailyTargets = async () => {
    const targetsStartTime = performance.now();
    console.log('🔍 NutritionProvider: Starting targets load at', targetsStartTime.toFixed(2) + 'ms');

    if (!user) return;

    try {
      const { data: targetsData, error: targetsError } = await supabase
        .from('daily_nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .single();

      if (targetsError && targetsError.code !== 'PGRST116') {
        console.error('Error loading targets:', targetsError);
        return;
      }

      if (targetsData) {
        const loadedTargets = {
          calories: targetsData.calories || 2000,
          protein: targetsData.protein || 150,
          carbs: targetsData.carbs || 250,
          fat: targetsData.fat || 65,
          fiber: targetsData.fiber || 25,
          sugar: targetsData.sugar || null,
          sodium: targetsData.sodium || null,
          saturated_fat: targetsData.saturated_fat || null,
          hydration_ml: targetsData.hydration_ml || 2000,
          supplement_count: targetsData.supplement_count || 0
        };
        
        setTargets(loadedTargets);
        console.log('🎯 Loaded daily targets for NutritionContext:', loadedTargets);
      }
    } catch (error) {
      console.error('Error loading daily targets:', error);
    } finally {
      const targetsEndTime = performance.now();
      console.log('🔍 NutritionProvider: Targets load completed in', (targetsEndTime - targetsStartTime).toFixed(2) + 'ms');
    }
  };

  // Set up subscription with timing diagnostics
  useEffect(() => {
    const subscriptionStartTime = performance.now();
    console.log('🔍 NutritionProvider: Setting up subscriptions at', subscriptionStartTime.toFixed(2) + 'ms');

    if (!user) return;

    // Subscribe to nutrition logs changes
    const nutritionSubscription = supabase
      .channel('nutrition_logs_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'nutrition_logs',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('🔍 NutritionProvider: Nutrition log change received at', performance.now().toFixed(2) + 'ms');
          console.log('Nutrition log change detected:', payload);
          loadTodaysData(date);
        }
      )
      .subscribe((status) => {
        console.log('🔍 NutritionProvider: Nutrition log subscription status:', status, 'at', performance.now().toFixed(2) + 'ms');
      });

    // Subscribe to other logs similarly...
    const hydrationSubscription = supabase
      .channel('hydration_logs_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'hydration_logs',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('🔍 NutritionProvider: Hydration log change received at', performance.now().toFixed(2) + 'ms');
          loadTodaysData(date);
        }
      )
      .subscribe((status) => {
        console.log('🔍 NutritionProvider: Hydration log subscription status:', status, 'at', performance.now().toFixed(2) + 'ms');
      });

    const supplementSubscription = supabase
      .channel('supplement_logs_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'supplement_logs',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('🔍 NutritionProvider: Supplement log change received at', performance.now().toFixed(2) + 'ms');
          loadTodaysData(date);
        }
      )
      .subscribe((status) => {
        console.log('🔍 NutritionProvider: Supplement log subscription status:', status, 'at', performance.now().toFixed(2) + 'ms');
      });

    const subscriptionEndTime = performance.now();
    console.log('🔍 NutritionProvider: Subscriptions setup completed in', (subscriptionEndTime - subscriptionStartTime).toFixed(2) + 'ms');

    return () => {
      const cleanupStartTime = performance.now();
      nutritionSubscription.unsubscribe();
      hydrationSubscription.unsubscribe();
      supplementSubscription.unsubscribe();
      console.log('🔍 NutritionProvider: Subscriptions cleanup completed in', (performance.now() - cleanupStartTime).toFixed(2) + 'ms');
    };
  }, [user, date]);

  // Load data when user or date changes
  useEffect(() => {
    console.log('🔍 NutritionProvider: Data loading effect triggered at', performance.now().toFixed(2) + 'ms');
    loadTodaysData(date);
    loadDailyTargets();
  }, [user, date]);

  const addFood = async (food: Omit<FoodItem, 'id' | 'timestamp' | 'confirmed'>) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('nutrition_logs')
        .insert({
          user_id: user.id,
          food_name: food.name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          fiber: food.fiber,
          sugar: food.sugar,
          sodium: food.sodium,
          image_url: food.image,
          confidence: food.confidence
        })
        .select()
        .single();

      if (error) throw error;

      const newFood: FoodItem = {
        id: data.id,
        name: data.food_name,
        calories: data.calories || 0,
        protein: Number(data.protein) || 0,
        carbs: Number(data.carbs) || 0,
        fat: Number(data.fat) || 0,
        fiber: Number(data.fiber) || 0,
        sugar: Number(data.sugar) || 0,
        sodium: Number(data.sodium) || 0,
        image: data.image_url || undefined,
        confidence: data.confidence || undefined,
        timestamp: new Date(data.created_at),
        confirmed: true
      };

      setFoods(prev => [...prev, newFood]);
      
    } catch (error) {
      console.error('Error adding food:', error);
      toast.error('Failed to add food item');
    }
  };

  const addHydration = async (hydrationItem: Omit<HydrationItem, 'id' | 'timestamp'>) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('hydration_logs')
        .insert({
          user_id: user.id,
          name: hydrationItem.name,
          volume: hydrationItem.volume,
          type: hydrationItem.type,
          image_url: hydrationItem.image
        })
        .select()
        .single();

      if (error) throw error;

      const newHydration: HydrationItem = {
        id: data.id,
        name: data.name,
        volume: data.volume,
        type: data.type as 'water' | 'other',
        image: data.image_url || undefined,
        timestamp: new Date(data.created_at)
      };

      setHydration(prev => [...prev, newHydration]);
      
    } catch (error) {
      console.error('Error adding hydration:', error);
      toast.error('Failed to add hydration item');
    }
  };

  const addSupplement = async (supplement: Omit<SupplementItem, 'id' | 'timestamp'>) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('supplement_logs')
        .insert({
          user_id: user.id,
          name: supplement.name,
          dosage: supplement.dosage,
          unit: supplement.unit,
          frequency: supplement.frequency,
          image_url: supplement.image
        })
        .select()
        .single();

      if (error) throw error;

      const newSupplement: SupplementItem = {
        id: data.id,
        name: data.name,
        dosage: Number(data.dosage),
        unit: data.unit,
        frequency: data.frequency || undefined,
        notifications: [],
        image: data.image_url || undefined,
        timestamp: new Date(data.created_at)
      };

      setSupplements(prev => [...prev, newSupplement]);
      
    } catch (error) {
      console.error('Error adding supplement:', error);
      toast.error('Failed to add supplement');
    }
  };

  const updateFood = (id: string, updates: Partial<FoodItem>) => {
    setFoods(prev => prev.map(food => 
      food.id === id ? { ...food, ...updates } : food
    ));
  };

  const removeFood = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('nutrition_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setFoods(prev => prev.filter(food => food.id !== id));
      
    } catch (error) {
      console.error('Error removing food:', error);
      toast.error('Failed to remove food item');
    }
  };

  const removeHydration = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('hydration_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setHydration(prev => prev.filter(item => item.id !== id));
      
    } catch (error) {
      console.error('Error removing hydration:', error);
      toast.error('Failed to remove hydration item');
    }
  };

  const removeSupplement = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('supplement_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSupplements(prev => prev.filter(supplement => supplement.id !== id));
      
    } catch (error) {
      console.error('Error removing supplement:', error);
      toast.error('Failed to remove supplement');
    }
  };

  const totals = calculateTotals(foods);

  // Helper functions that components expect
  const getTodaysProgress = () => ({
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    hydration: hydration.reduce((sum, item) => sum + item.volume, 0),
    supplements: supplements.length
  });

  const getHydrationGoal = () => targets.hydration_ml;
  const getSupplementGoal = () => targets.supplement_count;

  const value = {
    foods,
    hydration,
    supplements,
    targets,
    totals,
    loading,
    date,
    setDate,
    addFood,
    addHydration,
    addSupplement,
    updateFood,
    removeFood,
    removeHydration,
    removeSupplement,
    loadTodaysData,
    getTodaysProgress,
    getHydrationGoal,
    getSupplementGoal,
    currentDay: null, // Placeholder
    currentCoachCta: null, // Placeholder  
    clearCoachCta: () => {}, // Placeholder
    weeklyData: [] // Placeholder
  };

  const contextEndTime = performance.now();
  const totalNutritionTime = contextEndTime - nutritionStartTime;
  console.log('🔍 NutritionProvider: TOTAL INITIALIZATION COMPLETED in', totalNutritionTime.toFixed(2) + 'ms');

  return (
    <NutritionContext.Provider value={value}>
      {children}
    </NutritionContext.Provider>
  );
};

const calculateTotals = (foods: FoodItem[]) => {
  return foods.reduce((totals, food) => ({
    calories: totals.calories + food.calories,
    protein: totals.protein + food.protein,
    carbs: totals.carbs + food.carbs,
    fat: totals.fat + food.fat,
    fiber: totals.fiber + food.fiber,
    sugar: totals.sugar + food.sugar,
    sodium: totals.sodium + food.sodium,
  }), {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  });
};
