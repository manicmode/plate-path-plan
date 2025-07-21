import { useEffect } from 'react';

export const useReviewNotifications = () => {
  // Schedule weekly and monthly review notifications
  const scheduleReviewNotifications = () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      // Clear existing intervals for reviews
      const existingWeekly = localStorage.getItem('weeklyReviewScheduled');
      const existingMonthly = localStorage.getItem('monthlyReviewScheduled');
      
      if (existingWeekly) {
        clearTimeout(parseInt(existingWeekly));
      }
      if (existingMonthly) {
        clearTimeout(parseInt(existingMonthly));
      }

      // Schedule weekly review (Sunday evening at 7 PM)
      const now = new Date();
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
      nextSunday.setHours(19, 0, 0, 0); // 7 PM
      
      if (nextSunday <= now) {
        nextSunday.setDate(nextSunday.getDate() + 7);
      }

      const weeklyTimeout = setTimeout(() => {
        new Notification('Weekly Health Review Ready! 📊', {
          body: 'Your health review is ready! Open NutriCoach to see what\'s working for you 💪',
          icon: '/favicon.ico',
          tag: 'weekly-review'
        });
        
        // Schedule next week
        scheduleReviewNotifications();
      }, nextSunday.getTime() - now.getTime());

      localStorage.setItem('weeklyReviewScheduled', weeklyTimeout.toString());

      // Schedule monthly review (1st of month at 8 AM)
      const nextMonth = new Date(now);
      nextMonth.setMonth(now.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(8, 0, 0, 0); // 8 AM
      
      if (nextMonth <= now) {
        nextMonth.setMonth(nextMonth.getMonth() + 1);
      }

      const monthlyTimeout = setTimeout(() => {
        new Notification('Monthly Health Review Ready! 🧠', {
          body: 'Your health review is ready! Open NutriCoach to see what\'s working for you 💪',
          icon: '/favicon.ico',
          tag: 'monthly-review'
        });
        
        // Schedule next month
        scheduleReviewNotifications();
      }, nextMonth.getTime() - now.getTime());

      localStorage.setItem('monthlyReviewScheduled', monthlyTimeout.toString());
    } catch (error) {
      console.error('Error scheduling review notifications:', error);
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
    // Set up notifications when the hook is first used
    setupNotifications();
  }, []);

  return {
    scheduleReviewNotifications,
    setupNotifications
  };
};