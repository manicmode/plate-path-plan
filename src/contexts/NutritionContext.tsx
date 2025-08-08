import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { useNutritionLoader } from '@/hooks/useNutritionLoader';
import { useNutritionPersistence } from '@/hooks/useNutritionPersistence';
import { useNutritionDeduplication } from '@/hooks/useNutritionDeduplication';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { triggerDailyScoreCalculation } from '@/lib/dailyScoreUtils';
import { getLocalDateString } from '@/lib/dateUtils';
import { calculateTotalMicronutrients, type FoodMicronutrients } from '@/utils/micronutrientCalculations';
import { useXPSystem } from '@/hooks/useXPSystem';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  databaseId?: string; // ID from nutrition_logs table for meal scoring
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

interface DailyNutrition {
  date: string;
  foods: FoodItem[];
  hydration: HydrationItem[];
  supplements: SupplementItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalSugar: number;
  totalSodium: number;
  totalSaturatedFat: number;
  totalHydration: number;
}

interface NutritionContextType {
  currentDay: DailyNutrition;
  weeklyData: DailyNutrition[];
  addFood: (food: Omit<FoodItem, 'id' | 'timestamp' | 'confirmed' | 'saturated_fat'> & { saturated_fat?: number }) => void;
  addHydration: (hydration: Omit<HydrationItem, 'id' | 'timestamp'>) => void;
  addSupplement: (supplement: Omit<SupplementItem, 'id' | 'timestamp'>) => void;
  confirmFood: (foodId: string) => void;
  removeFood: (foodId: string) => void;
  updateFood: (foodId: string, updates: Partial<FoodItem>) => void;
  getTodaysProgress: () => { 
    calories: number; 
    protein: number; 
    carbs: number; 
    fat: number; 
    fiber: number;
    sugar: number;
    sodium: number;
    saturated_fat: number;
    hydration: number;
    supplements: number;
  };
  getHydrationGoal: () => number;
  getSupplementGoal: () => number;
  // Coach CTA functionality
  coachCtaQueue: string[];
  currentCoachCta: string | null;
  addCoachCta: (message: string) => void;
  clearCoachCta: () => void;
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

export const NutritionProvider = ({ children }: NutritionProviderProps) => {
  const today = getLocalDateString();
  console.log(`🏠 NutritionProvider initializing with local date: ${today}`);
  
  const { data: loadedData, isLoading, loadTodaysData } = useNutritionLoader();
  const { saveFood, saveHydration, saveSupplement, removeFood: removeFromDB } = useNutritionPersistence();
  const { isRecentlySaved } = useNutritionDeduplication();
  const { user } = useAuth();
  const { awardNutritionXP } = useXPSystem();
  
  // Singleton Realtime channel management
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const backoffAttemptRef = useRef<number>(0);
  const maxBackoffMs = 30000; // 30 seconds max
  
  // State for daily targets
  const [dailyTargets, setDailyTargets] = useState({
    hydration_ml: null,
    supplement_count: null
  });
  
  // Load daily targets from database
  useEffect(() => {
    const loadDailyTargets = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('daily_nutrition_targets')
        .select('hydration_ml, supplement_count')
        .eq('user_id', user.id)
        .eq('target_date', today)
        .maybeSingle();
      
      if (data && !error) {
        console.log('🎯 Loaded daily targets for NutritionContext:', data);
        setDailyTargets({
          hydration_ml: data.hydration_ml,
          supplement_count: data.supplement_count
        });
      }
    };
    
    loadDailyTargets();
  }, [user?.id, today]);
  
  const [currentDay, setCurrentDay] = useState<DailyNutrition>({
    date: today,
    foods: [],
    hydration: [],
    supplements: [],
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalFiber: 0,
    totalSugar: 0,
    totalSodium: 0,
    totalSaturatedFat: 0,
    totalHydration: 0,
  });

  // Initialize with loaded data
  useEffect(() => {
    if (!isLoading && loadedData) {
      const totals = calculateTotals(loadedData.foods, loadedData.hydration);
      console.log(`📊 Setting current day data with totals:`, totals);
      setCurrentDay({
        date: today,
        foods: loadedData.foods,
        hydration: loadedData.hydration,
        supplements: loadedData.supplements,
        ...totals,
      });
    }
  }, [isLoading, loadedData, today]);

  // Real weekly data will be fetched from database - removing mock generation
  const generateWeeklyData = (currentDayData: DailyNutrition): DailyNutrition[] => {
    // Return empty array - this functionality will be replaced with real database queries
    return [];
  };

