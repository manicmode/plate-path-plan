import React, { createContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { AuthContextType, AuthProviderProps, ExtendedUser } from './types';
import { loginUser, registerUser, signOutUser } from './authService';
import { createExtendedUser, updateUserTrackers } from './userService';
import { Session } from '@supabase/supabase-js';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializationAttempts, setInitializationAttempts] = useState(0);

  const updateUserWithProfile = async (supabaseUser: any) => {
    try {
      const extendedUser = await createExtendedUser(supabaseUser);
      setUser(extendedUser);
    } catch (error) {
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
      } else if (initialSession?.user) {
        setSession(initialSession);
        await updateUserWithProfile(initialSession.user);
      }
      
      setLoading(false);
      setInitializationAttempts(retryCount + 1);
    } catch (error) {
      console.error('Auth initialization error:', error);
      if (retryCount < 2) {
        setTimeout(() => initializeAuth(retryCount + 1), 1000);
      } else {
        setLoading(false);
      }
    }
  };

  // App lifecycle callbacks
  const handleAppForeground = () => {
    console.log('App came to foreground - refreshing auth state');
    if (loading && initializationAttempts > 0) {
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
      
      console.log('Auth state changed:', event);
      setSession(session);
      
      if (session?.user) {
        // Defer profile loading to prevent deadlocks
        setTimeout(async () => {
          if (mounted) {
            await updateUserWithProfile(session.user);
          }
        }, 0);
      } else {
        setUser(null);
      }
    });

    // Initialize auth with timeout
    const initTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth initialization timeout - forcing completion');
        setLoading(false);
      }
    }, 10000);

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(initTimeout);
    };
  }, []);

  const updateProfile = (profileData: Partial<ExtendedUser>) => {
    if (user) {
      const updatedUser = { ...user, ...profileData };
      setUser(updatedUser);
    }
  };

  const updateSelectedTrackers = async (trackers: string[]) => {
    if (!user) return;
    
    await updateUserTrackers(user.id, trackers);
    updateProfile({ selectedTrackers: trackers });
  };

  const contextValue: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!session?.user,
    login: loginUser,
    register: registerUser,
    signOut: signOutUser,
    logout: signOutUser,
    updateProfile,
    updateSelectedTrackers,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};