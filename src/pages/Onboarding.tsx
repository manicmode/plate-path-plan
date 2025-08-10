import React from 'react';
import { OnboardingWithNavigation } from '@/components/onboarding/OnboardingWithNavigation';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

export default function Onboarding() {
  const { markOnboardingComplete } = useOnboardingStatus();

  React.useEffect(() => {
    document.title = 'Onboarding | VOYAGE';
  }, []);

  return <OnboardingWithNavigation onComplete={markOnboardingComplete} />;
}