  const [weeklyData, setWeeklyData] = useState<DailyNutrition[]>([]);
  
  // Coach CTA state
  const [coachCtaQueue, setCoachCtaQueue] = useState<string[]>([]);
  const [currentCoachCta, setCurrentCoachCta] = useState<string | null>(null);

  // Real weekly data loading - removed mock data generation
  useEffect(() => {
    // Weekly data will be loaded directly from useReal*Data hooks
    setWeeklyData([]);
  }, [currentDay]);

  // App lifecycle awareness with local date checking
  useAppLifecycle({
    onForeground: () => {
      console.log('🔄 Nutrition context: App came to foreground');
      // Check if date has changed while app was in background using local time
      const newToday = getLocalDateString();
      console.log(`📅 Current local date: ${newToday}, Context date: ${currentDay.date}`);
      if (currentDay.date !== newToday) {
        console.log('🔄 Local date changed while app was in background, loading new day data');
        loadTodaysData(newToday);
      }
    },
  });

  const calculateTotals = (foods: FoodItem[], hydration: HydrationItem[]) => {
    // Add type guards to prevent reduce crashes
    if (!Array.isArray(foods)) {
      console.warn('🚨 Foods data is not an array:', foods);
      foods = [];
    }
    if (!Array.isArray(hydration)) {
      console.warn('🚨 Hydration data is not an array:', hydration);
      hydration = [];
    }

    // Only include confirmed foods in the totals calculation
    const confirmedFoods = foods.filter(food => food.confirmed);
    
    const foodTotals = confirmedFoods.reduce((totals, food) => ({
      totalCalories: totals.totalCalories + food.calories,
      totalProtein: totals.totalProtein + food.protein,
      totalCarbs: totals.totalCarbs + food.carbs,
      totalFat: totals.totalFat + food.fat,
      totalFiber: totals.totalFiber + food.fiber,
      totalSugar: totals.totalSugar + food.sugar,
      totalSodium: totals.totalSodium + food.sodium,
      totalSaturatedFat: totals.totalSaturatedFat + (food.saturated_fat || food.fat * 0.3), // Fallback: 30% of total fat
    }), {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalFiber: 0,
      totalSugar: 0,
      totalSodium: 0,
      totalSaturatedFat: 0,
    });

    const totalHydration = Array.isArray(hydration) 
      ? hydration.reduce((total, item) => total + item.volume, 0) 
      : 0;

    return { ...foodTotals, totalHydration };
  };

  const addFood = (food: Omit<FoodItem, 'id' | 'timestamp' | 'confirmed' | 'saturated_fat'> & { saturated_fat?: number }) => {
    const newFood: FoodItem = {
      ...food,
      saturated_fat: food.saturated_fat ?? food.fat * 0.3, // Fallback: 30% of total fat
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // More unique ID
      timestamp: new Date(),
      confirmed: true, // Mark as confirmed when added through confirmation flow
    };

    const updatedFoods = [...currentDay.foods, newFood];
    const totals = calculateTotals(updatedFoods, currentDay.hydration);

    setCurrentDay({
      ...currentDay,
      foods: updatedFoods,
      ...totals,
    });

    // Save to database
    saveFood(newFood);

    // Award XP for food logging
    awardNutritionXP('nutrition', newFood.databaseId);

    // Trigger daily score calculation
    if (user?.id) {
      triggerDailyScoreCalculation(user.id);
    }

    console.log('Food added to context:', newFood);
    console.log('Updated totals:', totals);
  };

