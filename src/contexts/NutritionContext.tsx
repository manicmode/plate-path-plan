import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNutritionLoader } from '@/hooks/useNutritionLoader';
import { useNutritionPersistence } from '@/hooks/useNutritionPersistence';
import { useNutritionDeduplication } from '@/hooks/useNutritionDeduplication';
import { useAuth } from '@/contexts/auth';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { triggerDailyScoreCalculation } from '@/lib/dailyScoreUtils';
import { getLocalDateString } from '@/lib/dateUtils';
import { calculateTotalMicronutrients, type FoodMicronutrients } from '@/utils/micronutrientCalculations';
import { useXPSystem } from '@/hooks/useXPSystem';

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
  saturated_fat?: number;
  micronutrients?: FoodMicronutrients;
  image?: string;
  confidence?: number;
  timestamp: Date;
  confirmed: boolean;
  databaseId?: string;
}

interface HydrationItem {
  id: string;
  name: string;
  volume: number;
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
  image?: string;
  timestamp: Date;
}

interface DailyNutrition {
  date: string;
  foods: FoodItem[];
  hydration: HydrationItem[];
  supplements: SupplementItem[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  saturated_fat: number;
  hydrationVolume: number;
  supplementCount: number;
  micronutrients: FoodMicronutrients;
}

interface NutritionContextType {
  currentDay: DailyNutrition;
  weeklyData: DailyNutrition[];
  isLoading: boolean;
  addFood: (food: Omit<FoodItem, 'id' | 'timestamp'>) => void;
  addHydration: (hydration: Omit<HydrationItem, 'id' | 'timestamp'>) => void;
  addSupplement: (supplement: Omit<SupplementItem, 'id' | 'timestamp'>) => void;
  confirmFood: (foodId: string) => void;
  removeFood: (foodId: string) => void;
  getTodaysProgress: () => { calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium: number; saturated_fat: number; hydrationVolume: number; supplementCount: number; micronutrients: FoodMicronutrients; hydration: HydrationItem[]; supplements: SupplementItem[] };
  getHydrationGoal: () => number;
  getSupplementGoal: () => number;
  loadTodaysData: (date: string) => void;
  coachCtaQueue: string[];
  currentCoachCta: string | null;
  addCoachCta: (cta: string) => void;
  clearCoachCta: () => void;
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

export const useNutrition = () => {
  const context = useContext(NutritionContext);
  if (!context) {
    throw new Error('useNutrition must be used within a NutritionProvider');
  }
  return context;
};

interface NutritionProviderProps {
  children: React.ReactNode;
}

// Singleton realtime channels to prevent subscription flapping
let nutritionChannel: any = null;
let hydrationChannel: any = null;
let supplementChannel: any = null;

export const NutritionProvider = ({ children }: NutritionProviderProps) => {
  const today = getLocalDateString();
  console.log(`🏠 NutritionProvider initializing with local date: ${today}`);
  
  const { data: loadedData, isLoading, loadTodaysData } = useNutritionLoader();
  const { saveFood, saveHydration, saveSupplement, removeFood: removeFromDB } = useNutritionPersistence();
  const { isRecentlySaved } = useNutritionDeduplication();
  const { user } = useAuth();
  const { awardNutritionXP } = useXPSystem();
  
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
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    saturated_fat: 0,
    hydrationVolume: 0,
    supplementCount: 0,
    micronutrients: {
      vitaminA: 0,
      vitaminC: 0,
      vitaminD: 0,
      vitaminE: 0,
      vitaminK: 0,
      thiamin: 0,
      riboflavin: 0,
      niacin: 0,
      vitaminB6: 0,
      folate: 0,
      vitaminB12: 0,
      biotin: 0,
      pantothenicAcid: 0,
      calcium: 0,
      iron: 0,
      magnesium: 0,
      phosphorus: 0,
      potassium: 0,
      zinc: 0,
      copper: 0,
      manganese: 0,
      selenium: 0,
      chromium: 0
    }
  });

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

