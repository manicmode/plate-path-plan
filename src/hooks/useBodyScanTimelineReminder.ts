import { useEffect } from 'react';
import { useStableAuth } from '@/hooks/useStableAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const useBodyScanTimelineReminder = () => {
  const { user, userReady } = useStableAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userReady || !user) return;

    const checkTimelineReminder = async () => {
      try {
        // Check when this reminder was last shown
        const lastReminderKey = 'lastBodyScanTimelineReminder';
        const lastReminder = localStorage.getItem(lastReminderKey);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Don't show if already shown this week
        if (lastReminder && new Date(lastReminder) > oneWeekAgo) {
          return;
        }

        // Check when user last visited /body-scan-results
        const lastVisitKey = 'lastBodyScanResultsVisit';
        const lastVisit = localStorage.getItem(lastVisitKey);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Don't show if visited recently
        if (lastVisit && new Date(lastVisit) > sevenDaysAgo) {
          return;
        }

        // Get user profile for personalization
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .single();

        const userName = profile?.first_name || 'there';

        // Get user's body scans
        const { data: scans } = await supabase
          .from('body_scans')
          .select('created_at, type')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!scans || scans.length < 2) {
          return; // Need at least 2 scans
        }

        // Check if user has scans from different weeks
        const scansByWeek = new Set();
        scans.forEach(scan => {
          const scanDate = new Date(scan.created_at);
          const weekStart = new Date(scanDate);
          weekStart.setDate(scanDate.getDate() - scanDate.getDay()); // Get start of week
          const weekKey = weekStart.toISOString().split('T')[0];
          scansByWeek.add(weekKey);
        });

        // Determine message based on scan history
        let message: string;
        let duration = 8000;

        if (scansByWeek.size >= 3) {
          // Bonus message for multiple weeks
          message = `Time for a mini body transformation check-in 🔎 — You've got scans across multiple weeks!`;
          duration = 10000;
        } else {
          // Standard message
          message = `Want to see how your body is changing? Tap to review your scans and track progress 📈`;
        }

        // Personalize the message
        const personalizedMessage = `Hey ${userName}! ${message}`;

        // Show the reminder notification
        toast.info(personalizedMessage, {
          duration,
          action: {
            label: 'View Timeline',
            onClick: () => {
              // Track that user visited the page
              localStorage.setItem(lastVisitKey, new Date().toISOString());
              navigate('/body-scan-results?tab=timeline');
            }
          }
        });

        // Mark reminder as shown
        localStorage.setItem(lastReminderKey, new Date().toISOString());

      } catch (error) {
        console.error('Error checking timeline reminder:', error);
      }
    };

    // Check reminder on app launch (with small delay to ensure everything is loaded)
    const timeoutId = setTimeout(checkTimelineReminder, 3000);

    return () => clearTimeout(timeoutId);
  }, [userReady, user, navigate]);

  // Function to track when user visits body scan results
  const trackBodyScanResultsVisit = () => {
    localStorage.setItem('lastBodyScanResultsVisit', new Date().toISOString());
  };

  return { trackBodyScanResultsVisit };
};