
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface EnhancedDailyAverageCardProps {
  title: string;
  value: number;
  suffix: string;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  progress?: number;
  target?: number;
  isCompact?: boolean;
}

export const EnhancedDailyAverageCard = ({ 
  title, 
  value, 
  suffix, 
  icon, 
  gradientFrom, 
  gradientTo, 
  progress = 0,
  target,
  isCompact = false
}: EnhancedDailyAverageCardProps) => {
  const CircularProgress = ({ percentage }: { percentage: number }) => {
    const radius = isCompact ? 20 : 30;
    const size = isCompact ? 48 : 64;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgb(148 163 184 / 0.2)"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#gradient-${title})`}
            strokeWidth="2"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-[2s] ease-out"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`${isCompact ? 'text-xs' : 'text-xs'} font-bold text-gray-900 dark:text-white`}>
              {Math.round(percentage)}%
            </div>
          </div>
        </div>
        <defs>
          <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>
      </div>
    );
  };

  const getProgressGuidance = () => {
    if (!target) return null;
    
    const difference = target - value;
    const percentDifference = Math.abs(difference / target) * 100;
    
    // Within ±5% is considered on track
    if (percentDifference <= 5) {
      return {
        icon: "✅",
        text: "You're on track. Keep going!",
        color: "text-green-600 dark:text-green-400"
      };
    }
    
    if (difference > 0) {
      // Need to increase
      return {
        icon: "➕",
        text: `Increase by ${Math.round(difference)}${suffix}/day to hit your target.`,
        color: "text-blue-600 dark:text-blue-400"
      };
    } else {
      // Need to reduce
      return {
        icon: "➖",
        text: `Reduce by ${Math.round(Math.abs(difference))}${suffix}/day to reach your goal.`,
        color: "text-orange-600 dark:text-orange-400"
      };
    }
  };

  const guidance = getProgressGuidance();

  return (
    <Card className={`bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 group mb-0 !mb-0`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          {/* Left side: Icon and main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="p-1.5 rounded-lg shadow-sm"
                style={{ 
                  background: `linear-gradient(135deg, ${gradientFrom}20, ${gradientTo}20)`,
                  border: `1px solid ${gradientFrom}30`
                }}
              >
                <div style={{ color: gradientFrom }}>
                  {React.cloneElement(icon as React.ReactElement, { 
                    className: 'h-4 w-4' 
                  })}
                </div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-tight">
                {title}
              </div>
            </div>
            
            {/* Main value */}
            <div className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:scale-105 transition-transform duration-200">
              {Math.round(value).toLocaleString()}{suffix}
            </div>
            
            {/* Target */}
            {target && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Target: {target.toLocaleString()}{suffix}
              </div>
            )}
            
            {/* Progress Guidance */}
            {guidance && (
              <div className={`text-xs ${guidance.color} flex items-start gap-1 font-medium`}>
                <span className="text-xs flex-shrink-0">{guidance.icon}</span>
                <span className="leading-tight">{guidance.text}</span>
              </div>
            )}
          </div>
          
          {/* Right side: Progress circle */}
          {target && (
            <div className="flex-shrink-0">
              <CircularProgress percentage={progress} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
