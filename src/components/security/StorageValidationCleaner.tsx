import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { isValidUUID, isValidNotificationData } from '@/lib/validation';

export const StorageValidationCleaner: React.FC = () => {
  useEffect(() => {
    const performStorageCleanup = async () => {
      let cleanedItems = 0;
      let errorItems = 0;
      
      try {
        // Clean localStorage
        const localStorageKeys = Object.keys(localStorage);
        
        for (const key of localStorageKeys) {
          try {
            const value = localStorage.getItem(key);
            
            // Remove obviously invalid values
            if (value === 'undefined' || value === 'null' || value === '' || value === 'false' || value === 'true') {
              localStorage.removeItem(key);
              cleanedItems++;
              continue;
            }
            
            // Check UUID fields
            if (key.includes('_id') || key.includes('Id') || key.endsWith('id')) {
              if (value && !isValidUUID(value)) {
                localStorage.removeItem(key);
                cleanedItems++;
                continue;
              }
            }
            
            // Check notification preferences
            if (key.includes('notification') || key.includes('preferences')) {
              try {
                const parsed = JSON.parse(value);
                if (!isValidNotificationData(parsed)) {
                  localStorage.removeItem(key);
                  cleanedItems++;
                  continue;
                }
              } catch {
                // Invalid JSON in notification data
                localStorage.removeItem(key);
                cleanedItems++;
                continue;
              }
            }
            
            // Check for XSS patterns in stored data
            if (typeof value === 'string' && value.length > 0) {
              const xssPattern = /<script|javascript:|on\w+\s*=|<iframe|eval\(|expression\(/i;
              if (xssPattern.test(value)) {
                localStorage.removeItem(key);
                cleanedItems++;
                
                await logSecurityEvent({
                  eventType: SECURITY_EVENTS.XSS_ATTEMPT,
                  eventDetails: { 
                    key, 
                    value: value.substring(0, 100) + '...',
                    context: 'localStorage_cleanup' 
                  },
                  severity: 'high'
                });
              }
            }
            
          } catch (error) {
            // Error processing this item, remove it
            localStorage.removeItem(key);
            errorItems++;
          }
        }
        
        // Clean sessionStorage
        const sessionStorageKeys = Object.keys(sessionStorage);
        
        for (const key of sessionStorageKeys) {
          try {
            const value = sessionStorage.getItem(key);
            
            if (value === 'undefined' || value === 'null' || value === '' || value === 'false' || value === 'true') {
              sessionStorage.removeItem(key);
              cleanedItems++;
              continue;
            }
            
            if (key.includes('_id') || key.includes('Id') || key.endsWith('id')) {
              if (value && !isValidUUID(value)) {
                sessionStorage.removeItem(key);
                cleanedItems++;
                continue;
              }
            }
            
          } catch (error) {
            sessionStorage.removeItem(key);
            errorItems++;
          }
        }
        
        // Log cleanup results
        if (cleanedItems > 0 || errorItems > 0) {
          await logSecurityEvent({
            eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
            eventDetails: { 
              action: 'storage_cleanup',
              cleanedItems,
              errorItems,
              context: 'automated_cleanup'
            },
            severity: 'low'
          });
          
          if (cleanedItems > 5) {
            toast.success(`Cleaned up ${cleanedItems} invalid data entries`);
          }
        }
        
      } catch (error) {
        console.warn('Storage cleanup error:', error);
        
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
          eventDetails: { 
            action: 'storage_cleanup_failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            context: 'cleanup_error'
          },
          severity: 'medium'
        });
      }
    };
    
    // Run cleanup immediately
    performStorageCleanup();
    
    // Run cleanup every 10 minutes
    const interval = setInterval(performStorageCleanup, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return null;
};