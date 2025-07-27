import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Moon, CalendarDays } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SleepReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder?: {
    id: string;
    time_of_day: string;
    recurrence: string;
  } | null;
}

export const SleepReminderModal = ({ isOpen, onClose, reminder }: SleepReminderModalProps) => {
  const [reminderTime, setReminderTime] = useState('21:30');
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
      setReminderTime(reminder.time_of_day);
      setRecurrence(reminder.recurrence);
      
      if (reminder.recurrence === 'custom') {
        setCustomDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
      } else if (reminder.recurrence === 'weekdays') {
        setCustomDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
      } else if (reminder.recurrence === 'weekends') {
        setCustomDays(['saturday', 'sunday']);
      }
    } else {
      setReminderTime('21:30');
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
        time_of_day: reminderTime,
        recurrence: recurrence
      };

      if (reminder) {
        // Update existing reminder
        const { error } = await supabase
          .from('sleep_reminders')
          .update(reminderData)
          .eq('id', reminder.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Sleep reminder updated successfully"
        });
      } else {
        // Create new reminder
        const { error } = await supabase
          .from('sleep_reminders')
          .upsert(reminderData, { onConflict: 'user_id' });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Sleep reminder created successfully"
        });
      }

      onClose();
    } catch (error) {
      console.error('Error saving sleep reminder:', error);
      toast({
        title: "Error",
        description: "Failed to save sleep reminder. Please try again.",
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
            <Moon className="h-5 w-5 text-indigo-600" />
            {reminder ? 'Edit Sleep Reminder' : 'Set Sleep Reminder'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Time Selection */}
          <div className="space-y-2">
            <Label htmlFor="reminder-time">Sleep Preparation Time</Label>
            <Input
              id="reminder-time"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Choose when you'd like to start winding down for sleep
            </p>
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
          <Button onClick={handleSave} disabled={isLoading} className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700">
            {isLoading ? 'Saving...' : reminder ? 'Update Reminder' : 'Set Reminder'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};