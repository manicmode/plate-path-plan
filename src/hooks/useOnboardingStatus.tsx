
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';

export const useOnboardingStatus = () => {
  const { user, isAuthenticated } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReminder, setShowReminder] = useState(false);
  const [completionLocked, setCompletionLocked] = useState(false);

  useEffect(() => {
    // Don't re-check if completion is already locked
    if (completionLocked) {
      console.log('Onboarding completion is locked, skipping status check');
      return;
    }

    const checkOnboardingStatus = async () => {
      if (!isAuthenticated || !user) {
        setIsOnboardingComplete(null);
        setIsLoading(false);
        setShowReminder(false);
        return;
      }

      try {
        console.log('Checking onboarding status for user:', user.id);
        
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
  }, [user, isAuthenticated, completionLocked]);

  const markOnboardingComplete = async () => {
    console.log('Marking onboarding as complete');
    
    // Lock completion to prevent state override
    setCompletionLocked(true);
    setIsOnboardingComplete(true);
    setShowReminder(false);
    
    // Verify the database state after a short delay
    setTimeout(async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data?.onboarding_completed) {
          console.log('Database confirmation: Onboarding completion verified');
        } else {
          console.warn('Database verification failed - onboarding may not be saved properly');
        }
      } catch (error) {
        console.error('Error verifying onboarding completion:', error);
      }
    }, 1000);
  };

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

  return {
    isOnboardingComplete,
    isLoading,
    showReminder,
    markOnboardingComplete,
    dismissReminder,
    completionLocked,
  };
};
