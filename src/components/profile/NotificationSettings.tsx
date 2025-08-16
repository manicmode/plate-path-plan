
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Bell, Clock, Smartphone, Brain, Heart, Droplets, Target, Calendar, AlertCircle, Moon, Volume2, Wind, Sparkles, Vibrate } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNotification } from '@/contexts/NotificationContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useSound } from '@/contexts/SoundContext';
import { useHapticsPref } from '@/contexts/HapticsContext';
import { useMeditationNudges } from '@/hooks/useMeditationNudges';
import { useBreathingNudges } from '@/hooks/useBreathingNudges';
import { useYogaNudges } from '@/hooks/useYogaNudges';
import { useSleepNudges } from '@/hooks/useSleepNudges';
import { useThermotherapyNudges } from '@/hooks/useThermotherapyNudges';
import { toast } from 'sonner';
import SectionCollapsible from '@/components/ui/SectionCollapsible';
import SubCollapsible from '@/components/ui/SubCollapsible';

export const NotificationSettings = () => {
  const isMobile = useIsMobile();
  const { preferences, updatePreferences } = useNotification();
  const { permission, requestPermission, hasPermission, isSupported } = usePushNotifications();
  const { isEnabled: soundEnabled, setSoundEnabled } = useSound();
  const { enabled: hapticsEnabled, setEnabled: setHapticsEnabled } = useHapticsPref();
  const { nudgePreferences, updateNudgePreferences } = useMeditationNudges();
  const { nudgePreferences: breathingNudgePreferences, updateNudgePreferences: updateBreathingNudgePreferences } = useBreathingNudges();
  const { nudgePreferences: yogaNudgePreferences, updateNudgePreferences: updateYogaNudgePreferences } = useYogaNudges();
  const { nudgePreferences: sleepNudgePreferences, updateNudgePreferences: updateSleepNudgePreferences } = useSleepNudges();
  const { nudgePreferences: thermotherapyNudgePreferences, updateNudgePreferences: updateThermotherapyNudgePreferences } = useThermotherapyNudges();

  const params = new URLSearchParams(window.location.search);
  const openMain = params.get("open") === "notifications" || window.location.hash.startsWith("#notifications");
  const subKey = (window.location.hash.split(":")[1] || params.get("sub")) ?? "";
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
    { 
      key: 'dailyMoodCheckin', 
      label: 'Daily Mood & Wellness Check-in', 
      description: 'Nightly reminders at 8:30 PM to log your mood and wellness',
      icon: Moon
    },
    { 
      key: 'moodPredictions', 
      label: 'AI Mood Predictions', 
      description: 'Tomorrow\'s mood and energy forecasts based on your patterns',
      icon: Brain
    },
  ];

  const meditationNotifications = [
    { 
      key: 'dailyReminder', 
      label: 'Daily Reminder', 
      description: 'Scheduled daily meditation reminders',
      icon: Bell,
      setting: 'nudges_enabled'
    },
    { 
      key: 'smartAISuggestions', 
      label: 'Smart AI Suggestions', 
      description: 'AI-powered nudges based on your mood and activity patterns',
      icon: Brain,
      setting: 'smart_nudges_enabled'
    },
    { 
      key: 'pushNotifications', 
      label: 'Push Notifications (coming soon)', 
      description: 'Device notifications for meditation reminders',
      icon: Smartphone,
      setting: 'push_notifications_enabled'
    }
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
    // eslint-disable-next-line no-console
    console.info('[PERSISTENCE OK]', { scope: 'notifications_toggle', key, value });
  };

  const handleFrequencyChange = (value: string) => {
    updatePreferences({ frequency: value as 'normal' | 'low' });
    // eslint-disable-next-line no-console
    console.info('[PERSISTENCE OK]', { scope: 'notifications_frequency', value });
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
    // eslint-disable-next-line no-console
    console.info('[PERSISTENCE OK]', { scope: 'notifications_quiet_hours', type, hour });
  };

  const handleMeditationToggle = async (setting: string, value: boolean) => {
    if (updateNudgePreferences) {
      await updateNudgePreferences({ [setting]: value });
    }
  };

  const handleBreathingToggle = async (setting: string, value: boolean) => {
    if (updateBreathingNudgePreferences) {
      await updateBreathingNudgePreferences({ [setting]: value });
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
          
          {!isSupported ? (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <div className={`font-medium text-amber-800 dark:text-amber-200 ${isMobile ? 'text-sm' : 'text-base'}`}>
                    Push Notifications Not Available
                  </div>
                  <div className={`text-amber-700 dark:text-amber-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Your browser doesn't support push notifications. You'll still receive in-app notifications.
                  </div>
                </div>
              </div>
            </div>
          ) : (
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
          )}
        </div>

        {/* Delivery Mode - only show if push notifications are supported */}
        {isSupported && (
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
        )}

        <SectionCollapsible title="Smart Notifications" startOpen={openMain} storageKey="profile.notifications.main" className="rounded-2xl">
          <div className="space-y-3">
        <SubCollapsible title="Smart Coach Notifications" startOpen={openMain && subKey === 'smartCoach'} storageKey="profile.notifications.smartCoach">
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
        </SubCollapsible>

        {/* Meditation Nudges */}
        <SubCollapsible title="Meditation Nudges" startOpen={openMain && subKey === 'meditation'} storageKey="profile.notifications.meditation">
          <div className="space-y-4">
          <h4 className={`font-semibold text-gray-900 dark:text-white flex items-center space-x-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
            <span className="text-lg">🧘</span>
            <span>Meditation Nudges</span>
          </h4>
          <div className="space-y-3">
            {meditationNotifications.map(({ key, label, description, icon: Icon, setting }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <div className="flex-1 flex items-center space-x-3">
                  <Icon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
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
                  checked={nudgePreferences?.[setting] ?? true}
                  onCheckedChange={(value) => handleMeditationToggle(setting, value)}
                />
              </div>
            ))}
          </div>
        </div>
        </SubCollapsible>

        {/* Sleep Nudges */}
        <SubCollapsible title="Sleep Optimization" startOpen={openMain && subKey === 'sleep'} storageKey="profile.notifications.sleep">
          <div className="bg-gradient-to-r from-slate-800/40 to-blue-900/40 p-6 rounded-lg border border-white/20 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-slate-600 via-blue-700 to-indigo-800 rounded-lg flex items-center justify-center">
              <Moon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Sleep Optimization</h3>
              <p className="text-sm text-white/70">Wind-down and sleep notifications</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <h4 className="font-medium text-white">🌙 Sleep Nudges</h4>
                <p className="text-sm text-white/70">Get gentle reminders for wind-down routines</p>
              </div>
              <Switch
                checked={sleepNudgePreferences?.nudges_enabled ?? true}
                onCheckedChange={(value) => updateSleepNudgePreferences?.({ nudges_enabled: value })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <h4 className="font-medium text-white">💤 Smart Sleep Nudges</h4>
                <p className="text-sm text-white/70">AI-powered sleep preparation suggestions</p>
              </div>
              <Switch
                checked={sleepNudgePreferences?.smart_nudges_enabled ?? true}
                onCheckedChange={(value) => updateSleepNudgePreferences?.({ smart_nudges_enabled: value })}
              />
            </div>
          </div>
        </div>
        </SubCollapsible>

        {/* Thermotherapy Nudges */}
        <SubCollapsible title="Cold & Heat Therapy" startOpen={openMain && subKey === 'thermal'} storageKey="profile.notifications.thermal">
          <div className="bg-gradient-to-r from-blue-900/20 to-red-900/20 p-6 rounded-lg border border-orange-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-red-600 rounded-lg flex items-center justify-center">
              🔥❄️
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Cold & Heat Therapy</h3>
              <p className="text-sm text-white/70">Contrast therapy notifications</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <h4 className="font-medium text-white">🔥❄️ Cold & Heat Therapy Nudges</h4>
                <p className="text-sm text-white/70">Get reminders for thermal recovery sessions</p>
              </div>
              <Switch
                checked={thermotherapyNudgePreferences?.nudges_enabled ?? true}
                onCheckedChange={(value) => updateThermotherapyNudgePreferences?.({ nudges_enabled: value })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <h4 className="font-medium text-white">⚙️ Smart Contrast Nudges</h4>
                <p className="text-sm text-white/70">AI-powered thermotherapy suggestions</p>
              </div>
              <Switch
                checked={thermotherapyNudgePreferences?.smart_nudges_enabled ?? true}
                onCheckedChange={(value) => updateThermotherapyNudgePreferences?.({ smart_nudges_enabled: value })}
              />
            </div>
          </div>
        </div>
        </SubCollapsible>

        {/* Breathing Nudges */}
        <SubCollapsible title="Breathing Nudges" startOpen={openMain && subKey === 'breathing'} storageKey="profile.notifications.breathing">
          <div className="space-y-4">
          <h4 className={`font-semibold text-gray-900 dark:text-white flex items-center space-x-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
            <Wind className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-cyan-600`} />
            <span>Breathing Nudges</span>
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20">
              <div className="flex-1 flex items-center space-x-3">
                <Bell className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-cyan-600`} />
                <div>
                  <div className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
                    Daily Reminder
                  </div>
                  <div className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Scheduled daily breathing practice reminders
                  </div>
                </div>
              </div>
              <Switch
                checked={breathingNudgePreferences?.nudges_enabled ?? true}
                onCheckedChange={(value) => handleBreathingToggle('nudges_enabled', value)}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20">
              <div className="flex-1 flex items-center space-x-3">
                <Smartphone className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-cyan-600`} />
                <div>
                  <div className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
                    Push Notifications (coming soon)
                  </div>
                  <div className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Device notifications for breathing reminders
                  </div>
                </div>
              </div>
              <Switch
                checked={breathingNudgePreferences?.push_notifications_enabled ?? true}
                onCheckedChange={(value) => handleBreathingToggle('push_notifications_enabled', value)}
              />
            </div>
          </div>
        </div>
        </SubCollapsible>

        {/* Yoga Nudges */}
        <SubCollapsible title="Yoga Nudges" startOpen={openMain && subKey === 'yoga'} storageKey="profile.notifications.yoga">
          <div className="space-y-4">
          <h4 className={`font-semibold text-gray-900 dark:text-white flex items-center space-x-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
            <span className="text-lg">🧘‍♀️</span>
            <span>Yoga Nudges</span>
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
              <div className="flex-1 flex items-center space-x-3">
                <Bell className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600`} />
                <div>
                  <div className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
                    Yoga Nudges
                  </div>
                  <div className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Scheduled daily yoga practice reminders
                  </div>
                </div>
              </div>
              <Switch
                checked={yogaNudgePreferences?.nudges_enabled ?? true}
                onCheckedChange={(value) => updateYogaNudgePreferences({ nudges_enabled: value })}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
              <div className="flex-1 flex items-center space-x-3">
                <Sparkles className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600`} />
                <div>
                  <div className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
                    Smart Yoga Nudges
                  </div>
                  <div className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    AI-powered yoga suggestions based on your mood and activity
                  </div>
                </div>
              </div>
              <Switch
                checked={yogaNudgePreferences?.smart_nudges_enabled ?? true}
                onCheckedChange={(value) => updateYogaNudgePreferences({ smart_nudges_enabled: value })}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
              <div className="flex-1 flex items-center space-x-3">
                <Smartphone className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600`} />
                <div>
                  <div className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
                    Push Notifications (coming soon)
                  </div>
                  <div className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Device notifications for yoga reminders
                  </div>
                </div>
              </div>
              <Switch
                checked={yogaNudgePreferences?.push_notifications_enabled ?? true}
                onCheckedChange={(value) => updateYogaNudgePreferences({ push_notifications_enabled: value })}
              />
            </div>
          </div>
        </div>
        </SubCollapsible>

        {/* General Notification Types */}
        <SubCollapsible title="General Notifications" startOpen={openMain && subKey === 'general'} storageKey="profile.notifications.general">
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
        </SubCollapsible>

        {/* Frequency Settings */}
        <SubCollapsible title="Frequency" startOpen={openMain && subKey === 'frequency'} storageKey="profile.notifications.frequency">
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
        </SubCollapsible>

        {/* Sound Effects */}
        <SubCollapsible title="Sound Effects" startOpen={openMain && subKey === 'sounds'} storageKey="profile.notifications.sounds">
          <div className="space-y-3">
          <h4 className={`font-semibold text-gray-900 dark:text-white flex items-center space-x-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
            <Volume2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-blue-600`} />
            <span>Sound Effects</span>
          </h4>
          <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20">
            <div className="flex-1">
              <div className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
                Enable Sound Effects
              </div>
              <div className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Play sounds for goals, celebrations, and achievements
              </div>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
            />
          </div>
        </div>

        {/* Haptics */}
        <div className="space-y-3">
          <h4 className={`font-semibold text-gray-900 dark:text-white flex items-center space-x-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
            <Vibrate className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
            <span>Haptics</span>
          </h4>
          <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-50 dark:bg-purple-900/20">
            <div className="flex-1">
              <div className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
                Enable Haptic Feedback
              </div>
              <div className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Gentle vibration for tabs and interaction feedback
              </div>
            </div>
            <Switch
              checked={hapticsEnabled}
              onCheckedChange={setHapticsEnabled}
            />
          </div>
        </div>
        </SubCollapsible>

        {/* Quiet Hours */}
        <SubCollapsible title="Quiet Hours" startOpen={openMain && subKey === 'quietHours'} storageKey="profile.notifications.quietHours">
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
        </SubCollapsible>
        </div>
      </SectionCollapsible>
      </CardContent>
    </Card>
  );
};
