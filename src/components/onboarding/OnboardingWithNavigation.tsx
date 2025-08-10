import { useNavigate } from 'react-router-dom';
import { OnboardingScreen } from './OnboardingScreen';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingWithNavigationProps {
  onComplete: () => Promise<void>;
}

export function OnboardingWithNavigation({ onComplete }: OnboardingWithNavigationProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleComplete = async () => {
    console.log('[DEBUG] OnboardingWithNavigation: Starting completion process...');
    try {
      await onComplete();
      console.log('[DEBUG] OnboardingWithNavigation: onComplete finished, navigating to /home...');
      // Force navigation with replace to prevent back navigation to onboarding
      navigate('/home', { replace: true });
      console.log('[DEBUG] OnboardingWithNavigation: Navigation to /home completed');
    } catch (error) {
      console.error('[DEBUG] OnboardingWithNavigation: Error during completion:', error);
    }
  };

  const handleSkip = async () => {
    console.log('[DEBUG] OnboardingWithNavigation: Starting skip process...');
    try {
      if (user) {
        await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            onboarding_completed: false,
            onboarding_skipped: true,
            show_onboarding_reminder: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      }
    } catch (error) {
      console.error('[DEBUG] OnboardingWithNavigation: Error during skip:', error);
    } finally {
      navigate('/home', { replace: true });
    }
  };

  return <OnboardingScreen onComplete={handleComplete} onSkip={handleSkip} />;
}
