
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, TrendingUp, Droplets, Pill, Zap, Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const { user } = useAuth();
  const { getTodaysProgress } = useNutrition();
  const navigate = useNavigate();
  const progress = getTodaysProgress();

  const totalCalories = user?.targetCalories || 2000;
  const currentCalories = progress.calories;
  const progressPercentage = Math.min((currentCalories / totalCalories) * 100, 100);
  const circumference = 2 * Math.PI * 60;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  const macroCards = [
    {
      name: 'Calories',
      current: progress.calories,
      target: totalCalories,
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
      name: 'Carbs',
      current: progress.carbs,
      target: user?.targetCarbs || 200,
      unit: 'g',
      color: 'from-orange-400 to-orange-600',
      icon: TrendingUp,
    },
    {
      name: 'Fat',
      current: progress.fat,
      target: user?.targetFat || 65,
      unit: 'g',
      color: 'from-purple-400 to-purple-600',
      icon: Target,
    },
  ];

  const actionButtons = [
    {
      title: 'Log Food',
      icon: Camera,
      action: () => navigate('/camera'),
      gradient: 'from-emerald-500 to-blue-500',
      glow: 'emerald',
    },
    {
      title: 'Hydration',
      icon: Droplets,
      action: () => {},
      gradient: 'from-blue-500 to-cyan-500',
      glow: 'blue',
    },
    {
      title: 'Supplements',
      icon: Pill,
      action: () => {},
      gradient: 'from-purple-500 to-pink-500',
      glow: 'purple',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Futuristic Greeting */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-block">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Let's optimize your day,
          </h1>
          <h2 className="text-4xl font-bold neon-text">
            {user?.name?.split(' ')[0] || 'Superstar'}! ✨
          </h2>
        </div>
        <p className="text-gray-600 font-medium">Your intelligent wellness companion is ready</p>
      </div>

      {/* Circular Progress Ring */}
      <div className="flex justify-center animate-scale-in">
        <Card className="glass-card border-0 p-8 rounded-3xl">
          <CardContent className="flex flex-col items-center space-y-4 p-0">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 progress-ring" viewBox="0 0 120 120">
                {/* Background circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="56"
                  fill="none"
                  stroke="rgba(0, 200, 150, 0.1)"
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="56"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00C896" />
                    <stop offset="100%" stopColor="#2E8BFF" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold neon-text">
                  {Math.round(progressPercentage)}%
                </span>
                <span className="text-xs text-gray-500 font-medium">Daily Goal</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {currentCalories.toFixed(0)} / {totalCalories} calories
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Glowing Action Buttons */}
      <div className="grid grid-cols-3 gap-4">
        {actionButtons.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.title}
              onClick={action.action}
              className={`glass-button h-20 flex flex-col items-center space-y-2 rounded-2xl border-0 micro-bounce animate-slide-up`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className={`w-8 h-8 bg-gradient-to-r ${action.gradient} rounded-xl flex items-center justify-center neon-glow`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700">{action.title}</span>
            </Button>
          );
        })}
      </div>

      {/* Horizontal Scrollable Macro Cards */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900 text-center">Today's Nutrients</h3>
        <div className="flex space-x-4 overflow-x-auto scroll-cards pb-2">
          {macroCards.map((macro, index) => {
            const percentage = Math.min((macro.current / macro.target) * 100, 100);
            const Icon = macro.icon;
            
            return (
              <Card
                key={macro.name}
                className={`glass-card border-0 min-w-[140px] rounded-2xl animate-slide-up`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-4 text-center">
                  <div className={`w-10 h-10 bg-gradient-to-r ${macro.color} rounded-xl flex items-center justify-center mx-auto mb-3 neon-glow`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">{macro.name}</h4>
                  <p className="text-lg font-bold neon-text">
                    {macro.current.toFixed(0)}{macro.unit}
                  </p>
                  <p className="text-xs text-gray-500">
                    of {macro.target}{macro.unit}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className={`bg-gradient-to-r ${macro.color} h-1.5 rounded-full transition-all duration-700`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* AI Insights Card */}
      <Card className="glass-card border-0 rounded-3xl animate-slide-up float-animation" style={{ animationDelay: '600ms' }}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center neon-glow">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">AI Insights</h3>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-700 font-medium">
              🎯 You're {progressPercentage >= 80 ? 'crushing' : 'building toward'} your daily goals!
            </p>
            {progressPercentage < 80 && (
              <p className="text-sm text-gray-600">
                💡 Consider a nutrient-dense snack to optimize your intake.
              </p>
            )}
            <Button
              onClick={() => navigate('/coach')}
              className="glass-button text-emerald-600 hover:text-emerald-700 p-0 h-auto font-medium"
            >
              Ask your AI coach →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
