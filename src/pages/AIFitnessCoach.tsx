import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Trophy, Target, Lightbulb, Zap, Send, Users, RotateCcw, Lock, Unlock, Plus, Dumbbell } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIntelligentFitnessCoach } from '@/hooks/useIntelligentFitnessCoach';
import { useSocialAccountability } from '@/hooks/useSocialAccountability';
import { NudgeOpportunityCard } from '@/components/NudgeOpportunityCard';
import { GroupStatsDisplay } from '@/components/GroupStatsDisplay';
import { WeeklyExerciseInsightsCard } from '@/components/analytics/WeeklyExerciseInsightsCard';
import { AnimatePresence } from 'framer-motion';
import { AINudgeChatEntries } from '@/components/meditation/AINudgeChatEntries';
import { AIYogaNudgeChatEntries } from '@/components/yoga/AIYogaNudgeChatEntries';
import { AISleepNudgeChatEntries } from '@/components/sleep/AISleepNudgeChatEntries';
import { AIThermotherapyNudgeChatEntries } from '@/components/thermotherapy/AIThermotherapyNudgeChatEntries';
import { AIRecoveryChallengeChatEntries } from '@/components/recovery/AIRecoveryChallengeChatEntries';
import { useNudgeContentChecker } from '@/hooks/useNudgeContentChecker';
import { EmptyNudgeState } from '@/components/common/EmptyNudgeState';
import { LoadingNudgeState } from '@/components/common/LoadingNudgeState';
import { WorkoutPreferencesModal } from '@/components/WorkoutPreferencesModal';
import { LevelProgressBar } from '@/components/level/LevelProgressBar';

