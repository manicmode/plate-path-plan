import React, { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Toggle } from '@/components/ui/toggle';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { HabitTemplate } from '@/hooks/useHabitTemplatesV2';
import { Clock } from 'lucide-react';
import { useEffect } from 'react';
import { useHabitManagement } from '@/hooks/useHabitManagement';

interface StartHabitSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: HabitTemplate | null;
  userHabit?: any; // For edit mode
  onSuccess: () => void;
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

export function StartHabitSheet({ open, onOpenChange, template, userHabit, onSuccess }: StartHabitSheetProps) {
  const [scheduleType, setScheduleType] = useState<'daily' | 'weekly'>('daily');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [reminderTime, setReminderTime] = useState<string>('08:00');
  const [target, setTarget] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<{ reminderTime?: string; schedule?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isEditMode = !!userHabit;
  const { addHabit, updateHabit, loading } = useHabitManagement();
  const { toast } = useToast();

  // Pre-fill form when in edit mode
  useEffect(() => {
    if (isEditMode && userHabit) {
      setScheduleType(userHabit.schedule?.type || 'daily');
      setSelectedDays(userHabit.schedule?.days || []);
      setReminderTime(userHabit.reminder_at || '08:00');
      setTarget(userHabit.target?.toString() || '');
      setNotes(userHabit.notes || '');
    } else if (template) {
      // Reset to defaults for new habit
      setScheduleType('daily');
      setSelectedDays([]);
      setReminderTime('08:00');
      setTarget(template.default_target?.toString() || '');
      setNotes('');
    }
  }, [isEditMode, userHabit, template]);

  const handleDayToggle = (day: string, pressed: boolean) => {
    setSelectedDays(prev => 
      pressed 
        ? [...prev, day]
        : prev.filter(d => d !== day)
    );
  };

  const handleSubmit = async () => {
    if (!template) return;

    // Validation
    if (scheduleType === 'weekly' && selectedDays.length === 0) {
      return; // Button should be disabled, but extra safety
    }

    // Validate time format
    if (reminderTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(reminderTime)) {
      setErrors({ reminderTime: 'Please enter a valid time format (HH:MM)' });
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      // Build schedule object
      const schedule = scheduleType === 'daily' 
        ? { type: 'daily' }
        : { type: 'weekly', days: selectedDays };

      // Parse target as number if provided
      const targetValue = target ? parseFloat(target) : null;

      // Parse reminder time
      const reminderAt = reminderTime || null;

      if (isEditMode && userHabit) {
        // Update existing habit
        const { error } = await supabase.rpc('rpc_update_user_habit', {
          p_user_habit_id: userHabit.id,
          p_schedule: schedule,
          p_reminder_at: reminderAt,
          p_target: targetValue,
          p_notes: notes || null
        });

        if (error) throw error;

        toast({
          title: "Saved • Schedule & reminders updated",
        });
      } else {
        // Add new habit
        const { error } = await supabase.rpc('rpc_add_user_habit', {
          p_slug: template.slug,
          p_schedule: schedule,
          p_reminder_at: reminderAt,
          p_target: targetValue,
          p_notes: notes || null
        });

        if (error) throw error;

        toast({
          title: "Added • We'll remind & track it",
        });

        // Smooth scroll to Your Habits section after adding
        setTimeout(() => {
          const yourHabitsElement = document.querySelector('h2:has-text("Your Habits"), [aria-label*="habits"]');
          if (yourHabitsElement) {
            yourHabitsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }

      // Reset form
      setScheduleType('daily');
      setSelectedDays([]);
      setReminderTime('08:00');
      setTarget('');
      setNotes('');
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving habit:', error);
      toast({
        title: isEditMode ? "Failed to update habit" : "Failed to start habit",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!template) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Start this habit</SheetTitle>
          <SheetDescription>
            Configure your schedule and preferences for "{template.name}"
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Schedule */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Schedule</Label>
            <RadioGroup
              value={scheduleType}
              onValueChange={(value) => setScheduleType(value as 'daily' | 'weekly')}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily">Daily</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly">Weekly</Label>
              </div>
            </RadioGroup>
            
            {scheduleType === 'weekly' && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Choose days</Label>
                <div className="flex flex-wrap gap-1">
                  {WEEKDAYS.map((day) => (
                    <Toggle
                      key={day.value}
                      size="sm"
                      pressed={selectedDays.includes(day.value)}
                      onPressedChange={(pressed) => handleDayToggle(day.value, pressed)}
                    >
                      {day.label}
                    </Toggle>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reminder time */}
          <div className="space-y-2">
            <Label htmlFor="reminder" className="text-sm font-medium">
              Reminder time (optional)
            </Label>
            <div className="relative">
              <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="reminder"
                type="time"
                value={reminderTime}
                onChange={(e) => {
                  setReminderTime(e.target.value);
                  if (errors.reminderTime) {
                    setErrors({ ...errors, reminderTime: undefined });
                  }
                }}
                className={`pl-10 ${errors.reminderTime ? 'border-destructive' : ''}`}
                placeholder="HH:MM"
              />
            </div>
            {errors.reminderTime && (
              <p className="text-sm text-destructive mt-1">{errors.reminderTime}</p>
            )}
          </div>

          {/* Target */}
          {template.goal_type !== 'bool' && (
            <div className="space-y-2">
              <Label htmlFor="target" className="text-sm font-medium">
                Target (optional)
              </Label>
              <Input
                id="target"
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={template.default_target?.toString() || 
                  (template.goal_type === 'duration' ? 'Minutes' : 'Count')}
                min="0"
                step={template.goal_type === 'duration' ? '1' : '0.1'}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes or reminders..."
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || (scheduleType === 'weekly' && selectedDays.length === 0)}
              className="flex-1"
            >
              {loading ? (isEditMode ? 'Saving...' : 'Starting...') : (isEditMode ? 'Save changes' : 'Start habit')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}