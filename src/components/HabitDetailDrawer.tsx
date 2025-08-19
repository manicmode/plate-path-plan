import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Clock, 
  Play, 
  Pause, 
  CheckCircle, 
  Settings,
  Star,
  Minus,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';
import { startHabit, pauseHabit, resumeHabit, setHabitReminder, markHabitDone } from '@/lib/habits';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

type HabitDetailProps = {
  habit: {
    slug: string;
    name: string;
    domain: 'nutrition' | 'exercise' | 'recovery';
    estimated_minutes?: number;
    equipment?: string | null;
    description?: string | null;
    reason?: string | null; // from rpc_recommend_habits_v2
    score?: number | null;  // from rpc_recommend_habits_v2
  };
  adoptionId?: string | null; // if already started
  onChanged: () => void; // refetch suggestions / progress after any action
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

const getDomainColor = (domain: string) => {
  switch (domain) {
    case 'nutrition': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'exercise': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'recovery': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

export function HabitDetailDrawer({ habit, adoptionId, onChanged, open, onOpenChange }: HabitDetailProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [habitStatus, setHabitStatus] = useState<'active' | 'paused' | null>(null);
  const [reminderTime, setReminderTime] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');

  // Check if habit is already adopted
  useEffect(() => {
    const checkHabitStatus = async () => {
      if (!user || !habit?.slug) return;
      
      try {
        const { data, error } = await supabase
          .from('user_habit')
          .select('status, reminder_at')
          .eq('user_id', user.id)
          .eq('slug', habit.slug)
          .maybeSingle();
          
        if (error) throw error;
        
        if (data) {
          setHabitStatus(data.status);
          setReminderTime(data.reminder_at || '');
        } else {
          setHabitStatus(null);
        }
      } catch (error) {
        console.error('Error checking habit status:', error);
      }
    };
    
    if (open) {
      checkHabitStatus();
    }
  }, [user, habit?.slug, open]);

  const handleStartHabit = async () => {
    if (!habit?.slug) return;
    
    setLoading(true);
    try {
      await startHabit(habit.slug, reminderTime || null, frequency);
      
      track('habit_started', { 
        habit_slug: habit.slug, 
        frequency, 
        reminder_time: reminderTime || null 
      });
      
      toast({
        title: "Habit started!",
        description: `${habit.name} has been added to your habits.`
      });
      
      setHabitStatus('active');
      onChanged();
    } catch (error) {
      console.error('Error starting habit:', error);
      toast({
        title: "Failed to start habit",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePauseHabit = async () => {
    if (!habit?.slug) return;
    
    setLoading(true);
    try {
      await pauseHabit(habit.slug);
      
      track('habit_paused', { habit_slug: habit.slug });
      
      toast({
        title: "Habit paused",
        description: `${habit.name} has been paused.`
      });
      
      setHabitStatus('paused');
      onChanged();
    } catch (error) {
      console.error('Error pausing habit:', error);
      toast({
        title: "Failed to pause habit",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResumeHabit = async () => {
    if (!habit?.slug) return;
    
    setLoading(true);
    try {
      await resumeHabit(habit.slug);
      
      track('habit_resumed', { habit_slug: habit.slug });
      
      toast({
        title: "Habit resumed",
        description: `${habit.name} is now active again.`
      });
      
      setHabitStatus('active');
      onChanged();
    } catch (error) {
      console.error('Error resuming habit:', error);
      toast({
        title: "Failed to resume habit",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetReminder = async () => {
    if (!habit?.slug || !reminderTime) return;
    
    setLoading(true);
    try {
      await setHabitReminder(habit.slug, reminderTime, frequency);
      
      track('habit_reminder_set', { 
        habit_slug: habit.slug, 
        reminder_time: reminderTime, 
        frequency 
      });
      
      toast({
        title: "Reminder set",
        description: `Reminder updated for ${habit.name}.`
      });
      
      onChanged();
    } catch (error) {
      console.error('Error setting reminder:', error);
      toast({
        title: "Failed to set reminder",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDone = async () => {
    if (!habit?.slug) return;
    
    setLoading(true);
    try {
      await markHabitDone(habit.slug);
      
      track('habit_logged', { habit_slug: habit.slug });
      
      toast({
        title: "Logged!",
        description: `${habit.name} completed for today.`
      });
      
      onChanged();
    } catch (error) {
      console.error('Error marking habit done:', error);
      toast({
        title: "Failed to log habit",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!habit) return null;

  const renderReasonBullets = () => {
    if (!habit.reason) return null;
    
    // Try to parse structured reasons or fallback to simple text
    const reasons = habit.reason.split(/[,;]/).map(r => r.trim()).filter(Boolean);
    
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Why this habit?</h4>
        <div className="space-y-1">
          {reasons.map((reason, index) => (
            <div key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Plus className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
              <span>{reason}</span>
            </div>
          ))}
          {habit.score && (
            <div className="flex items-center gap-2 text-sm">
              <Star className="h-3 w-3 text-yellow-500" />
              <span className="text-muted-foreground">Match score: {Math.round(habit.score * 100)}%</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <SheetTitle className="text-xl line-clamp-2 flex-1">
                {habit.name}
              </SheetTitle>
              <Badge className={getDomainColor(habit.domain)}>
                {habit.domain}
              </Badge>
            </div>
            
            {habit.estimated_minutes && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{habit.estimated_minutes} minutes</span>
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Description */}
          {habit.description && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">About</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {habit.description}
              </p>
            </div>
          )}

          {/* Equipment */}
          {habit.equipment && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Equipment needed</h4>
              <p className="text-sm text-muted-foreground">
                {habit.equipment}
              </p>
            </div>
          )}

          {/* Why this habit */}
          {renderReasonBullets()}

          {/* Reminder Settings (if habit is started or starting) */}
          {(habitStatus || !habitStatus) && (
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <h4 className="text-sm font-medium">Reminder settings</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="reminder-time" className="text-xs">Time</Label>
                    <Input
                      id="reminder-time"
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="frequency" className="text-xs">Frequency</Label>
                    <Select value={frequency} onValueChange={(value: 'daily' | 'weekly') => setFrequency(value)}>
                      <SelectTrigger id="frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {habitStatus && reminderTime && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSetReminder}
                    disabled={loading}
                    className="w-full"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Update reminder
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {!habitStatus ? (
              <Button 
                onClick={handleStartHabit}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                <Play className="h-4 w-4 mr-2" />
                Start this habit
              </Button>
            ) : (
              <div className="space-y-2">
                <Button 
                  onClick={handleMarkDone}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark done today
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  {habitStatus === 'active' ? (
                    <Button 
                      variant="outline"
                      onClick={handlePauseHabit}
                      disabled={loading}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
                      onClick={handleResumeHabit}
                      disabled={loading}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}