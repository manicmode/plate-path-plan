
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Flame, TrendingUp, TrendingDown, FileText, BarChart3, Shield, Brain, Pill, Trophy, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, Cell } from 'recharts';
import { useState } from 'react';
import { DayDetailModal } from '@/components/analytics/DayDetailModal';
import { format, subDays } from 'date-fns';

const ProgressCalories = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { getTodaysProgress } = useNutrition();
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showDayDetail, setShowDayDetail] = useState(false);
  
  // Use the scroll-to-top hook
  useScrollToTop();
  
  const targetCalories = user?.targetCalories || 2000;
  const todayProgress = getTodaysProgress();
  
  // Mock data for different time periods with actual dates
  const dailyData = [
    { name: 'Mon', value: 1800, target: targetCalories, date: format(subDays(new Date(), 6), 'yyyy-MM-dd') },
    { name: 'Tue', value: 2100, target: targetCalories, date: format(subDays(new Date(), 5), 'yyyy-MM-dd') },
    { name: 'Wed', value: 1950, target: targetCalories, date: format(subDays(new Date(), 4), 'yyyy-MM-dd') },
    { name: 'Thu', value: 2200, target: targetCalories, date: format(subDays(new Date(), 3), 'yyyy-MM-dd') },
    { name: 'Fri', value: 1850, target: targetCalories, date: format(subDays(new Date(), 2), 'yyyy-MM-dd') },
    { name: 'Sat', value: 2000, target: targetCalories, date: format(subDays(new Date(), 1), 'yyyy-MM-dd') },
    { name: 'Today', value: Math.round(todayProgress.calories), target: targetCalories, date: format(new Date(), 'yyyy-MM-dd') },
  ];

  const weeklyData = [
    { name: 'Week 1', value: 1920, target: targetCalories, date: format(subDays(new Date(), 21), 'yyyy-MM-dd') },
    { name: 'Week 2', value: 1985, target: targetCalories, date: format(subDays(new Date(), 14), 'yyyy-MM-dd') },
    { name: 'Week 3', value: 1876, target: targetCalories, date: format(subDays(new Date(), 7), 'yyyy-MM-dd') },
    { name: 'Week 4', value: 2050, target: targetCalories, date: format(new Date(), 'yyyy-MM-dd') },
  ];

  const monthlyData = [
    { name: 'Jan', value: 1890, target: targetCalories, date: '2024-01-01' },
    { name: 'Feb', value: 1950, target: targetCalories, date: '2024-02-01' },
    { name: 'Mar', value: 2020, target: targetCalories, date: '2024-03-01' },
  ];

  const getCurrentData = () => {
    switch (viewMode) {
      case 'weekly': return weeklyData;
      case 'monthly': return monthlyData;
      default: return dailyData;
    }
  };

  const getAverageIntake = () => {
    const data = getCurrentData();
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return Math.round(total / data.length);
  };

  const getGoalPercentage = () => {
    const average = getAverageIntake();
    return Math.round((average / targetCalories) * 100);
  };

  const getStatusMessage = () => {
    const percentage = getGoalPercentage();
    if (percentage >= 95 && percentage <= 105) return { message: "On track!", color: "text-green-600", icon: "🟢" };
    if (percentage >= 80 && percentage <= 120) return { message: "Slightly off target", color: "text-yellow-600", icon: "🟡" };
    return { message: "Needs attention!", color: "text-red-600", icon: "🔴" };
  };

  const status = getStatusMessage();

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clickedData = data.activePayload[0].payload;
      if (clickedData.date) {
        setSelectedDate(clickedData.date);
        setShowDayDetail(true);
      }
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border cursor-pointer">
          <p className="font-medium">{`${label}: ${payload[0].value} kcal`}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{`Target: ${targetCalories} kcal`}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">👆 Tap to see details</p>
        </div>
      );
    }
    return null;
  };

  // Health Report Mock Data
  const macroTrendsData = [
    { name: 'Mon', calories: 0, protein: 0, carbs: 0, fat: 0 },
    { name: 'Tue', calories: 0, protein: 0, carbs: 0, fat: 0 },
    { name: 'Wed', calories: 0, protein: 0, carbs: 0, fat: 0 },
    { name: 'Thu', calories: 0, protein: 0, carbs: 0, fat: 0 },
    { name: 'Fri', calories: 0, protein: 0, carbs: 0, fat: 0 },
    { name: 'Sat', calories: 0, protein: 0, carbs: 0, fat: 0 },
    { name: 'Sun', calories: 0, protein: 0, carbs: 0, fat: 0 },
  ];

  const micronutrientData = [
    { subject: 'Vitamin A', value: 0, fullMark: 100 },
    { subject: 'Vitamin C', value: 0, fullMark: 100 },
    { subject: 'Vitamin D', value: 0, fullMark: 100 },
    { subject: 'Iron', value: 0, fullMark: 100 },
    { subject: 'Calcium', value: 0, fullMark: 100 },
    { subject: 'B12', value: 0, fullMark: 100 },
  ];

  const toxinData = [
    { name: 'Seed Oils', value: 0, color: '#ef4444' },
    { name: 'Dyes', value: 0, color: '#f97316' },
    { name: 'Sweeteners', value: 0, color: '#eab308' },
  ];

  const moodNutritionData = [
    { name: 'Mon', mood: 0, nutrition: 0 },
    { name: 'Tue', mood: 0, nutrition: 0 },
    { name: 'Wed', mood: 0, nutrition: 0 },
    { name: 'Thu', mood: 0, nutrition: 0 },
    { name: 'Fri', mood: 0, nutrition: 0 },
    { name: 'Sat', mood: 0, nutrition: 0 },
    { name: 'Sun', mood: 0, nutrition: 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/analytics')}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
            <Flame className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>
              Calories Progress
            </h1>
            <p className="text-gray-600 dark:text-gray-300">Track your calorie intake over time</p>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <Card className="visible-card shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Status</h3>
              <p className={`text-2xl font-bold ${status.color} flex items-center space-x-2 mt-2`}>
                <span>{status.icon}</span>
                <span>{status.message}</span>
              </p>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Average: {getAverageIntake()} kcal ({getGoalPercentage()}% of goal)
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Daily Target</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{targetCalories}</p>
              <p className="text-xs text-gray-500">kcal</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle */}
      <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              viewMode === mode
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Progress Chart */}
      <Card className="visible-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-gray-900 dark:text-white">
            {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Calorie Intake
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={getCurrentData()} 
                onClick={handleChartClick}
                style={{ cursor: 'pointer' }}
              >
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine 
                  y={targetCalories} 
                  stroke="#F97316" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#F97316" 
                  strokeWidth={3}
                  dot={{ fill: '#F97316', strokeWidth: 2, r: 6, cursor: 'pointer' }}
                  activeDot={{ r: 8, stroke: '#F97316', strokeWidth: 2, cursor: 'pointer' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center items-center space-x-2 mt-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-4 h-0.5 bg-orange-500"></div>
            <span>Your intake</span>
            <div className="w-4 h-0.5 border-t-2 border-dashed border-orange-500"></div>
            <span>Target goal</span>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="visible-card shadow-md">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Highest</h4>
            <p className="text-xl font-bold text-green-600">
              {Math.max(...getCurrentData().map(d => d.value))} kcal
            </p>
          </CardContent>
        </Card>
        
        <Card className="visible-card shadow-md">
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Lowest</h4>
            <p className="text-xl font-bold text-blue-600">
              {Math.min(...getCurrentData().map(d => d.value))} kcal
            </p>
          </CardContent>
        </Card>
        
        <Card className="visible-card shadow-md">
          <CardContent className="p-4 text-center">
            <Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Average</h4>
            <p className="text-xl font-bold text-orange-600">
              {getAverageIntake()} kcal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 🧾 Your Health Report */}
      <Card className="visible-card shadow-lg mt-8">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle className="text-gray-900 dark:text-white">🧾 Your Health Report</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Comprehensive Weekly & Monthly Breakdown by NutriCoach AI
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="weekly" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="weekly">Weekly Report</TabsTrigger>
              <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
            </TabsList>
            
            <TabsContent value="weekly" className="space-y-6 mt-6">
              <ScrollArea className={`${isMobile ? 'h-96' : 'h-[500px]'} w-full pr-4`}>
                <div className="space-y-6">
                  
                  {/* Summary Card */}
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📊 Summary</h3>
                      <div className="space-y-2 text-sm">
                        <p className="text-gray-600 dark:text-gray-400">You logged <span className="font-semibold text-blue-600">0 meals</span> this week</p>
                        <p className="text-gray-600 dark:text-gray-400">Nutrition score: <span className="font-semibold text-orange-600">0%</span></p>
                        <p className="text-gray-600 dark:text-gray-400">Goal streak: <span className="font-semibold text-green-600">0 days</span></p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Macro Trends Chart */}
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Macro Trends
                      </h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={macroTrendsData}>
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="calories" stroke="#f97316" strokeWidth={2} />
                            <Line type="monotone" dataKey="protein" stroke="#3b82f6" strokeWidth={2} />
                            <Line type="monotone" dataKey="carbs" stroke="#22c55e" strokeWidth={2} />
                            <Line type="monotone" dataKey="fat" stroke="#ef4444" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center space-x-4 text-xs mt-2">
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-0.5 bg-orange-500"></div>
                          <span>Calories</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-0.5 bg-blue-500"></div>
                          <span>Protein</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-0.5 bg-green-500"></div>
                          <span>Carbs</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-0.5 bg-red-500"></div>
                          <span>Fat</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Micronutrient Radar Chart */}
                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🔬 Micronutrient Radar Chart</h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={micronutrientData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                            <Radar name="Nutrients" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-center text-xs text-gray-500 mt-2">All micronutrients at 0% - start logging to see progress!</p>
                    </CardContent>
                  </Card>

                  {/* Toxins & Flags */}
                  <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                        <Shield className="h-4 w-4 mr-2" />
                        Toxins & Flags
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        You logged <span className="font-semibold text-red-600">0 flagged foods</span> this week
                      </p>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={toxinData}>
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {toxinData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Mood vs. Nutrition Correlation */}
                  <Card className="border-l-4 border-l-pink-500">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                        <Brain className="h-4 w-4 mr-2" />
                        Mood vs. Nutrition Correlation
                      </h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={moodNutritionData}>
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="mood" stroke="#ec4899" strokeWidth={2} name="Mood Rating" />
                            <Line type="monotone" dataKey="nutrition" stroke="#06b6d4" strokeWidth={2} name="Nutrition Score" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center space-x-4 text-xs mt-2">
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-0.5 bg-pink-500"></div>
                          <span>Mood Rating</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-0.5 bg-cyan-500"></div>
                          <span>Nutrition Score</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Supplement Snapshot */}
                  <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                        <Pill className="h-4 w-4 mr-2" />
                        Supplement Snapshot
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        You used <span className="font-semibold text-amber-600">0 supplements</span> this week
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          No supplement data to display. Start logging your supplements to see insights!
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Logged Foods */}
                  <Card className="border-l-4 border-l-emerald-500">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🥗 Top Logged Foods</h3>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          No foods logged yet. Start tracking your meals to see your favorites!
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Consistency Score & Badge */}
                  <Card className="border-l-4 border-l-yellow-500">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                        <Trophy className="h-4 w-4 mr-2" />
                        Consistency Score & Badge
                      </h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Your weekly consistency was <span className="font-semibold text-yellow-600">0%</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Start logging consistently to unlock badges!</p>
                        </div>
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-2">
                            <Lock className="h-6 w-6 text-gray-400" />
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            🥉 Bronze Locked
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* AI Summary */}
                  <Card className="border-l-4 border-l-indigo-500">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                        <Brain className="h-4 w-4 mr-2" />
                        🤖 AI Summary
                      </h3>
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Not enough data this week to generate insights. Log more meals, track your mood, and record supplements to activate AI Summary.
                        </p>
                        <Button variant="outline" size="sm" className="mt-3">
                          Start Logging →
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="monthly" className="space-y-6 mt-6">
              <ScrollArea className={`${isMobile ? 'h-96' : 'h-[500px]'} w-full pr-4`}>
                <div className="space-y-6">
                  
                  {/* Monthly Summary Card */}
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📊 Monthly Summary</h3>
                      <div className="space-y-2 text-sm">
                        <p className="text-gray-600 dark:text-gray-400">You logged <span className="font-semibold text-blue-600">0 meals</span> this month</p>
                        <p className="text-gray-600 dark:text-gray-400">Monthly nutrition score: <span className="font-semibold text-orange-600">0%</span></p>
                        <p className="text-gray-600 dark:text-gray-400">Longest streak: <span className="font-semibold text-green-600">0 days</span></p>
                        <p className="text-gray-600 dark:text-gray-400">Active days: <span className="font-semibold text-purple-600">0/30</span></p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Monthly placeholder content with same structure but different timeframe */}
                  <Card className="border-l-4 border-l-indigo-500">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📈 Monthly Trends</h3>
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          Monthly analysis will appear here once you have more data
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Track for at least 7 days to unlock monthly insights
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Day Detail Modal */}
      <DayDetailModal
        isOpen={showDayDetail}
        onClose={() => setShowDayDetail(false)}
        selectedDate={selectedDate}
        onEditMeal={(mealId) => {
          // Future: Navigate to meal edit page
          console.log('Edit meal:', mealId);
        }}
        onViewDay={(date) => {
          // Future: Navigate to daily summary page
          console.log('View full day:', date);
          setShowDayDetail(false);
        }}
      />
    </div>
  );
};

export default ProgressCalories;
