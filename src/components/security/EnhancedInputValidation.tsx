import React, { useEffect } from 'react';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { validateUuidInput, cleanupInvalidUuids } from '@/lib/uuidValidationMiddleware';
import { cleanupNotificationPreferences } from '@/lib/notificationValidation';

// Security patterns for input validation
const SECURITY_PATTERNS = {
  XSS: /<script|javascript:|on\w+\s*=|<iframe|<object|<embed/i,
  SQL_INJECTION: /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\btable\b).*(;|--|\/\*)/i,
  PATH_TRAVERSAL: /\.\.\/|\.\.\\|\.\.\.|%2e%2e%2f|%2e%2e%5c/i,
  COMMAND_INJECTION: /(\||;|&|`|\$\(|\${|<|>)/,
  DATA_URI: /^data:.*base64/i,
  SENSITIVE_KEYWORDS: /password|token|secret|key|auth|session|cookie/i
};

export const EnhancedInputValidation: React.FC = () => {
  
  // Enhanced input monitoring
  useEffect(() => {
    const validateInput = async (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
      const inputType = element.type || 'text';
      const fieldName = element.name || element.id || 'unknown';
      
      // Check for security threats
      for (const [threatType, pattern] of Object.entries(SECURITY_PATTERNS)) {
        if (pattern.test(value)) {
          await logSecurityEvent({
            eventType: threatType === 'XSS' ? SECURITY_EVENTS.XSS_ATTEMPT : SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
            eventDetails: {
              threatType,
              fieldName,
              inputType,
              value: value.substring(0, 100), // Log first 100 chars only
              context: 'enhanced_input_validation'
            },
            severity: threatType === 'XSS' ? 'critical' : 'high'
          });
          
          // Clear the malicious input
          element.value = '';
          element.style.borderColor = 'red';
          
          // Show user feedback
          const errorMsg = document.createElement('div');
          errorMsg.textContent = 'Invalid input detected and cleared';
          errorMsg.style.color = 'red';
          errorMsg.style.fontSize = '12px';
          errorMsg.style.marginTop = '2px';
          element.parentNode?.appendChild(errorMsg);
          
          setTimeout(() => {
            errorMsg.remove();
            element.style.borderColor = '';
          }, 3000);
          
          return false;
        }
      }
      
      // Validate UUID fields
      if (fieldName.includes('_id') || fieldName.includes('Id') || inputType === 'hidden') {
        const validUuid = await validateUuidInput(value, `input_${fieldName}`);
        if (value && !validUuid) {
          element.value = '';
          return false;
        }
      }
      
      return true;
    };

    const handleInput = async (event: Event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        await validateInput(target, target.value);
      }
    };

    const handlePaste = async (event: ClipboardEvent) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const pastedData = event.clipboardData?.getData('text') || '';
        const isValid = await validateInput(target, pastedData);
        
        if (!isValid) {
          event.preventDefault();
        }
      }
    };

    // Enhanced form submission validation
    const handleFormSubmit = async (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (!form || form.tagName !== 'FORM') return;

      const formData = new FormData(form);
      let hasSecurityIssues = false;

      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
          // Check for security patterns
          for (const [threatType, pattern] of Object.entries(SECURITY_PATTERNS)) {
            if (pattern.test(value)) {
              await logSecurityEvent({
                eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
                eventDetails: {
                  threatType,
                  fieldName: key,
                  context: 'form_submission_validation',
                  formId: form.id || 'unknown'
                },
                severity: 'high'
              });
              hasSecurityIssues = true;
            }
          }

          // Validate UUIDs
          if (key.includes('_id') || key.includes('Id')) {
            const validUuid = await validateUuidInput(value, `form_${key}`);
            if (value && !validUuid) {
              hasSecurityIssues = true;
            }
          }
        }
      }

      if (hasSecurityIssues) {
        event.preventDefault();
        
        // Show user feedback
        const existingError = form.querySelector('.security-error');
        if (!existingError) {
          const errorDiv = document.createElement('div');
          errorDiv.className = 'security-error';
          errorDiv.textContent = 'Security validation failed. Please check your input.';
          errorDiv.style.color = 'red';
          errorDiv.style.padding = '8px';
          errorDiv.style.backgroundColor = '#fee';
          errorDiv.style.border = '1px solid red';
          errorDiv.style.borderRadius = '4px';
          errorDiv.style.marginTop = '8px';
          
          form.appendChild(errorDiv);
          
          setTimeout(() => {
            errorDiv.remove();
          }, 5000);
        }
      }
    };

    // Add event listeners
    document.addEventListener('input', handleInput);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('submit', handleFormSubmit);

    // Initial cleanup
    const performCleanup = async () => {
      const uuidCleaned = cleanupInvalidUuids();
      const notificationCleaned = await cleanupNotificationPreferences();
      
      if (uuidCleaned + notificationCleaned > 0) {
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
          eventDetails: {
            action: 'initial_data_cleanup',
            uuidCleaned,
            notificationCleaned,
            context: 'enhanced_input_validation'
          },
          severity: 'low'
        });
      }
    };

    performCleanup();

    return () => {
      document.removeEventListener('input', handleInput);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('submit', handleFormSubmit);
    };
  }, []);

  return null; // This component only adds event listeners
};