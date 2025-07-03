
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Clock } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNotifications } from '@/contexts/NotificationContext';

export const NotificationSettings = () => {
  const isMobile = useIsMobile();
  const { preferences, updatePreferences } = useNotifications();

  const notificationTypes = [
    { key: 'reminders', label: 'Daily Reminders', description: 'Gentle nudges to log your meals' },
    { key: 'milestones', label: 'Milestone Celebrations', description: 'Celebrate your streaks and achievements' },
    { key: 'progressSuggestions', label: 'Progress Suggestions', description: 'Helpful tips when goals are low' },
    { key: 'smartTips', label: 'Smart Tips', description: 'Insights about missing nutrition categories' },
    { key: 'overlimitAlerts', label: 'Overlimit Alerts', description: 'Friendly heads-up when exceeding goals' },
    { key: 'encouragement', label: 'Encouragement', description: 'Support during challenging days' },
    { key: 'reEngagement', label: 'Re-engagement', description: 'Welcome back messages after breaks' },
  ];

  const handleToggle = (key: string, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  const handleFrequencyChange = (value: string) => {
    updatePreferences({ frequency: value as 'normal' | 'low' });
  };

  const handleQuietHoursChange = (type: 'start' | 'end', value: string) => {
    const hour = parseInt(value);
    if (type === 'start') {
      updatePreferences({ quietHoursStart: hour });
    } else {
      updatePreferences({ quietHoursEnd: hour });
    }
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
  };

  return (
    <Card className="animate-slide-up glass-card border-0 rounded-3xl" style={{ animationDelay: '400ms' }}>
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
        <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
          <Bell className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-emerald-600`} />
          <span>Smart Notifications</span>
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0 space-y-6`}>
        {/* Notification Types */}
        <div className="space-y-4">
          <h4 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
            Notification Types
          </h4>
          <div className="space-y-3">
            {notificationTypes.map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                <div className="flex-1">
                  <div className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
                    {label}
                  </div>
                  <div className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {description}
                  </div>
                </div>
                <Switch
                  checked={preferences[key as keyof typeof preferences] as boolean}
                  onCheckedChange={(value) => handleToggle(key, value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Frequency Settings */}
        <div className="space-y-3">
          <h4 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
            Frequency
          </h4>
          <Select value={preferences.frequency} onValueChange={handleFrequencyChange}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal - Regular notifications</SelectItem>
              <SelectItem value="low">Low - Fewer notifications</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quiet Hours */}
        <div className="space-y-3">
          <h4 className={`font-semibold text-gray-900 dark:text-white flex items-center space-x-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
            <Clock className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
            <span>Quiet Hours</span>
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-gray-600 dark:text-gray-300 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Start
              </label>
              <Select 
                value={preferences.quietHoursStart.toString()} 
                onValueChange={(value) => handleQuietHoursChange('start', value)}
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {formatHour(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={`block text-gray-600 dark:text-gray-300 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                End
              </label>
              <Select 
                value={preferences.quietHoursEnd.toString()} 
                onValueChange={(value) => handleQuietHoursChange('end', value)}
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {formatHour(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className={`text-gray-500 dark:text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            No notifications will be sent during these hours
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
