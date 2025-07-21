import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, Flame, Dumbbell, Zap, Target, Droplets, Pill, FileText, BarChart3, Shield, Brain, Trophy, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, Cell } from 'recharts';

const Progress = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { getTodaysProgress } = useNutrition();
  
  // Use the scroll-to-top hook
  useScrollToTop();
  
  const todayProgress = getTodaysProgress();
  
  // Progress cards data
  const progressCards = [
    {
      title: 'Calories',
      icon: Flame,
      current: Math.round(todayProgress.calories),
      target: user?.targetCalories || 2000,
      unit: 'kcal',
      color: 'orange',
      route: '/progress/calories'
    },
    {
      title: 'Protein',
      icon: Dumbbell,
      current: Math.round(todayProgress.protein),
      target: user?.targetProtein || 150,
      unit: 'g',
      color: 'blue',
      route: '/progress/protein'
    },
    {
      title: 'Carbs',
      icon: Zap,
      current: Math.round(todayProgress.carbs),
      target: user?.targetCarbs || 200,
      unit: 'g',
      color: 'yellow',
      route: '/progress/carbs'
    },
    {
      title: 'Fat',
      icon: Target,
      current: Math.round(todayProgress.fat),
      target: user?.targetFat || 65,
      unit: 'g',
      color: 'purple',
      route: '/progress/fat'
    },
    {
      title: 'Hydration',
      icon: Droplets,
      current: Math.round(todayProgress.hydration || 0),
      target: user?.targetHydration || 8,
      unit: 'glasses',
      color: 'cyan',
      route: '/progress/hydration'
    },
    {
      title: 'Supplements',
      icon: Pill,
      current: Math.round(todayProgress.supplements || 0),
      target: user?.targetSupplements || 3,
      unit: 'taken',
      color: 'green',
      route: '/progress/supplements'
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      orange: 'from-orange-400 to-red-500',
      blue: 'from-blue-400 to-blue-600',
      yellow: 'from-yellow-400 to-amber-500',
      purple: 'from-purple-400 to-violet-600',
      cyan: 'from-cyan-400 to-blue-500',
      green: 'from-green-400 to-emerald-500'
    };
    return colorMap[color as keyof typeof colorMap] || 'from-gray-400 to-gray-600';
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
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
    <div className="min-h-screen overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 dark:text-white`}>
            Progress Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Track your nutrition and health metrics over time
          </p>
        </div>

        {/* Progress Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {progressCards.map((card) => {
            const Icon = card.icon;
            const percentage = getProgressPercentage(card.current, card.target);
            
            return (
              <Card key={card.title} className="visible-card shadow-lg hover:shadow-xl transition-all cursor-pointer group" onClick={() => navigate(card.route)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 bg-gradient-to-r ${getColorClasses(card.color)} rounded-xl flex items-center justify-center`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-gray-900 dark:text-white">{card.title}</CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {card.current} / {card.target} {card.unit}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="font-medium text-gray-900 dark:text-white">{Math.round(percentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full bg-gradient-to-r ${getColorClasses(card.color)} transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 🧾 Your Health Report */}
        <Card className="visible-card shadow-lg">
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
                <div className="max-h-[600px] overflow-y-auto pr-4">
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
                </div>
              </TabsContent>
              
              <TabsContent value="monthly" className="space-y-6 mt-6">
                <div className="max-h-[600px] overflow-y-auto pr-4">
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
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Progress;
