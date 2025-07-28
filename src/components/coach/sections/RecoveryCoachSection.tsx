import { useIsMobile } from '@/hooks/use-mobile';
import { RecoveryAIChat } from '@/components/coach/recovery/RecoveryAIChat';
import { RecoveryCommandBar } from '@/components/coach/recovery/RecoveryCommandBar';
import { RecoveryNudgeSection } from '@/components/coach/recovery/RecoveryNudgeSection';
import { RecoveryTips } from '@/components/coach/recovery/RecoveryTips';
import { RecoveryInsights } from '@/components/coach/recovery/RecoveryInsights';

const RecoveryCoachSection = () => {
  const isMobile = useIsMobile();

  return (
    <div className={`space-y-4 animate-fade-in ${isMobile ? 'pb-24' : 'pb-32'}`}>
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
  );
};

export default RecoveryCoachSection;