import React, { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { isValidUUID } from '@/lib/validation';

export const EnhancedUuidValidator: React.FC = () => {
  // Real-time input validation for UUID fields
  const validateAndSanitizeInput = useCallback(async (event: Event) => {
    const target = event.target as HTMLInputElement;
    
    if (!target || target.tagName !== 'INPUT') return;
    
    // Check if this looks like a UUID field
    const isUuidField = target.name?.includes('id') || 
                       target.id?.includes('id') || 
                       target.placeholder?.toLowerCase().includes('id');
    
    if (!isUuidField) return;
    
    const value = target.value?.trim();
    
    // Check for invalid UUID values
    if (value && (value === 'undefined' || value === 'null' || value === '')) {
      target.value = '';
      target.style.border = '2px solid hsl(var(--destructive))';
      target.style.animation = 'pulse 0.5s ease-in-out';
      
      toast.error('Invalid ID format detected and cleared');
      
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.INVALID_UUID,
        eventDetails: { 
          field: target.name || target.id, 
          value,
          context: 'real_time_validation' 
        },
        severity: 'medium'
      });
      
      setTimeout(() => {
        target.style.border = '';
        target.style.animation = '';
      }, 1000);
      
      return;
    }
    
    // Validate UUID format if value exists
    if (value && !isValidUUID(value)) {
      target.style.border = '2px solid hsl(var(--destructive))';
      toast.error('Invalid UUID format');
      
      setTimeout(() => {
        target.style.border = '';
      }, 2000);
    } else if (value && isValidUUID(value)) {
      target.style.border = '2px solid hsl(var(--success))';
      setTimeout(() => {
        target.style.border = '';
      }, 1000);
    }
  }, []);

  // Form submission interception
  const interceptFormSubmission = useCallback(async (event: Event) => {
    const form = event.target as HTMLFormElement;
    if (!form || form.tagName !== 'FORM') return;
    
    const formData = new FormData(form);
    let hasInvalidUuids = false;
    const invalidFields: string[] = [];
    
    // Check all form fields for UUID validation
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string' && key.includes('id')) {
        if (value === 'undefined' || value === 'null' || value === '') {
          hasInvalidUuids = true;
          invalidFields.push(key);
          // Clear the invalid value
          const input = form.querySelector(`[name="${key}"]`) as HTMLInputElement;
          if (input) input.value = '';
        } else if (value && !isValidUUID(value)) {
          hasInvalidUuids = true;
          invalidFields.push(key);
        }
      }
    }
    
    if (hasInvalidUuids) {
      event.preventDefault();
      toast.error(`Invalid UUID values detected in: ${invalidFields.join(', ')}`);
      
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.INVALID_UUID,
        eventDetails: { 
          invalidFields,
          context: 'form_submission_blocked',
          formAction: form.action 
        },
        severity: 'high'
      });
      
      // Visual feedback
      form.style.border = '2px solid hsl(var(--destructive))';
      form.style.animation = 'shake 0.5s ease-in-out';
      
      setTimeout(() => {
        form.style.border = '';
        form.style.animation = '';
      }, 2000);
    }
  }, []);

  // Cleanup invalid UUIDs from storage
  const performPeriodicCleanup = useCallback(async () => {
    try {
      let cleanedCount = 0;
      
      // Clean localStorage
      const localKeys = Object.keys(localStorage);
      for (const key of localKeys) {
        const value = localStorage.getItem(key);
        if (key.includes('id') && (value === 'undefined' || value === 'null' || value === '')) {
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
      
      // Clean sessionStorage
      const sessionKeys = Object.keys(sessionStorage);
      for (const key of sessionKeys) {
        const value = sessionStorage.getItem(key);
        if (key.includes('id') && (value === 'undefined' || value === 'null' || value === '')) {
          sessionStorage.removeItem(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.SYSTEM_RECOVERY,
          eventDetails: { 
            action: 'uuid_cleanup',
            cleanedCount,
            context: 'periodic_maintenance' 
          },
          severity: 'low'
        });
      }
    } catch (error) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.CRITICAL_ERROR,
        eventDetails: { 
          action: 'uuid_cleanup_failed',
          error: error instanceof Error ? error.message : 'Unknown error' 
        },
        severity: 'medium'
      });
    }
  }, []);

  useEffect(() => {
    // Add event listeners
    document.addEventListener('input', validateAndSanitizeInput);
    document.addEventListener('blur', validateAndSanitizeInput, true);
    document.addEventListener('submit', interceptFormSubmission);
    
    // Initial cleanup
    performPeriodicCleanup();
    
    // Periodic cleanup every 5 minutes
    const cleanupInterval = setInterval(performPeriodicCleanup, 5 * 60 * 1000);
    
    return () => {
      document.removeEventListener('input', validateAndSanitizeInput);
      document.removeEventListener('blur', validateAndSanitizeInput, true);
      document.removeEventListener('submit', interceptFormSubmission);
      clearInterval(cleanupInterval);
    };
  }, [validateAndSanitizeInput, interceptFormSubmission, performPeriodicCleanup]);

  return null;
};