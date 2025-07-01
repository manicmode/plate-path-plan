
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, Target, Award, Calendar, Zap, Droplets, Pill, Users, Star, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';

const Analytics = () => {
  const { user } = useAuth();
  const { getTodaysProgress } = useNutrition();
  const progress = getTodaysProgress();

  // Mock data for different time periods
  const dailyData = [
    { time: '6AM', calories: 0, protein: 0, carbs: 0, fat: 0, hydration: 0 },
    { time: '9AM', calories: 450, protein: 25, carbs: 45, fat: 15, hydration: 250 },
    { time: '12PM', calories: 850, protein: 65, carbs: 95, fat: 28, hydration: 750 },
    { time: '3PM', calories: 1200, protein: 90, carbs: 130, fat: 35, hydration: 1200 },
    { time: '6PM', calories: 1650, protein: 115, carbs: 165, fat: 50, hydration: 1500 },
    { time: '9PM', calories: progress.calories, protein: progress.protein, carbs: progress.carbs, fat: progress.fat, hydration: progress.hydration },
  ];

  const weeklyData = [
    { day: 'Mon', calories: 1850, protein: 120, carbs: 180, fat: 60, hydration: 2100, supplements: 3 },
    { day: 'Tue', calories: 2100, protein: 140, carbs: 220, fat: 70, hydration: 2300, supplements: 2 },
    { day: 'Wed', calories: 1950, protein: 135, carbs: 190, fat: 65, hydration: 1900, supplements: 3 },
    { day: 'Thu', calories: 2050, protein: 145, carbs: 200, fat: 68, hydration: 2200, supplements: 3 },
    { day: 'Fri', calories: 1900, protein: 130, carbs: 185, fat: 62, hydration: 2000, supplements: 2 },
    { day: 'Sat', calories: 2200, protein: 150, carbs: 240, fat: 75, hydration: 2400, supplements: 1 },
    { day: 'Sun', calories: progress.calories, protein: progress.protein, carbs: progress.carbs, fat: progress.fat, hydration: progress.hydration, supplements: progress.supplements },
  ];

  const monthlyData = [
    { week: 'Week 1', avgCalories: 1950, avgProtein: 135, avgCarbs: 190, avgFat: 65, avgHydration: 2100 },
    { week: 'Week 2', avgCalories: 2050, avgProtein: 142, avgCarbs: 205, avgFat: 68, avgHydration: 2200 },
    { week: 'Week 3', avgCalories: 1980, avgProtein: 138, avgCarbs: 195, avgFat: 66, avgHydration: 2050 },
    { week: 'Week 4', avgCalories: 2020, avgProtein: 140, avgCarbs: 200, avgFat: 67, avgHydration: 2150 },
  ];

  const macroDistribution = [
    { name: 'Protein', value: progress.protein * 4, color: '#3B82F6', percentage: Math.round((progress.protein * 4 / progress.calories) * 100) || 0 },
    { name: 'Carbs', value: progress.carbs * 4, color: '#F59E0B', percentage: Math.round((progress.carbs * 4 / progress.calories) * 100) || 0 },
    { name: 'Fat', value: progress.fat * 9, color: '#8B5CF6', percentage: Math.round((progress.fat * 9 / progress.calories) * 100) || 0 },
  ];

  const achievements = [
    { title: 'Consistent Logger', description: '7 days in a row', icon: Award, earned: true, progress: 100 },
    { title: 'Protein Master', description: 'Hit protein target 5x', icon: Target, earned: true, progress: 100 },
    { title: 'Hydration Hero', description: 'Perfect hydration 3x', icon: Droplets, earned: false, progress: 60 },
    { title: 'Balanced Eater', description: 'Balanced macros 3x', icon: TrendingUp, earned: false, progress: 40 },
    { title: 'Supplement Streak', description: 'Never missed supplements', icon: Pill, earned: true, progress: 100 },
  ];

  const goalProgress = [
    {
      name: 'Calories',
      current: progress.calories,
      target: user?.targetCalories || 2000,
      unit: '',
      color: 'from-emerald-400 to-emerald-600',
      icon: Zap,
    },
    {
      name: 'Protein',
      current: progress.protein,
      target: user?.targetProtein || 150,
      unit: 'g',
      color: 'from-blue-400 to-blue-600',
      icon: Target,
    },
    {
      name: 'Hydration',
      current: progress.hydration,
      target: 2000,
      unit: 'ml',
      color: 'from-cyan-400 to-blue-600',
      icon: Droplets,
    },
    {
      name: 'Supplements',
      current: progress.supplements,
      target: 3,
      unit: '',
      color: 'from-purple-500 to-pink-600',
      icon: Pill,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2">
          Analytics Dashboard
        </h1>
        <p className="text-emerald-600 dark:text-emerald-400 font-semibold">Track your nutrition progress and insights</p>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {goalProgress.map((goal, index) => {
          const percentage = Math.min((goal.current / goal.target) * 100, 100);
          const Icon = goal.icon;
          
          return (
            <Card key={goal.name} className="visible-card border-0 animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
              <CardContent className="p-4">
                <div className="text-center space-y-3">
                  <div className={`w-10 h-10 bg-gradient-to-r ${goal.color} rounded-xl flex items-center justify-center mx-auto neon-glow`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-emerald-600 dark:text-emerald-400">{goal.name}</h3>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold neon-text">
                      {goal.current.toFixed(0)}{goal.unit}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      of {goal.target}{goal.unit}
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{percentage.toFixed(0)}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Time-based Analytics Tabs */}
      <Card className="visible-card border-0 animate-slide-up" style={{ animationDelay: '400ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <span className="text-emerald-600 dark:text-emerald-400">Progress Tracking</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
            
            <TabsContent value="daily" className="space-y-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="calories" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="protein" stackId="2" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="weekly" className="space-y-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="calories" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="protein" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="monthly" className="space-y-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgCalories" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }} />
                    <Line type="monotone" dataKey="avgProtein" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Macro Distribution & Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="visible-card border-0 animate-slide-up" style={{ animationDelay: '500ms' }}>
          <CardHeader>
            <CardTitle className="text-emerald-600 dark:text-emerald-400">Today's Macro Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macroDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                  >
                    {macroDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} calories`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              {macroDistribution.map((macro) => (
                <div key={macro.name} className="text-center">
                  <div className="w-4 h-4 rounded-full mx-auto mb-2" style={{ backgroundColor: macro.color }}></div>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{macro.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{macro.percentage}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="visible-card border-0 animate-slide-up" style={{ animationDelay: '600ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <span className="text-emerald-600 dark:text-emerald-400">Achievements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {achievements.map((achievement, index) => {
                const Icon = achievement.icon;
                return (
                  <div
                    key={achievement.title}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      achievement.earned 
                        ? 'bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border-emerald-200 dark:border-emerald-700' 
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        achievement.earned 
                          ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white neon-glow' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-emerald-600 dark:text-emerald-400">{achievement.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{achievement.description}</p>
                        <div className="flex items-center space-x-2">
                          <Progress value={achievement.progress} className="h-2 flex-1" />
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{achievement.progress}%</span>
                        </div>
                      </div>
                      {achievement.earned && (
                        <Badge className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white">Earned</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Weekly Nutrient Trends */}
      <Card className="visible-card border-0 animate-slide-up" style={{ animationDelay: '700ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span className="text-emerald-600 dark:text-emerald-400">Weekly Nutrient Trends</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="protein" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }} />
                <Line type="monotone" dataKey="carbs" stroke="#F59E0B" strokeWidth={3} dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }} />
                <Line type="monotone" dataKey="fat" stroke="#8B5CF6" strokeWidth={3} dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }} />
                <Line type="monotone" dataKey="hydration" stroke="#06B6D4" strokeWidth={2} dot={{ fill: '#06B6D4', strokeWidth: 2, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Protein</p>
            </div>
            <div className="text-center">
              <div className="w-4 h-4 bg-orange-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Carbs</p>
            </div>
            <div className="text-center">
              <div className="w-4 h-4 bg-purple-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Fat</p>
            </div>
            <div className="text-center">
              <div className="w-4 h-4 bg-cyan-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Hydration</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goal vs Reality Comparison */}
      <Card className="visible-card border-0 animate-slide-up" style={{ animationDelay: '800ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span className="text-emerald-600 dark:text-emerald-400">Goal Achievement Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-bold text-emerald-600 dark:text-emerald-400">This Week's Performance</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Average Daily Calories</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">2,020</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Goal Achievement</span>
                  <Badge className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white">95%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Consistency Score</span>
                  <Badge className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white">Excellent</Badge>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-emerald-600 dark:text-emerald-400">Improvement Areas</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Increase fiber intake</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">More consistent hydration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Evening meal timing</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
