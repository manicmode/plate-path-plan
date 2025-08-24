/**
 * Analytics tracking for Habit Central
 * Safe fallback to console logging if no analytics service is configured
 */

interface AnalyticsEventProps {
  slug?: string;
  domain?: string;
  goal_type?: string;
  difficulty?: string;
  source?: 'hero' | 'for_you' | 'carousel' | 'list' | 'rail' | 'bell' | 'sheet' | 'start_pack';
  [key: string]: any;
}

type Payload = Record<string, unknown>;

/**
 * Safe analytics logger - no-op if analytics unavailable
 */
const log = (event: string, payload: Payload = {}) => {
  try { 
    (window as any)?.analytics?.track?.(event, payload); 
  } catch (error) {
    // Silent fallback - analytics should never break the app
    if (import.meta.env.DEV) {
      console.info(`[analytics] ${event}`, payload);
    }
  }
};

/**
 * Track an analytics event
 * Uses configured analytics service if available, otherwise logs to console
 */
export function track(event: string, props?: AnalyticsEventProps): void {
  log(event, props);
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

/**
 * Activity logging specific analytics
 */
export const ActivityEvents = {
  exerciseLogged: (p: Payload) => log('log_exercise_submitted', p),
  templateSaved: (p: Payload) => log('exercise_template_saved', p),
  recoveryFav: (p: Payload) => log('recovery_favorited', p),
  habitLogged: (p: Payload) => log('habit_logged', p),
};