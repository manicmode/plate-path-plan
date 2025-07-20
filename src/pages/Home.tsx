
import { useNutrition } from '@/contexts/NutritionContext';
import { useAuth } from '@/contexts/auth';
import { DailyProgressCard } from '@/components/analytics/DailyProgressCard';
import { DailyScoreCard } from '@/components/analytics/DailyScoreCard';
import { HomeCtaTicker } from '@/components/HomeCtaTicker';
import { HomeAIInsights } from '@/components/HomeAIInsights';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DailyTargets {
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

const Home = () => {
  const homeStartTime = performance.now();
  console.log('🔍 Home: Page initialization started at', homeStartTime.toFixed(2) + 'ms');

  const { user } = useAuth();
  const { foods, hydration, supplements, totals, loading: nutritionLoading } = useNutrition();
  const [dailyTargets, setDailyTargets] = useState<DailyTargets>({
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
  const [targetsLoading, setTargetsLoading] = useState(true);

  useEffect(() => {
    const loadTargets = async () => {
      const targetsStartTime = performance.now();
      console.log('🔍 Home: Daily targets query started at', targetsStartTime.toFixed(2) + 'ms');

      if (!user) {
        setTargetsLoading(false);
        return;
      }

      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: targetsData, error } = await supabase
          .from('daily_nutrition_targets')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();

        const targetsEndTime = performance.now();
        console.log('🔍 Home: Daily targets query completed in', (targetsEndTime - targetsStartTime).toFixed(2) + 'ms');

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading daily targets:', error);
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
          
          setDailyTargets(loadedTargets);
          console.log('📊 Loaded daily targets for Home:', loadedTargets);
        }
      } catch (error) {
        console.error('Error in loadTargets:', error);
      } finally {
        setTargetsLoading(false);
        const totalTargetsTime = performance.now() - targetsStartTime;
        console.log('🔍 Home: Daily targets loading COMPLETED in', totalTargetsTime.toFixed(2) + 'ms');
      }
    };

    loadTargets();
  }, [user]);

  const totalHydration = hydration.reduce((sum, item) => sum + item.volume, 0);
  const totalSupplements = supplements.length;

  const homeEndTime = performance.now();
  console.log('🔍 Home: Page render completed at', homeEndTime.toFixed(2) + 'ms');
  console.log('🔍 Home: TOTAL HOME LOAD TIME:', (homeEndTime - homeStartTime).toFixed(2) + 'ms');

  if (nutritionLoading || targetsLoading) {
    console.log('🔍 Home: Still loading - nutrition:', nutritionLoading, 'targets:', targetsLoading);
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Track your progress and stay on top of your health goals
          </p>
        </div>

        <HomeCtaTicker />
        
        <div className="grid gap-6 md:grid-cols-2">
          <DailyProgressCard 
            nutrition={totals}
            hydration={{ current: totalHydration, target: dailyTargets.hydration_ml }}
            supplements={{ current: totalSupplements, target: dailyTargets.supplement_count }}
            targets={dailyTargets}
          />
          <DailyScoreCard />
        </div>

        <HomeAIInsights />
      </div>
    </div>
  );
};

export default Home;