    const totals = foods.reduce(
      (acc, food) => ({
        calories: acc.calories + (food.calories || 0),
        protein: acc.protein + (food.protein || 0),
        carbs: acc.carbs + (food.carbs || 0),
        fat: acc.fat + (food.fat || 0),
        fiber: acc.fiber + (food.fiber || 0),
        sugar: acc.sugar + (food.sugar || 0),
        sodium: acc.sodium + (food.sodium || 0),
        saturated_fat: acc.saturated_fat + (food.saturated_fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, saturated_fat: 0 }
    );

    const hydrationVolume = hydration.reduce((acc, h) => acc + (h.volume || 0), 0);
    const micronutrients = calculateTotalMicronutrients(foods.filter(f => f.micronutrients));

    return {
      ...totals,
      hydrationVolume,
      supplementCount: 0, // Will be calculated from supplements
      micronutrients
    };
  };

  const addFood = (food: Omit<FoodItem, 'id' | 'timestamp'>) => {
    const newFood: FoodItem = {
      ...food,
      id: Date.now().toString(),
      timestamp: new Date(),
      confirmed: food.confirmed ?? true,
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

  const getTodaysProgress = () => {
    return {
      calories: currentDay.calories,
      protein: currentDay.protein,
      carbs: currentDay.carbs,
      fat: currentDay.fat,
      fiber: currentDay.fiber,
      sugar: currentDay.sugar,
      sodium: currentDay.sodium,
      saturated_fat: currentDay.saturated_fat,
      hydrationVolume: currentDay.hydrationVolume,
      supplementCount: currentDay.supplementCount,
      micronutrients: currentDay.micronutrients,
      hydration: currentDay.hydration,
      supplements: currentDay.supplements,
      totalCalories: currentDay.calories,
      totalProtein: currentDay.protein,
      totalCarbs: currentDay.carbs,
      totalFat: currentDay.fat,
      totalHydration: currentDay.hydrationVolume
    };
  };

  const getHydrationGoal = () => {
    return dailyTargets.hydration_ml || 2000; // Default 2L
  };

  const getSupplementGoal = () => {
    return dailyTargets.supplement_count || 3; // Default 3 supplements
  };

  // Coach CTA management
  const addCoachCta = (cta: string) => {
    setCoachCtaQueue(prev => [...prev, cta]);
    if (!currentCoachCta) {
      setCurrentCoachCta(cta);
    }
  };

  const clearCoachCta = () => {
    setCoachCtaQueue(prev => {
      const newQueue = prev.slice(1);
      setCurrentCoachCta(newQueue[0] || null);
      return newQueue;
    });
  };

  // Singleton realtime subscriptions with exponential backoff
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const backoffDelayRef = useRef(1000); // Start with 1 second

  useEffect(() => {
    if (!user?.id) return;

    // Initialize singleton channels with proper cleanup
    const initializeRealtimeChannels = () => {
      console.log('🔗 Initializing singleton realtime channels');

      // Nutrition logs channel
      if (!nutritionChannel) {
        nutritionChannel = supabase
          .channel('nutrition_logs_changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'nutrition_logs',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              const newFood = payload.new;
              
              // Skip if this was recently saved by us to prevent duplicates
              if (isRecentlySaved(newFood.id)) {
                console.log('🔄 Skipping duplicate food from realtime:', newFood.id);
                return;
              }
              
              // Filter events by current date
              const logDate = new Date(newFood.created_at).toLocaleDateString();
              const currentDate = new Date().toLocaleDateString();
              
              if (logDate === currentDate) {
                setCurrentDay(prev => ({
                  ...prev,
                  foods: [...prev.foods, {
                    id: newFood.id,
                    name: newFood.food_name,
                    calories: newFood.calories,
                    protein: newFood.protein,
                    carbs: newFood.carbs,
                    fat: newFood.fat,
                    fiber: newFood.fiber,
                    sugar: newFood.sugar,
                    sodium: newFood.sodium,
                    saturated_fat: newFood.saturated_fat || 0,
                    timestamp: new Date(newFood.created_at),
                    confirmed: true,
                    databaseId: newFood.id
                  }]
                }));
              }
            }
          )
          .subscribe((status) => {
            console.log('📡 Nutrition realtime status:', status);
            if (status === 'CLOSED') {
              handleReconnect();
            } else if (status === 'SUBSCRIBED') {
              // Reset backoff on successful connection
              backoffDelayRef.current = 1000;
            }
          });
      }

      // Similar for hydration and supplements...
      if (!hydrationChannel) {
        hydrationChannel = supabase
          .channel('hydration_logs_changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'hydration_logs',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              const newHydration = payload.new;
              
              if (isRecentlySaved(newHydration.id)) {
                console.log('🔄 Skipping duplicate hydration from realtime:', newHydration.id);
                return;
              }
              
              const logDate = new Date(newHydration.created_at).toLocaleDateString();
              const currentDate = new Date().toLocaleDateString();
              
              if (logDate === currentDate) {
                setCurrentDay(prev => ({
                  ...prev,
                  hydration: [...prev.hydration, {
                    id: newHydration.id,
                    name: newHydration.name,
                    volume: newHydration.volume,
                    type: newHydration.type,
                    timestamp: new Date(newHydration.created_at)
                  }]
                }));
              }
            }
          )
          .subscribe();
      }

      if (!supplementChannel) {
        supplementChannel = supabase
          .channel('supplement_logs_changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'supplement_logs',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              const newSupplement = payload.new;
              
              if (isRecentlySaved(newSupplement.id)) {
                console.log('🔄 Skipping duplicate supplement from realtime:', newSupplement.id);
                return;
              }
              
              const logDate = new Date(newSupplement.created_at).toLocaleDateString();
              const currentDate = new Date().toLocaleDateString();
              
              if (logDate === currentDate) {
                setCurrentDay(prev => ({
                  ...prev,
                  supplements: [...prev.supplements, {
                    id: newSupplement.id,
                    name: newSupplement.name,
                    dosage: newSupplement.dosage,
                    unit: newSupplement.unit,
                    frequency: newSupplement.frequency,
                    timestamp: new Date(newSupplement.created_at)
                  }]
                }));
              }
            }
          )
          .subscribe();
      }
    };

    const handleReconnect = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      console.log(`🔄 Reconnecting realtime in ${backoffDelayRef.current}ms`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        // Cleanup existing channels
        if (nutritionChannel) {
          supabase.removeChannel(nutritionChannel);
          nutritionChannel = null;
        }
        if (hydrationChannel) {
          supabase.removeChannel(hydrationChannel);
          hydrationChannel = null;
        }
        if (supplementChannel) {
          supabase.removeChannel(supplementChannel);
          supplementChannel = null;
        }

        // Reinitialize
        initializeRealtimeChannels();
        
        // Exponential backoff (max 30 seconds)
        backoffDelayRef.current = Math.min(backoffDelayRef.current * 2, 30000);
      }, backoffDelayRef.current);
    };

    initializeRealtimeChannels();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Note: Don't cleanup singleton channels on unmount
      // They'll be cleaned up when the user logs out
    };
  }, [user?.id, isRecentlySaved]);

  // Update state when loader data changes
  useEffect(() => {
    if (loadedData) {
      const totals = calculateTotals(loadedData.foods || [], loadedData.hydration || []);
      setCurrentDay({
        date: today, // Use today instead of loadedData.date
        foods: loadedData.foods || [],
        hydration: loadedData.hydration || [],
        supplements: loadedData.supplements || [],
        supplementCount: (loadedData.supplements || []).length,
        ...totals,
      });
    }
  }, [loadedData]);

  return (
    <NutritionContext.Provider
      value={{
        currentDay,
        weeklyData,
        isLoading,
        addFood,
        addHydration,
        addSupplement,
        confirmFood,
        removeFood,
        getTodaysProgress,
        getHydrationGoal,
        getSupplementGoal,
        loadTodaysData,
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