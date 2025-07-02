
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Zap, Target, Calendar, Award } from 'lucide-react';
import { useNutrition } from '@/contexts/NutritionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const Analytics = () => {
  const { getTodaysProgress } = useNutrition();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const todayProgress = getTodaysProgress();

  // Mock historical data for demonstration since we don't have getAllLogs
  const mockWeeklyData = [
    { calories: 1800, protein: 120, carbs: 180, fat: 80 },
    { calories: 2100, protein: 140, carbs: 200, fat: 90 },
    { calories: 1950, protein: 130, carbs: 190, fat: 85 },
    { calories: 2200, protein: 150, carbs: 210, fat: 95 },
    { calories: 1850, protein: 125, carbs: 175, fat: 80 },
    { calories: 2000, protein: 135, carbs: 185, fat: 88 },
    { calories: todayProgress.calories, protein: todayProgress.protein, carbs: todayProgress.carbs, fat: todayProgress.fat },
  ];

  // Calculate weekly averages
  const weeklyCalories = mockWeeklyData.reduce((sum, day) => sum + day.calories, 0) / 7;
  const weeklyProtein = mockWeeklyData.reduce((sum, day) => sum + day.protein, 0) / 7;

  const targetCalories = user?.targetCalories || 2000;
  const targetProtein = user?.targetProtein || 150;

  // Prepare chart data
  const weeklyData = mockWeeklyData.map((day, index) => ({
    day: `Day ${index + 1}`,
    calories: Math.round(day.calories),
    protein: Math.round(day.protein),
  }));

  const macroData = [
    { name: 'Protein', value: todayProgress.protein, color: '#3B82F6' },
    { name: 'Carbs', value: todayProgress.carbs, color: '#F59E0B' },
    { name: 'Fat', value: todayProgress.fat, color: '#8B5CF6' },
  ];

  const stats = [
    {
      title: 'Today\'s Calories',
      value: Math.round(todayProgress.calories),
      target: targetCalories,
      icon: Zap,
      trend: todayProgress.calories > weeklyCalories ? 'up' : 'down',
      color: 'from-emerald-400 to-emerald-600'
    },
    {
      title: 'Protein Intake',
      value: Math.round(todayProgress.protein),
      target: targetProtein,
      icon: Target,
      trend: todayProgress.protein > weeklyProtein ? 'up' : 'down',
      color: 'from-blue-400 to-blue-600'
    },
    {
      title: 'Days Tracked',
      value: 7, // Mock value
      target: 30,
      icon: Calendar,
      trend: 'up',
      color: 'from-purple-400 to-purple-600'
    },
    {
      title: 'Goal Achievement',
      value: Math.round((todayProgress.calories / targetCalories) * 100),
      target: 100,
      icon: Award,
      trend: 'up',
      color: 'from-orange-400 to-orange-600'
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2 sm:space-y-4">
        <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} gradient-primary rounded-3xl flex items-center justify-center mx-auto neon-glow`}>
          <TrendingUp className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white`} />
        </div>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold neon-text`}>Analytics</h1>
          <p className={`text-gray-600 dark:text-gray-300 font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>Track your nutrition journey</p>
        </div>
      </div>

      {/* Stats Grid - Mobile Optimized */}
      <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-4 gap-4'}`}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const percentage = Math.min((stat.value / stat.target) * 100, 100);
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
          
          return (
            <Card key={stat.title} className="visible-card border-0 rounded-2xl animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
              <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
                <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-2 neon-glow`}>
                  <Icon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-white`} />
                </div>
                <h3 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-xs' : 'text-sm'}`}>{stat.title}</h3>
                <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold neon-text`}>{stat.value}</p>
                <div className="flex items-center justify-center space-x-1 mt-1">
                  <TrendIcon className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                  <div
                    className={`bg-gradient-to-r ${stat.color} h-1.5 rounded-full transition-all duration-700`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Weekly Calories Chart - Mobile Optimized */}
      <Card className="visible-card border-0 rounded-3xl animate-slide-up" style={{ animationDelay: '400ms' }}>
        <CardHeader className={`${isMobile ? 'pb-2' : 'pb-4'}`}>
          <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} text-gray-900 dark:text-white text-center`}>Weekly Calories</CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-2' : 'p-4'}`}>
          <div className={`${isMobile ? 'h-40' : 'h-64'} w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  hide={isMobile}
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Bar 
                  dataKey="calories" 
                  fill="url(#calorieGradient)" 
                  radius={[4, 4, 0, 0]}
                />
                <defs>
                  <linearGradient id="calorieGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C896" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#2E8BFF" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Today's Macros - Mobile Optimized */}
      <Card className="visible-card border-0 rounded-3xl animate-slide-up" style={{ animationDelay: '500ms' }}>
        <CardHeader className={`${isMobile ? 'pb-2' : 'pb-4'}`}>
          <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} text-gray-900 dark:text-white text-center`}>Today's Macros</CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-2' : 'p-4'}`}>
          <div className={`${isMobile ? 'h-32' : 'h-48'} w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={macroData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 20 : 40}
                  outerRadius={isMobile ? 50 : 80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {macroData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className={`flex justify-center space-x-4 mt-2`}>
            {macroData.map((macro) => (
              <div key={macro.name} className="flex items-center space-x-1">
                <div 
                  className={`${isMobile ? 'w-2 h-2' : 'w-3 h-3'} rounded-full`}
                  style={{ backgroundColor: macro.color }}
                ></div>
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-300`}>
                  {macro.name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievements - Mobile Optimized */}
      <Card className="visible-card border-0 rounded-3xl animate-slide-up" style={{ animationDelay: '600ms' }}>
        <CardHeader className={`${isMobile ? 'pb-2' : 'pb-4'}`}>
          <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} text-gray-900 dark:text-white text-center`}>Recent Achievements</CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-3' : 'p-4'} space-y-2`}>
          <div className="flex items-center justify-between">
            <span className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-700 dark:text-gray-300`}>Days Tracked</span>
            <Badge variant="secondary" className={`${isMobile ? 'text-xs' : 'text-sm'}`}>7 days</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-700 dark:text-gray-300`}>Average Calories</span>
            <Badge variant="secondary" className={`${isMobile ? 'text-xs' : 'text-sm'}`}>{Math.round(weeklyCalories)}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-700 dark:text-gray-300`}>Protein Goal Rate</span>
            <Badge 
              variant={todayProgress.protein >= targetProtein ? "default" : "secondary"}
              className={`${isMobile ? 'text-xs' : 'text-sm'}`}
            >
              {Math.round((todayProgress.protein / targetProtein) * 100)}%
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