  const addHydration = (hydration: Omit<HydrationItem, 'id' | 'timestamp'>) => {
    const newHydration: HydrationItem = {
      ...hydration,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    const updatedHydration = [...currentDay.hydration, newHydration];
    const totals = calculateTotals(currentDay.foods, updatedHydration);

    setCurrentDay({
      ...currentDay,
      hydration: updatedHydration,
      ...totals,
    });

    // Save to database
    saveHydration(newHydration);

    // Award XP for hydration logging
    awardNutritionXP('hydration', newHydration.id);

    // Trigger daily score calculation
    if (user?.id) {
      triggerDailyScoreCalculation(user.id);
    }
  };

  const addSupplement = (supplement: Omit<SupplementItem, 'id' | 'timestamp'>) => {
    const newSupplement: SupplementItem = {
      ...supplement,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    setCurrentDay({
      ...currentDay,
      supplements: [...currentDay.supplements, newSupplement],
    });

    // Save to database
    saveSupplement(newSupplement);

    // Award XP for supplement logging
    awardNutritionXP('supplement', newSupplement.id);

    // Trigger daily score calculation
    if (user?.id) {
      triggerDailyScoreCalculation(user.id);
    }
  };

  const confirmFood = (foodId: string) => {
    const updatedFoods = currentDay.foods.map(food =>
      food.id === foodId ? { ...food, confirmed: true } : food
    );

    const totals = calculateTotals(updatedFoods, currentDay.hydration);

    setCurrentDay({
      ...currentDay,
      foods: updatedFoods,
      ...totals,
    });
  };

  const removeFood = (foodId: string) => {
    const updatedFoods = currentDay.foods.filter(food => food.id !== foodId);
    const totals = calculateTotals(updatedFoods, currentDay.hydration);

    setCurrentDay({
      ...currentDay,
      foods: updatedFoods,
      ...totals,
    });

    // Remove from database
    removeFromDB(foodId);
  };

  const updateFood = (foodId: string, updates: Partial<FoodItem>) => {
    const updatedFoods = currentDay.foods.map(food =>
      food.id === foodId ? { ...food, ...updates } : food
    );
    const totals = calculateTotals(updatedFoods, currentDay.hydration);

    setCurrentDay({
      ...currentDay,
      foods: updatedFoods,
      ...totals,
    });
  };

  const getTodaysProgress = () => {
    // Calculate micronutrients from confirmed foods with type guard
    const foods = Array.isArray(currentDay.foods) ? currentDay.foods : [];
    const confirmedFoods = foods.filter(food => food.confirmed);
    const micronutrients = calculateTotalMicronutrients(confirmedFoods);
    
    return {
      calories: currentDay.totalCalories,
      protein: currentDay.totalProtein,
      carbs: currentDay.totalCarbs,
      fat: currentDay.totalFat,
      fiber: currentDay.totalFiber,
      sugar: currentDay.totalSugar,
      sodium: currentDay.totalSodium,
      saturated_fat: currentDay.totalSaturatedFat,
      hydration: currentDay.totalHydration,
      supplements: currentDay.supplements.length,
      // Add micronutrients to progress
      iron: micronutrients.iron,
      magnesium: micronutrients.magnesium,
      calcium: micronutrients.calcium,
      zinc: micronutrients.zinc,
      vitaminA: micronutrients.vitaminA,
      vitaminB12: micronutrients.vitaminB12,
      vitaminC: micronutrients.vitaminC,
      vitaminD: micronutrients.vitaminD,
    };
  };

  // Use proper ml conversion from user profile or daily targets
  const getHydrationGoal = () => {
    if (dailyTargets.hydration_ml) return dailyTargets.hydration_ml;
    // Convert targetHydration (glasses) to ml
    return (user?.targetHydration || 8) * 250;
  };
  
  const getSupplementGoal = () => dailyTargets.supplement_count || 3; // Use daily targets or 3 supplements default

  // Coach CTA functions
  const addCoachCta = (message: string) => {
    // Add to queue if not already there
    setCoachCtaQueue(prev => {
      if (!prev.includes(message)) {
        return [...prev, message];
      }
      return prev;
    });
    
    // If no current CTA is active, set the first one from queue
    if (!currentCoachCta) {
      setCurrentCoachCta(message);
      // Remove from queue once it becomes current
      setCoachCtaQueue(prev => prev.filter(msg => msg !== message));
    }
  };

  const clearCoachCta = () => {
    setCurrentCoachCta(null);
    
    // If there are more CTAs in queue, activate the next one
    if (coachCtaQueue.length > 0) {
      const nextCta = coachCtaQueue[0];
      setCurrentCoachCta(nextCta);
      setCoachCtaQueue(prev => prev.slice(1)); // Remove the first item from queue
    }
  };

  // Helper function to check if event is for current day
  const isEventForToday = (eventTimestamp: string): boolean => {
    const eventDate = new Date(eventTimestamp);
    const eventDateString = getLocalDateString(eventDate);
    const currentDateString = getLocalDateString();
    return eventDateString === currentDateString;
  };

  // Exponential backoff reconnection
  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const backoffMs = Math.min(
      Math.pow(2, backoffAttemptRef.current) * 1000,
      maxBackoffMs
    );
    
    console.log(`🔄 Scheduling Realtime reconnect in ${backoffMs}ms (attempt ${backoffAttemptRef.current + 1})`);
    
    reconnectTimeoutRef.current = window.setTimeout(() => {
      backoffAttemptRef.current++;
      setupRealtimeSubscription();
    }, backoffMs);
  };

  // Setup Realtime subscription
  const setupRealtimeSubscription = () => {
    if (!user?.id) return;

    // Clean up existing channel if any
    if (realtimeChannelRef.current) {
      console.log('🧹 Cleaning up existing Realtime channel');
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    console.log('🔌 Setting up Realtime subscription for nutrition data');
    
    const channel = supabase
      .channel('nutrition-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'nutrition_logs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🍽️ Nutrition log inserted:', payload);
          
          // Filter by current day
          if (!isEventForToday(payload.new.created_at)) {
            console.log('📅 Ignoring nutrition event from different day');
            return;
          }

          // Check if this is a duplicate based on ID
          if (isRecentlySaved(payload.new.id)) {
            console.log('🔄 Skipping duplicate nutrition insert event');
            return;
          }

          // Convert database record to FoodItem format
          const newFood: FoodItem = {
            id: payload.new.id,
            name: payload.new.food_name,
            calories: payload.new.calories || 0,
            protein: payload.new.protein || 0,
            carbs: payload.new.carbs || 0,
            fat: payload.new.fat || 0,
            fiber: payload.new.fiber || 0,
            sugar: payload.new.sugar || 0,
            sodium: payload.new.sodium || 0,
            saturated_fat: payload.new.saturated_fat || (payload.new.fat || 0) * 0.3,
            timestamp: new Date(payload.new.created_at),
            confirmed: true,
            databaseId: payload.new.id,
          };

          // Update current day with new food
          setCurrentDay(prev => {
            const updatedFoods = [...prev.foods, newFood];
            const totals = calculateTotals(updatedFoods, prev.hydration);
            return {
              ...prev,
              foods: updatedFoods,
              ...totals,
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'hydration_logs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('💧 Hydration log inserted:', payload);
          
          // Filter by current day
          if (!isEventForToday(payload.new.created_at)) {
            console.log('📅 Ignoring hydration event from different day');
            return;
          }

          // Check if this is a duplicate
          if (isRecentlySaved(payload.new.id)) {
            console.log('🔄 Skipping duplicate hydration insert event');
            return;
          }

          // Convert database record to HydrationItem format
          const newHydration: HydrationItem = {
            id: payload.new.id,
            name: payload.new.name,
            volume: payload.new.volume,
            type: payload.new.type || 'water',
            timestamp: new Date(payload.new.created_at),
          };

          // Update current day with new hydration
          setCurrentDay(prev => {
            const updatedHydration = [...prev.hydration, newHydration];
            const totals = calculateTotals(prev.foods, updatedHydration);
            return {
              ...prev,
              hydration: updatedHydration,
              ...totals,
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'supplement_logs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('💊 Supplement log inserted:', payload);
          
          // Filter by current day
          if (!isEventForToday(payload.new.created_at)) {
            console.log('📅 Ignoring supplement event from different day');
            return;
          }

          // Check if this is a duplicate
          if (isRecentlySaved(payload.new.id)) {
            console.log('🔄 Skipping duplicate supplement insert event');
            return;
          }

          // Convert database record to SupplementItem format
          const newSupplement: SupplementItem = {
            id: payload.new.id,
            name: payload.new.name,
            dosage: payload.new.dosage || 0,
            unit: payload.new.unit || 'mg',
            frequency: payload.new.frequency,
            notifications: [], // Not stored in supplement_logs table
            timestamp: new Date(payload.new.created_at),
          };

          // Update current day with new supplement
          setCurrentDay(prev => ({
            ...prev,
            supplements: [...prev.supplements, newSupplement],
          }));
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to nutrition Realtime updates');
          backoffAttemptRef.current = 0; // Reset backoff on successful connection
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        } else if (status === 'CLOSED' && user?.id) {
          console.log('❌ Realtime connection closed, scheduling reconnect');
          scheduleReconnect();
        }
      });

    realtimeChannelRef.current = channel;
  };

  // Initialize Realtime subscription once
  useEffect(() => {
    if (user?.id) {
      setupRealtimeSubscription();
    }

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up Realtime subscription');
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [user?.id]); // Only depend on user ID

  return (
    <NutritionContext.Provider
      value={{
        currentDay,
        weeklyData,
        addFood,
        addHydration,
        addSupplement,
        confirmFood,
        removeFood,
        updateFood,
        getTodaysProgress,
        getHydrationGoal,
        getSupplementGoal,
        coachCtaQueue,
        currentCoachCta,
        addCoachCta,
        clearCoachCta,
      }}
    >
      {children}
    </NutritionContext.Provider>
  );
};
