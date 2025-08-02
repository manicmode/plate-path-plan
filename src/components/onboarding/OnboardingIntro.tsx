
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface OnboardingIntroProps {
  onStart: () => void;
  onSkip: () => void;
}

export const OnboardingIntro = ({ onStart, onSkip }: OnboardingIntroProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="text-center py-8">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
      </div>
      
      <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-4`}>
        Let's personalize VOYAGE just for you 💚
      </h1>
      
      <p className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-base' : 'text-lg'} mb-8 max-w-md mx-auto`}>
        Answer a few quick questions so your AI coach can give better suggestions. (Takes under 60 seconds!)
      </p>
      
      <div className="space-y-4">
        <Button
          onClick={onStart}
          className={`w-full gradient-primary ${isMobile ? 'h-12' : 'h-14'} text-lg font-semibold`}
        >
          Start
        </Button>
        
        <Button
          variant="ghost"
          onClick={onSkip}
          className="w-full text-gray-600 dark:text-gray-400"
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
};
