
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useSound } from '@/hooks/useSound';

interface DailyProgressCardProps {
  title: string;
  value: number;
  target: number;
  unit: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

// Session-only storage for played goal sounds (shared across all instances)
let playedGoalSounds: Set<string> | null = null;

const getPlayedGoalSounds = (): Set<string> => {
  if (!playedGoalSounds) {
    playedGoalSounds = new Set<string>();
  }
  return playedGoalSounds;
};

export const DailyProgressCard = ({ title, value, target, unit, icon, color, onClick }: DailyProgressCardProps) => {
  const percentage = Math.min(100, Math.round((value / target) * 100));
  const { playGoalHit } = useSound();
  
  // Create unique goal key for this goal on this date
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const goalKey = `${title.toLowerCase()}_${currentDate}`;
  
  // Use ref to track if we've checked this goal in this render cycle
  const hasCheckedThisRender = React.useRef(false);
  
  // Play sound when goal is hit for the first time per session
  React.useEffect(() => {
    const soundsSet = getPlayedGoalSounds();
    
    if (percentage >= 100 && !soundsSet.has(goalKey) && !hasCheckedThisRender.current) {
      console.log(`🔊 Playing goal hit sound for: ${goalKey} (${percentage}%)`);
      playGoalHit();
      soundsSet.add(goalKey);
      hasCheckedThisRender.current = true;
    } else if (percentage >= 100 && soundsSet.has(goalKey)) {
      console.log(`🔇 Skipping sound for ${goalKey} - already played this session (${percentage}%)`);
    }
    
    // Reset check flag when component unmounts or percentage changes
    return () => {
      hasCheckedThisRender.current = false;
    };
  }, [percentage, goalKey, playGoalHit]);
  
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
    <Card 
      className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden h-[230px] mb-0 !mb-0 cursor-pointer"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : -1}
    >
      <CardContent className="p-6 h-full flex flex-col justify-between">
        <div className="flex items-center justify-center mb-4">
          <div className={`p-3 rounded-xl shadow-lg`} style={{ backgroundColor: `${color}20` }}>
            <div style={{ color }}>{icon}</div>
          </div>
          {shouldShowConfetti && (
            <div className="text-2xl animate-bounce">🎉</div>
          )}
        </div>
        
        <div className="space-y-3 flex-1">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                {Math.round(value).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{unit}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{title}</div>
            </div>
          </div>
          
          {/* Progress bar with centered percentage - full-bleed within card padding */}
          <div className="-mx-4 sm:-mx-6">
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
