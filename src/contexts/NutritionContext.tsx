
import { createContext, useContext, useState, ReactNode } from 'react';

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
  totalHydration: number;
}

interface NutritionContextType {
  currentDay: DailyNutrition;
  weeklyData: DailyNutrition[];
  addFood: (food: Omit<FoodItem, 'id' | 'timestamp' | 'confirmed'>) => void;
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
    hydration: number;
    supplements: number;
  };
  getHydrationGoal: () => number;
  getSupplementGoal: () => number;
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
  const today = new Date().toISOString().split('T')[0];
  
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
    totalHydration: 0,
  });

  const [weeklyData, setWeeklyData] = useState<DailyNutrition[]>([]);

  const calculateTotals = (foods: FoodItem[], hydration: HydrationItem[]) => {
    const foodTotals = foods.reduce((totals, food) => ({
      totalCalories: totals.totalCalories + food.calories,
      totalProtein: totals.totalProtein + food.protein,
      totalCarbs: totals.totalCarbs + food.carbs,
      totalFat: totals.totalFat + food.fat,
      totalFiber: totals.totalFiber + food.fiber,
      totalSugar: totals.totalSugar + food.sugar,
      totalSodium: totals.totalSodium + food.sodium,
    }), {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalFiber: 0,
      totalSugar: 0,
      totalSodium: 0,
    });

    const totalHydration = hydration.reduce((total, item) => total + item.volume, 0);

    return { ...foodTotals, totalHydration };
  };

  const addFood = (food: Omit<FoodItem, 'id' | 'timestamp' | 'confirmed'>) => {
    const newFood: FoodItem = {
      ...food,
      id: Date.now().toString(),
      timestamp: new Date(),
      confirmed: false,
    };

    const updatedFoods = [...currentDay.foods, newFood];
    const totals = calculateTotals(updatedFoods, currentDay.hydration);

    setCurrentDay({
      ...currentDay,
      foods: updatedFoods,
      ...totals,
    });
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
  };

  const confirmFood = (foodId: string) => {
    const updatedFoods = currentDay.foods.map(food =>
      food.id === foodId ? { ...food, confirmed: true } : food
    );

    setCurrentDay({
      ...currentDay,
      foods: updatedFoods,
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
    return {
      calories: currentDay.totalCalories,
      protein: currentDay.totalProtein,
      carbs: currentDay.totalCarbs,
      fat: currentDay.totalFat,
      hydration: currentDay.totalHydration,
      supplements: currentDay.supplements.length,
    };
  };

  const getHydrationGoal = () => 2000; // 2L default goal
  const getSupplementGoal = () => 3; // 3 supplements default goal

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
      }}
    >
      {children}
    </NutritionContext.Provider>
  );
};
