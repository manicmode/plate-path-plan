import React, { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useHabitManagement } from '@/hooks/useHabitManagement';
import { HabitEvents } from '@/lib/analytics';
import { toastOnce } from '@/lib/toastOnce';
import { QuickLogSheet } from '@/components/QuickLogSheet';

interface DueHabit {
  user_habit_id: string;
  slug: string;
  name: string;
  domain: string;
  summary: string;
  goal_type?: string; // Optional since RPC might not include it
  next_due_at: string;
}

export default function ReminderBell() {
  const { user } = useAuth();
  const { logHabit } = useHabitManagement();
  const [dueHabits, setDueHabits] = useState<DueHabit[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<DueHabit | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const fetchDueHabits = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('rpc_get_due_habits', {
        p_before_minutes: 10,
        p_after_minutes: 30
      });
      
      if (error) throw error;
      setDueHabits(data || []);
    } catch (error) {
      console.error('Error fetching due habits:', error);
    }
  }, [user]);

  // Poll every 60 seconds and on window focus (respecting reduced motion)
  useEffect(() => {
    if (!user) return;

    fetchDueHabits();
    
    // Respect reduced motion preferences for polling frequency
    const pollInterval = prefersReducedMotion ? 120000 : 60000; // 2min vs 1min
    const interval = setInterval(fetchDueHabits, pollInterval);
    
    const handleFocus = () => fetchDueHabits();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) handleFocus();
    });
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user, fetchDueHabits, prefersReducedMotion]);

  // Track analytics when bell opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && dueHabits.length > 0) {
      HabitEvents.habitReminderOpened({ 
        due_count: dueHabits.length,
        due_slugs: dueHabits.map(h => h.slug).join(',')
      });
    }
  };

  const handleLogNow = async (habit: DueHabit) => {
    if (isLoading) return;
    
    // For boolean habits, log directly (default to true if goal_type not provided)
    if (habit.goal_type === 'bool' || !habit.goal_type) {
      setIsLoading(true);
      try {
        const success = await logHabit(habit.slug, true, null, null, habit, 'bell');
        if (success) {
          setDueHabits(prev => prev.filter(h => h.user_habit_id !== habit.user_habit_id));
          toastOnce('success', 'Logged • Nice work.');
        }
      } catch (error) {
        console.error('Error logging habit:', error);
        toastOnce('error', 'Failed to log habit');
      } finally {
        setIsLoading(false);
      }
    } else {
      // For duration/count habits, open QuickLogSheet
      setSelectedHabit(habit);
      setShowQuickLog(true);
      setIsOpen(false); // Close the bell
    }
  };

  const handleSnooze = async (habit: DueHabit) => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      // Update snooze_until to 10 minutes from now
      const snoozeUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('user_habit')
        .update({ snooze_until: snoozeUntil })
        .eq('id', habit.user_habit_id);
      
      if (error) throw error;
      
      // Track analytics
      HabitEvents.habitSnoozed({ 
        user_habit_id: habit.user_habit_id,
        slug: habit.slug, 
        minutes: 10,
        source: 'bell'
      });
      
      toastOnce('success', 'Snoozed • We\'ll remind you later.');
      setDueHabits(prev => prev.filter(h => h.user_habit_id !== habit.user_habit_id));
    } catch (error) {
      console.error('Error snoozing habit:', error);
      toastOnce('error', 'Failed to snooze habit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogSuccess = () => {
    setShowQuickLog(false);
    setSelectedHabit(null);
    // Remove the logged habit from due list
    if (selectedHabit) {
      setDueHabits(prev => prev.filter(h => h.user_habit_id !== selectedHabit.user_habit_id));
    }
  };

  const formatDueTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) return null;

  return (
    <>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative p-2"
          aria-label={`${dueHabits.length} habit reminders`}
        >
          <Bell className="w-5 h-5" />
          {dueHabits.length > 0 && (
            <span className="absolute -top-1 -right-1 text-[10px] bg-primary text-primary-foreground rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
              {dueHabits.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4">
          <h3 className="font-semibold mb-3">Due Soon</h3>
          {dueHabits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No habits due right now</p>
          ) : (
            <div className="space-y-3">
              {dueHabits.map((habit) => (
                <div key={habit.user_habit_id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{habit.name}</h4>
                    <span className="text-xs text-muted-foreground">
                      Due at {formatDueTime(habit.next_due_at)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleLogNow(habit)}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      Log now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSnooze(habit)}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      Snooze 10m
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>

    {/* QuickLogSheet for duration/count habits */}
    <QuickLogSheet
      open={showQuickLog}
      onOpenChange={setShowQuickLog}
      template={selectedHabit ? {
        slug: selectedHabit.slug,
        name: selectedHabit.name,
        goal_type: selectedHabit.goal_type as any,
        domain: selectedHabit.domain as any
      } as any : null}
      userHabit={selectedHabit}
      onSuccess={handleQuickLogSuccess}
    />
  </>
  );
}