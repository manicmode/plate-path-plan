import { validateEmail, validatePassword } from '@/lib/validation';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent, SECURITY_EVENTS } from './securityLogger';

// Security configuration for authentication
export const authSecurityConfig = {
  maxLoginAttempts: 5,
  lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
  passwordMinLength: 8,
  requiredPasswordComplexity: true
};

// Track failed login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>();

export const checkLoginAttempts = (email: string): { allowed: boolean; remainingAttempts?: number; lockedUntil?: number } => {
  const attempts = loginAttempts.get(email);
  const now = Date.now();

  if (!attempts) {
    return { allowed: true, remainingAttempts: authSecurityConfig.maxLoginAttempts };
  }

  // Check if lockout period has expired
  if (attempts.lockedUntil && now > attempts.lockedUntil) {
    loginAttempts.delete(email);
    return { allowed: true, remainingAttempts: authSecurityConfig.maxLoginAttempts };
  }

  // Check if account is locked
  if (attempts.lockedUntil && now <= attempts.lockedUntil) {
    return { allowed: false, lockedUntil: attempts.lockedUntil };
  }

  // Check if max attempts reached
  if (attempts.count >= authSecurityConfig.maxLoginAttempts) {
    const lockedUntil = now + authSecurityConfig.lockoutDurationMs;
    loginAttempts.set(email, { ...attempts, lockedUntil });
    return { allowed: false, lockedUntil };
  }

  return { 
    allowed: true, 
    remainingAttempts: authSecurityConfig.maxLoginAttempts - attempts.count 
  };
};

export const recordFailedLogin = async (email: string): Promise<void> => {
  const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
  const now = Date.now();

  loginAttempts.set(email, {
    count: attempts.count + 1,
    lastAttempt: now
  });

  // Log security event
  await logSecurityEvent({
    eventType: SECURITY_EVENTS.LOGIN_FAILURE,
    eventDetails: { email, attempt_count: attempts.count + 1 },
    severity: attempts.count >= 3 ? 'high' : 'medium'
  });
};

export const recordSuccessfulLogin = async (email: string): Promise<void> => {
  loginAttempts.delete(email);
  
  // Log successful login
  await logSecurityEvent({
    eventType: SECURITY_EVENTS.LOGIN_SUCCESS,
    eventDetails: { email },
    severity: 'low'
  });
};

export const validateAuthInput = (email: string, password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validate email
  if (!validateEmail(email)) {
    errors.push('Please enter a valid email address');
  }

  // Validate password
  if (!validatePassword(password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
  }

  return { isValid: errors.length === 0, errors };
};

// Secure session management
export const getSecureRedirectUrl = (fallback = '/'): string => {
  try {
    // Ensure we're using a safe redirect URL
    const origin = window.location.origin;
    const validPaths = ['/', '/home', '/profile', '/analytics', '/camera'];
    
    // Check if current path is valid
    const currentPath = window.location.pathname;
    if (validPaths.includes(currentPath)) {
      return `${origin}${currentPath}`;
    }
    
    return `${origin}${fallback}`;
  } catch {
    return '/';
  }
};

// Enhanced sign up with security checks
export const secureSignUp = async (email: string, password: string, additionalData?: any) => {
  // Validate input
  const validation = validateAuthInput(email, password);
  if (!validation.isValid) {
    return { error: { message: validation.errors.join(', ') } };
  }

  // Check login attempts (to prevent abuse)
  const attemptCheck = checkLoginAttempts(email);
  if (!attemptCheck.allowed) {
    return { 
      error: { 
        message: `Account temporarily locked. Try again later.` 
      } 
    };
  }

  try {
    const redirectUrl = getSecureRedirectUrl();
    
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: additionalData
      }
    });

    if (error) {
      recordFailedLogin(email);
      return { error };
    }

    recordSuccessfulLogin(email);
    return { data };
  } catch (error) {
    recordFailedLogin(email);
    return { error: { message: 'An unexpected error occurred. Please try again.' } };
  }
};

// Enhanced sign in with security checks
export const secureSignIn = async (email: string, password: string) => {
  // Validate input
  const validation = validateAuthInput(email, password);
  if (!validation.isValid) {
    return { error: { message: validation.errors.join(', ') } };
  }

  // Check login attempts
  const attemptCheck = checkLoginAttempts(email);
  if (!attemptCheck.allowed) {
    const lockoutTime = attemptCheck.lockedUntil ? new Date(attemptCheck.lockedUntil).toLocaleTimeString() : '';
    return { 
      error: { 
        message: `Too many failed attempts. Account locked until ${lockoutTime}.` 
      } 
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password
    });

    if (error) {
      recordFailedLogin(email);
      
      // Provide user-friendly error messages
      if (error.message.includes('Invalid login credentials')) {
        const remaining = attemptCheck.remainingAttempts ? attemptCheck.remainingAttempts - 1 : 0;
        return { 
          error: { 
            message: `Invalid email or password. ${remaining} attempts remaining.` 
          } 
        };
      }
      
      return { error };
    }

    recordSuccessfulLogin(email);
    return { data };
  } catch (error) {
    recordFailedLogin(email);
    return { error: { message: 'An unexpected error occurred. Please try again.' } };
  }
};

// Clean up old login attempts periodically
setInterval(() => {
  const now = Date.now();
  const expiredThreshold = now - authSecurityConfig.lockoutDurationMs * 2; // Clean attempts older than 2x lockout period
  
  for (const [email, attempts] of loginAttempts.entries()) {
    if (attempts.lastAttempt < expiredThreshold) {
      loginAttempts.delete(email);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes