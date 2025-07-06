
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNutrition } from '@/contexts/NutritionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIsMobile } from '@/hooks/use-mobile';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { TrendingUp, Target, Calendar, Award, Droplets, Flame, Zap, Activity, Brain, Trophy, ChevronRight, Star } from 'lucide-react';
import { useState } from 'react';

const Analytics = () => {
  const { currentDay, weeklyData, getTodaysProgress } = useNutrition();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month'>('week');
  
  useScrollToTop();

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
    steps: 8500, // Mock data - will be replaced with real data
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

  const CircularProgress = ({ value, max, color, size = 120, strokeWidth = 8 }: any) => {
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
            stroke="rgb(148 163 184 / 0.3)"
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
            className="transition-all duration-1000 ease-out"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900 dark:text-white">{Math.round(percentage)}%</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{value}/{max}</div>
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
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );

  const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: any, title: string, subtitle?: string }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl">
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-gray-900 dark:via-blue-900/20 dark:to-gray-900 ${isMobile ? 'pb-20' : 'pb-8'}`}>
      <div className="space-y-8 p-4 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-transparent dark:bg-gradient-to-r dark:from-blue-400 dark:to-cyan-400 dark:bg-clip-text">
            Your Progress Journey
          </h1>
          <p className="text-gray-600 dark:text-blue-300 font-medium">
            Track your transformation with smart insights
          </p>
        </div>

        {/* Weekly Summary Card */}
        <Card className="bg-white/80 dark:bg-gradient-to-br dark:from-blue-900/40 dark:to-blue-800/20 border-gray-200/50 dark:border-blue-500/20 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-gray-900 dark:text-white">Weekly Summary</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">🔥 Great work this week! You're 80% on track.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{Math.round(weeklyAverage.calories * 7).toLocaleString()}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Calories</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{weeklySteps.toLocaleString()}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Steps Walked</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{weeklyExerciseMinutes}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Exercise Minutes</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{hydrationCompliance}%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Hydration Goals</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Averages */}
        <div>
          <SectionHeader icon={TrendingUp} title="Daily Averages" subtitle="Your weekly performance overview" />
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-white/80 dark:bg-gradient-to-br dark:from-blue-900/40 dark:to-blue-800/20 border-gray-200/50 dark:border-blue-500/20 backdrop-blur-sm shadow-lg">
              <CardContent className="p-4">
                <AnimatedCounter 
                  value={weeklyAverage.calories} 
                  label="Avg Daily Calories"
                  suffix=" kcal"
                />
              </CardContent>
            </Card>
            <Card className="bg-white/80 dark:bg-gradient-to-br dark:from-emerald-900/40 dark:to-emerald-800/20 border-gray-200/50 dark:border-emerald-500/20 backdrop-blur-sm shadow-lg">
              <CardContent className="p-4">
                <AnimatedCounter 
                  value={weeklyAverage.protein} 
                  label="Avg Daily Protein"
                  suffix="g"
                />
              </CardContent>
            </Card>
            <Card className="bg-white/80 dark:bg-gradient-to-br dark:from-purple-900/40 dark:to-purple-800/20 border-gray-200/50 dark:border-purple-500/20 backdrop-blur-sm shadow-lg">
              <CardContent className="p-4">
                <AnimatedCounter 
                  value={weeklyAverage.steps} 
                  label="Avg Daily Steps"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Weekly Overview Chart */}
        <div>
          <SectionHeader icon={Calendar} title="Weekly Overview" subtitle="Track your nutrition trends" />
          <Card className="bg-white/80 dark:bg-gray-900/50 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900 dark:text-white">Nutrition Trends</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={selectedTimeframe === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTimeframe('week')}
                    className="text-xs"
                  >
                    Week
                  </Button>
                  <Button
                    variant={selectedTimeframe === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTimeframe('month')}
                    className="text-xs"
                  >
                    Month
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.3)" />
                    <XAxis dataKey="day" tick={{ fill: 'rgb(107 114 128)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'rgb(107 114 128)', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        borderRadius: '8px',
                        color: 'rgb(17, 24, 39)',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="calories" fill="#3B82F6" name="Calories" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="protein" fill="#10B981" name="Protein" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="carbs" fill="#F59E0B" name="Carbs" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Macros and Hydration */}
        <div>
          <SectionHeader icon={Zap} title="Today's Breakdown" subtitle="Macros and hydration status" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Macronutrient Distribution */}
            <Card className="bg-white/80 dark:bg-gray-900/50 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm shadow-lg">
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            borderRadius: '8px',
                            color: 'rgb(17, 24, 39)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {Math.round(progress.calories)}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">kcal today</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {macroData.map((macro, index) => (
                    <div key={index}>
                      <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: macro.color }}></div>
                      <div className="text-sm text-gray-900 dark:text-white font-semibold">{macro.value}g</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{macro.name}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Hydration Progress */}
            <Card className="bg-white/80 dark:bg-gray-900/50 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-cyan-500" />
                  Hydration Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center mb-4">
                  <CircularProgress
                    value={progress.hydration}
                    max={user?.targetHydration || 2000}
                    color="#06B6D4"
                    size={120}
                  />
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Weekly Trend</div>
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={hydrationWeeklyData}>
                        <Line
                          type="monotone"
                          dataKey="amount"
                          stroke="#06B6D4"
                          strokeWidth={2}
                          dot={{ fill: '#06B6D4', r: 3 }}
                        />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'rgb(107 114 128)' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            borderRadius: '8px',
                            color: 'rgb(17, 24, 39)'
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity Tracking */}
        <div>
          <SectionHeader icon={Activity} title="Activity & Exercise" subtitle="Steps and calories burned" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white/80 dark:bg-gray-900/50 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  Steps Walked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">8,500</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">steps today</div>
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stepsData}>
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'rgb(107 114 128)' }} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid rgba(148, 163, 184, 0.3)',
                          borderRadius: '8px',
                          color: 'rgb(17, 24, 39)'
                        }}
                      />
                      <Bar dataKey="steps" fill="#22C55E" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-900/50 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm shadow-lg">
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
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Weekly Progress</div>
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={exerciseCaloriesData}>
                        <Line
                          type="monotone"
                          dataKey="calories"
                          stroke="#F97316"
                          strokeWidth={2}
                          dot={{ fill: '#F97316', r: 3 }}
                        />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'rgb(107 114 128)' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            borderRadius: '8px',
                            color: 'rgb(17, 24, 39)'
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Achievements & Streaks */}
        <div>
          <SectionHeader icon={Trophy} title="Milestones & Streaks" subtitle="Your achievements and consistency" />
          <Card className="bg-white/80 dark:bg-gradient-to-r dark:from-yellow-900/30 dark:to-orange-900/30 border-gray-200/50 dark:border-yellow-500/20 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Flame className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">9-Day Streak</div>
                    <div className="text-sm text-emerald-700 dark:text-emerald-300">Consistency Champion</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400 ml-auto" />
                </div>
                
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl border border-blue-200 dark:border-blue-500/20">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
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

        {/* Smart Insights */}
        <div>
          <SectionHeader icon={Brain} title="Smart Insights" subtitle="Personalized recommendations" />
          <Card className="bg-white/80 dark:bg-gradient-to-r dark:from-purple-900/30 dark:to-pink-900/30 border-gray-200/50 dark:border-purple-500/20 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-l-4 border-green-500">
                  <div className="text-sm text-green-700 dark:text-green-300 font-semibold">🎯 Excellent Progress!</div>
                  <div className="text-gray-900 dark:text-white text-sm mt-1">You hit your protein target 5 days in a row. Amazing consistency!</div>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-l-4 border-yellow-500">
                  <div className="text-sm text-yellow-700 dark:text-yellow-300 font-semibold">💡 Optimization Tip</div>
                  <div className="text-gray-900 dark:text-white text-sm mt-1">Consider lowering sugar intake — 3 days this week exceeded 50g.</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Future Gamification */}
        <Card className="bg-white/80 dark:bg-gradient-to-r dark:from-indigo-900/30 dark:to-blue-900/30 border-gray-200/50 dark:border-indigo-500/20 backdrop-blur-sm shadow-lg">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Join Weekly Challenges</h3>
              <p className="text-gray-600 dark:text-blue-300 mb-4">Compete with others and earn rewards for healthy habits</p>
              <Button className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white border-0">
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
