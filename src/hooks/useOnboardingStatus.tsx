
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';

export const useOnboardingStatus = () => {
  const { user, isAuthenticated } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReminder, setShowReminder] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Skip check during transition to prevent race conditions
    if (isTransitioning) {
      console.log('Onboarding in transition state, skipping status check');
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
  }, [user, isAuthenticated, isTransitioning]);

  const markOnboardingComplete = async () => {
    console.log('Marking onboarding as complete - starting transition');
    
    // Set transition state to prevent race conditions
    setIsTransitioning(true);
    setIsOnboardingComplete(true);
    setShowReminder(false);
    
    // Brief delay to ensure UI transition is smooth
    setTimeout(() => {
      setIsTransitioning(false);
      console.log('Onboarding transition completed');
    }, 500);
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
    isLoading: isLoading || isTransitioning,
    showReminder,
    markOnboardingComplete,
    dismissReminder,
    isTransitioning,
  };
};
