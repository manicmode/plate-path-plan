import { z } from 'zod';
import { logSecurityEvent, SECURITY_EVENTS } from './securityLogger';
import { toast } from 'sonner';

// Enhanced UUID validation to prevent database errors
export const secureUuidSchema = z.string()
  .uuid('Invalid UUID format')
  .refine((val) => val !== 'undefined' && val !== null && val.length === 36, {
    message: 'UUID cannot be undefined or invalid'
  });

// User ID validation with null checks
export const validateUserId = async (userId: string | null | undefined, context?: string): Promise<string | null> => {
  if (!userId || userId === 'undefined' || userId === 'null') {
    await logSecurityEvent({
      eventType: SECURITY_EVENTS.INVALID_UUID,
      eventDetails: { 
        userId, 
        context: context || 'unknown',
        error: 'User ID is undefined or invalid'
      },
      severity: 'high'
    });
    return null;
  }

  try {
    secureUuidSchema.parse(userId);
    return userId;
  } catch (error) {
    await logSecurityEvent({
      eventType: SECURITY_EVENTS.INVALID_UUID,
      eventDetails: { 
        userId, 
        context: context || 'unknown',
        error: error instanceof Error ? error.message : 'UUID validation failed'
      },
      severity: 'high'
    });
    return null;
  }
};

// Notification type validation
export const notificationTypeSchema = z.enum([
  'meal_reminder',
  'hydration_nudge',
  'progress_update',
  'achievement',
  'challenge_invitation',
  'follow_notification',
  'system_alert',
  'security_alert',
  'coach_message',
  'mood_checkin'
]);

// Secure notification data validation
export const validateNotificationData = (data: {
  user_id?: string;
  type?: string;
  title?: string;
  message?: string;
}) => {
  const errors: string[] = [];

  // Validate user_id
  if (!data.user_id || data.user_id === 'undefined') {
    errors.push('User ID is required and cannot be undefined');
  }

  // Validate notification type
  try {
    if (data.type) {
      notificationTypeSchema.parse(data.type);
    } else {
      errors.push('Notification type is required');
    }
  } catch {
    errors.push(`Invalid notification type: ${data.type}`);
  }

  // Validate required fields
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Notification title is required');
  }

  if (!data.message || data.message.trim().length === 0) {
    errors.push('Notification message is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Database operation wrapper with validation
export const secureDbOperation = async <T>(
  operation: () => Promise<T>,
  context: string,
  userId?: string
): Promise<T | null> => {
  try {
    // Validate user ID if provided
    if (userId) {
      const validUserId = await validateUserId(userId, context);
      if (!validUserId) {
        throw new Error('Invalid user ID for database operation');
      }
    }

    return await operation();
  } catch (error) {
    await logSecurityEvent({
      eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
      eventDetails: {
        context,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: userId || 'unknown'
      },
      severity: 'medium'
    });

    // Show user-friendly error
    toast.error('Operation failed. Please try again.');
    return null;
  }
};

// Auth context validation
export const validateAuthContext = (user: any, requiredFields: string[] = ['id']) => {
  if (!user) {
    return { isValid: false, error: 'User not authenticated' };
  }

  for (const field of requiredFields) {
    if (!user[field] || user[field] === 'undefined') {
      return { 
        isValid: false, 
        error: `Required user field missing: ${field}` 
      };
    }
  }

  return { isValid: true, error: null };
};

// Sanitize database inputs to prevent SQL injection
export const sanitizeDbInput = (input: any): string => {
  if (typeof input !== 'string') {
    return String(input);
  }

  // Remove potentially dangerous SQL characters
  return input
    .replace(/'/g, "''")  // Escape single quotes
    .replace(/;/g, '')    // Remove semicolons
    .replace(/--/g, '')   // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comments
    .replace(/\*\//g, '');
};

// Enhanced rate limiting with behavioral analysis
interface UserActivity {
  timestamp: number;
  action: string;
  userId: string;
}

class SecurityRateLimiter {
  private activities: Map<string, UserActivity[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async checkLimit(userId: string, action: string): Promise<boolean> {
    const now = Date.now();
    const userActivities = this.activities.get(userId) || [];
    
    // Remove old activities
    const recentActivities = userActivities.filter(
      activity => now - activity.timestamp < this.windowMs
    );

    // Check if limit exceeded
    if (recentActivities.length >= this.maxRequests) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.RATE_LIMIT_EXCEEDED,
        eventDetails: {
          userId,
          action,
          activityCount: recentActivities.length,
          windowMs: this.windowMs
        },
        severity: 'high'
      });
      return false;
    }

    // Add current activity
    recentActivities.push({ timestamp: now, action, userId });
    this.activities.set(userId, recentActivities);

    return true;
  }

  // Detect suspicious patterns
  async detectSuspiciousActivity(userId: string): Promise<boolean> {
    const userActivities = this.activities.get(userId) || [];
    const now = Date.now();
    const recentActivities = userActivities.filter(
      activity => now - activity.timestamp < 60000 // Last minute
    );

    // Rapid-fire detection (more than 10 actions per minute)
    if (recentActivities.length > 10) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
        eventDetails: {
          userId,
          pattern: 'rapid_fire',
          activityCount: recentActivities.length,
          timeWindow: '1_minute'
        },
        severity: 'critical'
      });
      return true;
    }

    return false;
  }
}

// Global rate limiters
export const authRateLimiter = new SecurityRateLimiter(5, 60000); // 5 auth attempts per minute
export const apiRateLimiter = new SecurityRateLimiter(100, 60000); // 100 API calls per minute
export const dbRateLimiter = new SecurityRateLimiter(200, 60000); // 200 DB operations per minute

// Security middleware for critical operations
export const securityMiddleware = async (
  userId: string | undefined,
  action: string,
  rateLimiter: SecurityRateLimiter = apiRateLimiter
) => {
  // Validate user ID
  const validUserId = await validateUserId(userId, action);
  if (!validUserId) {
    throw new Error('Invalid user authentication');
  }

  // Check rate limits
  const isAllowed = await rateLimiter.checkLimit(validUserId, action);
  if (!isAllowed) {
    throw new Error('Rate limit exceeded');
  }

  // Check for suspicious activity
  const isSuspicious = await rateLimiter.detectSuspiciousActivity(validUserId);
  if (isSuspicious) {
    throw new Error('Suspicious activity detected');
  }

  return validUserId;
};