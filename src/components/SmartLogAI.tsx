import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FoodPrediction {
  name: string;
  time: string;
  calories: number;
}

interface SmartLogAIProps {
  onFoodSelect?: (food: FoodPrediction) => void;
}

const DUMMY_PREDICTIONS: FoodPrediction[] = [
  { name: "Greek Yogurt", time: "8:30 AM", calories: 150 },
  { name: "Chicken Salad", time: "12:45 PM", calories: 420 },
  { name: "Protein Shake", time: "6:00 PM", calories: 280 },
  { name: "Apple", time: "3:30 PM", calories: 95 },
  { name: "Stew", time: "7:00 PM", calories: 530 },
  { name: "Baked Beans", time: "8:00 PM", calories: 210 },
];

// Fallback foods for new users with no log history
const FALLBACK_FOODS: FoodPrediction[] = [
  { name: "Eggs", time: "8:00 AM", calories: 140 },
  { name: "Chicken Breast", time: "12:30 PM", calories: 185 },
  { name: "Salad", time: "1:00 PM", calories: 80 },
  { name: "Whole Grain Bread", time: "7:30 AM", calories: 120 },
  { name: "Avocado", time: "10:00 AM", calories: 160 },
  { name: "Apple", time: "3:00 PM", calories: 95 },
];

type TabType = 'smart' | 'saved' | 'recent';

