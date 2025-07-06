
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNutrition } from '@/contexts/NutritionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIsMobile } from '@/hooks/use-mobile';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { TrendingUp, Target, Calendar, Award, Droplets, Flame, Zap, Activity, Brain, Trophy, ChevronRight } from 'lucide-react';
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

  // Macronutrient data
  const macroData = [
    { name: 'Protein', value: progress.protein, color: '#3B82F6', percentage: 30 },
    { name: 'Carbs', value: progress.carbs, color: '#F59E0B', percentage: 45 },
    { name: 'Fat', value: progress.fat, color: '#10B981', percentage: 25 },
  ];

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
            stroke="rgb(75 85 99 / 0.2)"
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
            <div className="text-xl font-bold text-white">{Math.round(percentage)}%</div>
            <div className="text-xs text-gray-400">{value}/{max}</div>
          </div>
        </div>
      </div>
    );
  };

  const AnimatedCounter = ({ value, label, suffix = "" }: any) => (
    <div className="text-center">
      <div className="text-2xl font-bold text-white mb-1">
        {Math.round(value).toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 ${isMobile ? 'pb-20' : 'pb-8'}`}>
      <div className="space-y-6 p-4 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Your Progress Journey
          </h1>
          <p className="text-blue-300 font-medium">
            Track your transformation with smart insights
          </p>
        </div>

        {/* Section 1: Top Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border-blue-500/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <AnimatedCounter 
                value={weeklyAverage.calories} 
                label="Avg Daily Calories"
                suffix=" kcal"
              />
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border-emerald-500/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <AnimatedCounter 
                value={weeklyAverage.protein} 
                label="Avg Daily Protein"
                suffix="g"
              />
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-purple-500/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <AnimatedCounter 
                value={weeklyAverage.steps} 
                label="Avg Daily Steps"
              />
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Weekly Overview Chart */}
        <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-400" />
                Weekly Overview
              </CardTitle>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(75 85 99 / 0.2)" />
                  <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.9)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      color: 'white'
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

        {/* Section 3 & 4: Macros and Hydration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Macronutrient Distribution */}
          <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
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
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">
                        {Math.round(progress.calories)}
                      </div>
                      <div className="text-xs text-gray-400">kcal today</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                {macroData.map((macro, index) => (
                  <div key={index}>
                    <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: macro.color }}></div>
                    <div className="text-sm text-white font-semibold">{macro.value}g</div>
                    <div className="text-xs text-gray-400">{macro.name}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hydration Progress */}
          <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Droplets className="h-5 w-5 text-cyan-400" />
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
                <div className="text-sm text-gray-400 mb-2">Weekly Trend</div>
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
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 5: Achievements & Streaks */}
        <Card className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-yellow-500/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              Milestones & Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-900/30 to-green-900/30 rounded-xl border border-emerald-500/20">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Flame className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">9-Day Streak</div>
                  <div className="text-sm text-emerald-300">Consistency Champion</div>
                </div>
                <ChevronRight className="h-5 w-5 text-emerald-400 ml-auto" />
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl border border-blue-500/20">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">5/7 Days</div>
                  <div className="text-sm text-blue-300">Protein Goals Hit</div>
                </div>
                <ChevronRight className="h-5 w-5 text-blue-400 ml-auto" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Smart Insights */}
        <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" />
              Smart Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 bg-green-900/20 rounded-xl border-l-4 border-green-400">
                <div className="text-sm text-green-300 font-semibold">🎯 Excellent Progress!</div>
                <div className="text-white text-sm mt-1">You hit your protein target 5 days in a row. Amazing consistency!</div>
              </div>
              <div className="p-4 bg-yellow-900/20 rounded-xl border-l-4 border-yellow-400">
                <div className="text-sm text-yellow-300 font-semibold">💡 Optimization Tip</div>
                <div className="text-white text-sm mt-1">Consider lowering sugar intake — 3 days this week exceeded 50g.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 7: Steps & Exercise */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-400" />
                Steps Walked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-white">8,500</div>
                <div className="text-sm text-gray-400">steps today</div>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stepsData}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    />
                    <Bar dataKey="steps" fill="#22C55E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-400" />
                Exercise Calories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <CircularProgress
                  value={320}
                  max={500}
                  color="#F97316"
                  size={120}
                />
              </div>
              <div className="text-center mt-4">
                <div className="text-sm text-gray-400">320 of 500 calories burned</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 8: Future Gamification */}
        <Card className="bg-gradient-to-r from-indigo-900/30 to-blue-900/30 border-indigo-500/20 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Join Weekly Challenges</h3>
              <p className="text-blue-300 mb-4">Compete with others and earn rewards for healthy habits</p>
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
