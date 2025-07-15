import { useNavigate } from 'react-router-dom';
import { OnboardingScreen } from './OnboardingScreen';

interface OnboardingWithNavigationProps {
  onComplete: () => Promise<void>;
}

export function OnboardingWithNavigation({ onComplete }: OnboardingWithNavigationProps) {
  const navigate = useNavigate();

  const handleComplete = async () => {
    await onComplete();
    // Navigate to home after completion
    navigate('/home');
  };

  return <OnboardingScreen onComplete={handleComplete} />;
}