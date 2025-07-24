import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { isValidUUID, isValidNotificationData } from '@/lib/validation';

export const DatabaseValidationMiddleware: React.FC = () => {
  useEffect(() => {
    // Override fetch to intercept database calls and validate data
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      // Only intercept Supabase API calls
      if (url.includes('supabase.co') && init?.method === 'POST') {
        try {
          const body = init.body;
          if (typeof body === 'string') {
            const data = JSON.parse(body);
            
            // Validate UUIDs in request data
            for (const [key, value] of Object.entries(data)) {
              if (key.includes('id') && value && typeof value === 'string') {
                if (!isValidUUID(value)) {
                  await logSecurityEvent({
                    eventType: SECURITY_EVENTS.INVALID_UUID,
                    eventDetails: { 
                      field: key, 
                      value: String(value),
                      url: url,
                      context: 'database_middleware' 
                    },
                    severity: 'high'
                  });
                  
                  toast.error('Invalid data format detected. Request blocked for security.');
                  throw new Error(`Invalid UUID format in field: ${key}`);
                }
              }
            }
            
            // Validate notification data specifically
            if (url.includes('user_notifications') || data.type) {
              if (!isValidNotificationData(data)) {
                await logSecurityEvent({
                  eventType: SECURITY_EVENTS.INVALID_INPUT,
                  eventDetails: { 
                    data: data,
                    url: url,
                    context: 'notification_validation' 
                  },
                  severity: 'high'
                });
                
                toast.error('Invalid notification data. Request blocked.');
                throw new Error('Invalid notification data structure');
              }
            }
          }
        } catch (error) {
          if (error instanceof SyntaxError) {
            // Body is not JSON, proceed normally
          } else {
            // Validation error, don't proceed
            return Promise.reject(error);
          }
        }
      }
      
      return originalFetch(input, init);
    };
    
    // Cleanup on unmount
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    // Intercept form submissions to validate data
    const handleFormSubmit = async (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (!form || form.tagName !== 'FORM') return;
      
      const formData = new FormData(form);
      let hasErrors = false;
      
      // Check for UUID fields
      for (const [key, value] of formData.entries()) {
        if (key.includes('id') && value && typeof value === 'string') {
          if (!isValidUUID(value)) {
            await logSecurityEvent({
              eventType: SECURITY_EVENTS.INVALID_UUID,
              eventDetails: { 
                field: key, 
                value: String(value),
                context: 'form_submission' 
              },
              severity: 'medium'
            });
            
            form.classList.add('animate-pulse');
            setTimeout(() => form.classList.remove('animate-pulse'), 1000);
            
            toast.error(`Invalid format in field: ${key}`);
            hasErrors = true;
          }
        }
      }
      
      if (hasErrors) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    
    document.addEventListener('submit', handleFormSubmit);
    
    return () => {
      document.removeEventListener('submit', handleFormSubmit);
    };
  }, []);

  return null;
};