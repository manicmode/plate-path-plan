import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Clock, Plus, Bell } from "lucide-react";

interface MeditationReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reminderData: {
    time_of_day: string;
    recurrence: string;
  }) => void;
  editingReminder?: any;
}

const DAYS = [
  { id: 'monday', label: 'Monday', value: 'mon' },
  { id: 'tuesday', label: 'Tuesday', value: 'tue' },
  { id: 'wednesday', label: 'Wednesday', value: 'wed' },
  { id: 'thursday', label: 'Thursday', value: 'thu' },
  { id: 'friday', label: 'Friday', value: 'fri' },
  { id: 'saturday', label: 'Saturday', value: 'sat' },
  { id: 'sunday', label: 'Sunday', value: 'sun' }
];

export const MeditationReminderModal: React.FC<MeditationReminderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingReminder
}) => {
  const [timeOfDay, setTimeOfDay] = useState('09:00');
  const [recurrenceType, setRecurrenceType] = useState('daily');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Reset form when modal opens/closes or editing changes
  useEffect(() => {
    if (isOpen) {
      if (editingReminder) {
        setTimeOfDay(editingReminder.time_of_day);
        setRecurrenceType(editingReminder.recurrence === 'daily' || editingReminder.recurrence === 'weekdays' ? editingReminder.recurrence : 'custom');
        if (editingReminder.recurrence !== 'daily' && editingReminder.recurrence !== 'weekdays') {
          // Parse custom days like "mon,wed,fri"
          setSelectedDays(editingReminder.recurrence.split(','));
        } else {
          setSelectedDays([]);
        }
      } else {
        setTimeOfDay('09:00');
        setRecurrenceType('daily');
        setSelectedDays([]);
      }
    }
  }, [isOpen, editingReminder]);

  const handleSave = () => {
    if (!timeOfDay) return;

    let recurrence = recurrenceType;
    if (recurrenceType === 'custom' && selectedDays.length > 0) {
      recurrence = selectedDays.join(',');
    }

    onSave({
      time_of_day: timeOfDay,
      recurrence: recurrence
    });

    onClose();
  };

  const handleDayToggle = (dayValue: string) => {
    setSelectedDays(prev => 
      prev.includes(dayValue) 
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              {editingReminder ? <Clock className="h-4 w-4 text-primary" /> : <Bell className="h-4 w-4 text-primary" />}
            </div>
            <div>
              <DialogTitle>
                {editingReminder ? 'Edit Meditation Reminder' : '⏰ Set Meditation Reminder'}
              </DialogTitle>
              <DialogDescription>
                {editingReminder 
                  ? 'Update your meditation reminder settings.'
                  : 'Set up a reminder to maintain your meditation practice.'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Time Input */}
          <div className="space-y-2">
            <Label htmlFor="time">Time of Day</Label>
            <Input
              id="time"
              type="time"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Recurrence Options */}
          <div className="space-y-2">
            <Label htmlFor="recurrence">Recurrence</Label>
            <Select value={recurrenceType} onValueChange={setRecurrenceType}>
              <SelectTrigger>
                <SelectValue placeholder="Select recurrence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekdays">Weekdays Only</SelectItem>
                <SelectItem value="custom">Custom Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Days Selection */}
          {recurrenceType === 'custom' && (
            <div className="space-y-3">
              <Label>Select Days</Label>
              <div className="grid grid-cols-2 gap-2">
                {DAYS.map((day) => (
                  <div key={day.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={day.id}
                      checked={selectedDays.includes(day.value)}
                      onCheckedChange={() => handleDayToggle(day.value)}
                    />
                    <Label
                      htmlFor={day.id}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!timeOfDay || (recurrenceType === 'custom' && selectedDays.length === 0)}
            className="gap-2"
          >
            {editingReminder ? <Clock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingReminder ? 'Update Reminder' : 'Set Reminder'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};