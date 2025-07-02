
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Zap, Target, Calendar, Award, Flame, Droplets, Pill, Plus, BarChart3, Settings } from 'lucide-react';
import { useNutrition } from '@/contexts/NutritionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Analytics = () => {
  const { getTodaysProgress } = useNutrition();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const todayProgress = getTodaysProgress();

  const targetCalories = user?.targetCalories || 2000;
  const targetProtein = user?.targetProtein || 150;
  const targetCarbs = user?.targetCarbs || 200;
  const targetFat = user?.targetFat || 65;
  const targetHydration = user?.targetHydration || 8;
  const targetSupplements = user?.targetSupplements || 3;

  // Mock current values for hydration and supplements
  const currentHydration = 5;
  const currentSupplements = 2;

  // Mock weekly data for charts
  const weeklyChartData = [
    { day: 'Mon', calories: 1800, protein: 120 },
    { day: 'Tue', calories: 2100, protein: 140 },
    { day: 'Wed', calories: 1950, protein: 130 },
    { day: 'Thu', calories: 2200, protein: 150 },
    { day: 'Fri', calories: 1850, protein: 125 },
    { day: 'Sat', calories: 2000, protein: 135 },
    { day: 'Today', calories: Math.round(todayProgress.calories), protein: Math.round(todayProgress.protein) },
  ];

  const macroData = [
    { name: 'Protein', value: todayProgress.protein, color: '#3B82F6' },
    { name: 'Carbs', value: todayProgress.carbs, color: '#F59E0B' },
    { name: 'Fat', value: todayProgress.fat, color: '#8B5CF6' },
  ];

  // Circular progress component
  const CircularProgress = ({ percentage, size = 100, strokeWidth = 8, color = 'emerald' }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    const colorClasses = {
      emerald: 'text-emerald-500',
      orange: 'text-orange-500',
      blue: 'text-blue-500',
      purple: 'text-purple-500',
      yellow: 'text-yellow-500',
      pink: 'text-pink-500'
    };

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className={`${colorClasses[color]} transition-all duration-1000 ease-out`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              strokeLinecap: 'round',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>
              {Math.round(percentage)}%
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Action tabs component with improved styling
  const ActionTabs = ({ category, logPath, progressPath }: { category: string, logPath: string, progressPath: string }) => {
    const handleSetGoal = () => {
      navigate('/profile?edit=true&focus=' + category.toLowerCase());
    };

    const handleViewProgress = () => {
      navigate(`/progress/${category.toLowerCase()}`);
    };

    return (
      <div className="flex gap-2 px-1">
        <Button
          variant="outline"
          size={isMobile ? "sm" : "default"}
          onClick={() => navigate(logPath)}
          className="flex-1 h-9 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border-0 bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-xs">Log</span>
        </Button>
        <Button
          variant="outline"
          size={isMobile ? "sm" : "default"}
          onClick={handleSetGoal}
          className="flex-1 h-9 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border-0 bg-green-50/80 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-300 font-medium"
        >
          <Settings className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-xs">Goal</span>
        </Button>
        <Button
          variant="outline"
          size={isMobile ? "sm" : "default"}
          onClick={handleViewProgress}
          className="flex-1 h-9 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border-0 bg-purple-50/80 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium"
        >
          <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-xs">Progress</span>
        </Button>
      </div>
    );
  };

  // Tracker card component with integrated tabs
  const TrackerSection = ({ 
    icon, 
    title, 
    current, 
    target, 
    unit, 
    color, 
    category, 
    logPath, 
    progressPath 
  }: {
    icon: React.ReactNode;
    title: string;
    current: number;
    target: number;
    unit: string;
    color: string;
    category: string;
    logPath: string;
    progressPath: string;
  }) => (
    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-100/50 dark:border-gray-700/50">
      <Card className="visible-card shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0">
        <CardContent className="p-4 flex flex-col items-center justify-center min-h-[220px]">
          <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-2xl flex items-center justify-center neon-glow mb-3`}>
            {icon}
          </div>
          
          <CircularProgress 
            percentage={Math.min((current / target) * 100, 100)} 
            size={isMobile ? 70 : 85} 
            color={color}
          />
          
          <h3 className={`font-bold text-gray-900 dark:text-white mt-3 mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-center text-sm">
            <span className="font-semibold">{Math.round(current)}</span>
            <span className="mx-1">/</span>
            <span>{target}</span>
            <span className="ml-1 text-xs">{unit}</span>
          </p>
        </CardContent>
      </Card>
      
      <div className="mt-3">
        <ActionTabs category={category} logPath={logPath} progressPath={progressPath} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} gradient-primary rounded-3xl flex items-center justify-center mx-auto neon-glow`}>
          <TrendingUp className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white`} />
        </div>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 dark:text-white`}>Analytics</h1>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Track your nutrition journey</p>
        </div>
      </div>

      {/* Primary Progress Trackers with integrated tabs */}
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-5' : 'grid-cols-2 lg:grid-cols-3 gap-5'}`}>
        <TrackerSection
          icon={<Flame className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />}
          title="Calories"
          current={todayProgress.calories}
          target={targetCalories}
          unit="kcal"
          color="orange"
          category="Calories"
          logPath="/camera"
          progressPath="/analytics"
        />

        <TrackerSection
          icon={<Target className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />}
          title="Protein"
          current={todayProgress.protein}
          target={targetProtein}
          unit="g"
          color="emerald"
          category="Protein"
          logPath="/camera"
          progressPath="/analytics"
        />

        <TrackerSection
          icon={<Zap className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />}
          title="Carbs"
          current={todayProgress.carbs}
          target={targetCarbs}
          unit="g"
          color="yellow"
          category="Carbs"
          logPath="/camera"
          progressPath="/analytics"
        />

        <TrackerSection
          icon={<Target className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />}
          title="Fat"
          current={todayProgress.fat}
          target={targetFat}
          unit="g"
          color="purple"
          category="Fat"
          logPath="/camera"
          progressPath="/analytics"
        />

        <TrackerSection
          icon={<Droplets className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />}
          title="Hydration"
          current={currentHydration}
          target={targetHydration}
          unit="glasses"
          color="blue"
          category="Hydration"
          logPath="/hydration"
          progressPath="/analytics"
        />

        <TrackerSection
          icon={<Pill className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />}
          title="Supplements"
          current={currentSupplements}
          target={targetSupplements}
          unit="pills"
          color="pink"
          category="Supplements"
          logPath="/supplements"
          progressPath="/analytics"
        />
      </div>

      {/* Secondary Stats */}
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-3 gap-6'}`}>
        <Card className="visible-card shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6 text-center">
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 neon-glow`}>
              <Calendar className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Days Tracked</h3>
            <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-blue-600 dark:text-blue-400 mb-2`}>
              7 days
            </p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-700"
                style={{ width: '23%' }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="visible-card shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6 text-center">
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-gradient-to-r from-violet-400 to-violet-600 rounded-xl flex items-center justify-center mx-auto mb-3 neon-glow`}>
              <Award className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Goal Achievement</h3>
            <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-violet-600 dark:text-violet-400 mb-2`}>
              {Math.round((todayProgress.calories / targetCalories) * 100)}%
            </p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-violet-400 to-violet-600 h-2 rounded-full transition-all duration-700"
                style={{ width: `${Math.min((todayProgress.calories / targetCalories) * 100, 100)}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="visible-card shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6 text-center">
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3 neon-glow`}>
              <TrendingUp className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Weekly Average</h3>
            <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-emerald-600 dark:text-emerald-400 mb-2`}>
              1950 kcal
            </p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all duration-700"
                style={{ width: '78%' }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Progress Chart */}
      <Card className="visible-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-gray-900 dark:text-white">Weekly Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`${isMobile ? 'h-48' : 'h-64'} w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData}>
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: isMobile ? 11 : 12, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  hide={isMobile}
                  tick={{ fontSize: 12, fill: 'currentColor' }}
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
      <Card className="visible-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-gray-900 dark:text-white">Today's Macros</CardTitle>
        </CardHeader>
        <CardContent>
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
          <div className="flex justify-center space-x-6 mt-4">
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

      {/* Recent Achievements */}
      <Card className="visible-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-gray-900 dark:text-white">Recent Achievements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Weekly Streak</span>
            <Badge variant="default" className="bg-emerald-500 shadow-sm">7 days</Badge>
          </div>
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Average Calories</span>
            <Badge variant="secondary" className="shadow-sm">1950</Badge>
          </div>
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Goal Achievement</span>
            <Badge 
              variant={Math.round((todayProgress.calories / targetCalories) * 100) >= 80 ? "default" : "secondary"}
              className="shadow-sm"
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
