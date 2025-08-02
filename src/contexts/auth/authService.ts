
import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/lib/authUtils';
import { toast } from 'sonner';
import { validateUuidInput, cleanupInvalidUuids } from '@/lib/uuidValidationMiddleware';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import type { RegistrationResult } from './types';

// Display Supabase setup instructions in console
console.log(`
🔐 SUPABASE DASHBOARD MANUAL SETUP REQUIRED

⚠️  CRITICAL: Complete these steps in your Supabase Dashboard:
    https://supabase.com/dashboard/project/uzoiiijqtahohfafqirm

📧 STEP 1: Fix Email Template
Navigation: Auth → Email Templates → Confirm Signup
Template Body:
────────────────────────────────────────
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email address</a></p>
<p>If you didn't sign up for this account, you can safely ignore this email.</p>
────────────────────────────────────────

🌐 STEP 2: Configure URL Settings  
Navigation: Auth → URL Configuration

Site URL: https://7654ebf0-86bc-4d1d-8243-fa3eb5863908.lovableproject.com

Redirect URLs (add ALL):
- https://7654ebf0-86bc-4d1d-8243-fa3eb5863908.lovableproject.com
- https://7654ebf0-86bc-4d1d-8243-fa3eb5863908.lovableproject.com/confirm
- https://plate-path-plan.lovable.app  
- https://plate-path-plan.lovable.app/confirm

✅ After setup: Test signup → Check email → Verify clickable link exists
`);

export const loginUser = async (email: string, password: string) => {
  try {
    // Enhanced security: Clean up any invalid UUIDs before login
    cleanupInvalidUuids();
    
    // Log login attempt for security monitoring
    await logSecurityEvent({
      eventType: SECURITY_EVENTS.LOGIN_ATTEMPT,
      eventDetails: { email, timestamp: new Date().toISOString() },
      severity: 'low'
    });
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Login error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      });

      // 1. Email not confirmed - specific handling
      if (error.message?.includes('Email not confirmed')) {
        throw new Error('UNVERIFIED_EMAIL');
      }
      
      // 2. Invalid credentials - could be wrong password OR email not found
      if (error.message?.includes('Invalid login credentials')) {
        // We can't distinguish between wrong password vs wrong email
        // So we give a generic but helpful message
        throw new Error('INVALID_CREDENTIALS');
      }
      
      // 3. User not found - some versions of Supabase return this
      if (error.message?.includes('User not found')) {
        throw new Error('EMAIL_NOT_FOUND');
      }
      
      // 4. Rate limiting
      if (error.status === 429 || error.message?.includes('too many requests')) {
        throw new Error('RATE_LIMITED');
      }
      
      // Default to generic error
      throw new Error('LOGIN_FAILED');
    }

    // Additional check for email confirmation after successful login
    if (data.user && !data.user.email_confirmed_at) {
      // Sign out the user immediately if email is not confirmed
      await supabase.auth.signOut();
      throw new Error('UNVERIFIED_EMAIL');
    }
    
    // Log successful login
    if (data.user) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.LOGIN_SUCCESS,
        eventDetails: { userId: data.user.id, email },
        severity: 'low',
        userId: data.user.id
      });
    }
    
  } catch (error: any) {
    console.error('Login failed:', error);
    
    // Log failed login attempt
    await logSecurityEvent({
      eventType: SECURITY_EVENTS.LOGIN_FAILURE,
      eventDetails: { 
        email, 
        error: error.message,
        timestamp: new Date().toISOString()
      },
      severity: 'medium'
    });
    
    throw error;
  }
};

// Enhanced utility function to get email redirect URL
const getEmailRedirectURL = (): string => {
  try {
    // Priority 1: Check for explicit environment variable
    const envRedirectUrl = import.meta.env.VITE_PUBLIC_REDIRECT_URL;
    if (envRedirectUrl) {
      console.log('📧 Using VITE_PUBLIC_REDIRECT_URL:', envRedirectUrl);
      return envRedirectUrl;
    }

    // Priority 2: Check for legacy environment variables
    if (typeof window !== 'undefined') {
      const siteUrl = (window as any).__SITE_URL__ || process.env.SITE_URL;
      const authRedirectUrl = (window as any).__AUTH_REDIRECT_URL__ || process.env.AUTH_REDIRECT_URL;
      
      if (authRedirectUrl) {
        console.log('📧 Using AUTH_REDIRECT_URL:', authRedirectUrl);
        return authRedirectUrl;
      }
      
      if (siteUrl) {
        const redirectUrl = `${siteUrl}/confirm`;
        console.log('📧 Using SITE_URL for redirect:', redirectUrl);
        return redirectUrl;
      }
    }
    
    // Priority 3: Production domain check
    if (window.location.hostname === '7654ebf0-86bc-4d1d-8243-fa3eb5863908.lovableproject.com') {
      const redirectUrl = 'https://7654ebf0-86bc-4d1d-8243-fa3eb5863908.lovableproject.com/confirm';
      console.log('📧 Using production URL:', redirectUrl);
      return redirectUrl;
    }
    
    // Priority 4: Preview domain check for Lovable
    if (window.location.hostname.includes('lovableproject.com') || window.location.hostname.includes('lovable.app')) {
      const redirectUrl = `https://${window.location.hostname}/confirm`;
      console.log('📧 Using Lovable preview URL:', redirectUrl);
      return redirectUrl;
    }
    
    // Priority 5: Development/other environments fallback
    const redirectUrl = `${window.location.origin}/confirm`;
    console.log('📧 Using current origin fallback:', redirectUrl);
    return redirectUrl;
    
  } catch (error) {
    console.error('❌ Error generating email redirect URL:', error);
    const fallbackUrl = `${window.location.origin}/confirm`;
    console.log('📧 Using error fallback URL:', fallbackUrl);
    return fallbackUrl;
  }
};

