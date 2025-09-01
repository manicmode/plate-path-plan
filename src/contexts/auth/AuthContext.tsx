
import React, { createContext, useEffect, useState } from 'react';
import * as ReactModule from 'react';
import { supabase } from '@/lib/supabase';
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

  // STEP 2: Forensics - log auth ready state changes
  ReactModule.useEffect(() => {
    const isReady = !loading && session !== null;
    console.log('[auth] ready?', { 
      ready: isReady, 
      user: !!session?.user,
      isAuthenticated: !!session?.user && !!session?.user?.email_confirmed_at,
      loading
    });
  }, [loading, session]);


  // Load user profile in background with enhanced error handling
  const loadExtendedProfile = async (supabaseUser: any) => {
    if (!supabaseUser) {
      console.warn('🚨 LoadExtendedProfile: No supabaseUser provided');
      return;
    }
    
    try {
      setProfileLoading(true);
      setProfileError(null);
      console.log('🔄 Loading extended user profile...', { userId: supabaseUser.id });
      
      const extendedUser = await createExtendedUser(supabaseUser);
      setUser(extendedUser);
      console.log('✅ Extended user profile loaded successfully', { userId: supabaseUser.id });
    } catch (error) {
      console.error('🚨 Error loading extended user profile:', error);
      setProfileError(error instanceof Error ? error.message : 'Failed to load profile');
      
      // Create fallback user object to prevent app crashes
      const fallbackUser = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        created_at: supabaseUser.created_at,
        app_metadata: supabaseUser.app_metadata || {},
        user_metadata: supabaseUser.user_metadata || {},
        aud: supabaseUser.aud || 'authenticated',
        selectedTrackers: ['calories', 'hydration', 'supplements'],
        
        weight: null,
        height: null,
        age: null,
        gender: null,
        activity_level: 'moderate',
        main_health_goal: 'maintain_weight',
        weight_goal_type: 'maintain'
      } as ExtendedUser;
      
      setUser(fallbackUser);
      console.log('🔄 Set fallback user to prevent app crash', { userId: supabaseUser.id });
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
    const g = globalThis as any;
    
    // Guard against multiple inits - join existing init
    if (g.__voyageAuthInit) {
      g.__voyageAuthInit.then(() => {
        if (import.meta.env.VITE_DEBUG_BOOT === '1') {
          console.info('[AUTH][READY true]', { timestamp: new Date().toISOString() });
        }
        setLoading(false);
      }).catch(() => {
        console.warn('[AUTH][TIMEOUT] continuing unauthenticated');
        setLoading(false);
      });
      return;
    }

    // Diagnostic log
    if (import.meta.env.VITE_DEBUG_BOOT === '1') {
      console.info('[AUTH][INIT][START]', { timestamp: new Date().toISOString() });
    }

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    
    // Initialize auth with timeout fallback
    const initAuth = async () => {
      try {
        // Set up auth state listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!isMounted) return;

            console.log('🔐 Auth state change:', { event, hasSession: !!session });

            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            // Load extended profile for signed-in users
            if (event === 'SIGNED_IN' && session?.user && !window.location.hash.includes('type=recovery')) {
              setTimeout(() => {
                if (isMounted) {
                  loadExtendedProfile(session.user).catch(error => {
                    console.error('Profile loading failed:', error);
                  });
                }
              }, 0);
            }
          }
        );

        // Then check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('Session error:', error);
        }

        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }

        return subscription;
      } catch (error) {
        console.error('Auth init error:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
        return null;
      }
    };

    // Timeout fallback
    const withTimeout = async (promise: Promise<any>, timeout: number) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Auth timeout after ${timeout}ms`));
          }, timeout);
        })
      ]);
    };

    // Start auth init with global singleton guard
    g.__voyageAuthInit = withTimeout(initAuth(), 10000).then((subscription) => {
      clearTimeout(timeoutId);
      if (import.meta.env.VITE_DEBUG_BOOT === '1') {
        console.info('[AUTH][READY true]', { timestamp: new Date().toISOString() });
      }
      if (isMounted) {
        setLoading(false);
      }
      return subscription;
    }).catch((error) => {
      clearTimeout(timeoutId);
      console.warn('[AUTH][TIMEOUT] continuing unauthenticated', error);
      if (import.meta.env.VITE_DEBUG_BOOT === '1') {
        console.info('[AUTH][READY true]', { timestamp: new Date().toISOString() });
      }
      if (isMounted) {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
      return null;
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
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
