
import React, { createContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { AuthContextType, AuthProviderProps, ExtendedUser } from './types';
import { loginUser, registerUser, resendEmailConfirmation, signOutUser, setSignOutNavigationCallback } from './authService';
import { createExtendedUser, updateUserTrackers } from './userService';
import { Session } from '@supabase/supabase-js';
import { triggerDailyScoreCalculation, triggerDailyTargetsGeneration } from '@/lib/dailyScoreUtils';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const updateUserWithProfile = async (supabaseUser: any) => {
    try {
      const extendedUser = await createExtendedUser(supabaseUser);
      setUser(extendedUser);
      setError(null);
    } catch (error) {
      console.error('Error creating extended user:', error);
      setError('Failed to load user profile');
      // Set basic user info even if profile creation fails
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email,
        created_at: supabaseUser.created_at,
        selectedTrackers: ['calories', 'hydration', 'supplements']
      } as ExtendedUser);
    }
  };

  const initializeAuth = async (retryCount = 0) => {
    try {
      console.log(`Auth initialization attempt ${retryCount + 1}`);
      
      const { data: { session: initialSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting initial session:', error);
        if (retryCount < 2) {
          setTimeout(() => initializeAuth(retryCount + 1), 1000);
          return;
        }
        setError('Failed to initialize authentication');
      } else if (initialSession?.user) {
        setSession(initialSession);
        // Defer profile loading to prevent deadlocks
        setTimeout(() => {
          updateUserWithProfile(initialSession.user);
        }, 0);
      }
      
      setLoading(false);
      setInitializationAttempts(retryCount + 1);
    } catch (error) {
      console.error('Auth initialization error:', error);
      setError('Authentication initialization failed');
      if (retryCount < 2) {
        setTimeout(() => initializeAuth(retryCount + 1), 1000);
      } else {
        setLoading(false);
      }
    }
  };

  // Custom signOut function with proper state management
  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      setError(null);
      
      // Immediately clear local state
      setUser(null);
      setSession(null);
      
      console.log('🔓 Signing out user...');
      
      // Call the signOut function - it will handle navigation
      await signOutUser();
      
    } catch (error) {
      console.error('Sign out error:', error);
      setError('Failed to sign out');
    } finally {
      setSigningOut(false);
    }
  };

  // Set up navigation callback for signOut
  useEffect(() => {
    setSignOutNavigationCallback(() => {
      console.log('📍 Navigating to home after sign out');
      window.location.href = '/';
    });
  }, []);

  // App lifecycle callbacks
  const handleAppForeground = () => {
    console.log('App came to foreground - refreshing auth state');
    if (loading && initializationAttempts > 0) {
      setError(null);
      initializeAuth();
    }
  };

  const handleAppBackground = () => {
    console.log('App went to background');
  };

  useAppLifecycle({
    onForeground: handleAppForeground,
    onBackground: handleAppBackground,
  });

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_OUT') {
        console.log('🔓 Auth state: SIGNED_OUT');
        setSession(null);
        setUser(null);
        setSigningOut(false);
        setError(null);
        return;
      }
      
      setSession(session);
      
      if (session?.user && event === 'SIGNED_IN') {
        // Defer profile loading to prevent deadlocks
        setTimeout(async () => {
          if (mounted) {
            await updateUserWithProfile(session.user);
          }
        }, 0);
      } else if (!session?.user) {
        setUser(null);
      }
    });

    // Initialize auth with timeout
    const initTimeout = setTimeout(() => {
      if (loading && mounted) {
        console.warn('Auth initialization timeout - forcing completion');
        setLoading(false);
        setError('Authentication initialization timed out');
      }
    }, 10000);

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(initTimeout);
    };
  }, []); // Fixed: removed dependencies that could cause infinite loops

  const updateProfile = (profileData: Partial<ExtendedUser>) => {
    if (user) {
      const updatedUser = { ...user, ...profileData };
      setUser(updatedUser);
      
      // Trigger daily score calculation when profile is updated
      setTimeout(() => {
        triggerDailyScoreCalculation(user.id);
        
        // Also regenerate daily targets if significant profile changes occurred
        const significantFields = ['weight', 'age', 'gender', 'activity_level', 'weight_goal_type', 'health_conditions', 'main_health_goal'];
        const hasSignificantChanges = significantFields.some(field => profileData[field as keyof ExtendedUser] !== undefined);
        
        if (hasSignificantChanges) {
          console.log('Significant profile changes detected, regenerating daily targets...');
          triggerDailyTargetsGeneration(user.id);
        }
      }, 0);
    }
  };

  const updateSelectedTrackers = async (trackers: string[]) => {
    if (!user) return;
    
    try {
      await updateUserTrackers(user.id, trackers);
      updateProfile({ selectedTrackers: trackers });
    } catch (error) {
      console.error('Error updating trackers:', error);
      setError('Failed to update trackers');
    }
  };

  const refreshUser = async () => {
    if (!session?.user) return;
    
    try {
      console.log('[DEBUG] AuthContext: Refreshing user profile...');
      await updateUserWithProfile(session.user);
      console.log('[DEBUG] AuthContext: User profile refresh complete');
      setError(null);
    } catch (error) {
      console.error('Error refreshing user:', error);
      setError('Failed to refresh user data');
    }
  };

  const contextValue: AuthContextType = {
    user,
    session,
    loading: loading || signingOut,
    isAuthenticated: !!session?.user && !!session?.user?.email_confirmed_at,
    isEmailConfirmed: !!session?.user?.email_confirmed_at,
    login: async (email: string, password: string) => {
      try {
        await loginUser(email, password);
        return { error: null };
      } catch (error: any) {
        return { error };
      }
    },
    register: registerUser,
    resendEmailConfirmation: async (email: string) => {
      try {
        const result = await resendEmailConfirmation(email);
        return result;
      } catch (error: any) {
        return { success: false, error };
      }
    },
    signOut: handleSignOut,
    logout: handleSignOut,
    updateProfile,
    updateSelectedTrackers,
    refreshUser,
    error,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
