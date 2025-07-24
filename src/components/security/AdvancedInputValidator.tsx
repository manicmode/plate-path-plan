import React, { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { isValidUUID } from '@/lib/validation';

export const AdvancedInputValidator: React.FC = () => {
  const sanitizeInput = useCallback((value: string): string => {
    // Remove potential XSS patterns
    return value
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/expression\s*\(/gi, '')
      .replace(/eval\s*\(/gi, '')
      .replace(/Function\s*\(/gi, '');
  }, []);

  const validateInput = useCallback(async (input: HTMLInputElement | HTMLTextAreaElement) => {
    const value = input.value;
    const name = input.name || input.id || 'unknown';
    let isValid = true;
    let sanitizedValue = value;

    // XSS Pattern Detection
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /expression\s*\(/gi,
      /eval\s*\(/gi,
      /Function\s*\(/gi
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(value)) {
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.XSS_ATTEMPT,
          eventDetails: {
            field: name,
            pattern: pattern.source,
            value: value.substring(0, 100)
          },
          severity: 'high'
        });
        
        sanitizedValue = sanitizeInput(value);
        isValid = false;
        
        input.classList.add('border-red-500', 'animate-pulse');
        setTimeout(() => {
          input.classList.remove('border-red-500', 'animate-pulse');
        }, 2000);
        
        toast.error(`Potentially dangerous content detected in ${name}`);
        break;
      }
    }

    // UUID Validation
    if (name.toLowerCase().includes('id') && value && !isValidUUID(value)) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.INVALID_UUID,
        eventDetails: {
          field: name,
          value: value
        },
        severity: 'medium'
      });
      
      input.classList.add('border-yellow-500');
      setTimeout(() => {
        input.classList.remove('border-yellow-500');
      }, 2000);
      
      isValid = false;
    }

    // Update input with sanitized value if needed
    if (sanitizedValue !== value) {
      input.value = sanitizedValue;
    }

    return { isValid, sanitizedValue };
  }, [sanitizeInput]);

  useEffect(() => {
    const handleInput = async (event: Event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        await validateInput(target);
      }
    };

    const handlePaste = async (event: ClipboardEvent) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const pastedData = event.clipboardData?.getData('text') || '';
        
        // Check for suspicious paste content
        const suspiciousPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/i,
          /expression\s*\(/i
        ];

        for (const pattern of suspiciousPatterns) {
          if (pattern.test(pastedData)) {
            event.preventDefault();
            await logSecurityEvent({
              eventType: SECURITY_EVENTS.SUSPICIOUS_PASTE,
              eventDetails: {
                field: target.name || target.id || 'unknown',
                content: pastedData.substring(0, 100)
              },
              severity: 'medium'
            });
            
            toast.warning('Paste content blocked - contains potentially dangerous code');
            return;
          }
        }
        
        // Allow paste but validate after
        setTimeout(() => validateInput(target), 10);
      }
    };

    document.addEventListener('input', handleInput);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('input', handleInput);
      document.removeEventListener('paste', handlePaste);
    };
  }, [validateInput]);

  return null;
};