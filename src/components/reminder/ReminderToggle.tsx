import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Bell, Clock, X } from 'lucide-react';
import { ReminderForm } from './ReminderForm';
import { useReminders } from '@/hooks/useReminders';

interface ReminderToggleProps {
  foodName: string;
  foodData?: any;
  className?: string;
  onReminderOpen?: () => void;
  onReminderClose?: () => void;
}

const CONFIRM_FIX_REV = "2025-08-31T15:35Z-r10";

export const ReminderToggle: React.FC<ReminderToggleProps> = ({
  foodName,
  foodData,
  className = '',
  onReminderOpen,
  onReminderClose
}) => {
  const [createReminder, setCreateReminder] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const { createReminder: saveReminder } = useReminders();

  const handleToggleChange = (checked: boolean) => {
    setCreateReminder(checked);
    if (checked) {
      setShowReminderForm(true);
      onReminderOpen?.();
      console.log('[REMINDER][MODAL]', { rev: CONFIRM_FIX_REV, open: true });
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
      onReminderClose?.();
      console.log('[REMINDER][MODAL]', { rev: CONFIRM_FIX_REV, open: false });
    } catch (error) {
      setCreateReminder(false);
      onReminderClose?.();
      console.log('[REMINDER][MODAL]', { rev: CONFIRM_FIX_REV, open: false });
    }
  };

  const handleFormCancel = () => {
    setShowReminderForm(false);
    setCreateReminder(false);
    onReminderClose?.();
    console.log('[REMINDER][MODAL]', { rev: CONFIRM_FIX_REV, open: false });
  };

  // DOM close button census when modal opens
  useEffect(() => {
    if (!showReminderForm) return;
    const list = Array.from(document.querySelectorAll('button[aria-label="Close"]')).map(b => ({
      inConfirm: !!b.closest('[data-dialog-root="confirm-food-log"]'),
      inReminder: !!b.closest('[data-dialog-root="reminder-modal"]'),
      keep: b.hasAttribute('data-keep-close'),
    }));
    console.log('[A11Y][CLOSE-COUNT]', {
      rev: CONFIRM_FIX_REV,
      confirm: list.filter(x => x.inConfirm).length,
      reminder: list.filter(x => x.inReminder).length,
      detail: list
    });
  }, [showReminderForm]);

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

      <Dialog open={showReminderForm} onOpenChange={(open) => {
        setShowReminderForm(open);
        if (!open) {
          onReminderClose?.();
        }
      }}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={false}
          data-dialog-root="reminder-modal"
          aria-labelledby="reminder-title"
        >
          {/* A11y-only title to satisfy Radix without adding a visible header */}
          <VisuallyHidden>
            <DialogTitle id="reminder-title">Create Reminder</DialogTitle>
          </VisuallyHidden>
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