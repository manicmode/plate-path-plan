import React from 'react';
import { Sparkles } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

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

export const SmartLogAI: React.FC<SmartLogAIProps> = ({ onFoodSelect }) => {
  const isMobile = useIsMobile();

  const handleFoodLog = (food: FoodPrediction) => {
    console.log('Logging food:', food);
    onFoodSelect?.(food);
  };

  return (
    <div className={`bg-gradient-to-br from-slate-900/95 via-purple-900/90 to-indigo-900/95 rounded-3xl backdrop-blur-sm border border-purple-200/20 shadow-xl ${isMobile ? 'p-5' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl shadow-lg">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white`}>
            SmartLog AI Predictions
          </h3>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-purple-200/80`}>
            Based on your patterns
          </p>
        </div>
      </div>

      {/* Optional Toggle Row */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="flex bg-white/10 rounded-full p-1">
          <button className="px-3 py-1 bg-purple-500 text-white rounded-full text-xs font-medium">
            ⚡ Smart
          </button>
          <button className="px-3 py-1 text-white/70 rounded-full text-xs font-medium hover:bg-white/10">
            🔁 Repeat Favorites
          </button>
          <button className="px-3 py-1 text-white/70 rounded-full text-xs font-medium hover:bg-white/10">
            🌈 Add Variety
          </button>
        </div>
      </div>

      {/* Food Predictions Grid */}
      <div className={`grid grid-cols-2 ${isMobile ? 'gap-3' : 'gap-4'}`}>
        {DUMMY_PREDICTIONS.map((food, index) => (
          <div
            key={index}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-lg hover:bg-white/15 transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Food Info */}
            <div className="space-y-2 mb-3">
              <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-white leading-tight`}>
                🥗 {food.name}
              </h4>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-purple-200/80`}>
                🕒 Usually {food.time}
              </p>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-indigo-200 font-medium`}>
                🔢 {food.calories} cal
              </p>
            </div>

            {/* Tap to Log Button */}
            <button
              onClick={() => handleFoodLog(food)}
              className={`w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-medium rounded-full ${isMobile ? 'py-2 text-xs' : 'py-2.5 text-sm'} transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/30`}
            >
              ✅ Tap to log
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};