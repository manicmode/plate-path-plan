import { useAuth } from '@/contexts/auth';
import { validateUserId, validateAuthContext, securityMiddleware } from '@/lib/securityValidationEnhanced';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { toast } from 'sonner';
import { useCallback } from 'react';

export const useSecureAuth = () => {
  const auth = useAuth();

  // Secure user ID getter with validation
  const getSecureUserId = useCallback(async (context?: string): Promise<string | null> => {
    if (!auth.user) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.UNAUTHORIZED_ACCESS,
        eventDetails: { context: context || 'unknown', error: 'No authenticated user' },
        severity: 'medium'
      });
      return null;
    }

    const validUserId = await validateUserId(auth.user.id, context);
    if (!validUserId) {
      toast.error('Authentication error. Please sign in again.');
      auth.signOut?.();
      return null;
    }

    return validUserId;
  }, [auth.user, auth.signOut]);

  // Secure operation wrapper
  const withSecureAuth = useCallback(async <T>(
    operation: (userId: string) => Promise<T>,
    context: string
  ): Promise<T | null> => {
    try {
      // Get and validate user ID
      const userId = await getSecureUserId(context);
      if (!userId) {
        return null;
      }

      // Apply security middleware
      await securityMiddleware(userId, context);

      // Execute operation
      return await operation(userId);
    } catch (error) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
        eventDetails: {
          context,
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: auth.user?.id || 'unknown'
        },
        severity: 'high'
      });

      if (error instanceof Error && error.message.includes('Rate limit')) {
        toast.error('Too many requests. Please wait a moment.');
      } else if (error instanceof Error && error.message.includes('Suspicious')) {
        toast.error('Unusual activity detected. Please contact support if this continues.');
      } else {
        toast.error('Operation failed. Please try again.');
      }

      return null;
    }
  }, [auth.user, getSecureUserId]);

  // Validate current auth state
  const validateAuthState = useCallback(() => {
    const validation = validateAuthContext(auth.user, ['id', 'email']);
    
    if (!validation.isValid) {
      logSecurityEvent({
        eventType: SECURITY_EVENTS.INVALID_UUID,
        eventDetails: { error: validation.error },
        severity: 'medium'
      });
    }

    return validation;
  }, [auth.user]);

  return {
    ...auth,
    getSecureUserId,
    withSecureAuth,
    validateAuthState,
    isSecurelyAuthenticated: auth.isAuthenticated && validateAuthState().isValid
  };
};