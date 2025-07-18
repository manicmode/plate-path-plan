
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';

export const useOnboardingStatus = () => {
  const { user, isAuthenticated } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!isAuthenticated || !user) {
        setIsOnboardingComplete(null);
        setIsLoading(false);
        setShowReminder(false);
        return;
      }

      try {
        console.log('Checking onboarding status for user:', user.id);
        
        // Check localStorage first for immediate state restoration
        const cacheKey = `onboarding_complete_${user.id}`;
        const cachedStatus = localStorage.getItem(cacheKey);
        if (cachedStatus === 'true') {
          console.log('Found cached onboarding completion status');
          setIsOnboardingComplete(true);
          setShowReminder(false);
          setIsLoading(false);
          return;
        }
        
        const result = await supabase
          .from('user_profiles')
          .select('onboarding_completed, onboarding_skipped, show_onboarding_reminder')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data, error } = result;

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking onboarding status:', error);
          setIsOnboardingComplete(false);
          setShowReminder(false);
        } else if (!data) {
          console.log('No profile found, assuming onboarding not complete');
          setIsOnboardingComplete(false);
          setShowReminder(false);
        } else {
          const isComplete = data.onboarding_completed || false;
          const wasSkipped = data.onboarding_skipped || false;
          const shouldShowReminder = data.show_onboarding_reminder || false;
          
          console.log('Onboarding status:', { isComplete, wasSkipped, shouldShowReminder });
          
          setIsOnboardingComplete(isComplete);
          setShowReminder(wasSkipped && shouldShowReminder);
          
          // Update localStorage cache
          if (isComplete) {
            localStorage.setItem(cacheKey, 'true');
          } else {
            localStorage.removeItem(cacheKey);
          }
        }
      } catch (error) {
        console.error('Error in onboarding status check:', error);
        setIsOnboardingComplete(false);
        setShowReminder(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user, isAuthenticated]);


  const dismissReminder = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('user_profiles')
        .update({ show_onboarding_reminder: false })
        .eq('user_id', user.id);
      
      setShowReminder(false);
    } catch (error) {
      console.error('Error dismissing reminder:', error);
    }
  };

  const markOnboardingComplete = async () => {
    console.log('[DEBUG] markOnboardingComplete: Starting database update...');
    if (!user) {
      console.log('[DEBUG] markOnboardingComplete: No user found');
      return;
    }
    
    try {
      // Update local state immediately to prevent re-rendering
      console.log('[DEBUG] markOnboardingComplete: Updating local state immediately');
      setIsOnboardingComplete(true);
      setShowReminder(false);
      
      // Also update localStorage as backup
      const cacheKey = `onboarding_complete_${user.id}`;
      localStorage.setItem(cacheKey, 'true');
      
      console.log('[DEBUG] markOnboardingComplete: Updating database for user:', user.id);
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          onboarding_completed: true,
          onboarding_skipped: false,
          show_onboarding_reminder: false 
        })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('[DEBUG] markOnboardingComplete: Database error:', error);
        // Revert local state on error
        setIsOnboardingComplete(null);
        localStorage.removeItem(cacheKey);
        throw error;
      }
      
      console.log('[DEBUG] markOnboardingComplete: Database update successful');
      
      // Generate daily nutrition targets after onboarding completion
      try {
        console.log('[DEBUG] markOnboardingComplete: Generating daily nutrition targets...');
        const { data, error: targetsError } = await supabase.functions.invoke('calculate-daily-targets', {
          body: { userId: user.id }
        });
        
        if (targetsError) {
          console.error('[DEBUG] markOnboardingComplete: Error generating targets:', targetsError);
        } else {
          console.log('[DEBUG] markOnboardingComplete: Daily nutrition targets generated successfully:', data);
        }
      } catch (targetsError) {
        console.error('[DEBUG] markOnboardingComplete: Error invoking targets function:', targetsError);
      }
      
    } catch (error) {
      console.error('[DEBUG] markOnboardingComplete: Error updating completion status:', error);
      throw error;
    }
  };

  const forceRefresh = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      console.log('Force refreshing onboarding status for user:', user.id);
      
      // Check localStorage first for immediate state restoration
      const cacheKey = `onboarding_complete_${user.id}`;
      const cachedStatus = localStorage.getItem(cacheKey);
      if (cachedStatus === 'true') {
        console.log('Found cached onboarding completion status during refresh');
        setIsOnboardingComplete(true);
        setShowReminder(false);
        setIsLoading(false);
        return;
      }
      
      const result = await supabase
        .from('user_profiles')
        .select('onboarding_completed, onboarding_skipped, show_onboarding_reminder')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data, error } = result;

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking onboarding status:', error);
        setIsOnboardingComplete(false);
        setShowReminder(false);
      } else if (!data) {
        console.log('No profile found, assuming onboarding not complete');
        setIsOnboardingComplete(false);
        setShowReminder(false);
      } else {
        const isComplete = data.onboarding_completed || false;
        const wasSkipped = data.onboarding_skipped || false;
        const shouldShowReminder = data.show_onboarding_reminder || false;
        
        console.log('Onboarding status:', { isComplete, wasSkipped, shouldShowReminder });
        
        setIsOnboardingComplete(isComplete);
        setShowReminder(wasSkipped && shouldShowReminder);
        
        // Update localStorage cache
        if (isComplete) {
          localStorage.setItem(cacheKey, 'true');
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.error('Error in onboarding status check:', error);
      setIsOnboardingComplete(false);
      setShowReminder(false);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isOnboardingComplete,
    isLoading,
    showReminder,
    dismissReminder,
    markOnboardingComplete,
    forceRefresh,
  };
};
