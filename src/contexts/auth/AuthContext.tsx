
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

  // Enhanced mobile debugging
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  const [user, setUser] = ReactModule.useState<ExtendedUser | null>(null);
  const [session, setSession] = ReactModule.useState<Session | null>(null);
  const [loading, setLoading] = ReactModule.useState(true);
  const [signingOut, setSigningOut] = ReactModule.useState(false);
  const [profileLoading, setProfileLoading] = ReactModule.useState(false);
  const [profileError, setProfileError] = ReactModule.useState<string | null>(null);

  console.log('🔐 AuthContext initialized', { 
    isMobile, 
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent.substring(0, 50)
  });


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
    // Aggressive cleanup of all auth-related storage
    const clearAllAuthTokens = () => {
      try {
        // Clear all localStorage items that could contain auth tokens
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || 
              key.includes('supabase') || 
              key.includes('auth') || 
              key.includes('session')) {
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
    
    // Cleanup corrupted auth tokens
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
      clearAllAuthTokens();
      // Force page reload after cleanup to ensure fresh start
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      return;
    }

    let isMounted = true;
    
    console.log('🔐 Initializing auth state...', { 
      isMobile, 
      timestamp: new Date().toISOString() 
    });
    
    // Initialize auth session check and state listener in parallel (not sequential)
    const initializeAuth = async () => {
      try {
        // Start both operations simultaneously for faster initialization
        const [sessionResponse, authListener] = await Promise.all([
          supabase.auth.getSession(),
          Promise.resolve(supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (!isMounted) return;

              if (event === 'PASSWORD_RECOVERY') {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
                return;
              }

              if (event === 'TOKEN_REFRESHED' && session) {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
                return;
              }

              setSession(session);
              setUser(session?.user ?? null);
              setLoading(false);

              // Don't reset session during password recovery
              if (event === 'SIGNED_IN' && session?.user && !window.location.hash.includes('type=recovery')) {
                // Load extended profile asynchronously without blocking the UI
                setTimeout(() => {
                  if (isMounted) {
                    loadExtendedProfile(session.user);
                  }
                }, 0);
              }
            }
          ))
        ]);

        if (!isMounted) return;

        // Set initial session state immediately
        const { data: { session } } = sessionResponse;
        console.log('🔐 Auth initialization complete', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          isMobile,
          timestamp: new Date().toISOString() 
        });
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        return authListener.data.subscription;
      } catch (error) {
        console.error('🚨 Error initializing auth:', error, { 
          isMobile, 
          timestamp: new Date().toISOString() 
        });
        if (isMounted) {
          setLoading(false);
        }
        return null;
      }
    };

    // Start auth initialization
    initializeAuth().then((subscription) => {
      if (subscription && isMounted) {
        // Store subscription for cleanup
        return () => {
          isMounted = false;
          subscription.unsubscribe();
        };
      }
    });

    return () => {
      isMounted = false;
    };
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
    isAuthenticated: !!session?.user && !!session?.user?.email_confirmed_at,
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
