import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/lib/authUtils';
import { toast } from 'sonner';

export const loginUser = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
  } catch (error: any) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const registerUser = async (email: string, password: string, name?: string) => {
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
      if (error.message?.includes('User already registered')) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }
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
      console.error('❌ No user object in response - signup may have been silently rejected');
      console.log('🔍 Full response data:', data);
      throw new Error('Account creation failed. This email may already be registered. Please try signing in instead.');
    }
    
    // Check if this is actually a new user vs existing user
    const userCreatedAt = new Date(data.user.created_at || '');
    const now = new Date();
    const timeDifference = now.getTime() - userCreatedAt.getTime();
    const isNewUser = timeDifference < 5000; // Created within last 5 seconds
    
    console.log('👤 User creation timing:', {
      createdAt: data.user.created_at,
      timeDifference,
      isNewUser
    });
    
    if (!isNewUser && !data.session) {
      console.log('🚫 User already exists - this is not a new registration');
      throw new Error('An account with this email already exists. Please sign in instead.');
    }
    
    // Check if user needs email confirmation
    if (data.user && !data.user.email_confirmed_at && !data.session) {
      console.log('📬 User created but needs email confirmation');
      return; // This is actually success - user needs to confirm email
    }
    
    console.log('✅ Registration successful!');
    
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