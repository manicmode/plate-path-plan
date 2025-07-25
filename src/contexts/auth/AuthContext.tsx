
import React, { createContext, useEffect, useState } from 'react';
import * as ReactModule from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType, AuthProviderProps, ExtendedUser } from './types';
import { loginUser, registerUser, resendEmailConfirmation, signOutUser, setSignOutNavigationCallback } from './authService';
import { createExtendedUser, updateUserTrackers, loadUserProfile } from './userService';
import { Session } from '@supabase/supabase-js';
import { triggerDailyScoreCalculation, triggerDailyTargetsGeneration } from '@/lib/dailyScoreUtils';
import { cleanupAuthState } from '@/lib/authUtils';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Defensive check for React hooks availability
  if (!ReactModule.useState) {
    console.error('React hooks not available, falling back to basic render');
    return children as React.ReactElement;
  }

  const [user, setUser] = ReactModule.useState<ExtendedUser | null>(null);
  const [session, setSession] = ReactModule.useState<Session | null>(null);
  const [loading, setLoading] = ReactModule.useState(true);
  const [signingOut, setSigningOut] = ReactModule.useState(false);
  const [profileLoading, setProfileLoading] = ReactModule.useState(false);
  const [profileError, setProfileError] = ReactModule.useState<string | null>(null);

  // Check if we're in password reset flow anywhere in the app
  const isPasswordResetFlow = () => {
    const params = new URLSearchParams(window.location.search);
    const isRecovery = params.get('type') === 'recovery';
    const hasTokens = params.has('access_token') && params.has('refresh_token');
    
    console.log('🔍 AuthContext - Password reset flow check:', {
      isRecovery,
      hasTokens,
      pathname: window.location.pathname,
      searchParams: window.location.search
    });
    
    // Return true if we detect recovery parameters anywhere, not just on reset page
    return isRecovery && hasTokens;
  };

  // Load user profile in background
  const loadExtendedProfile = async (supabaseUser: any) => {
    if (!supabaseUser) return;
    
    try {
      setProfileLoading(true);
      setProfileError(null);
      console.log('Loading extended user profile...');
      
      const extendedUser = await createExtendedUser(supabaseUser);
      setUser(extendedUser);
      console.log('Extended user profile loaded successfully');
    } catch (error) {
      console.error('Error loading extended user profile:', error);
      setProfileError(error instanceof Error ? error.message : 'Failed to load profile');
      // Set basic user info even if profile creation fails
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email,
        created_at: supabaseUser.created_at,
        selectedTrackers: ['calories', 'hydration', 'supplements']
      } as ExtendedUser);
    } finally {
      setProfileLoading(false);
    }
  };

  // Custom signOut function with proper state management
  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      
      // Immediately clear local state
      setUser(null);
      setSession(null);
      
      console.log('🔓 Signing out user...');
      
      // Call the signOut function - it will handle navigation
      await signOutUser();
      
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setSigningOut(false);
    }
  };

  // Set up navigation callback for signOut
  ReactModule.useEffect(() => {
    setSignOutNavigationCallback(() => {
      console.log('📍 Navigating to home after sign out');
      window.location.href = '/';
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isRecovery = params.get('type') === 'recovery';
    
    if (isRecovery) {
      console.log("[AUTH] Blocking automatic login during password recovery");
      setLoading(false);
      return;
    }

    // Aggressive cleanup of all auth-related storage
    const clearAllAuthTokens = () => {
      console.log('🧹 Clearing all auth tokens...');
      try {
        // Clear all localStorage items that could contain auth tokens
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || 
              key.includes('supabase') || 
              key.includes('auth') || 
              key.includes('session')) {
            console.log('Removing storage key:', key);
            localStorage.removeItem(key);
          }
        });
        
        // Clear sessionStorage too
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('sb-') || 
              key.includes('supabase') || 
              key.includes('auth') || 
              key.includes('session')) {
            sessionStorage.removeItem(key);
          }
        });
        
        // Force sign out to clear any server-side sessions
        supabase.auth.signOut({ scope: 'global' }).catch(() => {
          // Ignore errors during cleanup
        });
        
      } catch (error) {
        console.warn('Error during auth cleanup:', error);
      }
    };
    
    // Check for password reset flow before cleaning auth
    const isPasswordReset = () => {
      const url = new URL(window.location.href);
      const hasRecoveryParams = url.searchParams.get('type') === 'recovery' && 
                               url.searchParams.get('access_token') && 
                               url.searchParams.get('refresh_token');
      const isResetPage = url.pathname === '/reset-password';
      
      console.log('[AUTH] Password reset detection:', {
        pathname: url.pathname,
        type: url.searchParams.get('type'),
        hasAccessToken: !!url.searchParams.get('access_token'),
        hasRefreshToken: !!url.searchParams.get('refresh_token'),
        hasRecoveryParams,
        isResetPage,
        finalResult: hasRecoveryParams || isResetPage
      });
      
      return hasRecoveryParams || isResetPage;
    };

    // Only cleanup corrupted auth if NOT in password reset flow
    if (!isPasswordReset()) {
      const hasCorruptedAuth = () => {
        try {
          const keys = Object.keys(localStorage);
          return keys.some(key => {
            if (key.includes('supabase') || key.startsWith('sb-')) {
              const value = localStorage.getItem(key);
              return value && (value.includes('403') || value.includes('invalid_claim'));
            }
            return false;
          });
        } catch {
          return true; // If we can't check, assume corruption
        }
      };
      
      if (hasCorruptedAuth()) {
        console.log('🚨 Detected corrupted auth tokens, cleaning up...');
        clearAllAuthTokens();
        // Force page reload after cleanup to ensure fresh start
        setTimeout(() => {
          console.log('🔄 Forcing page reload after auth cleanup...');
          window.location.reload();
        }, 1000);
        return;
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Don't process auth changes during password reset flow
        if (isPasswordResetFlow()) {
          console.log('🔄 AuthContext - Ignoring auth state change during password reset flow:', event);
          return;
        }

        console.log('🔄 Auth state change:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Load extended profile when user signs in
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            loadExtendedProfile(session.user);
          }, 0);
        }
      }
    );

    // Get initial session if not in password reset flow
    if (!isPasswordResetFlow()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('🔄 AuthContext - Initial session loaded:', !!session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  // Load extended profile when session is established (only once per session)
  ReactModule.useEffect(() => {
    if (session?.user && !profileLoading) {
      try {
        loadExtendedProfile(session.user);
        console.log('Extended profile loading initiated once per session');
      } catch (error) {
        console.error('Failed to initiate profile loading:', error);
        setProfileError(error instanceof Error ? error.message : 'Failed to load profile');
      }
    }
  }, [session?.user?.id]); // Only depend on user ID, not profileLoading state

  const updateProfile = (profileData: Partial<ExtendedUser>) => {
    if (user) {
      const updatedUser = { ...user, ...profileData };
      setUser(updatedUser);
      
      // Trigger daily score calculation when profile is updated
      triggerDailyScoreCalculation(user.id);
      
      // Also regenerate daily targets if significant profile changes occurred
      const significantFields = ['weight', 'age', 'gender', 'activity_level', 'weight_goal_type', 'health_conditions', 'main_health_goal'];
      const hasSignificantChanges = significantFields.some(field => profileData[field as keyof ExtendedUser] !== undefined);
      
      if (hasSignificantChanges) {
        console.log('Significant profile changes detected, regenerating daily targets...');
        triggerDailyTargetsGeneration(user.id);
      }
    }
  };

  const updateSelectedTrackers = async (trackers: string[]) => {
    if (!user) return;
    
    await updateUserTrackers(user.id, trackers);
    updateProfile({ selectedTrackers: trackers });
  };

  const refreshUser = async () => {
    if (!session?.user) return;
    
    console.log('[DEBUG] AuthContext: Refreshing user profile...');
    await loadExtendedProfile(session.user);
    console.log('[DEBUG] AuthContext: User profile refresh complete');
  };

  const contextValue: AuthContextType = {
    user,
    session,
    loading: loading || signingOut,
    isAuthenticated: isPasswordResetFlow() ? false : !!session?.user && !!session?.user?.email_confirmed_at,
    isEmailConfirmed: !!session?.user?.email_confirmed_at,
    login: loginUser,
    register: registerUser,
    resendEmailConfirmation,
    signOut: handleSignOut,
    logout: handleSignOut,
    updateProfile,
    updateSelectedTrackers,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
