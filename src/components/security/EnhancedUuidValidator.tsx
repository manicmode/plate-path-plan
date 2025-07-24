import { useEffect, useCallback } from 'react';
import { validateUuidInput, validateFormUuids, cleanupInvalidUuids } from '@/lib/uuidValidationMiddleware';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { toast } from 'sonner';

export const EnhancedUuidValidator = () => {
  const validateAndSanitizeInput = useCallback(async (event: Event) => {
    const target = event.target as HTMLInputElement;
    
    // Check if this is likely a UUID field
    if (target.name?.includes('id') || target.name?.includes('Id') || 
        target.id?.includes('id') || target.id?.includes('Id') ||
        target.placeholder?.toLowerCase().includes('id')) {
      
      const value = target.value;
      if (value && value !== '') {
        const validUuid = await validateUuidInput(value, `input_${target.name || target.id}`);
        
        if (!validUuid && value) {
          // Invalid UUID detected
          target.classList.add('border-destructive', 'animate-pulse');
          toast.error('Invalid ID format detected');
          
          // Clear the invalid value after a short delay
          setTimeout(() => {
            target.value = '';
            target.classList.remove('border-destructive', 'animate-pulse');
          }, 2000);
        } else if (validUuid) {
          // Valid UUID
          target.classList.remove('border-destructive', 'animate-pulse');
          target.classList.add('border-green-500');
          setTimeout(() => {
            target.classList.remove('border-green-500');
          }, 1000);
        }
      }
    }
  }, []);

  const interceptFormSubmission = useCallback(async (event: Event) => {
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const formDataObj = Object.fromEntries(formData.entries());
    
    try {
      const validatedData = await validateFormUuids(formDataObj);
      
      if (!validatedData) {
        event.preventDefault();
        event.stopPropagation();
        
        form.classList.add('animate-pulse', 'border-destructive');
        toast.error('Form contains invalid ID values. Please check your input.');
        
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
          eventDetails: {
            action: 'form_submission_blocked',
            reason: 'Invalid UUID in form data',
            formFields: Object.keys(formDataObj),
            context: 'enhanced_uuid_validator'
          },
          severity: 'medium'
        });
        
        setTimeout(() => {
          form.classList.remove('animate-pulse', 'border-destructive');
        }, 3000);
        
        return false;
      }
      
      // Update form with validated data
      Object.entries(validatedData).forEach(([key, value]) => {
        const field = form.querySelector(`[name="${key}"]`) as HTMLInputElement;
        if (field && value !== formDataObj[key]) {
          field.value = value || '';
        }
      });
      
    } catch (error) {
      console.error('UUID validation error:', error);
      event.preventDefault();
      toast.error('Form validation failed. Please try again.');
    }
  }, []);

  const performPeriodicCleanup = useCallback(async () => {
    try {
      const cleanedCount = cleanupInvalidUuids();
      
      if (cleanedCount > 0) {
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
          eventDetails: {
            action: 'periodic_uuid_cleanup',
            cleanedItems: cleanedCount,
            context: 'enhanced_uuid_validator'
          },
          severity: 'low'
        });
        
        console.log(`Cleaned ${cleanedCount} invalid UUID entries from storage`);
      }
    } catch (error) {
      console.warn('UUID cleanup failed:', error);
    }
  }, []);

  useEffect(() => {
    // Attach input validation listeners
    document.addEventListener('input', validateAndSanitizeInput);
    document.addEventListener('blur', validateAndSanitizeInput, true);
    
    // Attach form submission interceptor
    document.addEventListener('submit', interceptFormSubmission);
    
    // Perform initial cleanup
    performPeriodicCleanup();
    
    // Set up periodic cleanup (every 10 minutes)
    const cleanupInterval = setInterval(performPeriodicCleanup, 10 * 60 * 1000);
    
    return () => {
      document.removeEventListener('input', validateAndSanitizeInput);
      document.removeEventListener('blur', validateAndSanitizeInput, true);
      document.removeEventListener('submit', interceptFormSubmission);
      clearInterval(cleanupInterval);
    };
  }, [validateAndSanitizeInput, interceptFormSubmission, performPeriodicCleanup]);

  return null;
};