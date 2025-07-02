
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Zap, Target, Calendar, Award, Flame, Droplets, Pill } from 'lucide-react';
import { useNutrition } from '@/contexts/NutritionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const Analytics = () => {
  const { getTodaysProgress } = useNutrition();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const todayProgress = getTodaysProgress();

  // Mock historical data for demonstration
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
  const targetHydration = 8; // glasses
  const targetSupplements = 3; // pills

  // Mock current values for hydration and supplements
  const currentHydration = 5;
  const currentSupplements = 2;

  // Primary trackers data
  const primaryTrackers = [
    {
      title: 'Calories',
      current: Math.round(todayProgress.calories),
      target: targetCalories,
      percentage: Math.min((todayProgress.calories / targetCalories) * 100, 100),
      icon: Flame,
      color: 'calories',
      gradient: 'from-orange-400 to-red-500',
      unit: 'kcal'
    },
    {
      title: 'Hydration',
      current: currentHydration,
      target: targetHydration,
      percentage: Math.min((currentHydration / targetHydration) * 100, 100),
      icon: Droplets,
      color: 'hydration',
      gradient: 'from-cyan-400 to-blue-500',
      unit: 'glasses'
    },
    {
      title: 'Supplements',
      current: currentSupplements,
      target: targetSupplements,
      percentage: Math.min((currentSupplements / targetSupplements) * 100, 100),
      icon: Pill,
      color: 'supplements',
      gradient: 'from-purple-400 to-pink-500',
      unit: 'pills'
    },
  ];

  // Secondary stats
  const secondaryStats = [
    {
      title: 'Protein',
      value: Math.round(todayProgress.protein),
      target: targetProtein,
      icon: Target,
      trend: todayProgress.protein > weeklyProtein ? 'up' : 'down',
      color: 'from-emerald-400 to-emerald-600',
      unit: 'g'
    },
    {
      title: 'Days Tracked',
      value: 7,
      target: 30,
      icon: Calendar,
      trend: 'up',
      color: 'from-blue-400 to-blue-600',
      unit: 'days'
    },
    {
      title: 'Goal Achievement',
      value: Math.round((todayProgress.calories / targetCalories) * 100),
      target: 100,
      icon: Award,
      trend: 'up',
      color: 'from-violet-400 to-violet-600',
      unit: '%'
    },
  ];

  // Chart data
  const weeklyChartData = mockWeeklyData.map((day, index) => ({
    day: `Day ${index + 1}`,
    calories: Math.round(day.calories),
    protein: Math.round(day.protein),
  }));

  const macroData = [
    { name: 'Protein', value: todayProgress.protein, color: '#3B82F6' },
    { name: 'Carbs', value: todayProgress.carbs, color: '#F59E0B' },
    { name: 'Fat', value: todayProgress.fat, color: '#8B5CF6' },
  ];

  // Circular progress component
  const CircularProgress = ({ percentage, size = 120, strokeWidth = 8, color = 'calories' }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className={`${
              color === 'calories' ? 'text-orange-500' :
              color === 'hydration' ? 'text-cyan-500' :
              'text-purple-500'
            } transition-all duration-1000 ease-out ${color}-ring-glow`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              strokeLinecap: 'round',
            }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold neon-text`}>
              {Math.round(percentage)}%
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-3 sm:space-y-4">
        <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} gradient-primary rounded-3xl flex items-center justify-center mx-auto neon-glow`}>
          <TrendingUp className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white`} />
        </div>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold neon-text`}>Analytics</h1>
          <p className={`text-gray-600 dark:text-gray-300 font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>Track your nutrition journey</p>
        </div>
      </div>

      {/* Primary Progress Trackers */}
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-3 gap-6'}`}>
        {primaryTrackers.map((tracker, index) => {
          const Icon = tracker.icon;
          return (
            <div key={tracker.title} className={`modern-tracker-card ${tracker.color}-tracker rounded-3xl p-6 text-center animate-slide-up`} style={{ animationDelay: `${index * 100}ms` }}>
              <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} bg-gradient-to-r ${tracker.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 neon-glow`}>
                <Icon className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
              </div>
              
              <div className="mb-4">
                <CircularProgress 
                  percentage={tracker.percentage} 
                  size={isMobile ? 100 : 120} 
                  color={tracker.color}
                />
              </div>
              
              <h3 className={`font-bold text-gray-900 dark:text-white mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                {tracker.title}
              </h3>
              <p className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-sm' : 'text-base'}`}>
                <span className="font-semibold">{tracker.current}</span>
                <span className="mx-1">/</span>
                <span>{tracker.target}</span>
                <span className="ml-1 text-xs">{tracker.unit}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Secondary Stats Grid */}
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-4'}`}>
        {secondaryStats.map((stat, index) => {
          const Icon = stat.icon;
          const percentage = Math.min((stat.value / stat.target) * 100, 100);
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
          
          return (
            <Card key={stat.title} className="modern-nutrient-card border-0 rounded-2xl animate-slide-up" style={{ animationDelay: `${300 + index * 100}ms` }}>
              <CardContent className={`${isMobile ? 'p-4' : 'p-5'} text-center`}>
                <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-3 neon-glow`}>
                  <Icon className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
                </div>
                <h3 className={`font-semibold text-gray-900 dark:text-white mb-1 ${isMobile ? 'text-sm' : 'text-base'}`}>{stat.title}</h3>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold neon-text mb-2`}>{stat.value}{stat.unit}</p>
                <div className="flex items-center justify-center space-x-1 mb-2">
                  <TrendIcon className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`bg-gradient-to-r ${stat.color} h-2 rounded-full transition-all duration-700`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Weekly Calories Chart */}
      <Card className="modern-action-card border-0 rounded-3xl animate-slide-up" style={{ animationDelay: '600ms' }}>
        <CardHeader className={`${isMobile ? 'pb-2' : 'pb-4'}`}>
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} text-gray-900 dark:text-white text-center`}>Weekly Progress</CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-3' : 'p-6'}`}>
          <div className={`${isMobile ? 'h-48' : 'h-64'} w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: isMobile ? 11 : 12, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  hide={isMobile}
                  tick={{ fontSize: isMobile ? 10 : 12, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Bar 
                  dataKey="calories" 
                  fill="url(#calorieGradient)" 
                  radius={[6, 6, 0, 0]}
                />
                <defs>
                  <linearGradient id="calorieGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#EA580C" stopOpacity={0.7}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Today's Macros */}
      <Card className="modern-action-card border-0 rounded-3xl animate-slide-up" style={{ animationDelay: '700ms' }}>
        <CardHeader className={`${isMobile ? 'pb-2' : 'pb-4'}`}>
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} text-gray-900 dark:text-white text-center`}>Today's Macros</CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-3' : 'p-6'}`}>
          <div className={`${isMobile ? 'h-40' : 'h-56'} w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={macroData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 30 : 50}
                  outerRadius={isMobile ? 60 : 90}
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
          <div className={`flex justify-center space-x-6 mt-4`}>
            {macroData.map((macro) => (
              <div key={macro.name} className="flex items-center space-x-2">
                <div 
                  className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} rounded-full`}
                  style={{ backgroundColor: macro.color }}
                ></div>
                <span className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-700 dark:text-gray-300 font-medium`}>
                  {macro.name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="modern-action-card border-0 rounded-3xl animate-slide-up" style={{ animationDelay: '800ms' }}>
        <CardHeader className={`${isMobile ? 'pb-2' : 'pb-4'}`}>
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} text-gray-900 dark:text-white text-center`}>Recent Achievements</CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'} space-y-3`}>
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <span className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-700 dark:text-gray-300 font-medium`}>Weekly Streak</span>
            <Badge variant="default" className={`${isMobile ? 'text-xs' : 'text-sm'} bg-emerald-500`}>7 days</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <span className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-700 dark:text-gray-300 font-medium`}>Average Calories</span>
            <Badge variant="secondary" className={`${isMobile ? 'text-xs' : 'text-sm'}`}>{Math.round(weeklyCalories)}</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <span className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-700 dark:text-gray-300 font-medium`}>Goal Achievement</span>
            <Badge 
              variant={Math.round((todayProgress.calories / targetCalories) * 100) >= 80 ? "default" : "secondary"}
              className={`${isMobile ? 'text-xs' : 'text-sm'}`}
            >
              {Math.round((todayProgress.calories / targetCalories) * 100)}%
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
