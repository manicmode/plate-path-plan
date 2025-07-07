import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNutrition } from '@/contexts/NutritionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIsMobile } from '@/hooks/use-mobile';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { TrendingUp, Target, Calendar, Award, Droplets, Flame, Zap, Activity, Brain, Trophy, ChevronRight, Star, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

// Import new components
import { WeeklyProgressRing } from '@/components/analytics/WeeklyProgressRing';
import { LoggingStreakTracker } from '@/components/analytics/LoggingStreakTracker';
import { WeeklyOverviewChart } from '@/components/analytics/WeeklyOverviewChart';
import { DailyProgressCard } from '@/components/analytics/DailyProgressCard';
import { EnhancedDailyAverageCard } from '@/components/analytics/EnhancedDailyAverageCard';

const Analytics = () => {
  const { currentDay, weeklyData, getTodaysProgress } = useNutrition();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [animationDelay, setAnimationDelay] = useState(0);
  const [isDailyAveragesOpen, setIsDailyAveragesOpen] = useState(false);
  
  useScrollToTop();

  useEffect(() => {
    setAnimationDelay(100);
  }, []);

  const progress = getTodaysProgress();
  
  // Calculate dynamic data
  const weeklyChartData = weeklyData.slice(-7).map((day, index) => ({
    day: `Day ${index + 1}`,
    calories: day.totalCalories,
    protein: day.totalProtein,
    carbs: day.totalCarbs,
    fat: day.totalFat,
    target: user?.targetCalories || 2000
  }));

  const weeklyAverage = {
    calories: weeklyChartData.reduce((sum, day) => sum + day.calories, 0) / (weeklyChartData.length || 1),
    protein: weeklyChartData.reduce((sum, day) => sum + day.protein, 0) / (weeklyChartData.length || 1),
    carbs: weeklyChartData.reduce((sum, day) => sum + day.carbs, 0) / (weeklyChartData.length || 1),
    fat: weeklyChartData.reduce((sum, day) => sum + day.fat, 0) / (weeklyChartData.length || 1),
    hydration: 1800, // Mock data
    steps: 8500, // Mock data
    exerciseMinutes: 35, // Mock data
    supplements: 3, // Mock data
  };

  // Hydration weekly data
  const hydrationWeeklyData = [
    { day: 'Mon', amount: 1800, target: 2000 },
    { day: 'Tue', amount: 2200, target: 2000 },
    { day: 'Wed', amount: 1900, target: 2000 },
    { day: 'Thu', amount: 2100, target: 2000 },
    { day: 'Fri', amount: 1700, target: 2000 },
    { day: 'Sat', amount: 2000, target: 2000 },
    { day: 'Today', amount: progress.hydration, target: 2000 },
  ];

  // Steps data (mock)
  const stepsData = [
    { day: 'Mon', steps: 8200 },
    { day: 'Tue', steps: 9500 },
    { day: 'Wed', steps: 7800 },
    { day: 'Thu', steps: 10200 },
    { day: 'Fri', steps: 6900 },
    { day: 'Sat', steps: 8700 },
    { day: 'Today', steps: 8500 },
  ];

  // Exercise calories data (mock)
  const exerciseCaloriesData = [
    { day: 'Mon', calories: 250 },
    { day: 'Tue', calories: 320 },
    { day: 'Wed', calories: 180 },
    { day: 'Thu', calories: 410 },
    { day: 'Fri', calories: 200 },
    { day: 'Sat', calories: 350 },
    { day: 'Today', calories: 320 },
  ];

  // Macronutrient data
  const macroData = [
    { name: 'Protein', value: progress.protein, color: '#10B981', percentage: 30 },
    { name: 'Carbs', value: progress.carbs, color: '#F59E0B', percentage: 45 },
    { name: 'Fat', value: progress.fat, color: '#8B5CF6', percentage: 25 },
  ];

  // Weekly summary calculation
  const weeklySteps = stepsData.reduce((sum, day) => sum + day.steps, 0);
  const weeklyExerciseMinutes = 180; // Mock data
  const hydrationCompliance = Math.round((hydrationWeeklyData.reduce((sum, day) => sum + (day.amount >= day.target ? 1 : 0), 0) / hydrationWeeklyData.length) * 100);

  const CircularProgress = ({ value, max, color, size = 120, strokeWidth = 10 }: any) => {
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

  const AnimatedCounter = ({ value, label, suffix = "" }: any) => (
    <div className="text-center">
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {Math.round(value).toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300">{label}</div>
    </div>
  );

  const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: any, title: string, subtitle?: string }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-lg">
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600">
          <p className="text-gray-900 dark:text-white font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isMobile ? 'pb-20' : 'pb-8'}`}>
      <div className="space-y-6 p-4 animate-fade-in">
        {/* Simplified Header */}
        <div className="text-center pt-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            🏆 Your Progress Journey
          </h1>
          
          {/* Weekly Progress Ring - Hero Element */}
          <div className="mb-8">
            <WeeklyProgressRing />
          </div>
        </div>

        {/* Daily Progress Cards - Enhanced with Visual Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DailyProgressCard
            title="Calories"
            value={progress.calories}
            target={user?.targetCalories || 2000}
            unit="kcal"
            icon={<Flame className="h-6 w-6" />}
            color="#F97316"
          />
          <DailyProgressCard
            title="Protein"
            value={progress.protein}
            target={user?.targetProtein || 120}
            unit="g"
            icon={<Zap className="h-6 w-6" />}
            color="#10B981"
          />
          <DailyProgressCard
            title="Hydration"
            value={progress.hydration}
            target={user?.targetHydration || 2000}
            unit="ml"
            icon={<Droplets className="h-6 w-6" />}
            color="#06B6D4"
          />
          <DailyProgressCard
            title="Steps"
            value={8500}
            target={10000}
            unit="steps"
            icon={<Activity className="h-6 w-6" />}
            color="#22C55E"
          />
        </div>

        {/* Enhanced Daily Averages with Improved Dropdown */}
        <div>
          <Collapsible open={isDailyAveragesOpen} onOpenChange={setIsDailyAveragesOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-3 mb-6 cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl p-3 -m-3 transition-all duration-200">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Daily Averages</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Your weekly performance overview</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {isDailyAveragesOpen ? 'Collapse' : 'Expand'}
                  </span>
                  <ChevronDown className={`h-5 w-5 text-gray-600 dark:text-gray-400 transition-all duration-300 group-hover:text-blue-500 ${isDailyAveragesOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CollapsibleTrigger>
            
            {/* Always visible: Calories card */}
            <div className="mb-2">
              <EnhancedDailyAverageCard
                title="Avg Daily Calories"
                value={weeklyAverage.calories}
                suffix=" kcal"
                icon={<Flame className="h-6 w-6" />}
                gradientFrom="#F97316"
                gradientTo="#FB923C"
                progress={Math.round((weeklyAverage.calories / (user?.targetCalories || 2000)) * 100)}
                target={user?.targetCalories || 2000}
                isCompact={true}
              />
            </div>

            <CollapsibleContent className="space-y-2">
              <EnhancedDailyAverageCard
                title="Avg Daily Protein"
                value={weeklyAverage.protein}
                suffix="g"
                icon={<Zap className="h-6 w-6" />}
                gradientFrom="#10B981"
                gradientTo="#34D399"
                progress={Math.round((weeklyAverage.protein / (user?.targetProtein || 120)) * 100)}
                target={user?.targetProtein || 120}
                isCompact={true}
              />
              <EnhancedDailyAverageCard
                title="Avg Daily Carbs"
                value={weeklyAverage.carbs}
                suffix="g"
                icon={<Activity className="h-6 w-6" />}
                gradientFrom="#F59E0B"
                gradientTo="#FBBF24"
                progress={Math.round((weeklyAverage.carbs / (user?.targetCarbs || 250)) * 100)}
                target={user?.targetCarbs || 250}
                isCompact={true}
              />
              <EnhancedDailyAverageCard
                title="Avg Daily Fat"
                value={weeklyAverage.fat}
                suffix="g"
                icon={<Droplets className="h-6 w-6" />}
                gradientFrom="#8B5CF6"
                gradientTo="#A78BFA"
                progress={Math.round((weeklyAverage.fat / (user?.targetFat || 70)) * 100)}
                target={user?.targetFat || 70}
                isCompact={true}
              />
              <EnhancedDailyAverageCard
                title="Avg Daily Hydration"
                value={progress.hydration / 7}
                suffix="ml"
                icon={<Droplets className="h-6 w-6" />}
                gradientFrom="#06B6D4"
                gradientTo="#22D3EE"
                progress={Math.round((progress.hydration / 7 / (user?.targetHydration || 2000)) * 100)}
                target={user?.targetHydration || 2000}
                isCompact={true}
              />
              <EnhancedDailyAverageCard
                title="Avg Daily Steps"
                value={weeklyAverage.steps}
                suffix=""
                icon={<Activity className="h-6 w-6" />}
                gradientFrom="#3B82F6"
                gradientTo="#60A5FA"
                progress={Math.round((weeklyAverage.steps / 10000) * 100)}
                target={10000}
                isCompact={true}
              />
              <EnhancedDailyAverageCard
                title="Avg Exercise Minutes"
                value={weeklyAverage.exerciseMinutes}
                suffix=" min"
                icon={<Flame className="h-6 w-6" />}
                gradientFrom="#EF4444"
                gradientTo="#F87171"
                progress={Math.round((weeklyAverage.exerciseMinutes / 60) * 100)}
                target={60}
                isCompact={true}
              />
              <EnhancedDailyAverageCard
                title="Avg Daily Supplements"
                value={weeklyAverage.supplements}
                suffix=""
                icon={<Star className="h-6 w-6" />}
                gradientFrom="#EC4899"
                gradientTo="#F472B6"
                progress={Math.round((weeklyAverage.supplements / 5) * 100)}
                target={5}
                isCompact={true}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Logging Consistency Tracker */}
        <div>
          <LoggingStreakTracker />
        </div>

        {/* Weekly Overview Chart - Enhanced with Dropdown */}
        <div>
          <WeeklyOverviewChart />
        </div>

        {/* Macros and Hydration - Enhanced */}
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
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie
                          data={macroData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {macroData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {Math.round(progress.calories)}
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
                      <div className="text-sm text-gray-900 dark:text-white font-semibold">{macro.value}g</div>
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
                        strokeDashoffset={339.3 - (progress.hydration / (user?.targetHydration || 2000)) * 339.3}
                        className="transition-all duration-[2s] ease-out"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {Math.round((progress.hydration / (user?.targetHydration || 2000)) * 100)}%
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {progress.hydration}/{user?.targetHydration || 2000}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity Tracking - Enhanced */}
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
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">8,500</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">steps today</div>
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stepsData}>
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
                  </ResponsiveContainer>
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
                    value={320}
                    max={500}
                    color="#F97316"
                    size={120}
                  />
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Weekly Progress</div>
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={exerciseCaloriesData}>
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
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Achievements & Streaks - Enhanced */}
        <div>
          <SectionHeader icon={Trophy} title="Milestones & Streaks" subtitle="Your achievements and consistency" />
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700/50 shadow-sm">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                    <Flame className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">9-Day Streak</div>
                    <div className="text-sm text-emerald-700 dark:text-emerald-300">Consistency Champion</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400 ml-auto" />
                </div>
                
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-700/50 shadow-sm">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">5/7 Days</div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">Protein Goals Hit</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-blue-600 dark:text-blue-400 ml-auto" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Smart Insights - Enhanced */}
        <div>
          <SectionHeader icon={Brain} title="Smart Insights" subtitle="Personalized recommendations" />
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-l-4 border-green-500 shadow-sm">
                  <div className="text-sm text-green-700 dark:text-green-300 font-semibold">🎯 Excellent Progress!</div>
                  <div className="text-gray-900 dark:text-gray-100 text-sm mt-1">You hit your protein target 5 days in a row. Amazing consistency!</div>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-l-4 border-yellow-500 shadow-sm">
                  <div className="text-sm text-yellow-700 dark:text-yellow-300 font-semibold">💡 Optimization Tip</div>
                  <div className="text-gray-900 dark:text-gray-100 text-sm mt-1">Consider lowering sugar intake — 3 days this week exceeded 50g.</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Future Gamification - Enhanced */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Join Weekly Challenges</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">Compete with others and earn rewards for healthy habits</p>
              <Button className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white border-0 shadow-lg">
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
