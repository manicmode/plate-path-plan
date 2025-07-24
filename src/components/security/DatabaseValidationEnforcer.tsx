import React, { useEffect } from 'react';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { validateUuidInput } from '@/lib/uuidValidationMiddleware';
import { validateNotificationData } from '@/lib/securityValidationEnhanced';
import { toast } from 'sonner';

export const DatabaseValidationEnforcer: React.FC = () => {
  
  // Enhanced database validation interceptor
  useEffect(() => {
    // Override fetch to intercept database operations
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const url = typeof input === 'string' ? input : input.toString();
        
        // Only intercept Supabase API calls
        if (url.includes('supabase.co') && init?.method && ['POST', 'PATCH', 'PUT'].includes(init.method)) {
          const body = init.body;
          
          if (body && typeof body === 'string') {
            try {
              const data = JSON.parse(body);
              
              // Validate UUID fields in the request
              const uuidFields = ['user_id', 'id', 'challenge_id', 'friend_id', 'group_id'];
              for (const field of uuidFields) {
                if (data[field]) {
                  const validUuid = await validateUuidInput(data[field], `db_operation_${field}`);
                  if (!validUuid) {
                    await logSecurityEvent({
                      eventType: SECURITY_EVENTS.INVALID_UUID,
                      eventDetails: {
                        field,
                        value: data[field],
                        context: 'database_validation_enforcer',
                        url: url.substring(0, 100)
                      },
                      severity: 'high'
                    });
                    
                    toast.error('Invalid data detected and blocked');
                    throw new Error(`Invalid UUID in field: ${field}`);
                  }
                }
              }
              
              // Validate notification data if present
              if (url.includes('user_notifications') && (data.type || data.title || data.message)) {
                const validation = validateNotificationData(data);
                if (!validation.isValid) {
                  await logSecurityEvent({
                    eventType: SECURITY_EVENTS.INVALID_INPUT,
                    eventDetails: {
                      errors: validation.errors,
                      context: 'notification_validation',
                      url: url.substring(0, 100)
                    },
                    severity: 'medium'
                  });
                  
                  toast.error('Invalid notification data blocked');
                  throw new Error(`Invalid notification data: ${validation.errors.join(', ')}`);
                }
              }
              
              // Check for suspicious patterns in text fields
              const textFields = ['title', 'message', 'content', 'description'];
              for (const field of textFields) {
                if (data[field] && typeof data[field] === 'string') {
                  const suspiciousPatterns = [
                    /<script/i,
                    /javascript:/i,
                    /on\w+\s*=/i,
                    /data:.*base64/i,
                    /(union|select|insert|delete|drop|update).*(\s|;|--|\*)/i
                  ];
                  
                  for (const pattern of suspiciousPatterns) {
                    if (pattern.test(data[field])) {
                      await logSecurityEvent({
                        eventType: SECURITY_EVENTS.XSS_ATTEMPT,
                        eventDetails: {
                          field,
                          pattern: pattern.toString(),
                          value: data[field].substring(0, 100),
                          context: 'database_validation_enforcer'
                        },
                        severity: 'critical'
                      });
                      
                      toast.error('Malicious content detected and blocked');
                      throw new Error(`Suspicious content detected in field: ${field}`);
                    }
                  }
                }
              }
            } catch (parseError) {
              // If we can't parse JSON, it might be FormData or other format
              // Let it proceed but log the attempt
              if (parseError instanceof SyntaxError) {
                // Not JSON, might be FormData - proceed with original request
              } else {
                // Re-throw validation errors
                throw parseError;
              }
            }
          }
        }
        
        return originalFetch(input, init);
      } catch (error) {
        // If validation fails, don't make the request
        return Promise.reject(error);
      }
    };
    
    // Enhanced form validation interceptor
    const validateFormData = async (formData: FormData): Promise<boolean> => {
      const errors: string[] = [];
      
      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
          // UUID validation
          if (key.includes('_id') || key.includes('Id')) {
            const validUuid = await validateUuidInput(value, `form_${key}`);
            if (value && !validUuid) {
              errors.push(`Invalid UUID in field: ${key}`);
            }
          }
          
          // Content validation
          const suspiciousPatterns = [
            { pattern: /<script/i, type: 'XSS' },
            { pattern: /javascript:/i, type: 'XSS' },
            { pattern: /on\w+\s*=/i, type: 'XSS' },
            { pattern: /(union|select|insert|delete|drop).*(\s|;|--)/i, type: 'SQL_INJECTION' }
          ];
          
          for (const { pattern, type } of suspiciousPatterns) {
            if (pattern.test(value)) {
              await logSecurityEvent({
                eventType: type === 'XSS' ? SECURITY_EVENTS.XSS_ATTEMPT : SECURITY_EVENTS.SQL_INJECTION_ATTEMPT,
                eventDetails: {
                  field: key,
                  pattern: pattern.toString(),
                  value: value.substring(0, 100),
                  context: 'form_validation_interceptor'
                },
                severity: 'critical'
              });
              errors.push(`Malicious content detected in field: ${key}`);
            }
          }
        }
      }
      
      if (errors.length > 0) {
        toast.error(`Security validation failed: ${errors[0]}`);
        return false;
      }
      
      return true;
    };
    
    // Intercept form submissions
    const handleFormSubmit = async (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (!form || form.tagName !== 'FORM') return;
      
      const formData = new FormData(form);
      const isValid = await validateFormData(formData);
      
      if (!isValid) {
        event.preventDefault();
        event.stopPropagation();
        
        // Add visual feedback
        form.style.border = '2px solid red';
        setTimeout(() => {
          form.style.border = '';
        }, 3000);
      }
    };
    
    document.addEventListener('submit', handleFormSubmit, true);
    
    // Cleanup function
    return () => {
      window.fetch = originalFetch;
      document.removeEventListener('submit', handleFormSubmit, true);
    };
  }, []);
  
  // Enhanced storage validation and cleanup
  useEffect(() => {
    const validateAndCleanStorage = async () => {
      let cleanupCount = 0;
      
      // Clean localStorage
      const localStorageKeys = Object.keys(localStorage);
      for (const key of localStorageKeys) {
        try {
          const value = localStorage.getItem(key);
          
          // Remove invalid UUID values
          if ((key.includes('_id') || key.includes('Id')) && value) {
            if (value === 'undefined' || value === 'null' || value === '') {
              localStorage.removeItem(key);
              cleanupCount++;
            } else {
              const validUuid = await validateUuidInput(value, `storage_${key}`);
              if (!validUuid) {
                localStorage.removeItem(key);
                cleanupCount++;
              }
            }
          }
          
          // Clean malformed notification preferences
          if (key === 'notification_preferences' && value) {
            try {
              const prefs = JSON.parse(value);
              const validTypes = ['meal_reminder', 'hydration_nudge', 'progress_update', 'achievement', 'challenge_invitation', 'follow_notification', 'system_alert', 'security_alert', 'coach_message', 'mood_checkin'];
              
              let hasChanges = false;
              const cleanedPrefs: Record<string, boolean> = {};
              
              for (const [type, enabled] of Object.entries(prefs)) {
                if (validTypes.includes(type) && typeof enabled === 'boolean') {
                  cleanedPrefs[type] = enabled;
                } else {
                  hasChanges = true;
                }
              }
              
              if (hasChanges) {
                localStorage.setItem(key, JSON.stringify(cleanedPrefs));
                cleanupCount++;
              }
            } catch {
              localStorage.removeItem(key);
              cleanupCount++;
            }
          }
        } catch (error) {
          // Remove problematic keys
          localStorage.removeItem(key);
          cleanupCount++;
        }
      }
      
      if (cleanupCount > 0) {
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
          eventDetails: {
            action: 'database_validation_cleanup',
            cleanupCount,
            context: 'database_validation_enforcer'
          },
          severity: 'low'
        });
        
        toast.success(`Cleaned up ${cleanupCount} invalid data entries`);
      }
    };
    
    // Run initial cleanup
    validateAndCleanStorage();
    
    // Set up periodic cleanup
    const cleanupInterval = setInterval(validateAndCleanStorage, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(cleanupInterval);
  }, []);
  
  return null; // This component only provides side effects
};