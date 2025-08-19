import React, { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { HabitTemplate } from '@/hooks/useHabitTemplatesV2';
import { toastOnce } from '@/lib/toastOnce';
import { track } from '@/lib/analytics';

interface QuickLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: HabitTemplate | null;
  userHabit: any;
  onSuccess: () => void;
  source?: 'hero' | 'for_you' | 'carousel' | 'list' | 'rail' | 'bell';
}

const QUICK_PICKS_DURATION = [15, 30, 60];
const QUICK_PICKS_COUNT = [1, 5, 10];

export function QuickLogSheet({ open, onOpenChange, template, userHabit, onSuccess, source }: QuickLogSheetProps) {
  const [amount, setAmount] = useState<string>('');
  const [durationMin, setDurationMin] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();

  const handleQuickPick = (value: number, type: 'duration' | 'count') => {
    if (type === 'duration') {
      setDurationMin(value.toString());
    } else {
      setAmount(value.toString());
    }
  };

  const handleSubmit = async () => {
    if (!template || !userHabit) return;

    try {
      setIsSubmitting(true);

      const { data, error } = await supabase.rpc('rpc_log_habit', {
        p_slug: template.slug,
        p_amount: amount ? parseFloat(amount) : null,
        p_duration_min: durationMin ? parseFloat(durationMin) : null,
        p_completed: true,
        p_meta: {}
      });

      if (error) throw error;

      track('habit_logged', { slug: template.slug, source: source || 'sheet' });
      toastOnce('success', 'Logged • Nice work.');

      // Reset form
      setAmount('');
      setDurationMin('');
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error logging habit:', error);
      toast({
        title: "Failed to log habit",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!template || !userHabit) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Log habit</SheetTitle>
          <SheetDescription>
            Record your completion of "{template.name}"
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Duration input for duration goal type */}
          {template.goal_type === 'duration' && (
            <div className="space-y-3">
              <Label htmlFor="duration" className="text-sm font-medium">
                Duration (minutes)
              </Label>
              <div className="space-y-2">
                <Input
                  id="duration"
                  type="number"
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  placeholder={userHabit.target?.toString() || template.default_target?.toString() || '30'}
                  min="0"
                  step="1"
                />
                <div className="flex gap-1">
                  {QUICK_PICKS_DURATION.map((minutes) => (
                    <Button
                      key={minutes}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickPick(minutes, 'duration')}
                      className="text-xs"
                    >
                      {minutes}m
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Amount input for count goal type */}
          {template.goal_type === 'count' && (
            <div className="space-y-3">
              <Label htmlFor="amount" className="text-sm font-medium">
                Count
              </Label>
              <div className="space-y-2">
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={userHabit.target?.toString() || template.default_target?.toString() || '1'}
                  min="0"
                  step="0.1"
                />
                <div className="flex gap-1">
                  {QUICK_PICKS_COUNT.map((count) => (
                    <Button
                      key={count}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickPick(count, 'count')}
                      className="text-xs"
                    >
                      {count}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* For bool type, no extra inputs needed */}
          {template.goal_type === 'bool' && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Ready to mark this habit as completed?
              </p>
            </div>
          )}

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
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Logging...' : 'Log completion'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}