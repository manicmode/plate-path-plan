import { z } from 'zod';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';

// Notification type enum matching database constraints
const notificationTypeSchema = z.enum([
  'reminder',
  'achievement',
  'challenge',
  'social',
  'system',
  'health_check',
  'coach',
  'exercise_reminder'
]);

// Notification data validation schema
const notificationDataSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  type: notificationTypeSchema,
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  data: z.record(z.any()).optional(),
  scheduled_for: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
});

export const validateNotificationData = async (data: any): Promise<any | null> => {
  try {
    const result = notificationDataSchema.safeParse(data);
    
    if (!result.success) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.INVALID_INPUT,
        eventDetails: { 
          context: 'notification_validation',
          errors: result.error.errors,
          inputData: data,
          reason: 'Notification data validation failed'
        },
        severity: 'medium'
      });
      return null;
    }

    return result.data;
  } catch (error) {
    await logSecurityEvent({
      eventType: SECURITY_EVENTS.INVALID_INPUT,
      eventDetails: { 
        context: 'notification_validation',
        error: error instanceof Error ? error.message : 'Unknown error',
        reason: 'Notification validation exception'
      },
      severity: 'high'
    });
    return null;
  }
};

// Fix constraint violations in existing notification preferences
export const cleanupNotificationPreferences = async (): Promise<number> => {
  try {
    let cleanedCount = 0;
    
    // Check localStorage for invalid notification preferences
    const notificationPrefs = localStorage.getItem('notification_preferences');
    if (notificationPrefs) {
      try {
        const prefs = JSON.parse(notificationPrefs);
        const validTypes = notificationTypeSchema.options;
        
        // Filter out any invalid notification types
        const cleanedPrefs = Object.keys(prefs).reduce((acc, key) => {
          if (validTypes.includes(key as any)) {
            acc[key] = prefs[key];
          } else {
            cleanedCount++;
          }
          return acc;
        }, {} as Record<string, any>);
        
        if (cleanedCount > 0) {
          localStorage.setItem('notification_preferences', JSON.stringify(cleanedPrefs));
          
          await logSecurityEvent({
            eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
            eventDetails: { 
              action: 'cleanup_notification_preferences',
              cleanedCount,
              context: 'localStorage_cleanup'
            },
            severity: 'low'
          });
        }
      } catch (parseError) {
        // If we can't parse it, remove it entirely
        localStorage.removeItem('notification_preferences');
        cleanedCount = 1;
      }
    }
    
    return cleanedCount;
  } catch (error) {
    console.warn('Failed to cleanup notification preferences:', error);
    return 0;
  }
};

// Get valid notification types for UI components
export const getValidNotificationTypes = () => {
  return notificationTypeSchema.options;
};