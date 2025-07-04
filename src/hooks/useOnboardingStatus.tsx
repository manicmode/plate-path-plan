
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useOnboardingStatus = () => {
  const { user, isAuthenticated } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking onboarding status:', error);
          // If no profile exists yet, assume onboarding is not complete
          setIsOnboardingComplete(false);
        } else {
          const isComplete = data?.onboarding_completed || false;
          console.log('Onboarding status from database:', isComplete);
          setIsOnboardingComplete(isComplete);
        }
      } catch (error) {
        console.error('Error in onboarding status check:', error);
        setIsOnboardingComplete(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user, isAuthenticated]);

  const markOnboardingComplete = async () => {
    if (!user) {
      console.error('No user found when marking onboarding complete');
      return;
    }

    try {
      console.log('Marking onboarding as complete in database for user:', user.id);
      
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error marking onboarding complete:', error);
        throw error;
      }

      console.log('Successfully marked onboarding as complete');
      setIsOnboardingComplete(true);
    } catch (error) {
      console.error('Failed to mark onboarding complete:', error);
      // Don't update local state if database update failed
    }
  };

  return {
    isOnboardingComplete,
    isLoading,
    markOnboardingComplete,
  };
};
