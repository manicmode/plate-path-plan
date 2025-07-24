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