import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, TrendingUp, Target, Users, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { HomeCtaTicker } from '@/components/HomeCtaTicker';
import { HomeAIInsights } from '@/components/HomeAIInsights';
import { MoodForecastCard } from '@/components/MoodForecastCard';
import { ComingSoonPopup } from '@/components/ComingSoonPopup';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showComingSoon, setShowComingSoon] = React.useState(false);

  const exploreTiles = [
    {
      id: 'health-check',
      title: 'Health Scan',
      emoji: '❤️',
      color: 'from-red-300 to-rose-600',
      shadowColor: 'shadow-red-500/20',
      onClick: () => setShowComingSoon(true),
    },
    {
      id: 'game-challenge',
      title: 'Game & Challenge',
      emoji: '🏆',
      color: 'from-yellow-300 to-orange-600',
      shadowColor: 'shadow-yellow-500/20',
      onClick: () => navigate('/game-challenge'),
    },
    {
      id: 'supplement-hub',
      title: 'Supplement Hub',
      emoji: '🧪',
      color: 'from-purple-300 to-pink-600',
      shadowColor: 'shadow-purple-500/20',
      onClick: () => navigate('/supplement-hub'),
    },
    {
      id: 'influencers',
      title: 'Influencer Hub',
      emoji: '⭐️',
      color: 'from-blue-300 to-cyan-600',
      shadowColor: 'shadow-blue-500/20',
      onClick: () => setShowComingSoon(true),
    },
    {
      id: 'exercise-hub',
      title: 'Exercise Hub',
      emoji: '💪',
      color: 'from-blue-300 to-blue-600',
      shadowColor: 'shadow-blue-500/20',
      onClick: () => setShowComingSoon(true),
    },
    {
      id: 'my-reports',
      title: 'My Reports',
      emoji: '📄',
      color: 'from-emerald-300 to-teal-600',
      shadowColor: 'shadow-emerald-500/20',
      onClick: () => navigate('/my-reports'),
    },
  ];

  const quickAccessCards = [
    {
      title: 'Add Nutrition',
      description: 'Log your meals and track macros',
      icon: Plus,
      color: 'bg-green-500',
      onClick: () => navigate('/camera'),
    },
    {
      title: 'View Analytics',
      description: 'Check your progress and insights',
      icon: TrendingUp,
      color: 'bg-blue-500',
      onClick: () => navigate('/analytics'),
    },
    {
      title: 'Daily Goals',
      description: 'Track your daily targets',
      icon: Target,
      color: 'bg-purple-500',
      onClick: () => navigate('/profile'),
    },
    {
      title: 'Social Feed',
      description: 'Connect with your health community',
      icon: Users,
      color: 'bg-orange-500',
      onClick: () => navigate('/explore'),
    },
  ];

  const quickActions = [
    { label: 'Hydration', path: '/hydration', icon: '💧' },
    { label: 'Supplements', path: '/supplements', icon: '💊' },
    { label: 'Coach', path: '/coach', icon: '👨‍⚕️' },
    { label: 'Exercise', path: '/progress-calories', icon: '🏃‍♂️' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="pt-6 pb-20">
        <div className="px-4 space-y-6">
          {/* Welcome Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Welcome back{user?.user_metadata?.first_name ? `, ${user.user_metadata.first_name}` : ''}! 👋
            </h1>
            <p className="text-slate-600 text-sm">
              Ready to continue your wellness journey?
            </p>
          </div>

          {/* CTA Ticker */}
          <HomeCtaTicker />

          {/* AI Insights */}
          <HomeAIInsights />

          {/* Mood Forecast */}
          <MoodForecastCard />

          {/* Quick Access Cards */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900 px-1">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickAccessCards.map((card, index) => (
                <Card 
                  key={index}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-slate-200/50 bg-white/80 backdrop-blur-sm"
                  onClick={card.onClick}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className={`w-8 h-8 ${card.color} rounded-lg flex items-center justify-center mb-2`}>
                      <card.icon className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-medium text-slate-900 text-sm">{card.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{card.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Quick Navigation */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900 px-1">Quick Navigation</h2>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 px-3 bg-white/80 backdrop-blur-sm border-slate-200/60 hover:bg-slate-50/80 transition-all duration-200"
                  onClick={() => navigate(action.path)}
                >
                  <span className="mr-2 text-sm">{action.icon}</span>
                  <span className="text-xs font-medium text-slate-700">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Explore Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold text-slate-900">Explore Features</h2>
              <Badge variant="outline" className="text-xs bg-white/80 backdrop-blur-sm border-slate-200/60">
                <Activity className="w-3 h-3 mr-1" />
                Discover
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {exploreTiles.map((tile, index) => (
                <Card 
                  key={tile.id}
                  className={`
                    group relative cursor-pointer overflow-hidden border-0
                    bg-gradient-to-br ${tile.color}
                    hover:scale-105 active:scale-95
                    transition-all duration-300 ease-out
                    shadow-lg ${tile.shadowColor} hover:shadow-xl
                    animate-float
                  `}
                  onClick={tile.onClick}
                  style={{ 
                    animationDelay: `${index * 0.5}s`,
                    animationDuration: '6s'
                  }}
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-300">
                      {tile.emoji}
                    </div>
                    <h3 className="font-semibold text-white text-sm leading-tight drop-shadow-sm">
                      {tile.title}
                    </h3>
                  </CardContent>
                  
                  {/* Subtle overlay for depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ComingSoonPopup 
        isOpen={showComingSoon} 
        onClose={() => setShowComingSoon(false)} 
      />
    </div>
  );
}
