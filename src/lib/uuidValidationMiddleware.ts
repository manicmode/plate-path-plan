import { z } from 'zod';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';

// Enhanced UUID validation schema
const uuidSchema = z.string().uuid('Invalid UUID format').min(1, 'UUID cannot be empty');

export const validateUuidInput = async (value: any, context?: string): Promise<string | null> => {
  try {
    // Handle undefined, null, or empty values
    if (!value || value === 'undefined' || value === 'null' || value === '') {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.INVALID_UUID,
        eventDetails: { 
          value: String(value), 
          context: context || 'unknown',
          reason: 'Empty or undefined UUID'
        },
        severity: 'medium'
      });
      return null;
    }

    // Validate UUID format
    const result = uuidSchema.safeParse(value);
    
    if (!result.success) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.INVALID_UUID,
        eventDetails: { 
          value: String(value), 
          context: context || 'unknown',
          errors: result.error.errors,
          reason: 'Invalid UUID format'
        },
        severity: 'medium'
      });
      return null;
    }

    return result.data;
  } catch (error) {
    await logSecurityEvent({
      eventType: SECURITY_EVENTS.INVALID_UUID,
      eventDetails: { 
        value: String(value), 
        context: context || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        reason: 'UUID validation exception'
      },
      severity: 'high'
    });
    return null;
  }
};

// Middleware for form data validation
export const validateFormUuids = async (formData: Record<string, any>): Promise<Record<string, any> | null> => {
  const uuidFields = ['user_id', 'id', 'challenge_id', 'friend_id', 'group_id'];
  const validatedData = { ...formData };

  for (const field of uuidFields) {
    if (field in validatedData) {
      const validUuid = await validateUuidInput(validatedData[field], `form_${field}`);
      if (validatedData[field] && !validUuid) {
        // Field was provided but invalid
        return null;
      }
      validatedData[field] = validUuid;
    }
  }

  return validatedData;
};

// Sanitize storage data to remove invalid UUIDs
export const cleanupInvalidUuids = () => {
  try {
    const storageKeys = Object.keys(localStorage);
    let cleanedCount = 0;

    storageKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value === 'undefined' || value === 'null' || value === '') {
          localStorage.removeItem(key);
          cleanedCount++;
        } else if (key.includes('_id') || key.includes('Id')) {
          // Check if it's supposed to be a UUID
          const parsed = JSON.parse(value);
          if (typeof parsed === 'string' && (parsed === 'undefined' || parsed === 'null')) {
            localStorage.removeItem(key);
            cleanedCount++;
          }
        }
      } catch (error) {
        // If we can't parse it and it looks like invalid data, remove it
        if (key.includes('_id') || key.includes('Id')) {
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
    });

    if (cleanedCount > 0) {
      logSecurityEvent({
        eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
        eventDetails: { 
          action: 'cleanup_invalid_uuids',
          cleanedCount,
          context: 'localStorage_cleanup'
        },
        severity: 'low'
      });
    }

    return cleanedCount;
  } catch (error) {
    console.warn('Failed to cleanup invalid UUIDs:', error);
    return 0;
  }
};