import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Thermometer, Snowflake, Flame, Calendar } from 'lucide-react';

interface ThermotherapyStreak {
  user_id: string;
  total_sessions: number;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
  created_at: string;
  updated_at: string;
}

const motivationalQuotes = [
  "Strength is forged in contrast.",
  "From ice to fire, resilience grows.",
  "Cold challenges, hot rewards.",
  "Contrast builds character.",
  "Fire and ice, perfectly balanced.",
  "Temperature extremes, mental gains.",
  "Recovery through hot and cold.",
  "Heal through thermal therapy.",
];

export function ThermotherapyStreakDisplay() {
  const [streak, setStreak] = useState<ThermotherapyStreak>({
    user_id: '',
    total_sessions: 0,
    current_streak: 0,
    longest_streak: 0,
    last_completed_date: null,
    created_at: '',
    updated_at: '',
  });
  const [currentQuote, setCurrentQuote] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThermotherapyStreak();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('thermotherapy_streaks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'thermotherapy_streaks',
        },
        (payload) => {
          console.log('Thermotherapy streak updated:', payload);
          fetchThermotherapyStreak();
        }
      )
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

  const fetchThermotherapyStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('thermotherapy_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching thermotherapy streak:', error);
        return;
      }

      if (data) {
        setStreak(data);
      }
    } catch (error) {
      console.error('Error fetching thermotherapy streak:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLastCompletedText = () => {
    if (!streak.last_completed_date) return 'Never';
    
    const lastCompleted = new Date(streak.last_completed_date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = lastCompleted.toDateString() === today.toDateString();
    const isYesterday = lastCompleted.toDateString() === yesterday.toDateString();
    
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return lastCompleted.toLocaleDateString();
  };

  const getProgressToNextMilestone = () => {
    const milestones = [3, 7, 14, 30];
    const nextMilestone = milestones.find(m => m > streak.current_streak) || 30;
    const progress = Math.min((streak.current_streak / nextMilestone) * 100, 100);
    return { progress, nextMilestone };
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-900/40 to-red-900/40 p-6 rounded-lg border border-white/20 backdrop-blur-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/20 rounded"></div>
          <div className="h-16 bg-white/20 rounded"></div>
          <div className="h-4 bg-white/20 rounded"></div>
        </div>
      </div>
    );
  }

  const { progress, nextMilestone } = getProgressToNextMilestone();

  return (
    <div className="bg-gradient-to-r from-blue-900/40 to-red-900/40 p-6 rounded-lg border border-white/20 backdrop-blur-sm relative overflow-hidden">
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <div className="flex items-center">
            <Snowflake className="h-5 w-5 text-blue-300" />
            <Flame className="h-5 w-5 text-red-400" />
          </div>
          Thermotherapy Streak
        </h3>
      </div>

      {/* Current Streak - Large Display */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Snowflake className="h-8 w-8 text-blue-300 animate-pulse" />
          <span className="text-6xl font-bold bg-gradient-to-r from-blue-300 to-red-400 bg-clip-text text-transparent">
            {streak.current_streak}
          </span>
          <Flame className="h-8 w-8 text-red-400 animate-pulse" />
        </div>
        <p className="text-white/80 text-lg">Current Streak</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-white/10 rounded-lg border border-white/20">
          <div className="text-2xl font-bold text-orange-300">{streak.longest_streak}</div>
          <div className="text-white/70 text-sm">🏆 Longest</div>
        </div>
        <div className="text-center p-3 bg-white/10 rounded-lg border border-white/20">
          <div className="text-2xl font-bold text-blue-300">{streak.total_sessions}</div>
          <div className="text-white/70 text-sm">📊 Total</div>
        </div>
      </div>

      {/* Last Completed */}
      <div className="flex items-center justify-between mb-4 p-3 bg-white/5 rounded-lg">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-white/60" />
          <span className="text-white/70 text-sm">Last Session:</span>
        </div>
        <span className="text-white font-medium">{getLastCompletedText()}</span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/70 text-sm">Progress to {nextMilestone} days</span>
          <span className="text-white/70 text-sm">{streak.current_streak}/{nextMilestone}</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-red-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Motivational Quote */}
      <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
        <p className="text-white/80 italic text-sm transition-opacity duration-500">
          "{motivationalQuotes[currentQuote]}"
        </p>
      </div>
    </div>
  );
}