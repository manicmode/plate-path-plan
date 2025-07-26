import { useAuth } from '@/contexts/auth';
import { useMemo } from 'react';

/**
 * Optimized auth hook that provides stable references and reduces unnecessary re-renders
 */
export const useOptimizedAuth = () => {
  const auth = useAuth();
  
  // Memoize auth state to prevent unnecessary re-renders
  const authState = useMemo(() => ({
    isAuthenticated: auth.isAuthenticated,
    loading: auth.loading,
    user: auth.user,
    session: auth.session,
    isEmailConfirmed: auth.isEmailConfirmed
  }), [auth.isAuthenticated, auth.loading, auth.user?.id, auth.session?.access_token, auth.isEmailConfirmed]);
  
  // Memoize auth actions to prevent function recreations
  const authActions = useMemo(() => ({
    login: auth.login,
    register: auth.register,
    signOut: auth.signOut,
    logout: auth.logout,
    updateProfile: auth.updateProfile,
    updateSelectedTrackers: auth.updateSelectedTrackers,
    refreshUser: auth.refreshUser,
    resendEmailConfirmation: auth.resendEmailConfirmation
  }), [auth.login, auth.register, auth.signOut, auth.logout, auth.updateProfile, auth.updateSelectedTrackers, auth.refreshUser, auth.resendEmailConfirmation]);
  
  return {
    ...authState,
    ...authActions
  };
};