import { useCallback } from 'react';
import { validateUUID, sanitizeText } from '@/lib/validation';
import { toast } from 'sonner';

interface ApiCallOptions {
  requireAuth?: boolean;
  validateIds?: string[];
  sanitizeTexts?: string[];
}

export const useSecureApiCall = () => {
  const validateApiCall = useCallback((data: any, options: ApiCallOptions = {}) => {
    const { validateIds = [], sanitizeTexts = [] } = options;
    
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