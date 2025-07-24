import React, { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { isValidNotificationData } from '@/lib/validation';

export const NotificationConstraintValidator: React.FC = () => {
  // Validate notification data structure
  const validateNotificationData = useCallback((data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Check required fields based on notification type
    if (data.type) {
      switch (data.type) {
        case 'reminder':
          if (!data.title || !data.scheduledFor) return false;
          break;
        case 'alert':
          if (!data.message || !data.severity) return false;
          break;
        case 'update':
          if (!data.content) return false;
          break;
      }
    }
    
    // Check preferences structure
    if (data.preferences && typeof data.preferences !== 'object') return false;
    
    return isValidNotificationData(data);
  }, []);

  // Intercept notification-related requests
  const interceptNotificationRequests = useCallback(async (event: Event) => {
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const url = typeof input === 'string' ? input : input.toString();
        
        // Check if this is a notification-related request
        if ((init?.method === 'POST' || init?.method === 'PUT' || init?.method === 'PATCH') &&
            (url.includes('notifications') || url.includes('user_notifications'))) {
          
          if (init?.body) {
            let data;
            try {
              data = JSON.parse(init.body as string);
            } catch {
              // If not JSON, continue with original request
              return originalFetch(input, init);
            }
            
            if (!validateNotificationData(data)) {
              await logSecurityEvent({
                eventType: SECURITY_EVENTS.CONSTRAINT_VIOLATION,
                eventDetails: {
                  context: 'notification_constraint_violation',
                  url,
                  invalidData: data,
                  method: init.method
                },
                severity: 'high'
              });
              
              toast.error('Invalid notification data format');
              throw new Error('Notification data validation failed');
            }
          }
        }
        
        return originalFetch(input, init);
      } catch (error) {
        if (error instanceof Error && error.message.includes('validation failed')) {
          throw error;
        }
        return originalFetch(input, init);
      }
    };
  }, [validateNotificationData]);

  // Validate existing notification preferences in localStorage
  const validateExistingNotificationPreferences = useCallback(async () => {
    try {
      let cleanedCount = 0;
      
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.includes('notification') || key.includes('preferences')) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              const data = JSON.parse(value);
              if (!validateNotificationData(data)) {
                localStorage.removeItem(key);
                cleanedCount++;
              }
            } catch {
              // Invalid JSON, remove it
              localStorage.removeItem(key);
              cleanedCount++;
            }
          }
        }
      }
      
      if (cleanedCount > 0) {
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.SYSTEM_RECOVERY,
          eventDetails: {
            action: 'notification_preferences_cleanup',
            cleanedCount,
            context: 'validation_cleanup'
          },
          severity: 'low'
        });
      }
    } catch (error) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.CRITICAL_ERROR,
        eventDetails: {
          action: 'notification_cleanup_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        severity: 'medium'
      });
    }
  }, [validateNotificationData]);

  useEffect(() => {
    // Set up fetch interception
    interceptNotificationRequests(new Event('init'));
    
    // Initial validation of existing preferences
    validateExistingNotificationPreferences();
    
    // Periodic validation every 15 minutes
    const validationInterval = setInterval(validateExistingNotificationPreferences, 15 * 60 * 1000);
    
    return () => {
      clearInterval(validationInterval);
      // Note: Not restoring fetch here as it might interfere with other interceptors
    };
  }, [interceptNotificationRequests, validateExistingNotificationPreferences]);

  return null;
};