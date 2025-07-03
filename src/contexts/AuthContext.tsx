
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

// Utility functions for localStorage-based preferences
const loadUserPreferences = () => {
  try {
    const stored = localStorage.getItem('user_preferences');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading user preferences:', e);
  }
  return {
    selectedTrackers: ['calories', 'hydration', 'supplements'],
  };
};

const saveUserPreferences = (prefs: any) => {
  try {
    localStorage.setItem('user_preferences', JSON.stringify(prefs));
    console.log('User preferences saved to localStorage:', prefs);
  } catch (e) {
    console.error('Error saving user preferences:', e);
  }
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
      
      // Load preferences from localStorage
      const preferences = loadUserPreferences();
      
      // Ensure new fields have default values for existing users
      const userWithDefaults = {
        ...parsedUser,
        targetHydration: parsedUser.targetHydration || 8,
        targetSupplements: parsedUser.targetSupplements || 3,
        selectedTrackers: preferences.selectedTrackers || ['calories', 'hydration', 'supplements'],
      };
      
      setUser(userWithDefaults);
      setIsAuthenticated(true);
      console.log('User loaded with preferences:', userWithDefaults.selectedTrackers);
    }
  }, []);

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
    
    // Load preferences from localStorage
    const preferences = loadUserPreferences();
    const userWithPreferences = {
      ...mockUser,
      selectedTrackers: preferences.selectedTrackers || mockUser.selectedTrackers,
    };
    
    setUser(userWithPreferences);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userWithPreferences));
    console.log('User logged in with preferences:', userWithPreferences.selectedTrackers);
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
    
    // Save initial preferences
    saveUserPreferences({ selectedTrackers: mockUser.selectedTrackers });
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('user_preferences');
  };

  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const updateSelectedTrackers = async (trackers: string[]) => {
    console.log('Updating selected trackers to:', trackers);
    
    if (user) {
      const updatedUser = { ...user, selectedTrackers: trackers };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Save to localStorage preferences
      saveUserPreferences({ selectedTrackers: trackers });
      
      // Also try to save to Supabase as backup (but don't fail if it doesn't work)
      try {
        const { error } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            selected_trackers: trackers,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.log('Supabase backup failed (using localStorage instead):', error);
        } else {
          console.log('Preferences saved to Supabase as backup');
        }
      } catch (error) {
        console.log('Supabase not available (using localStorage instead):', error);
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
