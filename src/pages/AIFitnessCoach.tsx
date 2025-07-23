import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Trophy, Target, Lightbulb, Zap, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIntelligentFitnessCoach } from '@/hooks/useIntelligentFitnessCoach';

export default function AIFitnessCoach() {
  const navigate = useNavigate();
  const { processUserInput, analyzeWorkoutPatterns, isAnalyzing } = useIntelligentFitnessCoach();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; emoji?: string }>>([
    { 
      role: 'assistant', 
      content: 'Hey there, fitness champion! 💪 I\'m your AI Fitness Coach, and I\'m here to analyze your workouts, keep you motivated, and help you crush your goals! I can track your progress, suggest improvements, create challenges, and be your personal hype squad. What would you like to work on today?',
      emoji: '🤖'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  useScrollToTop();

  const smartPrompts = [
    { emoji: '📊', text: 'How Am I Doing?', message: 'How am I doing this week? Give me a complete analysis of my workout progress and patterns.' },
    { emoji: '🚀', text: 'Give Me a Challenge', message: 'Give me a new challenge based on my workout history. I want to push myself!' },
    { emoji: '🔥', text: 'Motivate Me!', message: 'I need some serious motivation to stay consistent with my fitness routine! Hype me up!' },
    { emoji: '💡', text: 'Areas to Improve', message: 'What areas should I focus on improving? Give me specific suggestions based on my workouts.' },
    { emoji: '🧘', text: 'Recovery Advice', message: 'Should I take a rest day or keep pushing? Help me with recovery planning.' }
  ];

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
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/exercise-hub')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <h1 className="text-xl font-bold">AI Fitness Coach</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-8 pb-20">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg">
              <span className="text-4xl animate-bounce">🤖</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            AI Fitness Coach
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get smarter, stronger, and more consistent — with a coach who never sleeps
          </p>
        </div>

        {/* AI Chat Component */}
        <Card className="border-2 border-indigo-300 dark:border-indigo-700">
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
                          <p className="text-xs text-muted-foreground">Analyzing your fitness data...</p>
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

        {/* Personalized 8-Week Routine */}
        <Card className="border border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
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
              <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                <Zap className="h-4 w-4 mr-2" />
                Generate New Routine
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Discipline & Accountability */}
        <Card className="border border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
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
        <Card className="border border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
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
    </div>
  );
}