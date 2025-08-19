import React, { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface DueHabit {
  user_habit_id: string;
  slug: string;
  name: string;
  domain: string;
  summary: string;
  next_due_at: string;
}

export default function ReminderBell() {
  const { user } = useAuth();
  const [dueHabits, setDueHabits] = useState<DueHabit[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  // Poll every 60 seconds and on window focus
  useEffect(() => {
    if (!user) return;

    fetchDueHabits();
    
    const interval = setInterval(fetchDueHabits, 60000);
    
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
  }, [user, fetchDueHabits]);

  const handleLogNow = async (habit: DueHabit) => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      const { error } = await supabase.rpc('rpc_log_habit', {
        p_slug: habit.slug,
        p_completed: true
      });
      
      if (error) throw error;
      
      toast.success('Logged • Nice work!');
      setDueHabits(prev => prev.filter(h => h.user_habit_id !== habit.user_habit_id));
    } catch (error) {
      console.error('Error logging habit:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to log habit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSnooze = async (habit: DueHabit) => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      const { error } = await supabase.rpc('rpc_snooze_habit', {
        p_user_habit_id: habit.user_habit_id,
        p_minutes: 10
      });
      
      if (error) throw error;
      
      toast.success('Snoozed for 10 min');
      setDueHabits(prev => prev.filter(h => h.user_habit_id !== habit.user_habit_id));
    } catch (error) {
      console.error('Error snoozing habit:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to snooze habit');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDueTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
  );
}