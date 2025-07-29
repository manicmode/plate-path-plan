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
    <div className={`bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 shadow-lg shadow-slate-200/20 ${isMobile ? 'p-5' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-slate-500/80 to-slate-600/80 rounded-xl shadow-sm">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-slate-800`}>
            SmartLog AI Predictions
          </h3>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>
            Based on your patterns
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="flex bg-slate-100/80 rounded-full p-1">
          <button 
            onClick={() => setActiveTab('smart')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
              activeTab === 'smart' 
                ? 'bg-slate-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            ⚡ Smart
          </button>
          <button 
            onClick={() => setActiveTab('saved')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
              activeTab === 'saved' 
                ? 'bg-slate-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            🔁 Saved
          </button>
          <button 
            onClick={() => setActiveTab('recent')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
              activeTab === 'recent' 
                ? 'bg-slate-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-200/60'
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
              className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-md hover:shadow-lg transition-all duration-300 animate-fade-in hover:border-slate-300/60"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Food Info */}
              <div className="space-y-2 mb-3">
                <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-slate-800 leading-tight`}>
                  🥗 {food.name}
                </h4>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>
                  🕒 {activeTab === 'recent' ? 'Logged at' : 'Usually'} {food.time}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-600 font-medium`}>
                  🔢 {food.calories} cal
                </p>
              </div>

              {/* Tap to Log Button */}
              <button
                onClick={() => handleFoodLog(food)}
                className={`w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-medium rounded-full ${isMobile ? 'py-2 text-xs' : 'py-2.5 text-sm'} transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg`}
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
          <p className="text-slate-700 font-medium mb-1">
            {activeTab === 'saved' ? 'No saved foods yet!' : 'No recent foods yet!'}
          </p>
          <p className="text-slate-500 text-sm">
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