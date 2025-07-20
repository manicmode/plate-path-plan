import React, { createContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType, AuthProviderProps, ExtendedUser } from './types';
import { loginUser, registerUser, resendEmailConfirmation, signOutUser, setSignOutNavigationCallback } from './authService';
import { createExtendedUser, updateUserTrackers } from './userService';
import { Session } from '@supabase/supabase-js';
import { triggerDailyScoreCalculation, triggerDailyTargetsGeneration } from '@/lib/dailyScoreUtils';
import { cleanupAuthState } from '@/lib/authUtils';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  // Diagnostic timing
  const authStartTime = performance.now();
  console.log('🔍 AuthProvider: Starting initialization at', authStartTime.toFixed(2) + 'ms');

  const updateUserWithProfile = async (supabaseUser: any) => {
    const profileStartTime = performance.now();
    console.log('🔍 AuthProvider: Starting profile creation at', profileStartTime.toFixed(2) + 'ms');
    
    try {
      console.log('Creating extended user profile...');
      const extendedUser = await createExtendedUser(supabaseUser);
      setUser(extendedUser);
      
      const profileEndTime = performance.now();
      console.log('🔍 AuthProvider: Profile creation completed in', (profileEndTime - profileStartTime).toFixed(2) + 'ms');
      console.log('Extended user profile created successfully');
    } catch (error) {
      const profileErrorTime = performance.now();
      console.log('🔍 AuthProvider: Profile creation failed after', (profileErrorTime - profileStartTime).toFixed(2) + 'ms');
      console.error('Error creating extended user:', error);
      // Set basic user info even if profile creation fails
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email,
        created_at: supabaseUser.created_at,
        selectedTrackers: ['calories', 'hydration', 'supplements']
      } as ExtendedUser);
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
  useEffect(() => {
    setSignOutNavigationCallback(() => {
      console.log('📍 Navigating to home after sign out');
      window.location.href = '/';
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    const effectStartTime = performance.now();
    console.log('🔍 AuthProvider: Main useEffect started at', effectStartTime.toFixed(2) + 'ms');
    
    console.log('🔐 Starting auth initialization...');
    
    // Set up auth state listener first
    const listenerStartTime = performance.now();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      const eventTime = performance.now();
      console.log('🔍 AuthProvider: Auth state changed:', event, 'at', eventTime.toFixed(2) + 'ms', session?.user?.id);
      
      if (event === 'SIGNED_OUT') {
        console.log('🔓 Auth state: SIGNED_OUT');
        setSession(null);
        setUser(null);
        setSigningOut(false);
        setLoading(false);
        console.log('🔍 AuthProvider: SIGNED_OUT processing completed at', performance.now().toFixed(2) + 'ms');
        return;
      }
      
      setSession(session);
      
      if (session?.user && event === 'SIGNED_IN') {
        console.log('🔍 AuthProvider: Starting deferred profile loading for SIGNED_IN');
        // Defer profile loading to prevent deadlocks
        setTimeout(async () => {
          if (mounted) {
            const deferredStartTime = performance.now();
            console.log('🔍 AuthProvider: Deferred profile loading started at', deferredStartTime.toFixed(2) + 'ms');
            await updateUserWithProfile(session.user);
            setLoading(false);
            const deferredEndTime = performance.now();
            console.log('🔍 AuthProvider: Deferred profile loading completed at', deferredEndTime.toFixed(2) + 'ms');
          }
        }, 0);
      } else if (!session?.user) {
        setUser(null);
        setLoading(false);
        console.log('🔍 AuthProvider: No user session, loading completed at', performance.now().toFixed(2) + 'ms');
      }
    });
    
    console.log('🔍 AuthProvider: Auth listener setup completed in', (performance.now() - listenerStartTime).toFixed(2) + 'ms');

    // Initialize session check with timeout
    const initializeSession = async () => {
      const sessionCheckStartTime = performance.now();
      console.log('🔍 AuthProvider: Session check started at', sessionCheckStartTime.toFixed(2) + 'ms');
      
      try {
        console.log('📋 Checking for existing session...');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        const sessionCheckEndTime = performance.now();
        console.log('🔍 AuthProvider: Session check completed in', (sessionCheckEndTime - sessionCheckStartTime).toFixed(2) + 'ms');
        
        if (error) {
          console.error('Session check error:', error);
          // Clear any corrupted auth state
          cleanupAuthState();
          setLoading(false);
          return;
        }

        if (currentSession?.user) {
          console.log('✅ Found existing session');
          setSession(currentSession);
          const profileStartTime = performance.now();
          await updateUserWithProfile(currentSession.user);
          console.log('🔍 AuthProvider: Existing session profile loading completed in', (performance.now() - profileStartTime).toFixed(2) + 'ms');
        } else {
          console.log('❌ No existing session found');
        }
        
        setLoading(false);
        const totalAuthTime = performance.now() - authStartTime;
        console.log('🔍 AuthProvider: TOTAL AUTH INITIALIZATION COMPLETED in', totalAuthTime.toFixed(2) + 'ms');
      } catch (error) {
        console.error('Session initialization error:', error);
        cleanupAuthState();
        setLoading(false);
        const errorTime = performance.now() - authStartTime;
        console.log('🔍 AuthProvider: Auth initialization failed after', errorTime.toFixed(2) + 'ms');
      }
    };

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading && mounted) {
        const timeoutTime = performance.now() - authStartTime;
        console.warn('⏰ Auth initialization timeout after', timeoutTime.toFixed(2) + 'ms - forcing completion');
        setLoading(false);
      }
    }, 5000);

    initializeSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeoutId);
      const cleanupTime = performance.now() - authStartTime;
      console.log('🔍 AuthProvider: Cleanup completed after', cleanupTime.toFixed(2) + 'ms');
    };
  }, []);

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
    await updateUserWithProfile(session.user);
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
