import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  name: string;
  email: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetHydration: number;
  targetSupplements: number;
  allergies: string[];
  dietaryGoals: string[];
  selectedTrackers: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
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

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Ensure new fields have default values for existing users
      const userWithDefaults = {
        ...parsedUser,
        targetHydration: parsedUser.targetHydration || 8,
        targetSupplements: parsedUser.targetSupplements || 3,
        selectedTrackers: parsedUser.selectedTrackers || ['calories', 'hydration', 'supplements'],
      };
      
      // Load user preferences from Supabase
      loadUserPreferences(userWithDefaults);
      
      setUser(userWithDefaults);
      setIsAuthenticated(true);
    }
  }, []);

  const loadUserPreferences = async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('selected_trackers')
        .eq('user_id', currentUser.id)
        .single();

      if (data && data.selected_trackers) {
        const updatedUser = { ...currentUser, selectedTrackers: data.selected_trackers };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.log('No user preferences found in Supabase, using defaults');
    }
  };

  const login = async (email: string, password: string) => {
    // Mock login - in real app, this would call an API
    const mockUser: User = {
      id: '1',
      name: 'John Doe',
      email: email,
      targetCalories: 2000,
      targetProtein: 150,
      targetCarbs: 200,
      targetFat: 65,
      targetHydration: 8,
      targetSupplements: 3,
      allergies: [],
      dietaryGoals: ['general_health'],
      selectedTrackers: ['calories', 'hydration', 'supplements'],
    };
    
    setUser(mockUser);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(mockUser));
    
    // Load preferences from Supabase after login
    loadUserPreferences(mockUser);
  };

  const register = async (email: string, password: string, name: string) => {
    // Mock registration - in real app, this would call an API
    const mockUser: User = {
      id: '1',
      name: name,
      email: email,
      targetCalories: 2000,
      targetProtein: 150,
      targetCarbs: 200,
      targetFat: 65,
      targetHydration: 8,
      targetSupplements: 3,
      allergies: [],
      dietaryGoals: [],
      selectedTrackers: ['calories', 'hydration', 'supplements'],
    };
    
    setUser(mockUser);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
  };

  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const updateSelectedTrackers = async (trackers: string[]) => {
    if (user) {
      const updatedUser = { ...user, selectedTrackers: trackers };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Save to Supabase
      try {
        const { error } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            selected_trackers: trackers,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Error saving tracker selection:', error);
        }
      } catch (error) {
        console.error('Error updating tracker selection:', error);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        register,
        logout,
        updateProfile,
        updateSelectedTrackers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
