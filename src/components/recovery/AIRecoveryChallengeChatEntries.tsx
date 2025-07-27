import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Target, Flame, ChevronRight } from 'lucide-react';
import { useCoachCta } from '@/hooks/useCoachCta';
import { useRecoveryChallenge } from '@/hooks/useRecoveryChallenge';
import { useNavigate } from 'react-router-dom';

interface AIRecoveryChallengeChatEntriesProps {
  maxEntries?: number;
  showOnlyRecent?: boolean;
}

const CATEGORY_EMOJIS = {
  meditation: '🧘‍♂️',
  breathing: '🫁',
  yoga: '🤸‍♀️',
  sleep: '🌙',
  thermotherapy: '🔥'
};

const CATEGORY_COLORS = {
  meditation: 'from-green-600 to-emerald-600',
  breathing: 'from-cyan-600 to-blue-600',
  yoga: 'from-purple-600 to-pink-600',
  sleep: 'from-indigo-600 to-blue-600',
  thermotherapy: 'from-orange-600 to-red-600'
};

export const AIRecoveryChallengeChatEntries: React.FC<AIRecoveryChallengeChatEntriesProps> = ({
  maxEntries = 3,
  showOnlyRecent = true
}) => {
  const { clearCurrentMessage, getQueueInfo } = useCoachCta();
  const { activeChallenges } = useRecoveryChallenge();
  const navigate = useNavigate();
  
  const { currentMessage: currentCoachCta } = getQueueInfo();

  // Only show recovery-related coach messages
  const isRecoveryMessage = currentCoachCta && (
    currentCoachCta.includes('Meditation') ||
    currentCoachCta.includes('Breathwork') ||
    currentCoachCta.includes('Yoga') ||
    currentCoachCta.includes('Sleep') ||
    currentCoachCta.includes('Thermotherapy') ||
    currentCoachCta.includes('challenge') ||
    currentCoachCta.includes('streak')
  );

  const handleViewChallenges = () => {
    navigate('/game-and-challenge');
    clearCurrentMessage();
  };

  const handleStartRecovery = () => {
    navigate('/exercise-hub?tab=recovery');
    clearCurrentMessage();
  };

  if (!isRecoveryMessage || !currentCoachCta) {
    return null;
  }

  // Determine category from message content
  let category = 'meditation';
  let colors = CATEGORY_COLORS.meditation;
  
  if (currentCoachCta.includes('Breathwork') || currentCoachCta.includes('breathing')) {
    category = 'breathing';
    colors = CATEGORY_COLORS.breathing;
  } else if (currentCoachCta.includes('Yoga')) {
    category = 'yoga';
    colors = CATEGORY_COLORS.yoga;
  } else if (currentCoachCta.includes('Sleep')) {
    category = 'sleep';
    colors = CATEGORY_COLORS.sleep;
  } else if (currentCoachCta.includes('Thermotherapy')) {
    category = 'thermotherapy';
    colors = CATEGORY_COLORS.thermotherapy;
  }

  const emoji = CATEGORY_EMOJIS[category as keyof typeof CATEGORY_EMOJIS];

  return (
    <div className="space-y-3">
      <Card className="glass-card border-violet-200/20 bg-gradient-to-r from-slate-900/40 via-blue-900/30 to-indigo-900/40">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className={`p-2 rounded-full bg-gradient-to-r ${colors} backdrop-blur-sm`}>
                <Trophy className="h-4 w-4 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{emoji}</span>
                <p className="text-sm font-medium text-blue-100">Recovery Challenge Coach</p>
                <Flame className="h-3 w-3 text-orange-300" />
              </div>
              
              <p className="text-sm text-blue-200/90 leading-relaxed">
                {currentCoachCta}
              </p>
              
              <div className="flex items-center space-x-2 pt-1">
                <Button
                  onClick={handleStartRecovery}
                  size="sm"
                  className={`bg-gradient-to-r ${colors} hover:opacity-90 text-white rounded-full text-xs px-3`}
                >
                  <Target className="h-3 w-3 mr-1" />
                  Continue Journey
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
                
                <Button
                  onClick={handleViewChallenges}
                  size="sm"
                  variant="ghost"
                  className="text-blue-300/70 hover:text-blue-200 hover:bg-blue-800/20 rounded-full text-xs px-3"
                >
                  View Challenges
                </Button>
                
                <Button
                  onClick={clearCurrentMessage}
                  size="sm"
                  variant="ghost"
                  className="text-blue-300/50 hover:text-blue-200 hover:bg-blue-800/20 rounded-full text-xs px-2"
                >
                  ×
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};