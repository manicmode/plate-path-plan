import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Thermometer, Snowflake } from 'lucide-react';

interface ThermotherapyReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThermotherapyReminderModal({ isOpen, onClose }: ThermotherapyReminderModalProps) {
  const [time, setTime] = useState('06:30');
  const [recurrence, setRecurrence] = useState('daily');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchThermotherapyReminder();
    }
  }, [isOpen]);

  const fetchThermotherapyReminder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('thermotherapy_reminders')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setTime(data.time_of_day.slice(0, 5));
        setRecurrence(data.recurrence);
      }
    } catch (error) {
      console.error('Error fetching thermotherapy reminder:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('thermotherapy_reminders')
        .upsert({
          user_id: user.id,
          time_of_day: time,
          recurrence,
        });

      if (error) throw error;

      toast({
        title: "Reminder Saved",
        description: "Your thermotherapy reminder has been set.",
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving thermotherapy reminder:', error);
      toast({
        title: "Error",
        description: "Failed to save reminder. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        });
        options.push({ value: timeString, label: displayTime });
      }
    }
    return options;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-r from-blue-900/90 to-red-900/90 border border-white/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="flex items-center">
              <Snowflake className="h-5 w-5 text-blue-300" />
              <Thermometer className="h-5 w-5 text-red-400 ml-1" />
            </div>
            Set Thermotherapy Reminder
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="time" className="text-white/90">Reminder Time</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20">
                {generateTimeOptions().map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="text-white hover:bg-white/10"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurrence" className="text-white/90">Recurrence</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20">
                <SelectItem value="daily" className="text-white hover:bg-white/10">Daily</SelectItem>
                <SelectItem value="custom" className="text-white hover:bg-white/10">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 text-white"
            >
              {loading ? 'Saving...' : 'Save Reminder'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}