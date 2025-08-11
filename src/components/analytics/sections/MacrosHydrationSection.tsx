
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Zap, Droplets } from 'lucide-react';
import { SectionHeader } from '@/components/analytics/ui/SectionHeader';
import { CustomTooltip } from '@/components/analytics/ui/CustomTooltip';
import { useNutrition } from '@/contexts/NutritionContext';
import { useAuth } from '@/contexts/auth';

interface MacrosHydrationSectionProps {
  macroData: any[];
  progress: any;
}

export const MacrosHydrationSection = ({ macroData, progress }: MacrosHydrationSectionProps) => {
  const { user } = useAuth();
  const { getHydrationGoal } = useNutrition();
  
  // Hydration target in ml via NutritionContext
  const hydrationTargetMl = getHydrationGoal();

  // Safe defaults
  const macros = Array.isArray(macroData) ? macroData : [];
  const safeProgress = progress ?? { calories: 0, hydration: 0 } as any;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-lg">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Today's Breakdown</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Macros and hydration status</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Macronutrient Distribution */}
        <Card className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Today's Macros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-[200px] h-[200px]">
                  <PieChart width={200} height={200}>
                    <Pie
                      data={macros}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {macros.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {Math.round(Number(safeProgress.calories) || 0)}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">kcal today</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              {macroData.map((macro, index) => (
                <div key={index}>
                  <div className="w-4 h-4 rounded-full mx-auto mb-2 shadow-sm" style={{ backgroundColor: macro.color }}></div>
                  <div className="text-sm text-gray-900 dark:text-white font-semibold">{Math.round(macro.value)}g</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">{macro.name}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hydration Progress */}
        <Card className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Droplets className="h-5 w-5 text-cyan-500" />
              Hydration Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg width="128" height="128" className="transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    stroke="rgb(148 163 184 / 0.2)"
                    strokeWidth="10"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    stroke="#06B6D4"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={339.3}
                    strokeDashoffset={(() => {
                      const denom = hydrationTargetMl > 0 ? hydrationTargetMl : 1;
                      const ratio = Math.min(1, Math.max(0, (Number(safeProgress.hydration) || 0) / denom));
                      return 339.3 - ratio * 339.3;
                    })()}
                    className="transition-all duration-[2s] ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {Math.round(((() => {
                        const denom = hydrationTargetMl > 0 ? hydrationTargetMl : 1;
                        return ((Number(safeProgress.hydration) || 0) / denom) * 100;
                      })()))}%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {Number(safeProgress.hydration) || 0}ml/{hydrationTargetMl}ml
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
