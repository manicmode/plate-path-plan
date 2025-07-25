import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bell, Clock } from 'lucide-react';
import { ReminderForm } from './ReminderForm';
import { useReminders } from '@/hooks/useReminders';

interface ReminderToggleProps {
  foodName: string;
  foodData?: any;
  className?: string;
}

export const ReminderToggle: React.FC<ReminderToggleProps> = ({
  foodName,
  foodData,
  className = ''
}) => {
  const [createReminder, setCreateReminder] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const { createReminder: saveReminder } = useReminders();

  const handleToggleChange = (checked: boolean) => {
    setCreateReminder(checked);
    if (checked) {
      setShowReminderForm(true);
    }
  };

  const handleReminderSubmit = async (reminderData: any) => {
    try {
      await saveReminder({
        ...reminderData,
        food_item_data: foodData
      });
      setShowReminderForm(false);
      setCreateReminder(false);
    } catch (error) {
      setCreateReminder(false);
    }
  };

  const handleFormCancel = () => {
    setShowReminderForm(false);
    setCreateReminder(false);
  };

  return (
    <>
      <div className={`flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
            <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Set Reminder
            </Label>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Get notified to take this again
            </p>
          </div>
        </div>
        <Switch
          checked={createReminder}
          onCheckedChange={handleToggleChange}
        />
      </div>

      <Dialog open={showReminderForm} onOpenChange={setShowReminderForm}>
        <DialogContent className="sm:max-w-md">
          <ReminderForm
            prefilledData={{
              label: `Take ${foodName}`,
              type: foodName.toLowerCase().includes('supplement') || foodName.toLowerCase().includes('vitamin') ? 'supplement' : 'meal',
              food_item_data: foodData
            }}
            onSubmit={handleReminderSubmit}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};