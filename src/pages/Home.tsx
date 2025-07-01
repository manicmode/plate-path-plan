import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, TrendingUp, Droplets, Pill, Zap, Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const { user } = useAuth();
  const { getTodaysProgress, getHydrationGoal, getSupplementGoal } = useNutrition();
  const navigate = useNavigate();
  const progress = getTodaysProgress();

  const totalCalories = user?.targetCalories || 2000;
  const currentCalories = progress.calories;
  const progressPercentage = Math.min((currentCalories / totalCalories) * 100, 100);

  const hydrationGoal = getHydrationGoal();
  const hydrationPercentage = Math.min((progress.hydration / hydrationGoal) * 100, 100);

  const supplementGoal = getSupplementGoal();
  const supplementPercentage = Math.min((progress.supplements / supplementGoal) * 100, 100);

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
    {
      name: 'Hydration',
      current: progress.hydration,
      target: hydrationGoal,
      unit: 'ml',
      color: 'from-cyan-400 to-blue-600',
      icon: Droplets,
    },
    {
      name: 'Supplements',
      current: progress.supplements,
      target: supplementGoal,
      unit: '',
      color: 'from-purple-500 to-pink-600',
      icon: Pill,
    },
  ];

  const actionButtons = [
    {
      title: 'Log Food',
      icon: Camera,
      action: () => navigate('/camera'),
      gradient: 'from-emerald-500 to-blue-500',
      glow: 'emerald',
      description: 'Take a photo of your meal to log nutrition'
    },
    {
      title: 'Hydration',
      icon: Droplets,
      action: () => navigate('/hydration'),
      gradient: 'from-blue-500 to-cyan-500',
      glow: 'blue',
      description: 'Track your daily water intake'
    },
    {
      title: 'Supplements',
      icon: Pill,
      action: () => navigate('/supplements'),
      gradient: 'from-purple-500 to-pink-500',
      glow: 'purple',
      description: 'Log vitamins and supplements'
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Futuristic Greeting */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-block">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-emerald-600 to-blue-600 dark:from-gray-100 dark:via-emerald-400 dark:to-blue-400 bg-clip-text text-transparent mb-2">
            Let's optimize your day,
          </h1>
          <h2 className="text-4xl font-bold neon-text">
            {user?.name?.split(' ')[0] || 'Superstar'}! ✨
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-300 font-medium">Your intelligent wellness companion is ready</p>
      </div>

      {/* Three Progress Rings */}
      <div className="grid grid-cols-3 gap-4 animate-scale-in">
        {/* Calories Ring */}
        <Card className="glass-card border-0 p-4 rounded-3xl">
          <CardContent className="flex flex-col items-center space-y-2 p-0">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 progress-ring" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(0, 200, 150, 0.1)" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="36" fill="none" stroke="url(#calorieGradient)" strokeWidth="6"
                  strokeLinecap="round" strokeDasharray={226} strokeDashoffset={226 - (progressPercentage / 100) * 226}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00C896" />
                    <stop offset="100%" stopColor="#2E8BFF" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold neon-text">{Math.round(progressPercentage)}%</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Calories</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{currentCalories.toFixed(0)}/{totalCalories}</p>
            </div>
          </CardContent>
        </Card>

        {/* Hydration Ring */}
        <Card className="glass-card border-0 p-4 rounded-3xl">
          <CardContent className="flex flex-col items-center space-y-2 p-0">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 progress-ring" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(6, 182, 212, 0.1)" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="36" fill="none" stroke="url(#hydrationGradient)" strokeWidth="6"
                  strokeLinecap="round" strokeDasharray={226} strokeDashoffset={226 - (hydrationPercentage / 100) * 226}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="hydrationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{Math.round(hydrationPercentage)}%</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Hydration</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{progress.hydration}/{hydrationGoal}ml</p>
            </div>
          </CardContent>
        </Card>

        {/* Supplements Ring */}
        <Card className="glass-card border-0 p-4 rounded-3xl">
          <CardContent className="flex flex-col items-center space-y-2 p-0">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 progress-ring" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(168, 85, 247, 0.1)" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="36" fill="none" stroke="url(#supplementGradient)" strokeWidth="6"
                  strokeLinecap="round" strokeDasharray={226} strokeDashoffset={226 - (supplementPercentage / 100) * 226}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="supplementGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A855F7" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{Math.round(supplementPercentage)}%</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Supplements</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{progress.supplements}/{supplementGoal}</p>
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
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{action.title}</span>
            </Button>
          );
        })}
      </div>

      {/* Horizontal Scrollable Macro Cards */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center">Today's Nutrients</h3>
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
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{macro.name}</h4>
                  <p className="text-lg font-bold neon-text">
                    {macro.current.toFixed(0)}{macro.unit}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    of {macro.target}{macro.unit}
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
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
            <h3 className="font-bold text-gray-900 dark:text-white">AI Insights</h3>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              🎯 You're {progressPercentage >= 80 ? 'crushing' : 'building toward'} your daily goals!
            </p>
            {progressPercentage < 80 && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
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
