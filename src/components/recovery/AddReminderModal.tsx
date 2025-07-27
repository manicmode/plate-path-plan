import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Clock, Plus } from "lucide-react";

interface Reminder {
  id: string;
  title: string;
  reminder_time: string;
  repeat_pattern: string;
  content_id?: string;
}

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reminderData?: {
    title: string;
    reminder_time: string;
    repeat_pattern: string;
    content_id?: string;
  }) => void;
  editingReminder?: Reminder | null;
  availableSessions?: Array<{ id: string; title: string; }>;
  defaultTitle?: string;
  contentType?: string;
  contentId?: string;
}

export const AddReminderModal: React.FC<AddReminderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingReminder,
  availableSessions = [],
  defaultTitle = 'Meditation Reminder',
  contentType = 'meditation',
  contentId
}) => {
  const [title, setTitle] = useState(defaultTitle);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [repeatPattern, setRepeatPattern] = useState('daily');
  const [isSessionSpecific, setIsSessionSpecific] = useState(!!contentId);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(contentId || '');

  // Reset form when modal opens/closes or editing changes
  useEffect(() => {
    if (isOpen) {
      if (editingReminder) {
        setTitle(editingReminder.title);
        setReminderTime(editingReminder.reminder_time);
        setRepeatPattern(editingReminder.repeat_pattern);
        setIsSessionSpecific(!!editingReminder.content_id);
        setSelectedSessionId(editingReminder.content_id || '');
      } else {
        setTitle(defaultTitle);
        setReminderTime('09:00');
        setRepeatPattern('daily');
        setIsSessionSpecific(!!contentId);
        setSelectedSessionId(contentId || '');
      }
    }
  }, [isOpen, editingReminder, defaultTitle, contentId]);

  const handleSave = () => {
    if (!title.trim() || !reminderTime) return;

    onSave({
      title: title.trim(),
      reminder_time: reminderTime,
      repeat_pattern: repeatPattern,
      content_id: isSessionSpecific ? selectedSessionId : undefined
    });

    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              {editingReminder ? <Clock className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
            </div>
            <div>
              <DialogTitle>
                {editingReminder ? 'Edit Reminder' : 'Add Meditation Reminder'}
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
          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title">Reminder Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter reminder title"
              className="w-full"
            />
          </div>

          {/* Time Input */}
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Repeat Pattern */}
          <div className="space-y-2">
            <Label htmlFor="repeat">Repeat</Label>
            <Select value={repeatPattern} onValueChange={setRepeatPattern}>
              <SelectTrigger>
                <SelectValue placeholder="Select repeat pattern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Session-specific toggle */}
          {availableSessions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Session-specific</Label>
                  <p className="text-sm text-muted-foreground">
                    Link this reminder to a specific meditation session
                  </p>
                </div>
                <Switch
                  checked={isSessionSpecific}
                  onCheckedChange={setIsSessionSpecific}
                />
              </div>

              {/* Session selector */}
              {isSessionSpecific && (
                <div className="space-y-2">
                  <Label htmlFor="session">Select Session</Label>
                  <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a session" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!title.trim() || !reminderTime}
            className="gap-2"
          >
            {editingReminder ? <Clock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingReminder ? 'Update Reminder' : 'Add Reminder'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};