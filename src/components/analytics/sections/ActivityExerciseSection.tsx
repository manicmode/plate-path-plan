
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';
import { Activity, Flame, Droplets } from 'lucide-react';
import { DailyProgressCard } from '@/components/analytics/DailyProgressCard';
import { SectionHeader } from '@/components/analytics/ui/SectionHeader';
import { useAuth } from '@/contexts/auth';
import { CircularProgress } from '@/components/analytics/ui/CircularProgress';
import { CustomTooltip } from '@/components/analytics/ui/CustomTooltip';

interface ActivityExerciseSectionProps {
  stepsData: any[];
  exerciseCaloriesData: any[];
  weeklyAverage: any;
  progress: any;
}

export const ActivityExerciseSection = ({ stepsData, exerciseCaloriesData, weeklyAverage, progress }: ActivityExerciseSectionProps) => {
  const { user } = useAuth();
  // Convert targetHydration (glasses) to ml
  const hydrationTargetMl = (user?.targetHydration || 8) * 250;

  return (
    <div>      
      {/* Progress Cards Row - Horizontal Layout */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <DailyProgressCard
          title="Steps"
          value={Math.round(weeklyAverage.steps)}
          target={10000}
          unit="steps"
          icon={<Activity className="h-6 w-6" />}
          color="#22C55E"
        />
        <DailyProgressCard
          title="Exercise"
          value={Math.round(weeklyAverage.exerciseMinutes * 8)}
          target={500}
          unit="kcal"
          icon={<Flame className="h-6 w-6" />}
          color="#F97316"
        />
        <DailyProgressCard
          title="Hydration"
          value={progress.hydration}
          target={hydrationTargetMl}
          unit="ml"
          icon={<Droplets className="h-6 w-6" />}
          color="#06B6D4"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-green-900 dark:text-green-100 flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Steps Walked
            </CardTitle>
            <p className="text-sm text-green-600 dark:text-green-300">Daily step tracking</p>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {Math.round(weeklyAverage.steps).toLocaleString()}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400 font-medium">steps today</div>
            </div>
            <div className="h-32">
              <div className="w-full h-full">
                <BarChart width={300} height={128} data={stepsData}>
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 11, fill: '#059669', fontWeight: 500 }}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '2px solid #10b981',
                      borderRadius: '12px',
                      boxShadow: '0 8px 25px rgba(16, 185, 129, 0.2)',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  />
                  <Bar 
                    dataKey="steps" 
                    fill="url(#greenGradient)"
                    radius={[8, 8, 0, 0]}
                    className="drop-shadow-lg"
                  />
                  <defs>
                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-orange-900 dark:text-orange-100 flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Exercise Calories
            </CardTitle>
            <p className="text-sm text-orange-600 dark:text-orange-300">Calories burned from workouts</p>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-6">
              <div className="relative">
                <CircularProgress
                  value={Math.round(weeklyAverage.exerciseMinutes * 8)}
                  max={500}
                  color="#f97316"
                  size={120}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">
                      {Math.round((Math.round(weeklyAverage.exerciseMinutes * 8) / 500) * 100)}%
                    </div>
                    <div className="text-xs text-orange-500">0ml/500ml</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-orange-600 dark:text-orange-400 font-semibold mb-3">Weekly Progress</div>
              <div className="h-16">
                <div className="w-full h-full">
                  <LineChart width={300} height={64} data={exerciseCaloriesData}>
                    <Line
                      type="monotone"
                      dataKey="calories"
                      stroke="url(#orangeLineGradient)"
                      strokeWidth={4}
                      dot={{ fill: '#f97316', r: 5, strokeWidth: 3, stroke: '#fff' }}
                      activeDot={{ r: 7, stroke: '#ea580c', strokeWidth: 3, fill: '#f97316' }}
                    />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 11, fill: '#ea580c', fontWeight: 500 }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '2px solid #f97316',
                        borderRadius: '12px',
                        boxShadow: '0 8px 25px rgba(249, 115, 22, 0.2)',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    />
                    <defs>
                      <linearGradient id="orangeLineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#ea580c" />
                      </linearGradient>
                    </defs>
                  </LineChart>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
