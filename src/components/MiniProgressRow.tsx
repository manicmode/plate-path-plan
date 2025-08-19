import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Circle, TrendingUp, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { getStreaksBySlug } from '@/lib/streaks';
import { StreakMap } from '@/types/streaks';

interface HabitProgress {
  slug: string;
  name: string;
  done_today: boolean;
  done_30d: number;
  window_days: number;
  current_streak: number;
}

export function MiniProgressRow() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<HabitProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHabitProgress = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get active habits with their names
        const { data: userHabits, error: habitsError } = await supabase
          .from('user_habit')
          .select(`
            slug,
            habit_templates!inner(name)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(3);

        if (habitsError) throw habitsError;

        if (!userHabits?.length) {
          setHabits([]);
          setLoading(false);
          return;
        }

        // Get consistency data
        const { data: consistencyData, error: consistencyError } = await supabase
          .from('v_habit_consistency')
          .select('*')
          .eq('user_id', user.id)
          .in('habit_slug', userHabits.map(h => h.slug));

        if (consistencyError) throw consistencyError;

        // Check today's completions
        const { data: todayLogs, error: logsError } = await supabase
          .from('habit_log')
          .select('habit_id')
          .eq('user_id', user.id)
          .gte('ts', new Date().toISOString().split('T')[0]) // Today
          .lt('ts', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Tomorrow

        if (logsError) throw logsError;

        // Get habit IDs for today's completed habits
        const { data: habitIds, error: idsError } = await supabase
          .from('user_habit')
          .select('id, slug')
          .eq('user_id', user.id)
          .in('slug', userHabits.map(h => h.slug));

        if (idsError) throw idsError;

        const completedTodayIds = new Set(todayLogs?.map(log => log.habit_id) || []);
        const habitIdMap = new Map(habitIds?.map(h => [h.slug, h.id]) || []);

        // Get streak data
        const streaks: StreakMap = await getStreaksBySlug();

        // Combine data
        const progressData: HabitProgress[] = userHabits.map(habit => {
          const consistency = consistencyData?.find(c => c.habit_slug === habit.slug);
          const habitId = habitIdMap.get(habit.slug);
          const doneToday = habitId ? completedTodayIds.has(habitId) : false;
          const streak = streaks[habit.slug];

          return {
            slug: habit.slug,
            name: habit.habit_templates.name,
            done_today: doneToday,
            done_30d: consistency?.done_30d || 0,
            window_days: consistency?.window_days || 30,
            current_streak: streak?.current_streak || 0
          };
        });

        setHabits(progressData);
      } catch (error) {
        console.error('Error fetching habit progress:', error);
        setHabits([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHabitProgress();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 w-48 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (habits.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-muted-foreground">Today's progress</h3>
      </div>
      
      <div className="flex gap-3 overflow-x-auto">
        {habits.map((habit) => (
          <Card key={habit.slug} className="flex-shrink-0 w-48">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium line-clamp-1">
                  {habit.name}
                </span>
                {habit.done_today ? (
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {habit.done_30d}/{habit.window_days} days this month
                </span>
                {habit.current_streak > 0 && (
                  <Badge variant="secondary" className="px-1 py-0 text-xs h-4">
                    <Flame className="h-2.5 w-2.5 mr-1" />
                    {habit.current_streak}d
                  </Badge>
                )}
              </div>
              
              <div className="w-full bg-muted rounded-full h-1">
                <div 
                  className="bg-primary h-1 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, (habit.done_30d / habit.window_days) * 100)}%` 
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}