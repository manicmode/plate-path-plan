import { useCallback } from 'react';
import { validateUUID, validateEmail, sanitizeText, safeParseNumber, safeParseDate } from '@/lib/validation';
import { toast } from 'sonner';

interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'uuid' | 'date';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null; // Return error message or null if valid
}

interface ValidationSchema {
  [key: string]: ValidationRule;
}

export const useInputValidation = () => {
  const validateField = useCallback((value: any, rule: ValidationRule, fieldName: string): string | null => {
    // Check required
    if (rule.required && (value === null || value === undefined || value === '')) {
      return `${fieldName} is required`;
    }

    // Skip further validation if value is empty and not required
    if (!rule.required && (value === null || value === undefined || value === '')) {
      return null;
    }

    // Type validation
    switch (rule.type) {
      case 'email':
        if (!validateEmail(value)) {
          return `${fieldName} must be a valid email address`;
        }
        break;
      case 'uuid':
        if (!validateUUID(value)) {
          return `${fieldName} must be a valid UUID`;
        }
        break;
      case 'number':
        const num = safeParseNumber(value);
        if (num === null) {
          return `${fieldName} must be a valid number`;
        }
        if (rule.min !== undefined && num < rule.min) {
          return `${fieldName} must be at least ${rule.min}`;
        }
        if (rule.max !== undefined && num > rule.max) {
          return `${fieldName} must be at most ${rule.max}`;
        }
        break;
      case 'date':
        const date = safeParseDate(value);
        if (date === null) {
          return `${fieldName} must be a valid date`;
        }
        break;
      case 'string':
      default:
        const str = String(value);
        if (rule.minLength !== undefined && str.length < rule.minLength) {
          return `${fieldName} must be at least ${rule.minLength} characters`;
        }
        if (rule.maxLength !== undefined && str.length > rule.maxLength) {
          return `${fieldName} must be at most ${rule.maxLength} characters`;
        }
        if (rule.pattern && !rule.pattern.test(str)) {
          return `${fieldName} format is invalid`;
        }
        break;
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        return customError;
      }
    }

    return null;
  }, []);

  const validateForm = useCallback((data: Record<string, any>, schema: ValidationSchema) => {
    const errors: Record<string, string> = {};
    const sanitizedData: Record<string, any> = {};

    for (const [fieldName, rule] of Object.entries(schema)) {
      const value = data[fieldName];
      
      // Sanitize string inputs
      if (rule.type === 'string' || rule.type === undefined) {
        sanitizedData[fieldName] = typeof value === 'string' ? sanitizeText(value) : value;
      } else if (rule.type === 'number') {
        sanitizedData[fieldName] = safeParseNumber(value);
      } else if (rule.type === 'date') {
        sanitizedData[fieldName] = safeParseDate(value);
      } else {
        sanitizedData[fieldName] = value;
      }

      // Validate field
      const error = validateField(sanitizedData[fieldName], rule, fieldName);
      if (error) {
        errors[fieldName] = error;
      }
    }

    return { isValid: Object.keys(errors).length === 0, errors, sanitizedData };
  }, [validateField]);

  const validateFormWithToast = useCallback((data: Record<string, any>, schema: ValidationSchema) => {
    const result = validateForm(data, schema);
    
    if (!result.isValid) {
      const firstError = Object.values(result.errors)[0];
      toast.error(firstError);
    }
    
    return result;
  }, [validateForm]);

  return {
    validateField,
    validateForm,
    validateFormWithToast
  };
};

// Common validation schemas
export const commonSchemas = {
  userProfile: {
    email: { required: true, type: 'email' as const },
    firstName: { required: true, type: 'string' as const, minLength: 1, maxLength: 50 },
    lastName: { required: true, type: 'string' as const, minLength: 1, maxLength: 50 },
    age: { type: 'number' as const, min: 13, max: 120 },
    weight: { type: 'number' as const, min: 30, max: 1000 },
    height: { type: 'number' as const, min: 100, max: 300 }
  },
  nutrition: {
    name: { required: true, type: 'string' as const, minLength: 1, maxLength: 255 },
    calories: { type: 'number' as const, min: 0, max: 10000 },
    protein: { type: 'number' as const, min: 0, max: 1000 },
    carbs: { type: 'number' as const, min: 0, max: 1000 },
    fat: { type: 'number' as const, min: 0, max: 1000 },
    fiber: { type: 'number' as const, min: 0, max: 200 },
    sugar: { type: 'number' as const, min: 0, max: 1000 },
    sodium: { type: 'number' as const, min: 0, max: 50000 }
  },
  reminder: {
    label: { required: true, type: 'string' as const, minLength: 1, maxLength: 100 },
    type: { required: true, type: 'string' as const },
    reminderTime: { required: true, type: 'string' as const },
    frequencyType: { required: true, type: 'string' as const }
  }
};