import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Bell } from 'lucide-react';
import { ReminderForm } from './ReminderForm';
import { useReminders } from '@/hooks/useReminders';

interface MealSetReminderToggleProps {
  mealSetName: string;
  mealSetData: any;
  className?: string;
  onReminderOpen?: () => void;
  onReminderClose?: () => void;
}

export const MealSetReminderToggle: React.FC<MealSetReminderToggleProps> = ({
  mealSetName,
  mealSetData,
  className = '',
  onReminderOpen,
  onReminderClose
}) => {
  const [createReminder, setCreateReminder] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const { createReminder: saveReminder } = useReminders();

  // Lock body scroll when reminder modal is open
  useEffect(() => {
    if (showReminderForm) {
      document.body.dataset.modalOpen = "true";
    } else {
      delete document.body.dataset.modalOpen;
    }
    
    // Cleanup on unmount
    return () => {
      delete document.body.dataset.modalOpen;
    };
  }, [showReminderForm]);

  const handleToggleChange = (checked: boolean) => {
    setCreateReminder(checked);
    if (checked) {
      setShowReminderForm(true);
      onReminderOpen?.();
    }
  };

  const handleReminderSubmit = async (reminderData: any) => {
    try {
      await saveReminder({
        ...reminderData,
        food_item_data: mealSetData,
        payload: { meal_set: true }
      });
      setShowReminderForm(false);
      setCreateReminder(false);
      onReminderClose?.();
    } catch (error) {
      setCreateReminder(false);
      onReminderClose?.();
    }
  };

  const handleFormCancel = () => {
    setShowReminderForm(false);
    setCreateReminder(false);
    onReminderClose?.();
  };

  return (
    <>
      <div className={`rounded-2xl border border-white/10 bg-white/5 p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Bell className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <Label className="text-[15px] font-semibold text-white">
                Set Reminder
              </Label>
              <p className="text-xs text-white/60">
                Get reminded to eat this set again
              </p>
            </div>
          </div>
          <Switch
            checked={createReminder}
            onCheckedChange={handleToggleChange}
            className="data-[state=checked]:bg-emerald-500"
          />
        </div>
      </div>

      <Dialog open={showReminderForm} onOpenChange={(open) => {
        setShowReminderForm(open);
        if (!open) {
          setCreateReminder(false);
          onReminderClose?.();
        }
      }}>
        <DialogContent
          className="sm:max-w-md z-[130]"
          showCloseButton={false}
          data-dialog-root="reminder-modal"
          aria-labelledby="reminder-title"
        >
          {/* A11y-only title to satisfy Radix without adding a visible header */}
          <VisuallyHidden>
            <DialogTitle id="reminder-title">Create Meal Set Reminder</DialogTitle>
          </VisuallyHidden>
          <ReminderForm
            prefilledData={{
              label: `Eat ${mealSetName}`,
              type: 'meal',
              food_item_data: mealSetData
            }}
            onSubmit={handleReminderSubmit}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};