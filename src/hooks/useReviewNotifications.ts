import { useEffect, useRef } from 'react';

// Global flag to prevent multiple scheduling attempts
declare global {
  interface Window {
    __nutriReviewScheduled?: boolean;
  }
}

export const useReviewNotifications = () => {
  const hasInitialized = useRef(false);

  // Check if notification was sent recently (24h cooldown)
  const wasNotificationSentRecently = (type: 'weekly' | 'monthly'): boolean => {
    const lastSent = localStorage.getItem(`lastNotification_${type}`);
    if (!lastSent) return false;
    
    const lastSentTime = parseInt(lastSent);
    const now = Date.now();
    const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours
    
    return (now - lastSentTime) < cooldownPeriod;
  };

  // Mark notification as sent
  const markNotificationSent = (type: 'weekly' | 'monthly') => {
    localStorage.setItem(`lastNotification_${type}`, Date.now().toString());
  };

  // Clear all existing timers and flags
  const clearExistingTimers = () => {
    console.log('🧹 Clearing existing notification timers');
    
    // Clear stored timer IDs
    const existingWeekly = localStorage.getItem('weeklyReviewScheduled');
    const existingMonthly = localStorage.getItem('monthlyReviewScheduled');
    const existingMonthlyInterval = localStorage.getItem('monthlyReportCheckInterval');
    
    if (existingWeekly) {
      clearTimeout(parseInt(existingWeekly));
      localStorage.removeItem('weeklyReviewScheduled');
    }
    if (existingMonthly) {
      clearTimeout(parseInt(existingMonthly));
      localStorage.removeItem('monthlyReviewScheduled');
    }
    if (existingMonthlyInterval) {
      clearInterval(parseInt(existingMonthlyInterval));
      localStorage.removeItem('monthlyReportCheckInterval');
    }
  };

  // Schedule weekly and monthly review notifications with safety checks
  const scheduleReviewNotifications = () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.log('🚫 Notifications not supported or not permitted');
      return;
    }

    // Global lock check
    if (window.__nutriReviewScheduled) {
      console.log('🔒 Review notifications already scheduled globally');
      return;
    }

    try {
      // Set global lock
      window.__nutriReviewScheduled = true;
      
      // Clear any existing timers first
      clearExistingTimers();

      const now = new Date();
      console.log('⏰ Scheduling notifications from:', now.toISOString());

      // Schedule weekly review (Sunday evening at 7 PM)
      if (!wasNotificationSentRecently('weekly')) {
        const nextSunday = new Date(now);
        const daysUntilSunday = (7 - now.getDay()) % 7;
        
        if (daysUntilSunday === 0 && now.getHours() >= 19) {
          // If it's Sunday after 7 PM, schedule for next Sunday
          nextSunday.setDate(now.getDate() + 7);
        } else if (daysUntilSunday === 0) {
          // If it's Sunday before 7 PM, schedule for today
          nextSunday.setDate(now.getDate());
        } else {
          // Schedule for next Sunday
          nextSunday.setDate(now.getDate() + daysUntilSunday);
        }
        
        nextSunday.setHours(19, 0, 0, 0); // 7 PM
        
        const weeklyDelay = nextSunday.getTime() - now.getTime();
        
        // Timer validation - only schedule if delay is > 1 minute
        if (weeklyDelay > 60000) {
          console.log(`📅 Weekly notification scheduled for: ${nextSunday.toISOString()} (${Math.round(weeklyDelay / 1000 / 60)} minutes from now)`);
          
          const weeklyTimeout = setTimeout(() => {
            if (!wasNotificationSentRecently('weekly')) {
              new Notification('Weekly Health Review Ready! 📊', {
                body: 'Your health review is ready! Open VOYAGE to see what\'s working for you 💪',
                icon: '/favicon.ico',
                tag: 'weekly-review'
              });
              markNotificationSent('weekly');
            }
          }, weeklyDelay);

          localStorage.setItem('weeklyReviewScheduled', weeklyTimeout.toString());
        } else {
          console.warn(`⚠️ Weekly delay too short: ${weeklyDelay}ms, skipping`);
        }
      } else {
        console.log('⏭️ Weekly notification sent recently, skipping');
      }

      // Check for actual monthly reports instead of scheduling based on time
      if (!wasNotificationSentRecently('monthly')) {
        console.log('🔍 Checking for available monthly reports...');
        
        // Check if monthly reports are available every hour instead of scheduling fixed notifications
        const checkReportsInterval = setInterval(async () => {
          try {
            const { supabase } = await import('@/integrations/supabase/client');
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) return;
            
            // Check if user has any monthly reports
            const { data: monthlyReports } = await supabase
              .from('monthly_reports')
              .select('id, title, created_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (monthlyReports && monthlyReports.length > 0) {
              // Check if we already notified about this specific report
              const latestReport = monthlyReports[0];
              const lastNotifiedReportId = localStorage.getItem('lastNotifiedMonthlyReport');
              
              if (lastNotifiedReportId !== latestReport.id && !wasNotificationSentRecently('monthly')) {
                new Notification('Monthly Health Review Ready! 🧠', {
                  body: 'Your health review is ready! Open VOYAGE to see what\'s working for you 💪',
                  icon: '/favicon.ico',
                  tag: 'monthly-review'
                });
                
                markNotificationSent('monthly');
                localStorage.setItem('lastNotifiedMonthlyReport', latestReport.id);
                console.log('📱 Sent monthly report notification for report:', latestReport.title);
                
                // Clear the interval once we've notified
                clearInterval(checkReportsInterval);
              }
            }
          } catch (error) {
            console.error('❌ Error checking for monthly reports:', error);
          }
        }, 60 * 60 * 1000); // Check every hour
        
        // Store interval ID for cleanup
        localStorage.setItem('monthlyReportCheckInterval', checkReportsInterval.toString());
        
        console.log('✅ Set up monthly report checking (every hour)');
      } else {
        console.log('⏭️ Monthly notification sent recently, skipping');
      }
      
    } catch (error) {
      console.error('❌ Error scheduling review notifications:', error);
      window.__nutriReviewScheduled = false; // Reset flag on error
    }
  };

  // Request notification permission and schedule
  const setupNotifications = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        scheduleReviewNotifications();
      }
    } else if (Notification.permission === 'granted') {
      scheduleReviewNotifications();
    }
  };

  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized.current) {
      console.log('🔄 Review notifications already initialized, skipping');
      return;
    }

    console.log('🚀 Initializing review notifications (first time)');
    hasInitialized.current = true;
    
    // Clear any stuck timers from previous sessions
    clearExistingTimers();
    
    // Reset global flag in case it was stuck from previous session
    window.__nutriReviewScheduled = false;
    
    // Set up notifications when the hook is first used
    setupNotifications();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up review notifications');
      clearExistingTimers();
      window.__nutriReviewScheduled = false;
    };
  }, []); // Empty dependency array ensures this runs only once

  return {
    scheduleReviewNotifications,
    setupNotifications
  };
};