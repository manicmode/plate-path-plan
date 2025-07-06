
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Extended user type with profile data
interface ExtendedUser extends User {
  name?: string;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  targetHydration?: number;
  targetSupplements?: number;
  allergies?: string[];
  dietaryGoals?: string[];
  selectedTrackers?: string[];
}

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profileData: Partial<ExtendedUser>) => void;
  updateSelectedTrackers: (trackers: string[]) => Promise<void>;
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
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      return null;
    }
  };

  const updateUserWithProfile = async (supabaseUser: User) => {
    const profile = await loadUserProfile(supabaseUser.id);
    const extendedUser: ExtendedUser = {
      ...supabaseUser,
      name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || '',
      targetCalories: 2000,
      targetProtein: 150,
      targetCarbs: 200,
      targetFat: 65,
      targetHydration: 8,
      targetSupplements: 3,
      allergies: [],
      dietaryGoals: [],
      selectedTrackers: profile?.selected_trackers || ['calories', 'hydration', 'supplements'],
    };
    setUser(extendedUser);
  };

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
        } else if (mounted && initialSession?.user) {
          setSession(initialSession);
          await updateUserWithProfile(initialSession.user);
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      setSession(session);
      
      if (session?.user) {
        await updateUserWithProfile(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
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

  const register = async (email: string, password: string, name?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: name ? { name } : undefined,
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
    }
  };

  const logout = signOut;

  const updateProfile = (profileData: Partial<ExtendedUser>) => {
    if (user) {
      const updatedUser = { ...user, ...profileData };
      setUser(updatedUser);
    }
  };

  const updateSelectedTrackers = async (trackers: string[]) => {
    try {
      if (!user) return;
      
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          selected_trackers: trackers,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error updating trackers in database:', error);
      }

      localStorage.setItem('user_preferences', JSON.stringify({ selectedTrackers: trackers }));
      updateProfile({ selectedTrackers: trackers });
      
    } catch (error) {
      console.error('Error updating selected trackers:', error);
    }
  };

  const contextValue: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!session?.user,
    login,
    register,
    signOut,
    logout,
    updateProfile,
    updateSelectedTrackers,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
