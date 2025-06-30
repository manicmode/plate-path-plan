
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Target, Award, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';

const Analytics = () => {
  const { user } = useAuth();
  const { getTodaysProgress } = useNutrition();
  const progress = getTodaysProgress();

  // Mock weekly data for charts
  const weeklyData = [
    { day: 'Mon', calories: 1850, protein: 120, carbs: 180, fat: 60 },
    { day: 'Tue', calories: 2100, protein: 140, carbs: 220, fat: 70 },
    { day: 'Wed', calories: 1950, protein: 135, carbs: 190, fat: 65 },
    { day: 'Thu', calories: 2050, protein: 145, carbs: 200, fat: 68 },
    { day: 'Fri', calories: 1900, protein: 130, carbs: 185, fat: 62 },
    { day: 'Sat', calories: 2200, protein: 150, carbs: 240, fat: 75 },
    { day: 'Sun', calories: progress.calories, protein: progress.protein, carbs: progress.carbs, fat: progress.fat },
  ];

  const macroDistribution = [
    { name: 'Protein', value: progress.protein * 4, color: '#3B82F6' },
    { name: 'Carbs', value: progress.carbs * 4, color: '#F59E0B' },
    { name: 'Fat', value: progress.fat * 9, color: '#8B5CF6' },
  ];

  const achievements = [
    { title: 'Consistent Logger', description: '7 days in a row', icon: Award, earned: true },
    { title: 'Protein Goal', description: 'Hit protein target 5x', icon: Target, earned: true },
    { title: 'Balanced Eater', description: 'Balanced macros 3x', icon: TrendingUp, earned: false },
  ];

  const macroTargets = [
    {
      name: 'Calories',
      current: progress.calories,
      target: user?.targetCalories || 2000,
      unit: '',
      color: 'bg-green-500',
    },
    {
      name: 'Protein',
      current: progress.protein,
      target: user?.targetProtein || 150,
      unit: 'g',
      color: 'bg-blue-500',
    },
    {
      name: 'Carbs',
      current: progress.carbs,
      target: user?.targetCarbs || 200,
      unit: 'g',
      color: 'bg-orange-500',
    },
    {
      name: 'Fat',
      current: progress.fat,
      target: user?.targetFat || 65,
      unit: 'g',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Analytics</h1>
        <p className="text-gray-600">Track your nutrition progress and insights</p>
      </div>

      {/* Daily Progress Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {macroTargets.map((macro, index) => {
          const percentage = Math.min((macro.current / macro.target) * 100, 100);
          return (
            <Card key={macro.name} className="animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
              <CardContent className="p-4">
                <div className="text-center space-y-2">
                  <div className={`w-8 h-8 ${macro.color} rounded-full mx-auto`}></div>
                  <h3 className="font-semibold text-sm">{macro.name}</h3>
                  <div className="space-y-1">
                    <div className="text-lg font-bold">
                      {macro.current.toFixed(0)}{macro.unit}
                    </div>
                    <div className="text-xs text-gray-500">
                      of {macro.target}{macro.unit}
                    </div>
                    <Progress value={percentage} className="h-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Weekly Trends */}
      <Card className="animate-slide-up" style={{ animationDelay: '400ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span>Weekly Calorie Trends</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="calories" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Macro Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="animate-slide-up" style={{ animationDelay: '500ms' }}>
          <CardHeader>
            <CardTitle>Today's Macro Distribution</CardTitle>
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
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {macroDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} calories`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '600ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-yellow-600" />
              <span>Achievements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {achievements.map((achievement, index) => {
                const Icon = achievement.icon;
                return (
                  <div
                    key={achievement.title}
                    className={`flex items-center space-x-3 p-3 rounded-lg ${
                      achievement.earned ? 'bg-green-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      achievement.earned ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{achievement.title}</h4>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                    </div>
                    {achievement.earned && (
                      <Badge className="bg-green-100 text-green-800">Earned</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Protein Trends */}
      <Card className="animate-slide-up" style={{ animationDelay: '700ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>Weekly Protein Intake</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="protein" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
