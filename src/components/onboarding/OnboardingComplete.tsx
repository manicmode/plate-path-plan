import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { SavingScreen } from '@/components/SavingScreen';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

interface OnboardingCompleteProps {
  onComplete: () => void;
  isSubmitting: boolean;
  formData?: {
    age: string;
    gender: string;
    weight: string;
    mainHealthGoal: string;
    activityLevel: string;
  };
}

export const OnboardingComplete = ({ onComplete, isSubmitting, formData }: OnboardingCompleteProps) => {
  const isMobile = useIsMobile();
  const { markOnboardingComplete } = useOnboardingStatus();
  const navigate = useNavigate();
  const [isFinalizing, setIsFinalizing] = useState(false);

  if (isSubmitting) {
    return <SavingScreen />;
  }

  const handleLetsGo = async () => {
    setIsFinalizing(true);

    try {
      // Set flags FIRST (before any await)
      try {
        sessionStorage.setItem('__voyagePostOnboarding', '1');
        sessionStorage.setItem('__voyagePostOnboarding_time', String(Date.now()));
      } catch {}

      // Ensure no splash/overlay can block next screen
      document.body.classList.remove('splash-visible');
      const splash = document.getElementById('SplashRoot');
      if (splash) splash.style.display = 'none';

      // Preload Home chunk (best effort, cap at 500ms)
      try {
        await Promise.race([import('@/pages/Home'), new Promise(r => setTimeout(r, 500))]);
      } catch {}

      // Persist completion
      if (typeof onComplete === 'function') await onComplete();
      else await markOnboardingComplete();

      // Optimistic mark
      try {
        sessionStorage.setItem('onb_completed_optimistic', '1');
        sessionStorage.setItem('onb_completed_optimistic_at', String(Date.now()));
      } catch {}

      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

      // Navigate via microtask (more deterministic than setTimeout)
      queueMicrotask(() => navigate('/home', { replace: true }));
    } catch (err) {
      console.error('[NAV] error', err);
      queueMicrotask(() => navigate('/home', { replace: true }));
    }
  };

  return (
    <div className="text-center py-8">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
      </div>
      
      <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-4`}>
        Awesome! You're all set ✨
      </h1>
      
      <p className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-base' : 'text-lg'} mb-8 max-w-md mx-auto`}>
        Your AI Coach is now more personalized. You can always update this info in your profile anytime.
      </p>
      
      <Button
        onClick={handleLetsGo}
        disabled={isSubmitting || isFinalizing}
        className={`w-full gradient-primary ${isMobile ? 'h-12' : 'h-14'} text-lg font-semibold`}
      >
        {isFinalizing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Finishing…
          </>
        ) : (
          "Let's go!"
        )}
      </Button>
    </div>
  );
};
