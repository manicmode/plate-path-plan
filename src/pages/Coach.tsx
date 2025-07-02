import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, Sparkles, Target, TrendingUp, Zap, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'coach';
  timestamp: Date;
  isError?: boolean;
}

const Coach = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { getTodaysProgress } = useNutrition();
  const isMobile = useIsMobile();

  const progress = getTodaysProgress();

  // Rate limiting: minimum 2 seconds between requests
  const RATE_LIMIT_MS = 2000;

  // Scroll to top of page when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Initialize welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: '1',
      text: `Hello ${user?.name?.split(' ')[0] || 'there'}! 🤖 I'm your AI nutrition coach powered by ChatGPT. I can provide personalized advice based on your nutrition data. What would you like to explore today?`,
      sender: 'coach',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    setHasInitialized(true);
  }, [user?.name]);

  // Handle scroll position tracking
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50; // 50px threshold
      setIsUserAtBottom(isAtBottom);
    }
  };

  // Smart scroll to bottom - only if user is already at bottom or it's a new message
  const scrollToBottom = (force: boolean = false) => {
    if (force || isUserAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Only scroll for new messages (not the initial welcome message)
  useEffect(() => {
    if (hasInitialized && messages.length > 1) {
      scrollToBottom();
    }
  }, [messages, hasInitialized, isUserAtBottom]);

  const callAICoach = async (userMessage: string): Promise<string> => {
    try {
      console.log('Calling AI coach with message:', userMessage);
      setConnectionError(null); // Clear any previous errors
      
      // Check rate limiting
      const now = Date.now();
      if (now - lastRequestTime < RATE_LIMIT_MS) {
        const waitTime = RATE_LIMIT_MS - (now - lastRequestTime);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      setLastRequestTime(Date.now());

      const userContext = {
        targetCalories: user?.targetCalories || 2000,
        targetProtein: user?.targetProtein || 150,
        progress: {
          calories: progress.calories,
          protein: progress.protein,
          carbs: progress.carbs,
          fat: progress.fat,
        }
      };

      console.log('User context:', userContext);

      const { data, error } = await supabase.functions.invoke('ai-coach-chat', {
        body: {
          message: userMessage,
          userContext: userContext
        }
      });

      console.log('Supabase function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        setConnectionError(`Connection error: ${error.message}`);
        throw new Error(error.message || 'Failed to connect to AI service');
      }

      if (data?.error) {
        console.error('AI service error:', data.error);
        
        // Set specific connection error for display
        if (data.error.includes('configuration') || data.error.includes('API key')) {
          setConnectionError('AI service configuration issue detected');
        } else if (data.error.includes('quota') || data.error.includes('credits')) {
          setConnectionError('AI service quota/credits issue detected');
        } else if (data.error.includes('authentication')) {
          setConnectionError('AI service authentication issue detected');
        } else {
          setConnectionError('AI service error detected');
        }
        
        throw new Error(data.error);
      }

      if (!data?.response) {
        console.error('No response from AI service:', data);
        setConnectionError('No response received from AI service');
        throw new Error('No response received from AI service');
      }

      console.log('AI response received successfully');
      setConnectionError(null); // Clear error on success
      return data.response;
    } catch (error) {
      console.error('Error calling AI coach:', error);
      
      // Show user-friendly error toast
      const errorMessage = error.message || "Failed to get AI response. Please try again.";
      toast({
        title: "AI Coach Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Return fallback message based on error type
      if (error.message?.includes('busy') || error.message?.includes('rate')) {
        return "I'm experiencing high demand right now. Please wait a moment and try again! 🤖⏰";
      } else if (error.message?.includes('configuration') || error.message?.includes('key')) {
        return "There's a configuration issue with the AI service. Please contact support. 🔧";
      }
      
      return "I'm having trouble connecting right now. Please try again in a moment! 🤖";
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    // Prevent rapid successive requests
    const now = Date.now();
    if (now - lastRequestTime < RATE_LIMIT_MS) {
      toast({
        title: "Please wait",
        description: "Please wait a moment before sending another message.",
        variant: "default"
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputValue;
    setInputValue('');
    setIsTyping(true);
    setShowQuickActions(false);

    // Force scroll to bottom for new user message
    setTimeout(() => scrollToBottom(true), 100);

    // Get AI response
    const aiResponse = await callAICoach(messageToSend);
    
    // Add AI response after a short delay for better UX
    setTimeout(() => {
      const coachResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'coach',
        timestamp: new Date(),
        isError: aiResponse.includes("having trouble connecting") || aiResponse.includes("configuration issue")
      };

      setMessages(prev => [...prev, coachResponse]);
      setIsTyping(false);
    }, 800);
  };

  const quickActions = [
    { text: "Analyze my progress", icon: TrendingUp },
    { text: "Suggest my next meal", icon: Target },
    { text: "Help me reach my goals", icon: Sparkles },
  ];

  const handleQuickAction = (actionText: string) => {
    // Check rate limiting for quick actions too
    const now = Date.now();
    if (now - lastRequestTime < RATE_LIMIT_MS) {
      toast({
        title: "Please wait",
        description: "Please wait a moment before sending another message.",
        variant: "default"
      });
      return;
    }

    setInputValue(actionText);
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleRetryConnection = () => {
    setConnectionError(null);
    toast({
      title: "Connection Reset",
      description: "You can now try sending a message again.",
      variant: "default"
    });
  };

  return (
    <div className={`flex flex-col animate-fade-in ${isMobile ? 'h-[calc(100vh-200px)]' : 'h-full'}`}>
      {/* Compact Header */}
      <div className="text-center space-y-2 mb-4 flex-shrink-0">
        <div className="flex justify-center">
          <div className="relative">
            <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} gradient-primary rounded-3xl flex items-center justify-center neon-glow float-animation`}>
              <Bot className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white`} />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full flex items-center justify-center animate-pulse">
              <Zap className="h-2 w-2 text-white" />
            </div>
          </div>
        </div>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent`}>
            AI Wellness Coach
          </h1>
          <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
            {isMobile ? 'ChatGPT • Personalized insights' : 'Powered by ChatGPT • Personalized insights'}
          </p>
        </div>
      </div>

      {/* Connection Error Alert */}
      {connectionError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-800 dark:text-red-200 font-medium">
                {connectionError}
              </span>
            </div>
            <Button
              onClick={handleRetryConnection}
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs border-red-300 text-red-700 hover:bg-red-100 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Chat Container - Mobile optimized with fixed height */}
      <Card className="glass-card border-0 rounded-3xl flex flex-col flex-1 min-h-0 max-h-full">
        <CardHeader className="flex-shrink-0 pb-2">
          <CardTitle className="flex items-center justify-center space-x-2">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${connectionError ? 'bg-red-400' : 'bg-emerald-400'}`}></div>
              <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold ${connectionError ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {isMobile 
                  ? (connectionError ? 'AI Offline' : 'AI Online') 
                  : (connectionError ? 'ChatGPT Connection Error' : 'ChatGPT Neural Network Active')
                }
              </span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 p-2 sm:p-4 space-y-3 sm:space-y-4 min-h-0">
          {/* Messages area - Mobile optimized with reduced height */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 pr-1 sm:pr-2" 
            style={{ 
              maxHeight: isMobile 
                ? 'calc(100vh - 500px)' 
                : 'calc(100vh - 300px)' 
            }}
            onScroll={handleScroll}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 ${isMobile ? 'max-w-[90%]' : 'max-w-[85%]'} ${
                  message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <Avatar className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} flex-shrink-0`}>
                    <AvatarFallback className={
                      message.sender === 'user' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                        : message.isError
                        ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                        : 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white'
                    }>
                      {message.sender === 'user' ? 
                        <User className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} /> : 
                        message.isError ?
                        <AlertCircle className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} /> :
                        <Bot className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                      }
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`rounded-2xl ${isMobile ? 'p-3' : 'p-4'} ${
                    message.sender === 'user'
                      ? 'gradient-primary text-white border-0'
                      : message.isError
                      ? 'bg-red-50 dark:bg-red-900/20 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50 text-red-900 dark:text-red-100'
                      : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-gray-100'
                  }`}>
                    <p className={`${isMobile ? 'text-sm' : 'text-sm'} whitespace-pre-line font-medium leading-relaxed`}>{message.text}</p>
                    <p className={`${isMobile ? 'text-xs' : 'text-xs'} mt-2 ${
                      message.sender === 'user' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2">
                  <Avatar className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`}>
                    <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white">
                      <Bot className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input area - Mobile optimized with fixed positioning */}
          <div className={`flex-shrink-0 space-y-2 sm:space-y-3 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-3' : 'p-4'} border border-gray-200/50 dark:border-gray-700/50`}>
            {/* Quick actions - Mobile collapsible */}
            {isMobile ? (
              <div className="space-y-2">
                <Button
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  className="glass-button text-emerald-600 hover:text-emerald-700 text-xs font-medium w-full justify-between"
                >
                  Quick Actions
                  <ChevronDown className={`h-3 w-3 transition-transform ${showQuickActions ? 'rotate-180' : ''}`} />
                </Button>
                {showQuickActions && (
                  <div className="grid grid-cols-1 gap-2">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <Button
                          key={action.text}
                          onClick={() => handleQuickAction(action.text)}
                          className="glass-button text-emerald-600 hover:text-emerald-700 text-xs font-medium justify-start py-2"
                        >
                          <Icon className="h-3 w-3 mr-2" />
                          {action.text}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 justify-center border-b border-gray-200 dark:border-gray-700 pb-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.text}
                      onClick={() => handleQuickAction(action.text)}
                      className="glass-button text-emerald-600 hover:text-emerald-700 text-sm font-medium micro-bounce px-3 py-2"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {action.text}
                    </Button>
                  );
                })}
              </div>
            )}

            {/* Input field */}
            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isMobile ? "Ask your AI coach..." : "Ask your AI coach anything..."}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className={`flex-1 glass-button border-0 rounded-2xl bg-white/50 dark:bg-gray-800/50 placeholder:text-gray-500 ${isMobile ? 'h-10 text-sm' : 'h-12'}`}
                disabled={isTyping}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className={`gradient-primary rounded-2xl ${isMobile ? 'w-10 h-10' : 'w-12 h-12'} p-0 neon-glow micro-bounce`}
              >
                <Send className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Coach;
