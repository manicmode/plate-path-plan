import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNudgeContentChecker } from '@/hooks/useNudgeContentChecker';
import { AINudgeChatEntries } from '@/components/meditation/AINudgeChatEntries';
import { AIBreathingNudgeChatEntries } from '@/components/breathing/AIBreathingNudgeChatEntries';
import { AIYogaNudgeChatEntries } from '@/components/yoga/AIYogaNudgeChatEntries';
import { AISleepNudgeChatEntries } from '@/components/sleep/AISleepNudgeChatEntries';
import { AIThermotherapyNudgeChatEntries } from '@/components/thermotherapy/AIThermotherapyNudgeChatEntries';
import { AIRecoveryChallengeChatEntries } from '@/components/recovery/AIRecoveryChallengeChatEntries';
import { LoadingNudgeState } from '@/components/common/LoadingNudgeState';
import { EmptyNudgeState } from '@/components/common/EmptyNudgeState';

export const RecoveryNudgeSection = () => {
  const isMobile = useIsMobile();
  const nudgeContent = useNudgeContentChecker({ maxEntries: 3, showOnlyRecent: true });

  if (nudgeContent.isLoading) {
    return (
      <Card className="glass-card border-0 rounded-3xl">
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <LoadingNudgeState />
        </CardContent>
      </Card>
    );
  }

  if (!nudgeContent.hasAnyContent) {
    return (
      <Card className="glass-card border-0 rounded-3xl">
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <EmptyNudgeState 
            message="No recent recovery suggestions available"
            type="recovery"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Meditation Nudges */}
      {nudgeContent.hasMeditationContent && (
        <Card className="glass-card border-0 rounded-3xl">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <AINudgeChatEntries maxEntries={3} showOnlyRecent={true} />
          </CardContent>
        </Card>
      )}

      {/* Breathing Nudges */}
      {nudgeContent.hasBreathingContent && (
        <Card className="glass-card border-0 rounded-3xl">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <AIBreathingNudgeChatEntries maxEntries={3} showOnlyRecent={true} />
          </CardContent>
        </Card>
      )}

      {/* Yoga Nudges */}
      {nudgeContent.hasYogaContent && (
        <Card className="glass-card border-0 rounded-3xl">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <AIYogaNudgeChatEntries maxEntries={3} showOnlyRecent={true} />
          </CardContent>
        </Card>
      )}

      {/* Sleep Nudges */}
      {nudgeContent.hasSleepContent && (
        <Card className="glass-card border-0 rounded-3xl">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <AISleepNudgeChatEntries maxEntries={3} showOnlyRecent={true} />
          </CardContent>
        </Card>
      )}

      {/* Thermotherapy Nudges */}
      {nudgeContent.hasThermotherapyContent && (
        <Card className="glass-card border-0 rounded-3xl">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <AIThermotherapyNudgeChatEntries maxEntries={3} showOnlyRecent={true} />
          </CardContent>
        </Card>
      )}

      {/* Recovery Challenge Coach */}
      {nudgeContent.hasRecoveryContent && (
        <Card className="glass-card border-0 rounded-3xl">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <AIRecoveryChallengeChatEntries maxEntries={3} showOnlyRecent={true} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};