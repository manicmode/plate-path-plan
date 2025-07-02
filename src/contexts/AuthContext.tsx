
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
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
      };
      setUser(userWithDefaults);
      setIsAuthenticated(true);
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
    };
    
    setUser(mockUser);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(mockUser));
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
