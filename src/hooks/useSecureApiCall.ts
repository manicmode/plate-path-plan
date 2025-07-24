import { useCallback } from 'react';
import { validateUUID, sanitizeText, safeParseNumber, safeParseDate } from '@/lib/validation';
import { toast } from 'sonner';

interface ApiCallOptions {
  requireAuth?: boolean;
  validateIds?: string[];
  sanitizeTexts?: string[];
  validateNumbers?: string[];
  validateDates?: string[];
}

export const useSecureApiCall = () => {
  const validateApiCall = useCallback((data: any, options: ApiCallOptions = {}) => {
    const { validateIds = [], sanitizeTexts = [], validateNumbers = [], validateDates = [] } = options;
    
    // Validate UUIDs
    for (const idField of validateIds) {
      const id = data[idField];
      if (id && !validateUUID(id)) {
        toast.error(`Invalid ${idField} format`);
        return false;
      }
    }
    
    // Sanitize text inputs
    const sanitizedData = { ...data };
    for (const textField of sanitizeTexts) {
      if (sanitizedData[textField]) {
        sanitizedData[textField] = sanitizeText(sanitizedData[textField]);
      }
    }
    
    // Validate and parse numbers
    for (const numberField of validateNumbers) {
      if (sanitizedData[numberField] !== undefined && sanitizedData[numberField] !== null) {
        const parsed = safeParseNumber(sanitizedData[numberField]);
        if (parsed === null) {
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
    const validatedData = validateApiCall(data, options);
    if (validatedData === false) {
      throw new Error('Invalid input data');
    }
    
    try {
      return await apiFunction(validatedData);
    } catch (error: any) {
      // Log security-related errors
      if (error.message?.includes('unauthorized') || 
          error.message?.includes('invalid') ||
          error.message?.includes('forbidden')) {
        console.warn('Security-related API error:', error);
      }
      throw error;
    }
  }, [validateApiCall]);
  
  return { secureApiCall, validateApiCall };
};