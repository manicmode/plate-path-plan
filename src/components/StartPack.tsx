import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Toggle } from '@/components/ui/toggle';
import { Sparkles, Clock, Calendar, Check, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { track } from '@/lib/analytics';
import { toastOnce } from '@/lib/toastOnce';
import { emitHabitStarted } from '@/lib/events';

interface StartPackRecommendation {
  slug: string;
  name: string;
  domain: string;
  summary?: string;
  reason: string;
}

interface StartPackProps {
  onHabitsStarted: () => void;
  onSkip: () => void;
}

const WEEKDAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
];

const getDomainColor = (domain: string) => {
  switch (domain) {
    case 'nutrition': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'exercise': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'recovery': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

const getDomainEmoji = (domain: string) => {
  switch (domain) {
    case 'nutrition': return '🥗';
    case 'exercise': return '💪';
    case 'recovery': return '🧘';
    default: return '✨';
  }
};

export function StartPack({ onHabitsStarted, onSkip }: StartPackProps) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<StartPackRecommendation[]>([]);
  const [selectedHabits, setSelectedHabits] = useState<Set<string>>(new Set());
  const [scheduleType, setScheduleType] = useState<'daily' | 'weekly'>('daily');
  const [selectedDays, setSelectedDays] = useState<string[]>(['mon', 'wed', 'fri']);
  const [reminderTime, setReminderTime] = useState<string>('08:00');
  const [useReminder, setUseReminder] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user]);

  const fetchRecommendations = async () => {
    try {
      const { data, error } = await supabase.rpc('rpc_recommend_habits' as any, {
        p_limit: 6
      });

      if (error) throw error;
      
      // Auto-select first 3-4 recommendations
      const recs = (data || []).map((rec: any) => ({
        ...rec,
        summary: rec.summary || '' // Provide fallback for summary
      }));
      setRecommendations(recs);
      
      const autoSelected = new Set<string>(recs.slice(0, Math.min(4, recs.length)).map((r: any) => r.slug as string));
      setSelectedHabits(autoSelected);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = (slug: string) => {
    const newSelected = new Set(selectedHabits);
    if (newSelected.has(slug)) {
      newSelected.delete(slug);
    } else {
      newSelected.add(slug);
    }
    setSelectedHabits(newSelected);
  };

  const handleStartAll = async () => {
    if (selectedHabits.size === 0) return;
    
    setSubmitting(true);
    try {
      const schedule = scheduleType === 'daily' 
        ? { type: 'daily' }
        : { type: 'weekly', days: selectedDays };

      const items = Array.from(selectedHabits).map(slug => ({
        slug,
        schedule,
        reminder_at: useReminder ? reminderTime : null
      }));

      const { data, error } = await supabase.rpc('rpc_add_user_habits_bulk' as any, {
        p_items: items
      });

      if (error) throw error;

      const createdHabits = data || [];
      
      // Track analytics
      track('habit_start_pack', {
        count: createdHabits.length,
        source: 'start_pack',
        time_set: useReminder,
        schedule: schedule.type
      });

      // Track individual habit starts
      createdHabits.forEach(({ slug }: { slug: string }) => {
        track('habit_started', { slug, source: 'start_pack' });
        emitHabitStarted({ slug });
      });

      toastOnce('success', 'Added • We\'ll remind & track it.');
      
      // Scroll to habits rail and focus first new habit
      setTimeout(() => {
        const railElement = document.querySelector('[data-section="your-habits"]');
        if (railElement) {
          railElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);

      onHabitsStarted();
    } catch (error) {
      console.error('Error starting habits:', error);
      toastOnce('error', 'Failed to start habits. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="p-0 pb-6">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Sparkles className="w-6 h-6" />
          Start Your Habit Journey
        </CardTitle>
        <p className="text-muted-foreground">
          We've picked some great habits to get you started. Select the ones that appeal to you most.
        </p>
      </CardHeader>

      <CardContent className="p-0 space-y-6">
        {/* Habit Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((rec) => (
            <Card 
              key={rec.slug}
              className={`cursor-pointer transition-all ${
                selectedHabits.has(rec.slug) 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => toggleHabit(rec.slug)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getDomainEmoji(rec.domain)}</span>
                    <Badge variant="secondary" className={getDomainColor(rec.domain)}>
                      {rec.domain}
                    </Badge>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedHabits.has(rec.slug) 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : 'border-muted-foreground/30'
                  }`}>
                    {selectedHabits.has(rec.slug) && <Check className="w-3 h-3" />}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm">{rec.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{rec.summary || 'Great habit to start with'}</p>
                  <p className="text-xs text-primary mt-2 italic">Why: {rec.reason}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Settings */}
        {selectedHabits.size > 0 && (
          <Card className="p-4 bg-muted/30">
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schedule & Reminders
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Schedule Type */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Frequency</Label>
                  <RadioGroup
                    value={scheduleType}
                    onValueChange={(value: 'daily' | 'weekly') => setScheduleType(value)}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="daily" id="daily" />
                      <Label htmlFor="daily" className="text-sm">Daily</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="weekly" id="weekly" />
                      <Label htmlFor="weekly" className="text-sm">3x per week (Mon/Wed/Fri)</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Reminder Time */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Reminder Time
                  </Label>
                  <div className="flex items-center gap-3">
                    <Toggle
                      pressed={useReminder}
                      onPressedChange={setUseReminder}
                      variant="outline"
                      size="sm"
                    >
                      {useReminder ? 'On' : 'Off'}
                    </Toggle>
                    {useReminder && (
                      <Input
                        type="time"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="w-32"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={handleStartAll}
            disabled={selectedHabits.size === 0 || submitting}
            className="flex-1 text-base py-6"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            {submitting ? 'Starting...' : `Start all (${selectedHabits.size})`}
          </Button>
          <Button
            variant="outline"
            onClick={onSkip}
            className="sm:w-auto px-8"
            size="lg"
          >
            Pick individually
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}