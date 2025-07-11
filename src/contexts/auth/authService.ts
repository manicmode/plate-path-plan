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
      // Handle email not confirmed error specifically
      if (error.message?.includes('Email not confirmed')) {
        throw new Error('Please confirm your email address before signing in. Check your email for a confirmation link.');
      }
      throw error;
    }

    // Additional check for email confirmation after successful login
    if (data.user && !data.user.email_confirmed_at) {
      // Sign out the user immediately if email is not confirmed
      await supabase.auth.signOut();
      throw new Error('Please confirm your email address to complete registration. Check your email for a confirmation link.');
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
        emailRedirectTo: `${window.location.origin}/`,
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
      
      // Handle specific Supabase errors
      if (error.message?.includes('over_email_send_rate_limit')) {
        throw new Error('Too many emails sent. Please wait a few minutes before trying again.');
      }
      if (error.status === 429) {
        throw new Error('Too many requests. Please wait a moment before trying again.');
      }
      
      throw error;
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
      // This is an existing user who hasn't confirmed their email yet
      // Don't throw an error, instead guide them to confirm their email
      return {
        requiresEmailConfirmation: true,
        message: 'Please check your email and click the confirmation link to complete your account setup.'
      };
    }
    
    // Check if user needs email confirmation (new user)
    if (data.user && !data.user.email_confirmed_at && !data.session) {
      console.log('📬 New user created - needs email confirmation');
      return {
        requiresEmailConfirmation: true,
        message: 'Account created! Please check your email for a confirmation link.'
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