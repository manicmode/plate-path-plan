
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, Sparkles, Target, TrendingUp, Zap, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'coach';
  timestamp: Date;
}

const Coach = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { getTodaysProgress } = useNutrition();
  const isMobile = useIsMobile();

  const progress = getTodaysProgress();

  useEffect(() => {
    const welcomeMessage: Message = {
      id: '1',
      text: `Hello ${user?.name?.split(' ')[0] || 'there'}! 🤖 I'm your AI nutrition coach. What would you like to explore today?`,
      sender: 'coach',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, [user?.name]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const generateCoachResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    const calorieTarget = user?.targetCalories || 2000;
    const proteinTarget = user?.targetProtein || 150;
    const calorieProgress = (progress.calories / calorieTarget) * 100;
    const proteinProgress = (progress.protein / proteinTarget) * 100;

    if (message.includes('progress') || message.includes('how am i doing')) {
      return `🔍 **Today's Analysis:**

📊 **Performance:**
• Calories: ${progress.calories}/${calorieTarget} (${calorieProgress.toFixed(0)}%)
• Protein: ${progress.protein}g/${proteinTarget}g (${proteinProgress.toFixed(0)}%)
• Carbs: ${progress.carbs}g
• Fat: ${progress.fat}g

💡 **Recommendations:**
${calorieProgress < 80 ? '⚡ Add a balanced snack to boost energy' : '✅ Great energy management!'}

${proteinProgress < 80 ? '💪 Try adding lean proteins like quinoa or legumes' : '🎉 Excellent protein intake!'}`;
    }

    if (message.includes('meal') || message.includes('eat') || message.includes('food')) {
      const suggestions = [
        "🥗 **Smart Meal**: Quinoa bowl with chickpeas, avocado, and tahini - perfect balance for sustained energy!",
        "🍳 **Power Breakfast**: Spinach omelet with nutritional yeast - great amino acid profile!",
        "🐟 **Omega Boost**: Salmon with sweet potato and greens - excellent for brain and heart health!",
        "🥙 **Energy Wrap**: Hummus, tempeh, and veggies in whole grain wrap - complete protein with fiber!",
      ];
      return suggestions[Math.floor(Math.random() * suggestions.length)];
    }

    if (message.includes('lose weight') || message.includes('weight loss')) {
      return `⚖️ **Weight Optimization:**

🎯 **Strategy:**
• Moderate caloric deficit (0.5-1kg/week)
• Prioritize protein for muscle preservation
• Focus on fiber-rich foods for satiety
• Stay hydrated and maintain consistent meal timing

📈 **Current Status:**
Your ${progress.calories} calories today ${calorieProgress < 100 ? 'looks great for progress!' : 'is slightly above target range.'}

💪 **Tip:** Include resistance training for optimal results.`;
    }

    const defaultResponses = [
      "🤖 **Ready to help!** What aspect of your health journey would you like to optimize today?",
      "✨ **AI Coach Active** - I can help with meal planning, progress tracking, or goal achievement. What's your priority?",
      "🧠 **Health Intelligence Online** - Whether it's nutrition advice or motivation, I'm here to help elevate your wellness!",
    ];

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setShowQuickActions(false);

    setTimeout(() => {
      const coachResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: generateCoachResponse(inputValue),
        sender: 'coach',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, coachResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const quickActions = [
    { text: "Analyze my progress", icon: TrendingUp },
    { text: "Optimize my next meal", icon: Target },
    { text: "Enhance performance", icon: Sparkles },
  ];

  const handleQuickAction = (actionText: string) => {
    setInputValue(actionText);
    handleSendMessage();
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Compact Header */}
      <div className="text-center space-y-2 mb-4">
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
            {isMobile ? 'AI • Personalized insights' : 'Advanced intelligence • Personalized insights'}
          </p>
        </div>
      </div>

      {/* Chat Container - Mobile optimized */}
      <Card className="glass-card border-0 rounded-3xl flex flex-col flex-1 min-h-0">
        <CardHeader className="flex-shrink-0 pb-2">
          <CardTitle className="flex items-center justify-center space-x-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-emerald-600 dark:text-emerald-400`}>
                {isMobile ? 'Online' : 'Neural Network Active'}
              </span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 p-4 space-y-4 min-h-0">
          {/* Messages area - Mobile optimized */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
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
                        : 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white'
                    }>
                      {message.sender === 'user' ? 
                        <User className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} /> : 
                        <Bot className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                      }
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`rounded-2xl ${isMobile ? 'p-3' : 'p-4'} ${
                    message.sender === 'user'
                      ? 'gradient-primary text-white neon-glow'
                      : 'glass-card text-gray-900 dark:text-gray-100'
                  }`}>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} whitespace-pre-line font-medium`}>{message.text}</p>
                    <p className={`${isMobile ? 'text-xs' : 'text-xs'} mt-1 ${
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
                  <div className="glass-card rounded-2xl p-3">
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

          {/* Input area - Mobile optimized */}
          <div className="flex-shrink-0 space-y-3">
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
                          className="glass-button text-emerald-600 hover:text-emerald-700 text-xs font-medium justify-start"
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
                placeholder={isMobile ? "Ask your coach..." : "Ask your AI coach anything..."}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className={`flex-1 glass-button border-0 rounded-2xl bg-white/50 dark:bg-gray-800/50 placeholder:text-gray-500 ${isMobile ? 'h-10 text-sm' : 'h-12'}`}
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
