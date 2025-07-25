
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';
import { Activity, Flame } from 'lucide-react';
import { SectionHeader } from '@/components/analytics/ui/SectionHeader';
import { CircularProgress } from '@/components/analytics/ui/CircularProgress';
import { CustomTooltip } from '@/components/analytics/ui/CustomTooltip';

interface ActivityExerciseSectionProps {
  stepsData: any[];
  exerciseCaloriesData: any[];
  weeklyAverage: any;
}

export const ActivityExerciseSection = ({ stepsData, exerciseCaloriesData, weeklyAverage }: ActivityExerciseSectionProps) => {
  return (
    <div>
      <SectionHeader icon={Activity} title="Activity & Exercise" subtitle="Steps and calories burned" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Steps Walked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(weeklyAverage.steps).toLocaleString()}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">steps today</div>
            </div>
            <div className="h-32">
              <div className="w-full h-full">
                <BarChart width={300} height={128} data={stepsData}>
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10 }} 
                    className="text-gray-600 dark:text-gray-300"
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="steps" 
                    fill="#22C55E" 
                    radius={[6, 6, 0, 0]}
                    className="drop-shadow-sm"
                  />
                </BarChart>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Exercise Calories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-4">
              <CircularProgress
                value={Math.round(weeklyAverage.exerciseMinutes * 8)}
                max={500}
                color="#F97316"
                size={120}
              />
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Weekly Progress</div>
              <div className="h-16">
                <div className="w-full h-full">
                  <LineChart width={300} height={64} data={exerciseCaloriesData}>
                    <Line
                      type="monotone"
                      dataKey="calories"
                      stroke="#F97316"
                      strokeWidth={3}
                      dot={{ fill: '#F97316', r: 4, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, stroke: '#F97316', strokeWidth: 2 }}
                    />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 10 }} 
                      className="text-gray-600 dark:text-gray-300"
                    />
                    <Tooltip content={<CustomTooltip />} />
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
