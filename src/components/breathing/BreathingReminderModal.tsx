import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, CalendarDays } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BreathingReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder?: {
    id: string;
    reminder_time: string;
    recurrence: string;
  } | null;
}

export const BreathingReminderModal = ({ isOpen, onClose, reminder }: BreathingReminderModalProps) => {
  const [reminderTime, setReminderTime] = useState('09:00');
  const [recurrence, setRecurrence] = useState('daily');
  const [customDays, setCustomDays] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const dayOptions = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  useEffect(() => {
    if (reminder) {
      setReminderTime(reminder.reminder_time);
      setRecurrence(reminder.recurrence);
      
      if (reminder.recurrence === 'custom') {
        // Parse custom days from reminder data if needed
        setCustomDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
      } else if (reminder.recurrence === 'weekdays') {
        setCustomDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
      } else if (reminder.recurrence === 'weekends') {
        setCustomDays(['saturday', 'sunday']);
      }
    } else {
      setReminderTime('09:00');
      setRecurrence('daily');
      setCustomDays([]);
    }
  }, [reminder, isOpen]);

  const handleRecurrenceChange = (value: string) => {
    setRecurrence(value);
    if (value === 'weekdays') {
      setCustomDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
    } else if (value === 'weekends') {
      setCustomDays(['saturday', 'sunday']);
    } else if (value === 'daily') {
      setCustomDays([]);
    }
  };

  const handleCustomDayToggle = (day: string) => {
    setCustomDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (!reminderTime) {
      toast({
        title: "Error",
        description: "Please select a reminder time",
        variant: "destructive"
      });
      return;
    }

    if (recurrence === 'custom' && customDays.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one day for custom recurrence",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const reminderData = {
        user_id: user.id,
        reminder_time: reminderTime,
        recurrence: recurrence
      };

      if (reminder) {
        // Update existing reminder
        const { error } = await supabase
          .from('breathing_reminders')
          .update(reminderData)
          .eq('id', reminder.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Breathing reminder updated successfully"
        });
      } else {
        // Create new reminder
        const { error } = await supabase
          .from('breathing_reminders')
          .upsert(reminderData, { onConflict: 'user_id' });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Breathing reminder created successfully"
        });
      }

      onClose();
    } catch (error) {
      console.error('Error saving breathing reminder:', error);
      toast({
        title: "Error",
        description: "Failed to save breathing reminder. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {reminder ? 'Edit Breathing Reminder' : 'Set Breathing Reminder'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Time Selection */}
          <div className="space-y-2">
            <Label htmlFor="reminder-time">Reminder Time</Label>
            <Input
              id="reminder-time"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Recurrence Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Recurrence
            </Label>
            
            <div className="space-y-2">
              {['daily', 'weekdays', 'weekends', 'custom'].map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={option}
                    checked={recurrence === option}
                    onCheckedChange={() => handleRecurrenceChange(option)}
                  />
                  <Label htmlFor={option} className="capitalize cursor-pointer">
                    {option === 'weekdays' ? 'Weekdays (Mon-Fri)' : 
                     option === 'weekends' ? 'Weekends (Sat-Sun)' : 
                     option === 'custom' ? 'Custom Days' : 'Daily'}
                  </Label>
                </div>
              ))}
            </div>

            {/* Custom Days Selection */}
            {recurrence === 'custom' && (
              <div className="ml-6 space-y-2">
                <Label className="text-sm text-muted-foreground">Select Days:</Label>
                <div className="grid grid-cols-2 gap-2">
                  {dayOptions.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={day.value}
                        checked={customDays.includes(day.value)}
                        onCheckedChange={() => handleCustomDayToggle(day.value)}
                      />
                      <Label htmlFor={day.value} className="text-sm cursor-pointer">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="flex-1">
            {isLoading ? 'Saving...' : reminder ? 'Update Reminder' : 'Set Reminder'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};