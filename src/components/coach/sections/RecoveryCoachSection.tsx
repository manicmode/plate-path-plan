import { useIsMobile } from '@/hooks/use-mobile';
import { RecoveryAIChat } from '@/components/coach/recovery/RecoveryAIChat';
import { RecoveryCommandBar } from '@/components/coach/recovery/RecoveryCommandBar';
import { RecoveryNudgeSection } from '@/components/coach/recovery/RecoveryNudgeSection';
import { RecoveryTips } from '@/components/coach/recovery/RecoveryTips';
import { RecoveryInsights } from '@/components/coach/recovery/RecoveryInsights';
import { Sparkles } from 'lucide-react';

const RecoveryCoachSection = () => {
  const isMobile = useIsMobile();

  return (
    <div className="max-w-md mx-auto w-full px-4">
      <div className={`space-y-6 animate-fade-in ${isMobile ? 'pb-24' : 'pb-32'}`}>
        {/* Animated Robot Head Header */}
        <div className="text-center py-6">
          <div className="flex justify-center mb-4">
            <div className={`${isMobile ? 'w-20 h-20' : 'w-24 h-24'} bg-gradient-to-br from-blue-600 via-teal-600 to-cyan-600 rounded-full flex items-center justify-center neon-glow animate-float shadow-2xl`}>
              <Sparkles className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} text-white animate-pulse`} />
            </div>
          </div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2`}>
            🧘 Recovery Coach
          </h1>
          <p className={`text-blue-600 dark:text-blue-400 font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>
            Your personal recovery guide, powered by AI
          </p>
        </div>

        {/* AI Chat Box */}
        <RecoveryAIChat />
        
        {/* Command Buttons */}
        <RecoveryCommandBar />
        
        {/* Nudge Window */}
        <RecoveryNudgeSection />
        
        {/* Tips or Motivation */}
        <RecoveryTips />
        
        {/* AI Insights or Patterns */}
        <RecoveryInsights />
      </div>
    </div>
  );
};

export default RecoveryCoachSection;