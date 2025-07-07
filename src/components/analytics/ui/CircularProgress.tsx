
import React from 'react';

interface CircularProgressProps {
  value: number;
  max: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}

export const CircularProgress = ({ value, max, color, size = 120, strokeWidth = 10 }: CircularProgressProps) => {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
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
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-[2s] ease-out"
          strokeLinecap="round"
          style={{
            filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.3))'
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900 dark:text-white">{Math.round(percentage)}%</div>
          <div className="text-xs text-gray-600 dark:text-gray-300">{value}/{max}</div>
        </div>
      </div>
    </div>
  );
};
