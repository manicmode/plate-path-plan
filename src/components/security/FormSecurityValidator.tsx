import React, { useEffect, useCallback } from 'react';
import { validateFormUuids } from '@/lib/uuidValidationMiddleware';
import { validateNotificationData } from '@/lib/notificationValidation';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { toast } from 'sonner';

interface FormValidationResult {
  isValid: boolean;
  sanitizedData?: any;
  errors?: string[];
}

export const FormSecurityValidator: React.FC = () => {
  const validateFormSubmission = useCallback(async (formData: FormData): Promise<FormValidationResult> => {
    try {
      const data: Record<string, any> = {};
      
      // Convert FormData to object
      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }
      
      // Validate UUIDs in the form data
      const validatedData = await validateFormUuids(data);
      if (!validatedData) {
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.INVALID_UUID,
          eventDetails: { 
            action: 'form_validation_failed',
            reason: 'Invalid UUID in form data',
            formKeys: Object.keys(data)
          },
          severity: 'high'
        });
        
        return {
          isValid: false,
          errors: ['Invalid form data detected. Please refresh and try again.']
        };
      }
      
      // Additional validation for notification forms
      if (data.type && data.title && data.message) {
        const notificationValidation = await validateNotificationData(data);
        if (!notificationValidation) {
          return {
            isValid: false,
            errors: ['Invalid notification data. Please check your input.']
          };
        }
      }
      
      return {
        isValid: true,
        sanitizedData: validatedData
      };
      
    } catch (error) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.INVALID_INPUT,
        eventDetails: { 
          action: 'form_validation_error',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        severity: 'high'
      });
      
      return {
        isValid: false,
        errors: ['Form validation failed. Please try again.']
      };
    }
  }, []);

  const handleFormSubmit = useCallback(async (event: Event) => {
    const form = event.target as HTMLFormElement;
    if (!form || form.tagName !== 'FORM') return;
    
    const formData = new FormData(form);
    const validation = await validateFormSubmission(formData);
    
    if (!validation.isValid) {
      event.preventDefault();
      event.stopPropagation();
      
      const errors = validation.errors || ['Form validation failed'];
      toast.error(errors[0]);
      
      // Add visual feedback to the form
      form.classList.add('form-validation-error');
      setTimeout(() => {
        form.classList.remove('form-validation-error');
      }, 3000);
    }
  }, [validateFormSubmission]);

  const handleInputBlur = useCallback(async (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (!input || !input.name) return;
    
    // Validate UUID fields on blur
    if (input.name.includes('_id') || input.name.includes('Id')) {
      const validUuid = await validateFormUuids({ [input.name]: input.value });
      if (input.value && !validUuid) {
        input.setCustomValidity('Invalid ID format');
        input.reportValidity();
        
        // Visual feedback
        input.classList.add('border-red-500', 'bg-red-50', 'dark:bg-red-950');
        setTimeout(() => {
          input.classList.remove('border-red-500', 'bg-red-50', 'dark:bg-red-950');
        }, 2000);
      } else {
        input.setCustomValidity('');
      }
    }
  }, []);

  useEffect(() => {
    // Add form validation listeners
    document.addEventListener('submit', handleFormSubmit, { capture: true });
    document.addEventListener('focusout', handleInputBlur, { capture: true });
    
    // Add CSS for form validation error state
    const style = document.createElement('style');
    style.textContent = `
      .form-validation-error {
        animation: shake 0.5s ease-in-out;
        border: 2px solid rgb(239 68 68) !important;
      }
      
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.removeEventListener('submit', handleFormSubmit, { capture: true });
      document.removeEventListener('focusout', handleInputBlur, { capture: true });
      document.head.removeChild(style);
    };
  }, [handleFormSubmit, handleInputBlur]);

  return null; // This component only provides side effects
};