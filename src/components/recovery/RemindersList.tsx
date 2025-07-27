import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Clock, Repeat } from "lucide-react";

interface Reminder {
  id: string;
  title: string;
  reminder_time: string;
  repeat_pattern: string;
  content_id?: string;
}

interface RemindersListProps {
  reminders: Reminder[];
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
}

export const RemindersList: React.FC<RemindersListProps> = ({ 
  reminders, 
  onEdit, 
  onDelete 
}) => {
  const formatTime = (time: string) => {
    try {
      return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return time;
    }
  };

  const getRepeatLabel = (pattern: string) => {
    switch (pattern) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'custom':
        return 'Custom';
      default:
        return pattern;
    }
  };

  if (reminders.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-foreground mb-2">No reminders yet</h3>
        <p className="text-sm text-muted-foreground">
          Create your first meditation reminder to stay consistent with your practice.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-background/50 rounded-lg border border-border/50 hover:border-primary/30 transition-all duration-200"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="font-medium text-foreground">{reminder.title}</h4>
              {reminder.content_id && (
                <Badge variant="secondary" className="text-xs">
                  Session-specific
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatTime(reminder.reminder_time)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                <span>{getRepeatLabel(reminder.repeat_pattern)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(reminder)}
              className="h-8 w-8 hover:bg-accent/50"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(reminder.id)}
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};