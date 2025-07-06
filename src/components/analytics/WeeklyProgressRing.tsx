
import React, { useEffect, useState } from 'react';
import { useNutrition } from '@/contexts/NutritionContext';
import { useAuth } from '@/contexts/AuthContext';

interface WeeklyProgressRingProps {
  size?: number;
  strokeWidth?: number;
}

export const WeeklyProgressRing = ({ size = 180, strokeWidth = 12 }: WeeklyProgressRingProps) => {
  const { weeklyData } = useNutrition();
  const { user } = useAuth();
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [showSparkles, setShowSparkles] = useState(false);

  // Calculate weekly score from multiple factors
  const calculateWeeklyScore = () => {
    if (!weeklyData.length) return 0;
    
    const loggedDays = weeklyData.filter(day => day.foods.length > 0).length;
    const loggingScore = (loggedDays / 7) * 0.4; // 40% weight
    
    const hydrationDays = weeklyData.filter(day => day.totalHydration >= (user?.targetHydration || 2000)).length;
    const hydrationScore = (hydrationDays / 7) * 0.3; // 30% weight
    
    const avgCalories = weeklyData.reduce((sum, day) => sum + day.totalCalories, 0) / weeklyData.length;
    const targetCalories = user?.targetCalories || 2000;
    const calorieAccuracy = Math.max(0, 1 - Math.abs(avgCalories - targetCalories) / targetCalories);
    const calorieScore = calorieAccuracy * 0.2; // 20% weight
    
    const activityScore = 0.1; // 10% placeholder for activity
    
    return Math.min(100, Math.round((loggingScore + hydrationScore + calorieScore + activityScore) * 100));
  };

  const weeklyScore = calculateWeeklyScore();

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(weeklyScore);
      if (weeklyScore >= 80) {
        setShowSparkles(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [weeklyScore]);

  const getScoreColor = () => {
    if (weeklyScore >= 80) return '#10B981'; // Green
    if (weeklyScore >= 40) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  const getMotivationalMessage = () => {
    if (weeklyScore >= 80) return '🔥 Crushing it this week! Keep the momentum!';
    if (weeklyScore >= 40) return '⏳ You\'re making progress. Stay focused!';
    return '🚨 Don\'t give up. New week, new chance!';
  };

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgb(148 163 184 / 0.2)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getScoreColor()}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-[2s] ease-out"
            strokeLinecap="round"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.3))'
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
              {animatedProgress}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Weekly Score
            </div>
          </div>
        </div>

        {/* Sparkles effect for high scores */}
        {showSparkles && weeklyScore >= 80 && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 right-8 text-yellow-400 animate-bounce">✨</div>
            <div className="absolute bottom-6 left-6 text-yellow-400 animate-bounce delay-300">⭐</div>
            <div className="absolute top-8 left-4 text-yellow-400 animate-bounce delay-500">🌟</div>
          </div>
        )}
      </div>
      
      {/* Motivational message */}
      <div className="text-center max-w-sm">
        <p className="text-lg font-semibold text-gray-900 dark:text-white">
          {getMotivationalMessage()}
        </p>
      </div>
    </div>
  );
};
