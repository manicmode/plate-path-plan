
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { SavingScreen } from '@/components/SavingScreen';

interface OnboardingCompleteProps {
  onComplete: () => void;
  isSubmitting: boolean;
}

export const OnboardingComplete = ({ onComplete, isSubmitting }: OnboardingCompleteProps) => {
  const isMobile = useIsMobile();

  if (isSubmitting) {
    return <SavingScreen />;
  }

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
        onClick={onComplete}
        disabled={isSubmitting}
        className={`w-full gradient-primary ${isMobile ? 'h-12' : 'h-14'} text-lg font-semibold`}
      >
        "Let's go!"
      </Button>
    </div>
  );
};
