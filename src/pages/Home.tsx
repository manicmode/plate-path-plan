
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Camera, TrendingUp, Target, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const { user } = useAuth();
  const { getTodaysProgress } = useNutrition();
  const navigate = useNavigate();
  const progress = getTodaysProgress();

  const macroProgress = [
    {
      name: 'Calories',
      current: progress.calories,
      target: user?.targetCalories || 2000,
      color: 'bg-green-500',
      icon: Zap,
    },
    {
      name: 'Protein',
      current: progress.protein,
      target: user?.targetProtein || 150,
      color: 'bg-blue-500',
      icon: Target,
    },
    {
      name: 'Carbs',
      current: progress.carbs,
      target: user?.targetCarbs || 200,
      color: 'bg-orange-500',
      icon: TrendingUp,
    },
    {
      name: 'Fat',
      current: progress.fat,
      target: user?.targetFat || 65,
      color: 'bg-purple-500',
      icon: Target,
    },
  ];

  const quickActions = [
    {
      title: 'Log Food',
      description: 'Take a photo of your meal',
      icon: Camera,
      action: () => navigate('/camera'),
      gradient: 'from-green-500 to-green-600',
    },
    {
      title: 'View Analytics',
      description: 'Check your progress',
      icon: TrendingUp,
      action: () => navigate('/analytics'),
      gradient: 'from-blue-500 to-blue-600',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Good morning, {user?.name?.split(' ')[0] || 'there'}! 👋
        </h1>
        <p className="text-gray-600">Let's make today a healthy day</p>
      </div>

      {/* Daily Progress */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-green-600" />
            <span>Today's Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {macroProgress.map((macro) => {
            const percentage = Math.min((macro.current / macro.target) * 100, 100);
            const Icon = macro.icon;
            
            return (
              <div key={macro.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">{macro.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold">
                      {macro.current.toFixed(0)}/{macro.target}
                    </span>
                    <Badge variant={percentage >= 80 ? 'default' : 'secondary'}>
                      {percentage.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={percentage} 
                  className="h-2"
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card 
              key={action.title}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={action.action}
            >
              <CardContent className="p-6">
                <div className={`w-12 h-12 bg-gradient-to-r ${action.gradient} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{action.title}</h3>
                <p className="text-gray-600 text-sm">{action.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Zap className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Welcome to NutriCoach!</p>
                <p className="text-sm text-gray-600">Start by logging your first meal</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
