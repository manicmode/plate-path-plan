
import { OnboardingFlow } from './OnboardingFlow';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const handleSkip = () => {
    // When user skips, we still call onComplete to continue to the app
    // but the database will be marked as skipped with reminder enabled
    onComplete();
  };

  return (
    <OnboardingFlow onComplete={onComplete} onSkip={handleSkip} />
  );
};
