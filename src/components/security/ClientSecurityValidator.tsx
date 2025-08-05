import React, { useEffect, useCallback } from 'react';
import { validateUuidInput } from '@/lib/uuidValidationMiddleware';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { toast } from 'sonner';

export const ClientSecurityValidator: React.FC = () => {
  // Enhanced UUID validation for client-side inputs
  const validateClientUuid = useCallback(async (value: string, context: string): Promise<boolean> => {
    try {
      const result = await validateUuidInput(value, context);
      return result !== null;
    } catch (error) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.INVALID_UUID,
        eventDetails: {
          value: String(value),
          context,
          error: error instanceof Error ? error.message : 'Unknown error',
          location: 'client_side_validation'
        },
        severity: 'medium'
      });
      return false;
    }
  }, []);

  // Enhanced form validation with security checks
  const handleFormValidation = useCallback(async (event: Event) => {
    const form = event.target as HTMLFormElement;
    if (!form || form.tagName !== 'FORM') return;

    const formData = new FormData(form);
    let hasSecurityIssues = false;

    for (const [key, value] of formData.entries()) {
      const stringValue = String(value);
      
      // Check for UUID fields
      if (key.includes('_id') || key.includes('Id')) {
        if (stringValue && stringValue !== '') {
          const isValid = await validateClientUuid(stringValue, `form_${key}`);
          if (!isValid) {
            hasSecurityIssues = true;
            break;
          }
        }
      }

      // Check for potential XSS in text fields
      if (typeof value === 'string' && value.length > 0) {
        const xssPatterns = [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /<iframe/gi,
          /<object/gi,
          /<embed/gi
        ];

        const hasXss = xssPatterns.some(pattern => pattern.test(stringValue));
        if (hasXss) {
          await logSecurityEvent({
            eventType: SECURITY_EVENTS.XSS_ATTEMPT,
            eventDetails: {
              field: key,
              value: stringValue.slice(0, 100),
              pattern_matched: 'client_xss_detection',
              location: 'form_validation'
            },
            severity: 'high'
          });
          hasSecurityIssues = true;
          break;
        }
      }
    }

    if (hasSecurityIssues) {
      event.preventDefault();
      event.stopPropagation();
      toast.error('Security validation failed. Please check your input.');
    }
  }, [validateClientUuid]);

  // Monitor for suspicious DOM modifications
  const setupDomMonitoring = useCallback(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Check for dangerous script elements
              if (element.tagName === 'SCRIPT') {
                logSecurityEvent({
                  eventType: SECURITY_EVENTS.XSS_ATTEMPT,
                  eventDetails: {
                    threat: 'script_injection_detected',
                    tagName: element.tagName,
                    location: 'dom_monitoring',
                    timestamp: Date.now()
                  },
                  severity: 'critical'
                });
                
                // Remove the malicious element
                element.remove();
                toast.error('Malicious script blocked');
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  // Enhanced clipboard monitoring for security
  const handlePasteEvent = useCallback(async (event: ClipboardEvent) => {
    const clipboardData = event.clipboardData?.getData('text') || '';
    
    // Check for malicious content in clipboard
    const suspiciousPatterns = [
      /<script/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /onload=/gi,
      /onerror=/gi
    ];

    const hasSuspiciousContent = suspiciousPatterns.some(pattern => 
      pattern.test(clipboardData)
    );

    if (hasSuspiciousContent) {
      event.preventDefault();
      
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
        eventDetails: {
          action: 'malicious_paste_blocked',
          content_length: clipboardData.length,
          content_preview: clipboardData.slice(0, 50),
          location: 'clipboard_monitoring'
        },
        severity: 'high'
      });
      
      toast.error('Suspicious content blocked from clipboard');
    }
  }, []);

  useEffect(() => {
    // Set up event listeners
    document.addEventListener('submit', handleFormValidation, { capture: true });
    document.addEventListener('paste', handlePasteEvent, { capture: true });
    
    // Set up DOM monitoring
    const cleanupDomMonitoring = setupDomMonitoring();
    
    // Cleanup function
    return () => {
      document.removeEventListener('submit', handleFormValidation, { capture: true });
      document.removeEventListener('paste', handlePasteEvent, { capture: true });
      cleanupDomMonitoring();
    };
  }, [handleFormValidation, handlePasteEvent, setupDomMonitoring]);

  // Log successful client-side security setup
  useEffect(() => {
    logSecurityEvent({
      eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
      eventDetails: {
        action: 'client_security_validator_initialized',
        features: [
          'uuid_validation',
          'xss_protection',
          'dom_monitoring',
          'clipboard_security'
        ],
        timestamp: Date.now()
      },
      severity: 'low'
    });
  }, []);

  return null;
};