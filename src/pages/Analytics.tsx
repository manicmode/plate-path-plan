
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { CalendarDays, TrendingUp, Award, Target, Activity } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';

const Analytics = () => {
  const { user } = useAuth();
  const { getTodaysProgress } = useNutrition();
  const isMobile = useIsMobile();
  
  // Always scroll to top when entering Analytics page
  useScrollToTop(true);

  const progress = getTodaysProgress();
  
  const caloriesTarget = user?.targetCalories || 2000;
  const proteinTarget = user?.targetProtein || 150;
  const carbsTarget = user?.targetCarbs || 200;
  const fatTarget = user?.targetFat || 65;
  const hydrationTarget = user?.targetHydration || 8;
  const supplementsTarget = user?.targetSupplements || 3;

  // Mock data for charts since nutritionHistory doesn't exist in context
  const dailyCalorieData = [
    { date: 'Mon', calories: progress.calories, target: caloriesTarget },
    { date: 'Tue', calories: 1800, target: caloriesTarget },
    { date: 'Wed', calories: 2200, target: caloriesTarget },
    { date: 'Thu', calories: 1900, target: caloriesTarget },
    { date: 'Fri', calories: 2100, target: caloriesTarget },
    { date: 'Sat', calories: 2000, target: caloriesTarget },
    { date: 'Sun', calories: progress.calories, target: caloriesTarget },
  ];

  const macroData = [
    { date: 'Mon', protein: 120, carbs: 180, fat: 50, proteinTarget: proteinTarget, carbsTarget: carbsTarget, fatTarget: fatTarget },
    { date: 'Tue', protein: 140, carbs: 160, fat: 60, proteinTarget: proteinTarget, carbsTarget: carbsTarget, fatTarget: fatTarget },
    { date: 'Wed', protein: progress.protein, carbs: progress.carbs, fat: progress.fat, proteinTarget: proteinTarget, carbsTarget: carbsTarget, fatTarget: fatTarget },
  ];

  const COLORS = ['#16a34a', '#dc2626', '#facc15', '#0ea5e9', '#9333ea', '#d946ef'];

  const pieData = [
    { name: 'Protein', value: progress.protein },
    { name: 'Carbs', value: progress.carbs },
    { name: 'Fat', value: progress.fat },
  ];

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${pieData[index].name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Analytics Overview Section */}
      <div className="text-center py-6">
        <div className="flex justify-center mb-4">
          <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse shadow-2xl`}>
            <BarChart className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white animate-bounce`} />
          </div>
        </div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2`}>
          Your Progress at a Glance
        </h1>
        <p className={`text-emerald-600 dark:text-emerald-400 font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>
          Stay informed, stay motivated!
        </p>
      </div>

      {/* Today's Progress Card */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            <span>Today's Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <span>Calories</span>
              <Badge variant="secondary">{progress.calories} / {caloriesTarget}</Badge>
            </div>
            <Progress value={(progress.calories / caloriesTarget) * 100} />

            <div className="flex items-center justify-between">
              <span>Protein</span>
              <Badge variant="secondary">{progress.protein} / {proteinTarget}</Badge>
            </div>
            <Progress value={(progress.protein / proteinTarget) * 100} />

            <div className="flex items-center justify-between">
              <span>Carbs</span>
              <Badge variant="secondary">{progress.carbs} / {carbsTarget}</Badge>
            </div>
            <Progress value={(progress.carbs / carbsTarget) * 100} />

            <div className="flex items-center justify-between">
              <span>Fat</span>
              <Badge variant="secondary">{progress.fat} / {fatTarget}</Badge>
            </div>
            <Progress value={(progress.fat / fatTarget) * 100} />

            <div className="flex items-center justify-between">
              <span>Hydration</span>
              <Badge variant="secondary">{progress.hydration} / {hydrationTarget}</Badge>
            </div>
            <Progress value={(progress.hydration / hydrationTarget) * 100} />

            <div className="flex items-center justify-between">
              <span>Supplements</span>
              <Badge variant="secondary">{progress.supplements} / {supplementsTarget}</Badge>
            </div>
            <Progress value={(progress.supplements / supplementsTarget) * 100} />
          </div>
        </CardContent>
      </Card>

      {/* Calorie Intake Chart */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span>Daily Calorie Intake</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyCalorieData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="calories" fill="#82ca9d" name="Calories Consumed" />
              <Line type="monotone" dataKey="target" stroke="#8884d8" name="Calorie Target" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Macro Tracking Chart */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Activity className="h-4 w-4 text-emerald-600" />
            <span>Macro Nutrients Over Time</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={macroData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="protein" stroke="#82ca9d" name="Protein" />
              <Line type="monotone" dataKey="carbs" stroke="#8884d8" name="Carbs" />
              <Line type="monotone" dataKey="fat" stroke="#ffc658" name="Fat" />
              <Line type="monotone" dataKey="proteinTarget" stroke="#82ca9d" strokeDasharray="5 5" name="Protein Target" />
              <Line type="monotone" dataKey="carbsTarget" stroke="#8884d8" strokeDasharray="5 5" name="Carbs Target" />
              <Line type="monotone" dataKey="fatTarget" stroke="#ffc658" strokeDasharray="5 5" name="Fat Target" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Macro Distribution Pie Chart */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Award className="h-4 w-4 text-emerald-600" />
            <span>Today's Macro Distribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
