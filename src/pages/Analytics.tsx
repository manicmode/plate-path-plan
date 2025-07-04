
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNutrition } from '@/contexts/NutritionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIsMobile } from '@/hooks/use-mobile';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Target, Calendar, Award } from 'lucide-react';

const Analytics = () => {
  const { currentDay, weeklyData, getTodaysProgress } = useNutrition();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Use the scroll-to-top hook
  useScrollToTop();

  const progress = getTodaysProgress();
  
  // Prepare data for the weekly overview chart using weeklyData
  const weeklyChartData = weeklyData.slice(-7).map((day, index) => ({
    day: `Day ${index + 1}`,
    calories: day.totalCalories,
    protein: day.totalProtein,
    carbs: day.totalCarbs,
    fat: day.totalFat,
    target: user?.targetCalories || 2000
  }));

  // Calculate weekly averages
  const weeklyAverage = {
    calories: weeklyChartData.reduce((sum, day) => sum + day.calories, 0) / (weeklyChartData.length || 1),
    protein: weeklyChartData.reduce((sum, day) => sum + day.protein, 0) / (weeklyChartData.length || 1),
    carbs: weeklyChartData.reduce((sum, day) => sum + day.carbs, 0) / (weeklyChartData.length || 1),
    fat: weeklyChartData.reduce((sum, day) => sum + day.fat, 0) / (weeklyChartData.length || 1),
  };

  // Today's macronutrient distribution
  const macroData = [
    { name: 'Protein', value: progress.protein, color: '#3B82F6' },
    { name: 'Carbs', value: progress.carbs, color: '#F59E0B' },
    { name: 'Fat', value: progress.fat, color: '#10B981' },
  ];

  // Hydration data
  const hydrationData = [
    { name: 'Completed', value: progress.hydration, color: '#06B6D4' },
    { name: 'Remaining', value: Math.max(0, (user?.targetHydration || 2000) - progress.hydration), color: '#E5E7EB' },
  ];

  const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#06B6D4', '#E5E7EB'];

  return (
    <div className={`space-y-6 animate-fade-in ${isMobile ? 'pb-8' : ''}`}>
      {/* Page Header */}
      <div className="text-center space-y-2">
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent`}>
          Progress Analytics
        </h1>
        <p className={`text-emerald-600 dark:text-emerald-400 font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>
          Track your nutrition journey over time
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className={`grid grid-cols-2 ${isMobile ? 'gap-3' : 'gap-4'}`}>
        <Card className="glass-card border-0 rounded-3xl">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'} text-center`}>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>
                  {weeklyAverage.calories.toFixed(0)}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                  Avg Daily Calories
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 rounded-3xl">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'} text-center`}>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>
                  {weeklyAverage.protein.toFixed(0)}g
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                  Avg Daily Protein
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Progress Chart */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className={`${isMobile ? 'p-4 pb-2' : 'p-6 pb-4'}`}>
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} text-gray-900 dark:text-white flex items-center gap-2`}>
            <Calendar className="h-5 w-5" />
            Weekly Overview
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-4 pt-0' : 'p-6 pt-0'}`}>
          <div className={`${isMobile ? 'h-48' : 'h-64'}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="calories" fill="#3B82F6" name="Calories" />
                <Bar dataKey="target" fill="#E5E7EB" name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Macronutrient Distribution */}
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6'}`}>
        <Card className="glass-card border-0 rounded-3xl">
          <CardHeader className={`${isMobile ? 'p-4 pb-2' : 'p-6 pb-4'}`}>
            <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} text-gray-900 dark:text-white`}>
              Today's Macros
            </CardTitle>
          </CardHeader>
          <CardContent className={`${isMobile ? 'p-4 pt-0' : 'p-6 pt-0'}`}>
            <div className={`${isMobile ? 'h-48' : 'h-64'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macroData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}g`}
                  >
                    {macroData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 rounded-3xl">
          <CardHeader className={`${isMobile ? 'p-4 pb-2' : 'p-6 pb-4'}`}>
            <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} text-gray-900 dark:text-white`}>
              Hydration Progress
            </CardTitle>
          </CardHeader>
          <CardContent className={`${isMobile ? 'p-4 pt-0' : 'p-6 pt-0'}`}>
            <div className={`${isMobile ? 'h-48' : 'h-64'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={hydrationData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {hydrationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievement Section */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className={`${isMobile ? 'p-4 pb-2' : 'p-6 pb-4'}`}>
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} text-gray-900 dark:text-white flex items-center gap-2`}>
            <Award className="h-5 w-5" />
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-4 pt-0' : 'p-6 pt-0'}`}>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🎯</span>
              </div>
              <div>
                <p className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-900 dark:text-white`}>Consistency Streak</p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>7 days of logging meals</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">💪</span>
              </div>
              <div>
                <p className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-900 dark:text-white`}>Protein Goal</p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>Hit protein target 5 days this week</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
