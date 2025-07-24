import { useEffect, useCallback } from 'react';
import { isValidNotificationData } from '@/lib/validation';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { toast } from 'sonner';

export const NotificationConstraintValidator = () => {
  const validateNotificationData = useCallback((data: any): boolean => {
    // Enhanced notification type validation
    const validTypes = ['email', 'push', 'sms', 'in_app', 'reminder', 'challenge', 'social', 'system'];
    
    if (!data || typeof data !== 'object') {
      return false;
    }
    
    // Check notification type constraint
    if (data.type && !validTypes.includes(data.type)) {
      return false;
    }
    
    // Check for required fields based on type
    if (data.type === 'email' && (!data.email || !data.subject)) {
      return false;
    }
    
    if (data.type === 'push' && !data.title) {
      return false;
    }
    
    // Validate preferences structure
    if (data.preferences) {
      if (typeof data.preferences !== 'object') {
        return false;
      }
      
      // Check for boolean values only
      for (const [key, value] of Object.entries(data.preferences)) {
        if (typeof value !== 'boolean' && value !== null && value !== undefined) {
          return false;
        }
      }
    }
    
    return isValidNotificationData(data);
  }, []);

  const interceptNotificationRequests = useCallback(async (event: Event) => {
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      
      // Check if this is a notification-related request
      if (url.includes('/user_notifications') || url.includes('/notification')) {
        if (init?.method === 'POST' || init?.method === 'PUT' || init?.method === 'PATCH') {
          try {
            const body = init.body;
            let data: any;
            
            if (typeof body === 'string') {
              data = JSON.parse(body);
            } else if (body instanceof FormData) {
              data = Object.fromEntries(body.entries());
            }
            
            if (data && !validateNotificationData(data)) {
              await logSecurityEvent({
                eventType: SECURITY_EVENTS.INVALID_REQUEST,
                eventDetails: {
                  action: 'notification_constraint_violation_prevented',
                  url,
                  method: init.method,
                  invalidData: data,
                  reason: 'Notification data failed constraint validation'
                },
                severity: 'medium'
              });
              
              toast.error('Invalid notification data detected. Request blocked.');
              throw new Error('Notification constraint validation failed');
            }
          } catch (error) {
            if (error instanceof SyntaxError) {
              // JSON parsing error
              await logSecurityEvent({
                eventType: SECURITY_EVENTS.INVALID_REQUEST,
                eventDetails: {
                  action: 'notification_json_parse_error',
                  url,
                  method: init.method,
                  error: error.message
                },
                severity: 'medium'
              });
              
              toast.error('Invalid notification format. Request blocked.');
              throw error;
            }
            
            if (error.message.includes('constraint validation')) {
              throw error;
            }
          }
        }
      }
      
      return originalFetch(input, init);
    };
  }, [validateNotificationData]);

  const validateExistingNotificationPreferences = useCallback(async () => {
    try {
      const keys = Object.keys(localStorage);
      let cleanedCount = 0;
      
      keys.forEach(key => {
        if (key.includes('notification') || key.includes('preferences')) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              
              if (!validateNotificationData(parsed)) {
                localStorage.removeItem(key);
                cleanedCount++;
              }
            }
          } catch (error) {
            // Invalid JSON, remove it
            localStorage.removeItem(key);
            cleanedCount++;
          }
        }
      });
      
      if (cleanedCount > 0) {
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
          eventDetails: {
            action: 'notification_preferences_cleanup',
            cleanedItems: cleanedCount,
            context: 'notification_constraint_validator'
          },
          severity: 'low'
        });
        
        console.log(`Cleaned ${cleanedCount} invalid notification preference entries`);
      }
    } catch (error) {
      console.warn('Notification preferences cleanup failed:', error);
    }
  }, [validateNotificationData]);

  useEffect(() => {
    // Set up fetch interception
    interceptNotificationRequests(new Event('init'));
    
    // Perform initial cleanup
    validateExistingNotificationPreferences();
    
    // Set up periodic validation (every 15 minutes)
    const validationInterval = setInterval(validateExistingNotificationPreferences, 15 * 60 * 1000);
    
    return () => {
      clearInterval(validationInterval);
      // Restore original fetch on unmount would be complex, keeping enhanced version
    };
  }, [interceptNotificationRequests, validateExistingNotificationPreferences]);

  return null;
};
