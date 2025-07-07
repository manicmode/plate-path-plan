
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
    const radius = isCompact ? 24 : 30;
    const size = isCompact ? 56 : 64;
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
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#gradient-${title})`}
            strokeWidth="3"
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

  return (
    <Card className={`bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 group ${isCompact ? 'h-auto' : ''}`}>
      <CardContent className={isCompact ? "p-3" : "p-4"}>
        <div className="flex items-center justify-between mb-3">
          <div 
            className={`${isCompact ? 'p-1.5' : 'p-2'} rounded-xl shadow-lg`}
            style={{ 
              background: `linear-gradient(135deg, ${gradientFrom}20, ${gradientTo}20)`,
              border: `1px solid ${gradientFrom}30`
            }}
          >
            <div style={{ color: gradientFrom }} className={isCompact ? 'text-sm' : ''}>
              {React.cloneElement(icon as React.ReactElement, { 
                className: isCompact ? 'h-4 w-4' : 'h-6 w-6' 
              })}
            </div>
          </div>
          {target && (
            <CircularProgress percentage={progress} />
          )}
        </div>
        
        <div className="space-y-1">
          <div className={`${isCompact ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white group-hover:scale-105 transition-transform duration-200`}>
            {Math.round(value).toLocaleString()}{suffix}
          </div>
          <div className={`${isCompact ? 'text-xs' : 'text-xs'} text-gray-600 dark:text-gray-300`}>{title}</div>
          {target && (
            <div className={`${isCompact ? 'text-xs' : 'text-xs'} text-gray-500 dark:text-gray-400`}>
              Target: {target.toLocaleString()}{suffix}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
