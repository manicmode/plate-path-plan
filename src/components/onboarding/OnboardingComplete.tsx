
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
    // 1) Optional: gather missing fields to warn, but DO NOT block
    const missing: string[] = [];
    if (formData) {
      const requiredFields = [
        { field: 'age', name: 'Age' },
        { field: 'gender', name: 'Gender' },
        { field: 'weight', name: 'Weight' },
        { field: 'mainHealthGoal', name: 'Health Goal' },
        { field: 'activityLevel', name: 'Activity Level' }
      ];
      requiredFields.forEach(({ field, name }) => {
        const val = formData[field as keyof typeof formData];
        if (!val || (typeof val === 'string' && val.trim() === '')) {
          missing.push(name);
        }
      });
    }

    if (missing.length) {
      toast?.({
        title: 'Onboarding finished with defaults',
        description: `We’ll fill these later: ${missing.join(', ')}`,
      });
    }

    setIsFinalizing(true);
    try {
      sessionStorage.setItem('onb_finalizing', '1');
      sessionStorage.setItem('onb_finalizing_at', String(Date.now()));

      if (typeof onComplete === 'function') {
        await onComplete();
      } else {
        await markOnboardingComplete();
      }
    } catch (e) {
      console.error('[ONB] markOnboardingComplete failed', e);
    } finally {
      // Make sure the page is at the top and splash can't block
      try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch {}
      document.body.classList.remove('splash-visible');

      console.info('[ONB] handleFinish → navigate("/home")');
      navigate('/home', { replace: true });

      // Force-paint safety after navigate
      requestAnimationFrame(() => document.body.classList.remove('splash-visible'));
      setTimeout(() => {
        // Force reflow & repaint in edge cases
        document.documentElement.style.transform = 'translateZ(0)';
        setTimeout(() => (document.documentElement.style.transform = ''), 0);
      }, 100);

      // Belt & suspenders: retry once after router settles
      setTimeout(() => navigate('/home', { replace: true }), 800);
      setIsFinalizing(false);
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
