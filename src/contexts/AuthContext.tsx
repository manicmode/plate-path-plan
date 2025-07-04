
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  console.log('AuthProvider initializing...');
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('AuthProvider effect starting...');
    
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        console.log('Getting initial session...');
        
        // Get initial session with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session timeout')), 5000);
        });
        
        const { data: { session: initialSession }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        if (error) {
          console.error('Error getting initial session:', error);
        } else if (mounted) {
          console.log('Initial session:', initialSession ? 'Found' : 'None');
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }
        
        if (mounted) {
          setLoading(false);
          setIsInitialized(true);
          console.log('Auth initialized successfully');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          setIsInitialized(true);
          // Continue without auth rather than crashing
        }
      }
    };

    initializeAuth();

    // Set up auth listener with error handling
    let authListener: any = null;
    
    try {
      authListener = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event, session?.user?.id || 'no user');
        
        try {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (event === 'SIGNED_OUT') {
            console.log('User signed out');
          } else if (event === 'SIGNED_IN') {
            console.log('User signed in');
          }
        } catch (error) {
          console.error('Error handling auth state change:', error);
        }
      });
    } catch (error) {
      console.error('Error setting up auth listener:', error);
    }

    return () => {
      console.log('AuthProvider cleanup');
      mounted = false;
      if (authListener) {
        try {
          authListener.data?.subscription?.unsubscribe?.();
        } catch (error) {
          console.error('Error cleaning up auth listener:', error);
        }
      }
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('Signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
    }
  };

  const contextValue: AuthContextType = {
    user,
    session,
    loading,
    signOut,
  };

  console.log('AuthProvider rendering, loading:', loading, 'user:', user ? 'present' : 'none');

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