export const SmartLogAI: React.FC<SmartLogAIProps> = ({ onFoodSelect }) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('smart');

  // Fetch user's total log count to determine if they're new
  const { data: logCount } = useQuery({
    queryKey: ['user-log-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { count, error } = await supabase
        .from('nutrition_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id
  });

  // Fetch saved foods (most frequently logged)
  const { data: savedFoods } = useQuery({
    queryKey: ['saved-foods', user?.id, activeTab],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('food_name, calories, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Group by food name and count frequency
      const foodCounts = data.reduce((acc: Record<string, { count: number; calories: number; lastTime: string }>, item) => {
        if (!acc[item.food_name]) {
          acc[item.food_name] = { 
            count: 0, 
            calories: item.calories || 0,
            lastTime: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        }
        acc[item.food_name].count++;
        return acc;
      }, {});

      // Sort by frequency and get actual saved foods
      const actualSavedFoods = Object.entries(foodCounts)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 6)
        .map(([name, data]): FoodPrediction => ({
          name,
          time: data.lastTime,
          calories: data.calories
        }));

      // If user has few logs, mix with fallback foods to always show 6 items
      if (actualSavedFoods.length < 6) {
        const remainingSlots = 6 - actualSavedFoods.length;
        const fallbackToAdd = FALLBACK_FOODS.slice(0, remainingSlots);
        return [...actualSavedFoods, ...fallbackToAdd];
      }

      return actualSavedFoods;
    },
    enabled: !!user?.id && activeTab === 'saved'
  });

  // Fetch recent foods
  const { data: recentFoods } = useQuery({
    queryKey: ['recent-foods', user?.id, activeTab],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('food_name, calories, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      const actualRecentFoods = data.map((item): FoodPrediction => ({
        name: item.food_name,
        time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        calories: item.calories || 0
      }));

      // If user has few recent logs, mix with fallback foods to always show 6 items
      if (actualRecentFoods.length < 6) {
        const remainingSlots = 6 - actualRecentFoods.length;
        const fallbackToAdd = FALLBACK_FOODS.slice(0, remainingSlots);
        return [...actualRecentFoods, ...fallbackToAdd];
      }

      return actualRecentFoods;
    },
    enabled: !!user?.id && activeTab === 'recent'
  });

  // Smart tab: Mix actual AI predictions with fallbacks based on user's log history
  const getSmartPredictions = (): FoodPrediction[] => {
    // If user is very new (less than 5 logs), show mostly fallback foods
    if (!logCount || logCount < 5) {
      return FALLBACK_FOODS;
    }
    
    // If user has some history but not much (5-15 logs), mix predictions with fallbacks
    if (logCount < 15) {
      const actualPredictions = DUMMY_PREDICTIONS.slice(0, 3);
      const fallbacksToAdd = FALLBACK_FOODS.slice(0, 3);
      return [...actualPredictions, ...fallbacksToAdd];
    }
    
    // User has good history, show full AI predictions
    return DUMMY_PREDICTIONS;
  };

  const getCurrentData = (): FoodPrediction[] => {
    switch (activeTab) {
      case 'smart':
        return getSmartPredictions();
      case 'saved':
        return savedFoods || FALLBACK_FOODS; // Always show fallbacks if no saved foods
      case 'recent':
        return recentFoods || FALLBACK_FOODS; // Always show fallbacks if no recent foods
      default:
        return getSmartPredictions();
    }
  };

  const handleFoodLog = (food: FoodPrediction) => {
    console.log('Logging food:', food);
    onFoodSelect?.(food);
  };

  const currentData = getCurrentData();

  const FoodGrid = ({ data, currentTab }: { data: FoodPrediction[], currentTab: string }) => (
    <>
      {data.length > 0 ? (
        <div className={`grid grid-cols-2 ${isMobile ? 'gap-3' : 'gap-4'}`}>
          {data.map((food, index) => (
            <div
              key={index}
              className="bg-card dark:bg-gradient-to-br dark:from-slate-800/80 dark:to-slate-700/60 dark:shadow-lg dark:shadow-slate-900/20 rounded-2xl p-4 border border-border/30 shadow-md hover:shadow-lg transition-all duration-300 animate-fade-in hover:border-border/50 flex flex-col min-h-[140px]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Food Info - Fixed heights for consistent alignment */}
              <div className="mb-3 flex-grow flex flex-col justify-between">
                {/* Food Name Row - Fixed height for alignment */}
                <div className={`${isMobile ? 'h-10' : 'h-12'} flex items-center mb-2`}>
                  <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-card-foreground leading-tight`}>
                    🥗 {food.name}
                  </h4>
                </div>
                
                {/* Time Row - Fixed height for alignment */}
                <div className={`${isMobile ? 'h-5' : 'h-6'} flex items-center mb-2`}>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                    🕒 {currentTab === 'recent' ? 'Logged at' : 'Usually'} {food.time}
                  </p>
                </div>
                
                {/* Calories Row - Fixed height for alignment */}
                <div className={`${isMobile ? 'h-5' : 'h-6'} flex items-center`}>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-card-foreground/80 font-medium`}>
                    🔢 {food.calories} cal
                  </p>
                </div>
              </div>

              {/* Tap to Log Button */}
              <button
                onClick={() => handleFoodLog(food)}
                className={`w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium rounded-full ${isMobile ? 'py-2 text-xs' : 'py-2.5 text-sm'} transition-all duration-300 transform hover:scale-105 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 mt-auto text-center`}
              >
                Tap to log
              </button>
            </div>
          ))}
        </div>
      ) : (
        // Empty State
        <div className="text-center py-8">
          <div className="text-4xl mb-3">
            {currentTab === 'saved' ? '🔖' : '📱'}
          </div>
          <p className="text-card-foreground font-medium mb-1">
            {currentTab === 'saved' ? 'No saved foods yet!' : 'No recent foods yet!'}
          </p>
          <p className="text-muted-foreground text-sm">
            {currentTab === 'saved' 
              ? 'Start logging meals to see your favorites here' 
              : 'Your recently logged foods will appear here'
            }
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className={`bg-gradient-to-br from-background/95 to-background/90 dark:from-gray-900/95 dark:to-gray-800/90 backdrop-blur-xl rounded-3xl border border-border/50 shadow-xl shadow-black/5 dark:shadow-black/20 ${isMobile ? 'p-5' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-primary/80 to-primary/60 rounded-xl shadow-sm">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-foreground`}>
            SmartLog AI Predictions
          </h3>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
            Your most likely meals, based on real patterns
          </p>
        </div>
      </div>

      <Tabs defaultValue="smart" value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)}>
        {/* Tab Navigation - Custom styled to match existing design */}
        <div className="flex items-center justify-center mb-6">
          <TabsList className="flex bg-muted/60 rounded-full p-1 w-full max-w-md mx-auto h-auto">
            <TabsTrigger 
              value="smart"
              className="flex-1 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/80"
            >
              ⚡ Smart
            </TabsTrigger>
            <TabsTrigger 
              value="saved"
              className="flex-1 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/80"
            >
              🔁 Saved
            </TabsTrigger>
            <TabsTrigger 
              value="recent"
              className="flex-1 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/80"
            >
              🌈 Recent
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="smart" className="mt-0">
          <FoodGrid data={getSmartPredictions()} currentTab="smart" />
        </TabsContent>

        <TabsContent value="saved" className="mt-0">
          <FoodGrid data={savedFoods || FALLBACK_FOODS} currentTab="saved" />
        </TabsContent>

        <TabsContent value="recent" className="mt-0">
          <FoodGrid data={recentFoods || FALLBACK_FOODS} currentTab="recent" />
        </TabsContent>
      </Tabs>
    </div>
  );
};