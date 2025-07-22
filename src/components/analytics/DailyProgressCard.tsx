
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface DailyProgressCardProps {
  title: string;
  value: number;
  target: number;
  unit: string;
  icon: React.ReactNode;
  color: string;
}

export const DailyProgressCard = ({ title, value, target, unit, icon, color }: DailyProgressCardProps) => {
  const percentage = Math.min(100, Math.round((value / target) * 100));
  
  const getStatusColor = () => {
    if (percentage >= 100) return 'text-white drop-shadow-sm';
    if (percentage >= 50) return 'text-gray-900 drop-shadow-sm';
    return 'text-white drop-shadow-sm';
  };

  const getProgressBarColor = () => {
    if (percentage >= 100) return 'bg-emerald-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const shouldShowConfetti = percentage >= 100;

  return (
    <Card className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden h-[200px]">
      <CardContent className="p-6 h-full flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl shadow-lg`} style={{ backgroundColor: `${color}20` }}>
            <div style={{ color }}>{icon}</div>
          </div>
          {shouldShowConfetti && (
            <div className="text-2xl">🎉</div>
          )}
        </div>
        
        <div className="space-y-3 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(value).toLocaleString()}
                <span className="text-sm text-gray-600 dark:text-gray-300 ml-1">{unit}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{title}</div>
            </div>
          </div>
          
          {/* Progress bar with centered percentage */}
          <div className="space-y-2">
            <div className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getProgressBarColor()} transition-all duration-1000 ease-out rounded-full`}
                style={{ width: `${percentage}%` }}
              />
              {/* Centered percentage on progress bar with improved contrast */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`text-sm font-bold ${getStatusColor()}`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                  {percentage}%
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Goal achievement badge */}
        {percentage >= 100 && (
          <div className="absolute top-2 right-2">
            <div className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
              Goal Hit! 🔥
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