export const registerUser = async (email: string, password: string, name?: string): Promise<RegistrationResult> => {
  try {
    console.log('🚀 Starting registration process for:', email);
    
    // Enhanced security: Clean up any existing auth state and invalid UUIDs
    cleanupAuthState();
    cleanupInvalidUuids();
    
    // Add a small delay to ensure cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Attempt global sign out to clear any lingering sessions
    try {
      console.log('🔓 Attempting global signout before registration...');
      await supabase.auth.signOut({ scope: 'global' });
      console.log('✅ Global signout completed');
    } catch (err) {
      // Continue even if this fails
      console.log('⚠️ Global signout failed during registration cleanup:', err);
    }
    
    // Add another small delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const emailRedirectTo = getEmailRedirectURL();
    console.log('📧 Calling Supabase signUp with redirect URL:', emailRedirectTo);
    
    // Enhanced validation and warning
    if (!emailRedirectTo || emailRedirectTo === 'undefined' || emailRedirectTo.includes('undefined')) {
      console.error('⚠️ WARNING: emailRedirectTo is invalid:', emailRedirectTo);
      console.error('🔍 Current environment check:', {
        hostname: window.location.hostname,
        origin: window.location.origin,
        envRedirect: import.meta.env.VITE_PUBLIC_REDIRECT_URL,
        fallback: `${window.location.origin}/confirm`
      });
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: name ? { name } : undefined,
        emailRedirectTo,
      },
    });
    
    // Call debug function to log email configuration
    try {
      await supabase.functions.invoke('debug-email-config', {
        body: {
          action: 'signup',
          email,
          emailRedirectTo,
          metadata: {
            hostname: window.location.hostname,
            origin: window.location.origin,
            hasName: !!name,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (debugError) {
      console.warn('Debug function call failed (non-critical):', debugError);
    }
    
    console.log('📊 Supabase signUp response:', {
      hasData: !!data,
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      userId: data?.user?.id,
      userEmail: data?.user?.email,
      userEmailConfirmed: data?.user?.email_confirmed_at,
      userCreatedAt: data?.user?.created_at,
      emailRedirectTo: emailRedirectTo,
      error: error
    });
    
    // Log email configuration for debugging
    if (data?.user && !data?.user?.email_confirmed_at) {
      console.log('📧 Email confirmation required - email will be sent to:', data.user.email);
      console.log('📧 Email confirmation link will redirect to:', emailRedirectTo);
    }
    
    // Check if there's a Supabase error
    if (error) {
      console.error('❌ Supabase returned error:', error);
      console.error('📧 Registration failed details:', {
        email,
        redirectUrl: emailRedirectTo,
        errorMessage: error.message,
        errorStatus: error.status,
        errorCode: error.code
      });
      
      // Handle specific registration errors
      if (error.message?.includes('User already registered')) {
        throw new Error('EMAIL_ALREADY_REGISTERED');
      }
      
      if (error.message?.includes('over_email_send_rate_limit')) {
        console.warn('⚠️ Email rate limit hit - email confirmation may be delayed');
        throw new Error('EMAIL_RATE_LIMITED');
      }
      
      if (error.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      
      if (error.message?.includes('Password should be at least')) {
        throw new Error('PASSWORD_TOO_SHORT');
      }
      
      if (error.message?.includes('Unable to validate email') || 
          error.message?.includes('invalid email')) {
        throw new Error('INVALID_EMAIL');
      }
      
      // Default registration error
      throw new Error('REGISTRATION_FAILED');
    }
    
    // Check if user was actually created
    if (!data?.user) {
      console.error('❌ No user object in response');
      throw new Error('Account creation failed. Please try again.');
    }
    
    // Check if this is actually a new user vs existing user
    const userCreatedAt = new Date(data.user.created_at || '');
    const now = new Date();
    const timeDifference = now.getTime() - userCreatedAt.getTime();
    const isNewUser = timeDifference < 5000; // Created within last 5 seconds
    
    console.log('👤 User creation timing:', {
      createdAt: data.user.created_at,
      timeDifference,
      isNewUser,
      emailConfirmed: !!data.user.email_confirmed_at,
      hasSession: !!data.session
    });
    
    // Handle existing user with unconfirmed email
    if (!isNewUser && !data.session) {
      console.log('📧 Existing user with unconfirmed email - guiding to email confirmation');
      return {
        requiresEmailConfirmation: true,
        isExistingUnverified: true,
        message: 'This email was previously used to sign up but has not been verified. Please check your inbox to confirm your email.'
      };
    }
    
    // Check if user needs email confirmation (new user)
    if (data.user && !data.user.email_confirmed_at && !data.session) {
      console.log('📬 New user created - needs email confirmation');
      return {
        requiresEmailConfirmation: true,
        message: 'Welcome! Please check your inbox to confirm your email and activate your account.'
      };
    }
    
    console.log('✅ Registration successful with immediate login!');
    return {
      requiresEmailConfirmation: false,
      message: 'Account created and logged in successfully!'
    };
    
  } catch (error: any) {
    console.error('💥 Registration failed:', error);
    console.error('📋 Error details:', {
      status: error.status,
      message: error.message,
      name: error.name,
      code: error.code,
      details: error.details
    });
    throw error;
  }
};

export const resendEmailConfirmation = async (email: string) => {
  try {
    console.log('📧 Resending email confirmation for:', email);
    
    const emailRedirectTo = getEmailRedirectURL();
    console.log('📧 Resending with redirect URL:', emailRedirectTo);
    
    // Enhanced validation and warning for resend
    if (!emailRedirectTo || emailRedirectTo === 'undefined' || emailRedirectTo.includes('undefined')) {
      console.error('⚠️ WARNING: emailRedirectTo is invalid for resend:', emailRedirectTo);
      console.error('🔍 Resend environment check:', {
        hostname: window.location.hostname,
        origin: window.location.origin,
        envRedirect: import.meta.env.VITE_PUBLIC_REDIRECT_URL,
        fallback: `${window.location.origin}/confirm`
      });
    }
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo,
      }
    });
    
    if (error) {
      console.error('❌ Resend confirmation error:', error);
      console.error('📧 Email confirmation failed details:', {
        email,
        redirectUrl: emailRedirectTo,
        errorMessage: error.message,
        errorStatus: error.status,
        errorCode: error.code
      });
      
      if (error.message?.includes('over_email_send_rate_limit')) {
        throw new Error('EMAIL_RATE_LIMITED');
      }
      
      if (error.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      
      throw new Error('RESEND_FAILED');
    }
    
    console.log('✅ Email confirmation resent successfully to:', email);
    console.log('📧 Confirmation email sent with redirect URL:', emailRedirectTo);
    return { success: true };
    
  } catch (error: any) {
    console.error('💥 Resend email confirmation failed:', error);
    throw error;
  }
};

// Updated signOut function that uses proper navigation flow
let signOutNavigationCallback: (() => void) | null = null;

export const setSignOutNavigationCallback = (callback: () => void) => {
  signOutNavigationCallback = callback;
};

export const signOutUser = async () => {
  try {
    console.log('🔓 Starting sign out process...');
    
    // Enhanced security: Clean up auth state and invalid UUIDs
    cleanupAuthState();
    cleanupInvalidUuids();
    
    // Log logout event
    await logSecurityEvent({
      eventType: SECURITY_EVENTS.LOGOUT,
      eventDetails: { timestamp: new Date().toISOString() },
      severity: 'low'
    });
    
    // Attempt Supabase sign out
    console.log('📤 Calling Supabase signOut...');
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    
    if (error) {
      console.error('❌ Supabase signOut error:', error);
      // Continue with cleanup even if Supabase signOut fails
    } else {
      console.log('✅ Supabase signOut successful');
    }
    
    // Use navigation callback if available, otherwise fallback to hard refresh
    if (signOutNavigationCallback) {
      console.log('📍 Using React Router navigation');
      signOutNavigationCallback();
    } else {
      console.log('📍 Fallback to hard refresh');
      window.location.href = '/';
    }
    
  } catch (error: any) {
    console.error('💥 Error during sign out:', error);
    toast.error('Error signing out');
    
    // Force navigation even if there are errors
    if (signOutNavigationCallback) {
      signOutNavigationCallback();
    } else {
      window.location.href = '/';
    }
  }
};
