
import { OnboardingFlow } from './OnboardingFlow';

interface OnboardingScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingScreen = ({ onComplete, onSkip }: OnboardingScreenProps) => {
  return (
    <OnboardingFlow onComplete={onComplete} onSkip={onSkip} />
  );
};
