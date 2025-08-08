import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Moon, Clock, TestTube, Send } from 'lucide-react';
import { useMoodCheckinPrefs } from '@/hooks/useMoodCheckinPrefs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const MoodCheckinSettings: React.FC = () => {
  const { preferences, loading, updatePreferences } = useMoodCheckinPrefs();
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleEnabledChange = (enabled: boolean) => {
    updatePreferences({ enabled });
  };

  const handleTimeChange = (time: string) => {
    updatePreferences({ reminder_time_local: time });
  };

  const handleTimezoneChange = (timezone: string) => {
    updatePreferences({ timezone });
  };

  const sendTestNotification = async () => {
    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-mood-checkin-reminder', {
        body: { 
          test_mode: true,
          target_user_id: preferences?.user_id 
        }
      });

      if (error) {
        console.error('Error sending test notification:', error);
        toast.error('Failed to send test notification');
      } else {
        toast.success('Test notification sent successfully!');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsSendingTest(false);
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
          hour12: true
        });
        options.push({ value: timeString, label: displayTime });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Moon className="h-5 w-5 text-purple-600" />
          <span>Mood Check-In Reminder</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-black/20 rounded-2xl">
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              Daily Reminders
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Get notified to log your daily mood and wellness
            </div>
          </div>
          <Switch
            checked={preferences?.enabled ?? true}
            onCheckedChange={handleEnabledChange}
          />
        </div>

        {/* Time Picker */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-gray-900 dark:text-white">Reminder Time</span>
          </div>
          <Select
            value={preferences?.reminder_time_local ?? '20:30'}
            onValueChange={handleTimeChange}
            disabled={!preferences?.enabled}
          >
            <SelectTrigger className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timezone Display */}
        <div className="p-3 bg-white/50 dark:bg-black/20 rounded-2xl">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Timezone: {preferences?.timezone ?? 'Not set'}
          </div>
        </div>

        {/* Test Notification Button */}
        <div className="space-y-3">
          <Button
            onClick={sendTestNotification}
            disabled={!preferences?.enabled || isSendingTest}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-2xl"
          >
            {isSendingTest ? (
              <>
                <TestTube className="h-4 w-4 mr-2 animate-spin" />
                Sending Test...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Test Notification
              </>
            )}
          </Button>
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Test notifications are sent immediately regardless of time settings
          </div>
        </div>
      </CardContent>
    </Card>
  );
};