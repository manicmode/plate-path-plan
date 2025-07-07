
import React from 'react';

interface AnimatedCounterProps {
  value: number;
  label: string;
  suffix?: string;
}

export const AnimatedCounter = ({ value, label, suffix = "" }: AnimatedCounterProps) => (
  <div className="text-center">
    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
      {Math.round(value).toLocaleString()}{suffix}
    </div>
    <div className="text-sm text-gray-600 dark:text-gray-300">{label}</div>
  </div>
);
