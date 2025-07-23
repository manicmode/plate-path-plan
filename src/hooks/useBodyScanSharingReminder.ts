import { useEffect } from 'react';
import { useStableAuth } from '@/hooks/useStableAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { startOfWeek } from 'date-fns';

export const useBodyScanSharingReminder = () => {
  const { user, userReady } = useStableAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userReady || !user) return;

    const checkSharingReminder = async () => {
      try {
        // Check when this reminder was last shown
        const lastReminderKey = 'lastBodyScanSharingReminder';
        const lastReminder = localStorage.getItem(lastReminderKey);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        // Don't show if already shown in the last 2 weeks
        if (lastReminder && new Date(lastReminder) > twoWeeksAgo) {
          return;
        }

        // Check if user has ever used export/compare features
        const hasUsedExport = localStorage.getItem('hasUsedBodyScanExport') === 'true';
        const hasUsedCompare = localStorage.getItem('hasUsedBodyScanCompare') === 'true';

        // Don't show if user has already used these features
        if (hasUsedExport || hasUsedCompare) {
          return;
        }

        // Get user's body scans
        const { data: scans } = await supabase
          .from('body_scans')
          .select('created_at, type, pose_score')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!scans || scans.length < 3) {
          return; // Need at least 3 scans
        }

        // Check if scans are from different weeks
        const scansByWeek = new Set();
        scans.forEach(scan => {
          const scanDate = new Date(scan.created_at);
          const weekStart = startOfWeek(scanDate);
          const weekKey = weekStart.toISOString().split('T')[0];
          scansByWeek.add(weekKey);
        });

        if (scansByWeek.size < 2) {
          return; // Need scans from at least 2 different weeks
        }

        // Get user profile for personalization
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .single();

        const userName = profile?.first_name || 'there';

        // Analyze scan quality for bonus message
        const averagePoseScore = scans
          .filter(scan => scan.pose_score !== null)
          .reduce((sum, scan) => sum + (scan.pose_score || 0), 0) / 
          scans.filter(scan => scan.pose_score !== null).length;

        const hasHighQualityScans = averagePoseScore >= 0.8;
        const hasProgressScans = scansByWeek.size >= 3;

        // Determine message based on scan quality and progress
        let message: string;
        let duration = 10000;

        if (hasHighQualityScans && hasProgressScans) {
          // Bonus message for high quality and progress
          message = `You're crushing it 💪 Your scans show awesome alignment and growth. Tap to compare and celebrate your progress 🎉`;
          duration = 12000;
        } else {
          // Standard message
          message = `Want to see your transformation side-by-side? Try our body scan comparison tool — or export your scans to share your fitness journey 📤`;
        }

        // Personalize the message
        const personalizedMessage = `Hey ${userName}! ${message}`;

        // Show the reminder notification
        toast.info(personalizedMessage, {
          duration,
          action: {
            label: 'View Progress',
            onClick: () => {
              navigate('/body-scan-results?tab=timeline');
            }
          }
        });

        // Mark reminder as shown
        localStorage.setItem(lastReminderKey, new Date().toISOString());

      } catch (error) {
        console.error('Error checking sharing reminder:', error);
      }
    };

    // Check reminder on app launch (with delay to ensure everything is loaded)
    const timeoutId = setTimeout(checkSharingReminder, 4000);

    return () => clearTimeout(timeoutId);
  }, [userReady, user, navigate]);

  // Functions to track when user uses export/compare features
  const trackExportUsage = () => {
    localStorage.setItem('hasUsedBodyScanExport', 'true');
  };

  const trackCompareUsage = () => {
    localStorage.setItem('hasUsedBodyScanCompare', 'true');
  };

  return { trackExportUsage, trackCompareUsage };
};