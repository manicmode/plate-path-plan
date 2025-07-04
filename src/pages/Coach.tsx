
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { supabase } from '@/integrations/supabase/client';
import { Send, Bot, User, Loader2, Brain } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const Coach = () => {
  const { user } = useAuth();
  const { getTodaysProgress, currentDay } = useNutrition();
  const { recordCoachInteraction } = useNotifications();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hi ${user?.name || 'there'}! 👋 I'm your AI nutrition coach. I'm here to help you reach your health goals, answer questions about nutrition, and provide personalized guidance based on your progress. What would you like to talk about today?`,
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const progress = getTodaysProgress();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Record coach interaction for notifications
    recordCoachInteraction();

    try {
      const contextData = {
        user: {
          name: user?.name,
          targetCalories: user?.targetCalories,
          targetProtein: user?.targetProtein,
          targetCarbs: user?.targetCarbs,
          targetFat: user?.targetFat,
          allergies: user?.allergies,
          dietaryGoals: user?.dietaryGoals,
        },
        todaysProgress: progress,
        todaysFoods: currentDay.foods.map(f => ({
          name: f.name,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
        })),
        hydration: currentDay.totalHydration,
        supplements: currentDay.supplements.length,
      };

      const { data, error } = await supabase.functions.invoke('ai-coach-chat', {
        body: {
          message: input.trim(),
          context: contextData,
        },
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickQuestions = [
    "Analyze my progress",
    "Meal suggestions?",
    "Boost my protein",
    "Stay motivated",
  ];

  return (
    <div className={`space-y-4 sm:space-y-6 animate-fade-in ${isMobile ? 'pb-32' : 'pb-40'}`}>
      {/* Animated Robot Head Header */}
      <div className="text-center py-6">
        <div className="flex justify-center mb-4">
          <div className={`${isMobile ? 'w-20 h-20' : 'w-24 h-24'} bg-gradient-to-br from-purple-600 via-blue-600 to-emerald-600 rounded-full flex items-center justify-center neon-glow animate-float shadow-2xl`}>
            <Brain className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} text-white animate-pulse`} />
          </div>
        </div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-purple-600 to-emerald-600 bg-clip-text text-transparent mb-2`}>
          AI Nutrition Coach
        </h1>
        <p className={`text-purple-600 dark:text-purple-400 font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>
          Your personal nutrition expert, powered by AI
        </p>
      </div>

      {/* Chat Interface */}
      <Card className={`glass-card border-0 rounded-3xl flex flex-col ${isMobile ? 'h-[450px]' : 'h-[500px]'}`}>
        <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
          <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <Brain className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600`} />
            <span>Chat with Your Coach</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0 flex flex-col flex-1`}>
          {/* Messages */}
          <ScrollArea className="flex-1 mb-4 pr-2" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.isUser ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.isUser
                        ? 'bg-emerald-600 text-white'
                        : 'bg-purple-600 text-white'
                    }`}
                  >
                    {message.isUser ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`${
                      isMobile ? 'max-w-[75%]' : 'max-w-[80%]'
                    } p-3 rounded-2xl overflow-hidden break-words hyphens-auto ${
                      message.isUser
                        ? 'bg-emerald-600 text-white ml-auto'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                    }`}
                    style={{ 
                      wordWrap: 'break-word',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word'
                    }}
                  >
                    <p className={`${isMobile ? 'text-sm' : 'text-base'} leading-relaxed`}>
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                      <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-300`}>
                        Thinking...
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Questions */}
          {messages.length === 1 && (
            <div className="mb-4">
              <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-300 mb-3 font-medium`}>
                Quick start:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(question)}
                    className={`${isMobile ? 'text-xs px-3 py-2 h-auto' : 'text-sm px-4 py-3 h-auto'} text-center justify-center font-semibold bg-gradient-to-r from-purple-50 to-emerald-50 dark:from-purple-900/20 dark:to-emerald-900/20 border-purple-200 dark:border-purple-700 hover:from-purple-100 hover:to-emerald-100 dark:hover:from-purple-800/30 dark:hover:to-emerald-800/30 transition-all duration-200 hover:scale-105`}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input - with extra margin bottom for menu spacing */}
          <div className={`flex space-x-2 ${isMobile ? 'mb-4' : 'mb-6'}`}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about nutrition..."
              disabled={isLoading}
              className="flex-1 rounded-2xl"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 rounded-2xl px-4"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Coach;
