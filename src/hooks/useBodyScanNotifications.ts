import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useBodyScanNotifications = () => {
  const triggerScanCompletedNotification = async (scanType: 'front' | 'side' | 'back') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.functions.invoke('body-scan-notifications', {
        body: {
          type: 'scan_completed',
          user_id: user.id,
          scan_type: scanType
        }
      });

      if (error) {
        console.error('Error triggering scan notification:', error);
      }
    } catch (error) {
      console.error('Failed to trigger scan notification:', error);
    }
  };

  const checkForReminders = async () => {
    try {
      const { error } = await supabase.functions.invoke('body-scan-notifications', {
        body: {
          type: 'check_reminders'
        }
      });

      if (error) {
        console.error('Error checking for reminders:', error);
      }
    } catch (error) {
      console.error('Failed to check for reminders:', error);
    }
  };

  const showInstantFeedback = async (scanType: 'front' | 'side' | 'back') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get recent scans to provide instant feedback
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data: recentScans } = await supabase
        .from('body_scans')
        .select('type')
        .eq('user_id', user.id)
        .gte('created_at', twentyFourHoursAgo.toISOString());

      if (!recentScans) return;

      const scanTypes = [...new Set(recentScans.map(scan => scan.type))];
      const scanCount = scanTypes.length;

      if (scanCount === 3) {
        toast.success('🎉 Full body scan complete! Amazing work! 💪', {
          duration: 5000,
        });
      } else if (scanCount === 2) {
        const remaining = ['front', 'side', 'back'].find(type => !scanTypes.includes(type));
        toast.info(`📸 Great progress! Complete your ${remaining} scan to finish the set! 👀`, {
          duration: 4000,
        });
      } else if (scanCount === 1) {
        toast.info('🚀 Good start! Capture your other two angles for the complete picture! 📸', {
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Failed to show instant feedback:', error);
    }
  };

  return {
    triggerScanCompletedNotification,
    checkForReminders,
    showInstantFeedback
  };
};