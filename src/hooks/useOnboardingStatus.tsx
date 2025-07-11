
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
        return;
      }

      try {
        console.log('Checking onboarding status for user:', user.id);
        
        const { data, error } = await supabase
          .from('user_profiles')
          .select('onboarding_completed, onboarding_skipped, show_onboarding_reminder')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking onboarding status:', error);
          // If no profile exists yet, assume onboarding is not complete
          setIsOnboardingComplete(false);
          setShowReminder(false);
        } else {
          const isComplete = data?.onboarding_completed || false;
          const wasSkipped = data?.onboarding_skipped || false;
          const shouldShowReminder = data?.show_onboarding_reminder || false;
          
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
  }, [user, isAuthenticated]);

  const markOnboardingComplete = () => {
    console.log('Marking onboarding as complete');
    setIsOnboardingComplete(true);
    setShowReminder(false);
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
  };
};
