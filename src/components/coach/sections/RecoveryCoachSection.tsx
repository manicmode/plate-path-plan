import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import { RecoveryAIChat } from '@/components/coach/recovery/RecoveryAIChat';
import { RecoveryCommandBar } from '@/components/coach/recovery/RecoveryCommandBar';
import { RecoveryNudgeSection } from '@/components/coach/recovery/RecoveryNudgeSection';
import { RecoveryTips } from '@/components/coach/recovery/RecoveryTips';
import { RecoveryInsights } from '@/components/coach/recovery/RecoveryInsights';
import { SkillPanel } from '@/components/coach/SkillPanel';
import { Heart, Moon, Wind, Brain, Activity } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { LevelProgressBar } from '@/components/level/LevelProgressBar';
import { useCoachInteractions } from '@/hooks/useCoachInteractions';
import { CoachPraiseMessage } from '@/components/coach/CoachPraiseMessage';
import { MyPraiseModal } from '@/components/coach/MyPraiseModal';
import { AnimatePresence } from 'framer-motion';
import { substituteRecoveryPlaceholders } from '@/utils/recoveryPlaceholders';

const RecoveryCoachSection = () => {
  const isMobile = useIsMobile();

  // 🎮 Coach Gamification System
  const [showPraiseMessage, setShowPraiseMessage] = useState<string | null>(null);
  const { trackInteraction } = useCoachInteractions();

const handleCommand = async (command: string) => {
  // 🎮 Coach Gamification System - Track skill panel interaction
  const trackResult = await trackInteraction('recovery', 'skill_panel');
  if (trackResult?.should_praise && trackResult.praise_message) {
    setShowPraiseMessage(trackResult.praise_message);
    setTimeout(() => setShowPraiseMessage(null), 8000);
  }
  // Personalize placeholders, then auto-send to chat
  const text = await substituteRecoveryPlaceholders(command);
  window.dispatchEvent(new CustomEvent('recovery-chat:send', { detail: { text } }));
};

  // Recovery Skill Panel Categories
  const recoverySkillCategories = [
    {
      title: "Sleep Optimization",
      icon: <Moon className="h-4 w-4 text-blue-600" />,
      commands: [
        { label: "Analyze my sleep patterns", prompt: "Analyze my sleep patterns and tell me how to improve my sleep quality." },
        { label: "Best bedtime routine for recovery", prompt: "What's the best bedtime routine for optimal recovery and performance?" },
        { label: "How much sleep do I really need?", prompt: "How much sleep do I really need based on my training intensity?" },
        { label: "Fix my sleep schedule", prompt: "Help me fix my inconsistent sleep schedule and get better rest." },
        { label: "Sleep environment optimization", prompt: "How can I optimize my sleep environment for deeper recovery?" },
      ]
    },
    {
      title: "Stress Management",
      icon: <Brain className="h-4 w-4 text-green-600" />,
      commands: [
        { label: "Quick stress relief techniques", prompt: "Give me quick stress relief techniques I can use anywhere." },
        { label: "Manage workout stress and burnout", prompt: "How can I manage workout stress and prevent burnout?" },
        { label: "Mindfulness for better recovery", prompt: "How can mindfulness practices improve my recovery?" },
        { label: "Deal with training anxiety", prompt: "Help me deal with training anxiety and performance pressure." },
        { label: "Work-life-fitness balance", prompt: "How can I better balance work, life, and fitness commitments?" },
      ]
    },
    {
      title: "Breathing & Meditation",
      icon: <Wind className="h-4 w-4 text-purple-600" />,
      commands: [
        { label: "Best breathing exercises for recovery", prompt: "What are the best breathing exercises for post-workout recovery?" },
        { label: "Meditation techniques for athletes", prompt: "Teach me meditation techniques specifically designed for athletes." },
        { label: "Breathing for better sleep", prompt: "How can breathing techniques help me fall asleep faster?" },
        { label: "Reduce anxiety with breathwork", prompt: "Show me breathing exercises to reduce anxiety and stress." },
        { label: "Morning breathing routine", prompt: "Create a morning breathing routine to start my day energized." },
      ]
    },
    {
      title: "Active Recovery",
      icon: <Activity className="h-4 w-4 text-orange-600" />,
      commands: [
        { label: "Best active recovery activities", prompt: "What are the best active recovery activities for my training style?" },
        { label: "Yoga sequences for recovery", prompt: "Design yoga sequences that enhance recovery between workouts." },
        { label: "Stretching routine for muscle recovery", prompt: "Create a stretching routine to improve muscle recovery." },
        { label: "Light cardio for recovery days", prompt: "What light cardio activities are best for recovery days?" },
        { label: "Foam rolling and mobility work", prompt: "Teach me proper foam rolling and mobility techniques." },
      ]
    },
    {
      title: "Recovery Tracking",
      icon: <Heart className="h-4 w-4 text-red-600" />,
      commands: [
        { label: "Signs I need more recovery time", prompt: "What are the signs that I need more recovery time between workouts?" },
        { label: "Track my recovery metrics", prompt: "What recovery metrics should I track to optimize my performance?" },
        { label: "Heart rate variability insights", prompt: "How can heart rate variability help me understand my recovery?" },
        { label: "Energy levels throughout the day", prompt: "Analyze my energy levels and suggest recovery improvements." },
        { label: "Recovery vs. overtraining signs", prompt: "Help me distinguish between normal fatigue and overtraining." },
      ]
    }
  ];

  return (
    <div className="max-w-md mx-auto w-full px-4">
      <div className={`space-y-6 animate-fade-in ${isMobile ? 'pb-24' : 'pb-32'}`}>
        {/* Animated Robot Head Header */}
        <div className="text-center py-6">
          <div className="flex justify-center mb-4">
            <div className={`${isMobile ? 'w-20 h-20' : 'w-24 h-24'} bg-gradient-to-br from-orange-500 via-pink-500 to-rose-500 rounded-full flex items-center justify-center neon-glow animate-float shadow-2xl`}>
              <Sparkles className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} text-white animate-pulse`} />
            </div>
          </div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent mb-2`}>
            Recovery Coach
          </h1>
          <p className={`text-orange-600 dark:text-orange-400 font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>
            Your personal recovery guide, powered by AI
          </p>
        </div>

        {/* Level & XP Progress Bar */}
        <div className="mb-6">
          <LevelProgressBar theme="recovery" />
        </div>

        {/* AI Chat Box */}
        <RecoveryAIChat />

        {/* My Praise Button */}
        <div className="flex justify-center">
          <MyPraiseModal coachType="recovery" />
        </div>

        {/* 🎮 Coach Gamification System - Praise Messages */}
        <AnimatePresence>
          {showPraiseMessage && (
            <CoachPraiseMessage 
              message={showPraiseMessage}
              coachType="recovery"
              onDismiss={() => setShowPraiseMessage(null)}
            />
          )}
        </AnimatePresence>

        {/* Recovery Skill Panel */}
        <SkillPanel
          title="🧘 Recovery Expert Skills"
          icon={<Heart className="h-4 w-4 text-orange-600" />}
          categories={recoverySkillCategories}
          onCommandClick={handleCommand}
          isLoading={false}
          gradientColors="from-orange-50 to-pink-50 dark:from-orange-900/20 dark:to-pink-900/20"
        />
        
{/* Command Buttons */}
<RecoveryCommandBar onCommand={(cmd) => window.dispatchEvent(new CustomEvent('recovery-chat:send', { detail: { text: cmd } }))} />
        
        {/* Tips or Motivation */}
        <RecoveryTips />
        
        {/* AI Insights or Patterns */}
        <RecoveryInsights />

        {/* 🧠 Coach Nudge Zone (Moved to Bottom) */}
        <RecoveryNudgeSection />
      </div>
    </div>
  );
};

export default RecoveryCoachSection;