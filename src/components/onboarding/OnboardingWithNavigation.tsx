import { useNavigate } from 'react-router-dom';
import { OnboardingScreen } from './OnboardingScreen';

interface OnboardingWithNavigationProps {
  onComplete: () => Promise<void>;
}

export function OnboardingWithNavigation({ onComplete }: OnboardingWithNavigationProps) {
  const navigate = useNavigate();

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

  return <OnboardingScreen onComplete={handleComplete} />;
}