import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Activity, Zap, Trophy, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StretchingStreak {
  user_id: string;
  total_sessions: number;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
  created_at: string;
  updated_at: string;
}

const motivationalQuotes = [
  "Stretch your limits every day ⚡",
  "Flexibility is the key to life 🤸",
  "One stretch closer to your best self ☀️",
  "Bend so you don't break 💪",
  "Flexibility creates possibility ✨",
  "Stretch your body, expand your mind 🧘",
  "Movement is medicine 🌟",
  "Every stretch counts towards progress 🎯"
];

export const StretchingStreakDisplay: React.FC = () => {
  const [streakData, setStreakData] = useState<StretchingStreak | null>(null);
  const [currentQuote, setCurrentQuote] = useState(0);

  useEffect(() => {
    const loadStreakData = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data } = await supabase
        .from('stretching_streaks')
        .select('*')
        .eq('user_id', user.user.id)
        .maybeSingle();

      setStreakData(data || {
        user_id: user.user.id,
        total_sessions: 0,
        current_streak: 0,
        longest_streak: 0,
        last_completed_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    };

    loadStreakData();

    const channel = supabase
      .channel('stretching-streaks-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stretching_streaks'
      }, async (payload) => {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user && payload.new && (payload.new as any).user_id === userData.user.id) {
          setStreakData(payload.new as StretchingStreak);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % motivationalQuotes.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const getProgressToGoal = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  const getStreakGlow = (streak: number) => {
    if (streak >= 30) return 'shadow-lg shadow-amber-500/50';
    if (streak >= 14) return 'shadow-lg shadow-orange-500/50';
    if (streak >= 7) return 'shadow-lg shadow-yellow-500/50';
    if (streak >= 3) return 'shadow-lg shadow-orange-400/50';
    return '';
  };

  const formatLastCompleted = (date: string | null) => {
    if (!date) return 'Never';
    
    const completedDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (completedDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (completedDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return completedDate.toLocaleDateString();
    }
  };

  if (!streakData) {
    return (
      <Card className="glass-card border-0 rounded-3xl bg-gradient-to-br from-orange-900/50 via-amber-900/30 to-yellow-900/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-orange-800/30 rounded"></div>
            <div className="h-16 bg-orange-800/30 rounded"></div>
            <div className="h-4 bg-orange-800/30 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`glass-card border-0 rounded-3xl bg-gradient-to-br from-orange-900/50 via-amber-900/30 to-yellow-900/50 ${getStreakGlow(streakData.current_streak)}`}>
      <CardContent className="p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Activity className="h-6 w-6 text-orange-300" />
            <h3 className="text-xl font-semibold text-orange-100">Stretching Streak</h3>
            <Activity className="h-6 w-6 text-amber-300" />
          </div>
          
          <p className="text-sm text-orange-200/80 italic transition-all duration-500">
            {motivationalQuotes[currentQuote]}
          </p>
        </div>

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-3">
            <Zap className="h-8 w-8 text-yellow-400" />
            <span className="text-4xl font-bold text-orange-100">
              {streakData.current_streak}
            </span>
            <span className="text-lg text-orange-300">days</span>
          </div>
          <p className="text-sm text-orange-200/70">Current Streak</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center space-x-1">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span className="text-xl font-bold text-orange-100">
                {streakData.longest_streak}
              </span>
            </div>
            <p className="text-xs text-orange-200/70">Longest Streak</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center space-x-1">
              <Calendar className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-orange-100">
                {formatLastCompleted(streakData.last_completed_date)}
              </span>
            </div>
            <p className="text-xs text-orange-200/70">Last Completed</p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-orange-200 text-center">Progress to Goals</h4>
          
          <div className="space-y-2">
            {[3, 7, 14, 30].map((goal) => (
              <div key={goal} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-orange-300">{goal} days</span>
                  <span className="text-orange-200">
                    {Math.min(streakData.current_streak, goal)}/{goal}
                  </span>
                </div>
                <Progress 
                  value={getProgressToGoal(streakData.current_streak, goal)}
                  className="h-2 bg-orange-950/50"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="text-center pt-2 border-t border-orange-800/30">
          <p className="text-sm text-orange-200/70">
            Total sessions: <span className="font-medium text-orange-100">{streakData.total_sessions}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};