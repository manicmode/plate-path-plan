/**
 * Analytics tracking for Habit Central
 * Safe fallback to console logging if no analytics service is configured
 */

interface AnalyticsEventProps {
  slug?: string;
  domain?: string;
  goal_type?: string;
  difficulty?: string;
  source?: 'hero' | 'for_you' | 'carousel' | 'list' | 'rail' | 'bell' | 'sheet';
  [key: string]: any;
}

/**
 * Track an analytics event
 * Uses configured analytics service if available, otherwise logs to console
 */
export function track(event: string, props?: AnalyticsEventProps): void {
  try {
    // TODO: Replace with actual analytics service when available
    // For now, log to console for debugging
    if (import.meta.env.DEV) {
      console.info(`[analytics] ${event}`, props);
    }
    
    // Future: Call actual analytics service
    // analytics.track(event, props);
    
  } catch (error) {
    // Silent fallback - analytics should never break the app
    console.warn('Analytics tracking failed:', error);
  }
}

/**
 * Predefined analytics events for habits
 */
export const HabitEvents = {
  habitStarted: (props: AnalyticsEventProps) => track('habit_started', props),
  habitLogged: (props: AnalyticsEventProps) => track('habit_logged', props),
  habitPaused: (props: AnalyticsEventProps) => track('habit_paused', props),
  habitResumed: (props: AnalyticsEventProps) => track('habit_resumed', props),
  habitCompleted: (props: AnalyticsEventProps) => track('habit_completed', props),
  habitEdited: (props: AnalyticsEventProps) => track('habit_edited', props),
  habitSnoozed: (props: AnalyticsEventProps) => track('habit_snoozed', props),
  habitReminderOpened: (props: AnalyticsEventProps) => track('habit_reminder_opened', props),
};