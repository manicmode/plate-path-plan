
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

interface DailyNutrition {
  date: string;
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalSugar: number;
  totalSodium: number;
}

interface NutritionContextType {
  currentDay: DailyNutrition;
  weeklyData: DailyNutrition[];
  addFood: (food: Omit<FoodItem, 'id' | 'timestamp' | 'confirmed'>) => void;
  confirmFood: (foodId: string) => void;
  removeFood: (foodId: string) => void;
  updateFood: (foodId: string, updates: Partial<FoodItem>) => void;
  getTodaysProgress: () => { calories: number; protein: number; carbs: number; fat: number };
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
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalFiber: 0,
    totalSugar: 0,
    totalSodium: 0,
  });

  const [weeklyData, setWeeklyData] = useState<DailyNutrition[]>([]);

  const calculateTotals = (foods: FoodItem[]) => {
    return foods.reduce((totals, food) => ({
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
  };

  const addFood = (food: Omit<FoodItem, 'id' | 'timestamp' | 'confirmed'>) => {
    const newFood: FoodItem = {
      ...food,
      id: Date.now().toString(),
      timestamp: new Date(),
      confirmed: false,
    };

    const updatedFoods = [...currentDay.foods, newFood];
    const totals = calculateTotals(updatedFoods);

    setCurrentDay({
      ...currentDay,
      foods: updatedFoods,
      ...totals,
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
    const totals = calculateTotals(updatedFoods);

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
    const totals = calculateTotals(updatedFoods);

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
    };
  };

  return (
    <NutritionContext.Provider
      value={{
        currentDay,
        weeklyData,
        addFood,
        confirmFood,
        removeFood,
        updateFood,
        getTodaysProgress,
      }}
    >
      {children}
    </NutritionContext.Provider>
  );
};
