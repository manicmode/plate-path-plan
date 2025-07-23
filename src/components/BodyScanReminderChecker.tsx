import { useEffect } from 'react';
import { useBodyScanNotifications } from '@/hooks/useBodyScanNotifications';

export default function BodyScanReminderChecker() {
  const { checkForReminders } = useBodyScanNotifications();

  useEffect(() => {
    // Check for reminders when the component mounts (user opens app)
    checkForReminders();

    // Set up periodic checking (every 24 hours)
    const interval = setInterval(() => {
      checkForReminders();
    }, 24 * 60 * 60 * 1000); // 24 hours

    return () => clearInterval(interval);
  }, [checkForReminders]);

  return null; // This component doesn't render anything
}