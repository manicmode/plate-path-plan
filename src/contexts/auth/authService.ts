import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/lib/authUtils';
import { toast } from 'sonner';
import type { RegistrationResult } from './types';

export const loginUser = async (email: string, password: string) => {
  try {
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
    
  } catch (error: any) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const registerUser = async (email: string, password: string, name?: string): Promise<RegistrationResult> => {
  try {
    console.log('🚀 Starting registration process for:', email);
    
    // Clean up any existing auth state before registration
    cleanupAuthState();
    
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
    
    console.log('📧 Calling Supabase signUp...');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: name ? { name } : undefined,
        emailRedirectTo: `${window.location.origin}/confirm`,
      },
    });
    
    console.log('📊 Supabase signUp response:', {
      hasData: !!data,
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      userId: data?.user?.id,
      userEmail: data?.user?.email,
      userEmailConfirmed: data?.user?.email_confirmed_at,
      userCreatedAt: data?.user?.created_at,
      error: error
    });
    
    // Check if there's a Supabase error
    if (error) {
      console.error('❌ Supabase returned error:', error);
      
      // Handle specific registration errors
      if (error.message?.includes('User already registered')) {
        throw new Error('EMAIL_ALREADY_REGISTERED');
      }
      
      if (error.message?.includes('over_email_send_rate_limit')) {
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
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/confirm`,
      }
    });
    
    if (error) {
      console.error('❌ Resend confirmation error:', error);
      
      if (error.message?.includes('over_email_send_rate_limit')) {
        throw new Error('EMAIL_RATE_LIMITED');
      }
      
      if (error.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      
      throw new Error('RESEND_FAILED');
    }
    
    console.log('✅ Email confirmation resent successfully');
    return { success: true };
    
  } catch (error: any) {
    console.error('💥 Resend email confirmation failed:', error);
    throw error;
  }
};

export const signOutUser = async () => {
  try {
    // Clean up auth state first
    cleanupAuthState();
    
    // Attempt global sign out
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) throw error;
    
    // Force page refresh for completely clean state
    window.location.href = '/';
  } catch (error) {
    console.error('Error signing out:', error);
    toast.error('Error signing out');
    // Force refresh even if signout fails
    window.location.href = '/';
  }
};