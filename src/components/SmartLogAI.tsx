import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

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

type TabType = 'smart' | 'saved' | 'recent';

export const SmartLogAI: React.FC<SmartLogAIProps> = ({ onFoodSelect }) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('smart');

  // Fetch saved foods (most frequently logged)
  const { data: savedFoods } = useQuery({
    queryKey: ['saved-foods', user?.id],
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

      // Sort by frequency and take top 6
      return Object.entries(foodCounts)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 6)
        .map(([name, data]): FoodPrediction => ({
          name,
          time: data.lastTime,
          calories: data.calories
        }));
    },
    enabled: !!user?.id && activeTab === 'saved'
  });

  // Fetch recent foods
  const { data: recentFoods } = useQuery({
    queryKey: ['recent-foods', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('food_name, calories, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      return data.map((item): FoodPrediction => ({
        name: item.food_name,
        time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        calories: item.calories || 0
      }));
    },
    enabled: !!user?.id && activeTab === 'recent'
  });

  const getCurrentData = (): FoodPrediction[] => {
    switch (activeTab) {
      case 'smart':
        return DUMMY_PREDICTIONS;
      case 'saved':
        return savedFoods || [];
      case 'recent':
        return recentFoods || [];
      default:
        return DUMMY_PREDICTIONS;
    }
  };

  const handleFoodLog = (food: FoodPrediction) => {
    console.log('Logging food:', food);
    onFoodSelect?.(food);
  };

  const currentData = getCurrentData();

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

      {/* Tab Navigation */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex bg-muted/60 rounded-full p-1 w-full max-w-md mx-auto">
          <button 
            onClick={() => setActiveTab('smart')}
            className={`flex-1 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
              activeTab === 'smart' 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'text-muted-foreground hover:bg-muted/80'
            }`}
          >
            ⚡ Smart
          </button>
          <button 
            onClick={() => setActiveTab('saved')}
            className={`flex-1 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
              activeTab === 'saved' 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'text-muted-foreground hover:bg-muted/80'
            }`}
          >
            🔁 Saved
          </button>
          <button 
            onClick={() => setActiveTab('recent')}
            className={`flex-1 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
              activeTab === 'recent' 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'text-muted-foreground hover:bg-muted/80'
            }`}
          >
            🌈 Recent
          </button>
        </div>
      </div>

      {/* Food Predictions Grid */}
      {currentData.length > 0 ? (
        <div className={`grid grid-cols-2 ${isMobile ? 'gap-3' : 'gap-4'}`}>
          {currentData.map((food, index) => (
            <div
              key={index}
              className="bg-card dark:bg-card/95 rounded-2xl p-4 border border-border/30 shadow-md hover:shadow-lg transition-all duration-300 animate-fade-in hover:border-border/50 flex flex-col min-h-[140px]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Food Info */}
              <div className="space-y-2 mb-3 flex-grow">
                <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-card-foreground leading-tight`}>
                  🥗 {food.name}
                </h4>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                  🕒 {activeTab === 'recent' ? 'Logged at' : 'Usually'} {food.time}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-card-foreground/80 font-medium`}>
                  🔢 {food.calories} cal
                </p>
              </div>

              {/* Tap to Log Button */}
              <button
                onClick={() => handleFoodLog(food)}
                className={`w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-medium rounded-full ${isMobile ? 'py-2 text-xs' : 'py-2.5 text-sm'} transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg mt-auto`}
              >
                ✅ Tap to log
              </button>
            </div>
          ))}
        </div>
      ) : (
        // Empty State
        <div className="text-center py-8">
          <div className="text-4xl mb-3">
            {activeTab === 'saved' ? '🔖' : '📱'}
          </div>
          <p className="text-card-foreground font-medium mb-1">
            {activeTab === 'saved' ? 'No saved foods yet!' : 'No recent foods yet!'}
          </p>
          <p className="text-muted-foreground text-sm">
            {activeTab === 'saved' 
              ? 'Start logging meals to see your favorites here' 
              : 'Your recently logged foods will appear here'
            }
          </p>
        </div>
      )}
    </div>
  );
};