export default function AIFitnessCoach() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { 
    processUserInput, 
    analyzeWorkoutPatterns, 
    isAnalyzing, 
    nudgeOpportunities, 
    groupStats, 
    socialCoachMessage 
  } = useIntelligentFitnessCoach();
  
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; emoji?: string }>>([
    { 
      role: 'assistant', 
      content: 'Hey there, fitness champion! 💪 I\'m your AI Fitness Coach, and I\'m here to analyze your workouts, keep you motivated, and help you crush your goals! I can track your progress, suggest improvements, create challenges, and be your personal hype squad. What would you like to work on today?',
      emoji: '🤖'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Workout routine generation state
  const [showWorkoutPreferencesModal, setShowWorkoutPreferencesModal] = useState(false);
  
  // Weekly plan and regeneration state
  const [weeklyPlan, setWeeklyPlan] = useState<Array<{
    day: string;
    title: string;
    muscleGroups: string[];
    exercises: Array<{ name: string; sets: string; reps: string }>;
    isLocked: boolean;
  }>>([]);
  const [isRegeneratingDay, setIsRegeneratingDay] = useState<string | null>(null);
  
  // Multi-day regeneration tracking
  const [recentRegenerations, setRecentRegenerations] = useState<Array<{
    day: string;
    timestamp: number;
  }>>([]);
  useScrollToTop();
  
  const { sendNudge } = useSocialAccountability();
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(new Set());

  // Check nudge content availability
  const nudgeContent = useNudgeContentChecker({ maxEntries: 3, showOnlyRecent: true });

  const smartPrompts = [
    { emoji: '📊', text: 'How Am I Doing?', message: 'How am I doing this week? Give me a complete analysis of my workout progress and patterns.' },
    { emoji: '🚀', text: 'Give Me a Challenge', message: 'Give me a new challenge based on my workout history. I want to push myself!' },
    { emoji: '🔥', text: 'Motivate Me!', message: 'I need some serious motivation to stay consistent with my fitness routine! Hype me up!' },
    { emoji: '💡', text: 'Areas to Improve', message: 'What areas should I focus on improving? Give me specific suggestions based on my workouts.' },
    { emoji: '🧘', text: 'Recovery Advice', message: 'Should I take a rest day or keep pushing? Help me with recovery planning.' },
    { emoji: '🤝', text: 'Team Check', message: 'How is our squad doing? Any teammates who need support?' }
  ];

  // Show social coach message in chat if available
  useEffect(() => {
    if (socialCoachMessage && messages[messages.length - 1]?.content !== socialCoachMessage) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: socialCoachMessage,
        emoji: '🤝'
      }]);
    }
  }, [socialCoachMessage]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    const newMessages = [...messages, { role: 'user' as const, content: message }];
    setMessages(newMessages);
    setInputMessage('');
    
    // Process message with intelligent coach logic
    setTimeout(() => {
      const coachResponse = processUserInput(message);
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: coachResponse.message,
        emoji: coachResponse.emoji
      }]);
      setIsLoading(false);
    }, 1500); // Slightly longer to simulate analysis
  };

  const handlePromptClick = (promptMessage: string) => {
    handleSendMessage(promptMessage);
  };

  const handleRoutineCreated = (routine: any) => {
    // Handle routine creation success
    const successMessage = `🎉 Amazing! I've generated your personalized 8-week workout routine: "${routine.routine_name}". This plan is specifically designed for your ${routine.routine_goal} goal with ${routine.split_type} training. You can find it in your Exercise Hub and start your fitness journey today!`;
    
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: successMessage,
      emoji: '🏋️‍♂️'
    }]);
  };

  const handleRegenerateDay = async (dayIndex: number) => {
    const day = weeklyPlan[dayIndex];
    if (!day) return;

    // Check if day is locked
    if (day.isLocked) {
      toast({
        title: "Day is Locked 🔒",
        description: "This day is locked. Unlock to make changes.",
        variant: "destructive",
      });
      return;
    }

    setIsRegeneratingDay(day.day);

    // Track this regeneration for multi-day smart adjustments
    const currentTime = Date.now();
    const recentTimeFrame = 10 * 60 * 1000; // 10 minutes
    
    // Add current regeneration to tracking
    const newRegeneration = { day: day.day, timestamp: currentTime };
    const updatedRegenerations = [...recentRegenerations, newRegeneration]
      .filter(regen => currentTime - regen.timestamp < recentTimeFrame); // Keep only recent ones
    
    setRecentRegenerations(updatedRegenerations);

    // Check if this is multi-day regeneration (2+ unlocked days in timeframe)
    const unlockedRegenerations = updatedRegenerations.filter(regen => {
      const regenDayIndex = weeklyPlan.findIndex(d => d.day === regen.day);
      return regenDayIndex !== -1 && !weeklyPlan[regenDayIndex].isLocked;
    });

    // Get previous day's muscle groups for smart balancing
    const previousDay = dayIndex > 0 ? weeklyPlan[dayIndex - 1] : null;
    const nextDay = dayIndex < weeklyPlan.length - 1 ? weeklyPlan[dayIndex + 1] : null;

    // Build regeneration prompt with muscle group balancing logic
    const regenerationPrompt = `💡 "You are VOYAGE's AI Fitness Coach. The user has tapped the 'Regenerate' button for ${day.day}. Create a new workout for this day with intelligent muscle group balancing.

Current Context:
- Day to regenerate: ${day.day}
- Previous day (${previousDay?.day || 'Rest'}): ${previousDay?.muscleGroups.join(', ') || 'No workout'}
- Next day (${nextDay?.day || 'Rest'}): ${nextDay?.muscleGroups.join(', ') || 'No workout'}

User Preferences:
- Fitness Goal: General Fitness
- Training Split: Full Body
- Workout Time: 45 minutes
- Equipment: Bodyweight

Smart Balancing Rules:
- Avoid repeating the same primary muscle groups from the day before
- If previous day focused on chest/triceps, avoid those today
- Ensure the new day fits into the overall split style and weekly balance
- Consider recovery time between muscle groups

Generate a new ${day.day} workout that includes:
- Exciting workout title (e.g., 'Pull Power — Back & Biceps', 'HIIT Cardio Blast')
- Primary muscle groups targeted
- 4-6 specific exercises with sets/reps
- Brief motivational note

Make it energetic and perfectly balanced with the rest of the week!"`;

    // Add regeneration message to chat
    const newMessages = [...messages, { 
      role: 'user' as const, 
      content: `Regenerate my ${day.day} workout with smart muscle group balancing` 
    }];
    setMessages(newMessages);

    // Simulate AI regeneration
    setTimeout(() => {
      const coachResponse = processUserInput(regenerationPrompt);
      
      // Update the specific day in weekly plan (mock data for now)
      const newDay = {
        ...day,
        title: `New ${day.day} Routine`,
        muscleGroups: previousDay?.muscleGroups.includes('chest') ? ['back', 'biceps'] : ['chest', 'triceps'],
        exercises: [
          { name: 'Exercise 1', sets: '3', reps: '10-12' },
          { name: 'Exercise 2', sets: '3', reps: '8-10' },
          { name: 'Exercise 3', sets: '2', reps: '12-15' },
          { name: 'Exercise 4', sets: '3', reps: '30s' }
        ]
      };

      setWeeklyPlan(prev => prev.map((planDay, index) => 
        index === dayIndex ? newDay : planDay
      ));

      // Check for multi-day smart regeneration (2+ unlocked days regenerated)
      if (unlockedRegenerations.length >= 2) {
        // Show multi-day smart adjustment prompt
        const smartAdjustmentMessage = {
          role: 'assistant' as const,
          content: '🤖 Smart Adjustment Activated!\n\nI\'ve optimized your weekly plan to ensure:\n\n💪 No muscle group is overworked back-to-back\n\n🔁 Push/pull/leg/core workouts are distributed evenly\n\n⚖️ Locked days are fully respected during balancing\n\nYour workout plan is now perfectly balanced for optimal recovery and results!',
          emoji: '🤖'
        };
        
        setMessages([...newMessages, { 
          role: 'assistant', 
          content: coachResponse.message,
          emoji: '🔄'
        }, smartAdjustmentMessage]);
      } else {
        setMessages([...newMessages, { 
          role: 'assistant', 
          content: coachResponse.message,
          emoji: '🔄'
        }]);
      }
      
      setIsRegeneratingDay(null);
    }, 2000);
  };

  const toggleDayLock = (dayIndex: number) => {
    const currentDay = weeklyPlan[dayIndex];
    const willBeLocked = !currentDay.isLocked;
    
    setWeeklyPlan(prev => prev.map((day, index) => 
      index === dayIndex ? { ...day, isLocked: !day.isLocked } : day
    ));

    // Show toast with lock status
    toast({
      title: willBeLocked ? "Day Locked 🔒" : "Day Unlocked 🔓",
      description: willBeLocked 
        ? "This day is now locked. It won't be regenerated and will maintain its current routine. Smart generation for other days will respect this day's muscle groups for balanced recovery."
        : "This day is now unlocked. You can regenerate and modify this routine anytime.",
    });
  };

  const motivationalQuotes = [
    "The only bad workout is the one that didn't happen.",
    "Your body can do it. It's your mind you need to convince.",
    "Progress, not perfection.",
    "Consistency beats intensity."
  ];

  const fitnessWisdomCards = [
    {
      title: "Myth Buster",
      description: "Debunking common fitness misconceptions",
      icon: "💡"
    },
    {
      title: "Form Check",
      description: "Perfect your exercise technique",
      icon: "✅"
    },
    {
      title: "Recovery Tips",
      description: "Optimize your rest and recovery",
      icon: "😴"
    },
    {
      title: "Nutrition Timing",
      description: "When to eat for maximum performance",
      icon: "⏰"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-8 pb-20">
        {/* Hero Section */}
        <div className="text-center py-6">
          <div className="flex justify-center mb-4">
            <div className={`${isMobile ? 'w-20 h-20' : 'w-24 h-24'} bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-600 rounded-full flex items-center justify-center neon-glow animate-float shadow-2xl`}>
              <Dumbbell className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} text-white animate-pulse`} />
            </div>
          </div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2`}>
            AI Fitness Coach
          </h1>
          <p className={`${isMobile ? 'text-sm' : 'text-base'} text-indigo-600 dark:text-indigo-400 font-semibold max-w-2xl mx-auto mb-6`}>
            Your personal fitness guide, powered by AI
          </p>
          <LevelProgressBar theme="exercise" />
        </div>

        {/* AI Chat Component */}
        <Card className="border-2 border-indigo-300 dark:border-indigo-700 mb-0 !mb-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-indigo-600" />
              AI Chat Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Chat Messages */}
              <div className="bg-muted/30 rounded-lg p-4 min-h-[300px] max-h-[400px] overflow-y-auto space-y-3">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                          : 'bg-gradient-to-r from-white to-blue-50 dark:from-gray-700 dark:to-gray-800 text-foreground border border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {message.role === 'assistant' && message.emoji && (
                          <span className="text-lg flex-shrink-0 mt-0.5">{message.emoji}</span>
                        )}
                        <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                 {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-white to-blue-50 dark:from-gray-700 dark:to-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🤖</span>
                        <div className="flex flex-col gap-1">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Analyzing your fitness data...
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Smart Prompt Buttons */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground font-medium">🚀 Quick Actions - Get instant insights:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {smartPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => handlePromptClick(prompt.message)}
                      className="flex-shrink-0 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/50 dark:hover:to-purple-900/50 border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all duration-300 hover:scale-105 text-left justify-start h-auto py-3"
                      disabled={isLoading}
                    >
                      <span className="mr-2 text-lg">{prompt.emoji}</span>
                      <span className="text-sm font-medium">{prompt.text}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Chat Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Ask your AI fitness coach anything..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputMessage)}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => handleSendMessage(inputMessage)}
                  disabled={isLoading || !inputMessage.trim()}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Routine Generator Hero Box */}
        <div className="w-full mb-6">
          <button
            onClick={() => setShowWorkoutPreferencesModal(true)}
            className="group w-full h-20 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-700 to-fuchsia-600 hover:from-purple-500 hover:via-violet-600 hover:to-fuchsia-500 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/30 border-0 overflow-hidden relative"
          >
            {/* Floating particles animation */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-2 left-4 w-2 h-2 bg-white rounded-full animate-[float_3s_ease-in-out_infinite]"></div>
              <div className="absolute top-4 right-8 w-1 h-1 bg-white rounded-full animate-[float_4s_ease-in-out_infinite_1s]"></div>
              <div className="absolute bottom-6 left-12 w-1.5 h-1.5 bg-white rounded-full animate-[float_5s_ease-in-out_infinite_2s]"></div>
              <div className="absolute bottom-3 right-6 w-1 h-1 bg-white rounded-full animate-[float_3.5s_ease-in-out_infinite_1.5s]"></div>
              <div className="absolute top-1/2 left-1/3 w-1 h-1 bg-white rounded-full animate-[float_4.5s_ease-in-out_infinite_0.5s]"></div>
            </div>
            
            <div className="flex items-center justify-center gap-3 mb-1 relative z-10">
              <div className="flex items-center gap-4">
                <span className="text-5xl transition-transform duration-300 group-hover:scale-110 animate-pulse">🤖</span>
                <h2 className="text-xl font-bold text-white">AI Routine Generator</h2>
              </div>
              <span className="text-sm opacity-70 transition-transform duration-300 group-hover:translate-x-1 text-white">→</span>
            </div>
            <p className="text-white/90 text-sm opacity-90 relative z-10">
              Let the AI build your 8-week fitness plan
            </p>
          </button>
        </div>

        {/* New Routine Button */}
        <Card className="glass-card border-0 rounded-3xl mb-0 !mb-0">
          <CardContent className="p-6 !p-4">
            <Button
              onClick={() => navigate('/exercise-hub')}
              className="w-full h-14 bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 hover:from-purple-300 hover:via-pink-400 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:brightness-110"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Routine
            </Button>
          </CardContent>
        </Card>


        {/* Fitness Nudges Section */}
        {nudgeContent.isLoading ? (
          <Card className="glass-card border-0 rounded-3xl">
            <CardContent className="p-6">
              <LoadingNudgeState />
            </CardContent>
          </Card>
        ) : nudgeContent.hasAnyContent ? (
          <>
            {/* Meditation Nudges Section */}
            {nudgeContent.hasMeditationContent && (
              <Card className="glass-card border-0 rounded-3xl">
                <CardContent className="p-6">
                  <AINudgeChatEntries maxEntries={3} showOnlyRecent={true} />
                </CardContent>
              </Card>
            )}


            {/* Yoga Nudges Section */}
            {nudgeContent.hasYogaContent && (
              <Card className="glass-card border-0 rounded-3xl">
                <CardContent className="p-6">
                  <AIYogaNudgeChatEntries maxEntries={3} showOnlyRecent={true} />
                </CardContent>
              </Card>
            )}

            {/* Sleep Nudges Section */}
            {nudgeContent.hasSleepContent && (
              <Card className="glass-card border-0 rounded-3xl">
                <CardContent className="p-6">
                  <AISleepNudgeChatEntries maxEntries={3} showOnlyRecent={true} />
                </CardContent>
              </Card>
            )}

            {/* Thermotherapy Nudges Section */}
            {nudgeContent.hasThermotherapyContent && (
              <Card className="glass-card border-0 rounded-3xl">
                <CardContent className="p-6">
                  <AIThermotherapyNudgeChatEntries maxEntries={3} showOnlyRecent={true} />
                </CardContent>
              </Card>
            )}

            {/* Recovery Challenge Coach Section */}
            {nudgeContent.hasRecoveryContent && (
              <Card className="glass-card border-0 rounded-3xl">
                <CardContent className="p-6">
                  <AIRecoveryChallengeChatEntries maxEntries={3} showOnlyRecent={true} />
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="glass-card border-0 rounded-3xl">
            <CardContent className="p-6">
              <EmptyNudgeState 
                message="No recent fitness suggestions available"
                type="fitness"
              />
            </CardContent>
          </Card>
        )}

        {/* Social Accountability Section */}
        {(nudgeOpportunities?.length > 0 || groupStats) && (
          <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5 mb-0 !mb-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Squad Accountability
                <span className="text-2xl">🤝</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Group Stats */}
              {groupStats && <GroupStatsDisplay stats={groupStats} />}
              
              {/* Nudge Opportunities */}
              {nudgeOpportunities && nudgeOpportunities.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    💫 Teammates Who Could Use a Boost
                  </h4>
                  <AnimatePresence>
                    {nudgeOpportunities
                      .filter(opportunity => !dismissedNudges.has(opportunity.target_user.user_id))
                      .map((opportunity) => (
                        <NudgeOpportunityCard
                          key={opportunity.target_user.user_id}
                          opportunity={opportunity}
                          onSendNudge={sendNudge}
                          onDismiss={() => {
                            setDismissedNudges(prev => new Set([...prev, opportunity.target_user.user_id]));
                          }}
                        />
                      ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Weekly Exercise Insights */}
        <WeeklyExerciseInsightsCard />

        {/* Personalized 8-Week Routine */}
        <Card className="border border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 mb-0 !mb-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Your Personalized 8-Week Routine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                AI-generated workout plans tailored to your fitness level, goals, and available equipment.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Progressive overload tracking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Adaptive difficulty</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Recovery optimization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Goal-specific exercises</span>
                  </div>
                </div>
              </div>
              {/* Weekly Plan Display */}
              {weeklyPlan.length > 0 && (
                <div className="space-y-4 mb-6">
                  <h4 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                    📅 Your Weekly Plan
                  </h4>
                  <div className="grid gap-3">
                    {weeklyPlan.map((day, index) => (
                      <div
                        key={index}
                        className={`bg-white/60 dark:bg-gray-800/60 rounded-lg p-4 border transition-all duration-300 ${
                          day.isLocked 
                            ? 'border-yellow-300 dark:border-yellow-600 bg-yellow-50/50 dark:bg-yellow-900/20' 
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {day.day}
                            </span>
                            {day.isLocked && (
                              <div className="flex items-center gap-1">
                                <span className="text-yellow-500">🔒</span>
                                <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Locked</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleDayLock(index)}
                              className={`h-8 w-8 p-0 transition-colors ${
                                day.isLocked 
                                  ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30' 
                                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                              title={day.isLocked ? "Unlock day" : "Lock day"}
                            >
                              {day.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRegenerateDay(index)}
                              disabled={isRegeneratingDay === day.day}
                              className={`h-8 w-8 p-0 ${
                                day.isLocked 
                                  ? 'opacity-40 cursor-not-allowed' 
                                  : 'text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
                              }`}
                              title={day.isLocked ? "Unlock to regenerate" : "Regenerate this day"}
                            >
                              {isRegeneratingDay === day.day ? (
                                <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <RotateCcw className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className={`space-y-2 transition-all duration-300 ${
                          day.isLocked ? 'opacity-70' : 'opacity-100'
                        }`}>
                          <h5 className="font-medium text-sm">{day.title}</h5>
                          <p className="text-xs text-muted-foreground">
                            Target: {day.muscleGroups.join(', ')}
                          </p>
                          <div className="text-xs space-y-1">
                            {day.exercises.map((exercise, exerciseIndex) => (
                              <div key={exerciseIndex} className="flex justify-between">
                                <span>{exercise.name}</span>
                                <span className="text-muted-foreground">{exercise.sets}x{exercise.reps}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={() => setShowWorkoutPreferencesModal(true)}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
              >
                <Zap className="h-4 w-4 mr-2" />
                Generate New Routine
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Discipline & Accountability */}
        <Card className="border border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 mb-0 !mb-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-orange-600" />
              Discipline & Accountability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-orange-700 dark:text-orange-400">Current Streak</h4>
                  <div className="text-3xl font-bold text-orange-600">7 days</div>
                  <p className="text-sm text-muted-foreground">Keep going! You're on fire! 🔥</p>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-orange-700 dark:text-orange-400">Weekly Goal</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Workouts completed</span>
                      <span className="font-semibold">4/5</span>
                    </div>
                    <div className="w-full bg-orange-200 dark:bg-orange-800 rounded-full h-2">
                      <div className="bg-orange-600 h-2 rounded-full" style={{ width: '80%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-orange-700 dark:text-orange-400">Daily Motivation</h4>
                {motivationalQuotes.map((quote, index) => (
                  <div key={index} className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 text-sm italic">
                    "{quote}"
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fitness Wisdom & Tips */}
        <Card className="border border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 mb-0 !mb-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              Fitness Wisdom & Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fitnessWisdomCards.map((card, index) => (
                <div
                  key={index}
                  className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4 hover:shadow-md transition-all duration-300 hover:scale-105 cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{card.icon}</span>
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400">{card.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">💡 Today's Tip</h4>
              <p className="text-sm">
                Focus on compound movements like squats, deadlifts, and pull-ups. They work multiple muscle groups simultaneously and give you the most bang for your buck!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workout Preferences Modal */}
      <WorkoutPreferencesModal
        isOpen={showWorkoutPreferencesModal}
        onClose={() => setShowWorkoutPreferencesModal(false)}
        onRoutineCreated={handleRoutineCreated}
      />
    </div>
  );
}