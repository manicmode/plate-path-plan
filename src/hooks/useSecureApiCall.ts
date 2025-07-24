import { useCallback } from 'react';
import { validateUUID, sanitizeText, safeParseNumber, safeParseDate } from '@/lib/validation';
import { toast } from 'sonner';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { detectSQLInjection } from '@/lib/edgeFunctionSecurity';

interface ApiCallOptions {
  requireAuth?: boolean;
  validateIds?: string[];
  sanitizeTexts?: string[];
  validateNumbers?: string[];
  validateDates?: string[];
}

export const useSecureApiCall = () => {
  const validateApiCall = useCallback(async (data: any, options: ApiCallOptions = {}) => {
    const { validateIds = [], sanitizeTexts = [], validateNumbers = [], validateDates = [] } = options;
    
    // Validate UUIDs with security logging
    for (const idField of validateIds) {
      const id = data[idField];
      if (id && !validateUUID(id)) {
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.INVALID_UUID,
          eventDetails: { field: idField, value: id },
          severity: 'medium'
        });
        toast.error(`Invalid ${idField} format`);
        return false;
      }
    }
    
    // Sanitize text inputs and check for SQL injection
    const sanitizedData = { ...data };
    for (const textField of sanitizeTexts) {
      if (sanitizedData[textField]) {
        const originalValue = sanitizedData[textField];
        
        // Check for SQL injection attempts
        if (detectSQLInjection(originalValue)) {
          await logSecurityEvent({
            eventType: SECURITY_EVENTS.SQL_INJECTION_ATTEMPT,
            eventDetails: { field: textField, suspicious_input: originalValue },
            severity: 'high'
          });
          toast.error('Invalid input detected');
          return false;
        }
        
        sanitizedData[textField] = sanitizeText(originalValue);
        
        // Log if significant sanitization occurred
        if (sanitizedData[textField] !== originalValue) {
          await logSecurityEvent({
            eventType: SECURITY_EVENTS.INVALID_INPUT,
            eventDetails: { 
              field: textField, 
              original_length: originalValue.length,
              sanitized_length: sanitizedData[textField].length 
            },
            severity: 'low'
          });
        }
      }
    }
    
    // Validate and parse numbers
    for (const numberField of validateNumbers) {
      if (sanitizedData[numberField] !== undefined && sanitizedData[numberField] !== null) {
        const parsed = safeParseNumber(sanitizedData[numberField]);
        if (parsed === null) {
          await logSecurityEvent({
            eventType: SECURITY_EVENTS.INVALID_INPUT,
            eventDetails: { field: numberField, value: sanitizedData[numberField] },
            severity: 'low'
          });
          toast.error(`Invalid ${numberField} number format`);
          return false;
        }
        sanitizedData[numberField] = parsed;
      }
    }
    
    // Validate and parse dates
    for (const dateField of validateDates) {
      if (sanitizedData[dateField]) {
        const parsed = safeParseDate(sanitizedData[dateField]);
        if (parsed === null) {
          await logSecurityEvent({
            eventType: SECURITY_EVENTS.INVALID_INPUT,
            eventDetails: { field: dateField, value: sanitizedData[dateField] },
            severity: 'low'
          });
          toast.error(`Invalid ${dateField} date format`);
          return false;
        }
        sanitizedData[dateField] = parsed;
      }
    }
    
    return sanitizedData;
  }, []);
  
  const secureApiCall = useCallback(async (
    apiFunction: (data: any) => Promise<any>,
    data: any,
    options: ApiCallOptions = {}
  ) => {
    const validatedData = await validateApiCall(data, options);
    if (validatedData === false) {
      throw new Error('Invalid input data');
    }
    
    try {
      return await apiFunction(validatedData);
    } catch (error: any) {
      // Log security-related errors with event logging
      if (error.message?.includes('unauthorized') || 
          error.message?.includes('invalid') ||
          error.message?.includes('forbidden')) {
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.UNAUTHORIZED_ACCESS,
          eventDetails: { error_message: error.message },
          severity: 'high'
        });
        console.warn('Security-related API error:', error);
      }
      throw error;
    }
  }, [validateApiCall]);
  
  return { secureApiCall, validateApiCall };
};