import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Star, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StretchingReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StretchingReminderModal: React.FC<StretchingReminderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [timeOfDay, setTimeOfDay] = useState('07:00');
  const [recurrence, setRecurrence] = useState('daily');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const loadExistingReminder = async () => {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;

        const { data } = await supabase
          .from('stretching_reminders')
          .select('*')
          .eq('user_id', user.user.id)
          .maybeSingle();

        if (data) {
          setTimeOfDay(data.time_of_day);
          setRecurrence(data.recurrence);
        }
      };

      loadExistingReminder();
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('stretching_reminders')
        .upsert({
          user_id: user.user.id,
          time_of_day: timeOfDay,
          recurrence: recurrence,
        });

      if (error) throw error;

      toast({
        title: "Stretching reminder set! 🤸",
        description: `You'll be reminded at ${timeOfDay} ${recurrence}`,
      });

      onClose();
    } catch (error) {
      console.error('Error saving stretching reminder:', error);
      toast({
        title: "Error",
        description: "Failed to save stretching reminder",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-orange-900 via-amber-900 to-yellow-900 border-orange-800/50 text-white">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="p-3 rounded-full bg-orange-800/30 backdrop-blur-sm">
              <Activity className="h-6 w-6 text-orange-300" />
            </div>
            <Star className="h-4 w-4 text-yellow-300 animate-pulse" />
          </div>
          <DialogTitle className="text-center text-xl font-semibold text-orange-100">
            Daily Stretching Reminder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="time" className="text-orange-200 flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Reminder Time</span>
            </Label>
            <Input
              id="time"
              type="time"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              className="bg-orange-950/50 border-orange-700/50 text-orange-100 focus:border-orange-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-orange-200">Recurrence</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger className="bg-orange-950/50 border-orange-700/50 text-orange-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-orange-950 border-orange-700/50">
                <SelectItem value="daily" className="text-orange-100 focus:bg-orange-800/50">
                  Every day
                </SelectItem>
                <SelectItem value="weekdays" className="text-orange-100 focus:bg-orange-800/50">
                  Weekdays only
                </SelectItem>
                <SelectItem value="weekends" className="text-orange-100 focus:bg-orange-800/50">
                  Weekends only
                </SelectItem>
                <SelectItem value="custom" className="text-orange-100 focus:bg-orange-800/50">
                  Custom schedule
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="flex-1 border-orange-700/50 text-orange-200 hover:bg-orange-800/30"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white"
            >
              {isLoading ? 'Setting...' : 'Set Reminder'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};