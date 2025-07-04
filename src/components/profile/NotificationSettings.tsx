
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Bell, Clock, Smartphone, Brain, Heart, Droplets, Target, Calendar } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNotifications } from '@/contexts/NotificationContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

export const NotificationSettings = () => {
  const isMobile = useIsMobile();
  const { preferences, updatePreferences, requestPushPermission } = useNotifications();
  const { permission, requestPermission, hasPermission } = usePushNotifications();

  const smartCoachNotifications = [
    { 
      key: 'mealReminders', 
      label: 'Meal Logging Reminders', 
      description: 'Gentle nudges to log meals at 12 PM and 6 PM',
      icon: Target
    },
    { 
      key: 'hydrationNudges', 
      label: 'Hydration Nudges', 
      description: 'Reminders when you haven\'t logged water for 6+ hours',
      icon: Droplets
    },
    { 
      key: 'consistencyPraise', 
      label: 'Consistency Praise', 
      description: 'Celebrate your tracking streaks and achievements',
      icon: Heart
    },
    { 
      key: 'coachCheckins', 
      label: 'AI Coach Check-ins', 
      description: 'Suggestions to chat with your coach after 3+ days',
      icon: Brain
    },
    { 
      key: 'progressReflection', 
      label: 'Weekly Progress Reflection', 
      description: 'Sunday reminders to review your weekly progress',
      icon: Calendar
    },
  ];

  const generalNotifications = [
    { key: 'reminders', label: 'General Reminders', description: 'Daily reminders to stay on track' },
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

  const handleDeliveryModeChange = (value: string) => {
    updatePreferences({ deliveryMode: value as 'toast' | 'push' | 'both' });
  };

  const handlePushPermissionRequest = async () => {
    const granted = await requestPermission();
    if (granted) {
      updatePreferences({ pushEnabled: true });
      toast.success('Push notifications enabled! You\'ll receive notifications even when the app is closed.');
    } else {
      toast.error('Push notifications were denied. You can enable them in your browser settings.');
    }
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
        {/* Push Notification Setup */}
        <div className="space-y-3">
          <h4 className={`font-semibold text-gray-900 dark:text-white flex items-center space-x-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
            <Smartphone className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
            <span>Push Notifications</span>
          </h4>
          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
                  Enable Push Notifications
                </div>
                <div className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  Get notified even when the app is closed
                </div>
              </div>
              {!hasPermission ? (
                <Button 
                  onClick={handlePushPermissionRequest}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Enable
                </Button>
              ) : (
                <div className="text-emerald-600 text-sm font-medium">✓ Enabled</div>
              )}
            </div>
            {permission === 'denied' && (
              <div className="text-amber-600 text-xs mt-2">
                Push notifications are blocked. Enable them in your browser settings to receive notifications.
              </div>
            )}
          </div>
        </div>

        {/* Delivery Mode */}
        <div className="space-y-3">
          <h4 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
            Delivery Method
          </h4>
          <Select value={preferences.deliveryMode} onValueChange={handleDeliveryModeChange}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toast">Toast Only - Show when app is open</SelectItem>
              <SelectItem value="push">Push Only - Send to device when app is closed</SelectItem>
              <SelectItem value="both">Both - Smart delivery based on app state</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Smart Coach Notifications */}
        <div className="space-y-4">
          <h4 className={`font-semibold text-gray-900 dark:text-white flex items-center space-x-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
            <Brain className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-purple-600`} />
            <span>Smart Coach Notifications</span>
          </h4>
          <div className="space-y-3">
            {smartCoachNotifications.map(({ key, label, description, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-emerald-50 dark:from-purple-900/20 dark:to-emerald-900/20">
                <div className="flex-1 flex items-center space-x-3">
                  <Icon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600`} />
                  <div>
                    <div className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
                      {label}
                    </div>
                    <div className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      {description}
                    </div>
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

        {/* General Notification Types */}
        <div className="space-y-4">
          <h4 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
            General Notifications
          </h4>
          <div className="space-y-3">
            {generalNotifications.map(({ key, label, description }) => (
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
