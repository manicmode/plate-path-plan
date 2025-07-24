import { z } from 'zod';

// UUID validation schema
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Email validation schema
export const emailSchema = z.string().email('Invalid email format').min(1, 'Email is required');

// Password validation schema
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

// Text input sanitization
export const sanitizeText = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .slice(0, 1000); // Limit length
};

// Validate UUID before API calls
export const validateUUID = (uuid: string): boolean => {
  try {
    uuidSchema.parse(uuid);
    return true;
  } catch {
    return false;
  }
};

// Validate email before API calls
export const validateEmail = (email: string): boolean => {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
};

// Validate password before API calls
export const validatePassword = (password: string): boolean => {
  try {
    passwordSchema.parse(password);
    return true;
  } catch {
    return false;
  }
};

// Safe number parsing
export const safeParseNumber = (value: any): number | null => {
  const parsed = Number(value);
  return isNaN(parsed) || !isFinite(parsed) ? null : parsed;
};

// Safe date parsing
export const safeParseDate = (value: any): Date | null => {
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

// Enhanced UUID validation with comprehensive checks
export const isValidUUID = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false;
  
  // Check for common invalid values that cause database errors
  if (value === 'undefined' || value === 'null' || value === 'false' || value === 'true' || value === '') {
    return false;
  }
  
  // Check for string representations of undefined/null
  if (value.toLowerCase() === 'undefined' || value.toLowerCase() === 'null') {
    return false;
  }
  
  // UUID v4 pattern with strict validation
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(value) && value.length === 36;
};

// Enhanced notification data validation with constraint checking
export const isValidNotificationData = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;
  
  // Check for required notification structure
  const validTypes = ['email', 'push', 'sms', 'in_app', 'reminder', 'challenge', 'social'];
  
  if (data.type && !validTypes.includes(data.type)) {
    return false;
  }
  
  // Validate notification preferences structure to prevent constraint violations
  if (data.preferences) {
    const prefs = data.preferences;
    if (typeof prefs !== 'object') return false;
    
    // Check for valid boolean preferences
    for (const [key, value] of Object.entries(prefs)) {
      if (typeof value !== 'boolean' && value !== null && value !== undefined) {
        return false;
      }
      
      // Prevent empty string values that cause constraint violations
      if (value === '' || value === 'undefined' || value === 'null') {
        return false;
      }
    }
  }
  
  // Validate required fields for database constraints
  if (data.user_id && !isValidUUID(data.user_id)) {
    return false;
  }
  
  // Check for XSS in notification content
  if (data.content && typeof data.content === 'string') {
    const xssPattern = /<script|javascript:|on\w+\s*=|<iframe/i;
    if (xssPattern.test(data.content)) {
      return false;
    }
  }
  
  return true;
};