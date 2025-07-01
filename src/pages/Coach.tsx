
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, Sparkles, Target, TrendingUp, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { getTodaysProgress } = useNutrition();

  const progress = getTodaysProgress();

  useEffect(() => {
    const welcomeMessage: Message = {
      id: '1',
      text: `Hello ${user?.name?.split(' ')[0] || 'there'}! 🤖✨ I'm your AI nutrition coach, powered by advanced wellness algorithms. I've analyzed your profile and I'm ready to help optimize your health journey. What would you like to explore today?`,
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
      return `🔍 **AI Analysis Complete**

📊 **Today's Performance Metrics:**
• Energy Intake: ${progress.calories}/${calorieTarget} kcal (${calorieProgress.toFixed(0)}%)
• Protein Synthesis: ${progress.protein}g/${proteinTarget}g (${proteinProgress.toFixed(0)}%)
• Carbohydrate Fuel: ${progress.carbs}g
• Lipid Balance: ${progress.fat}g

🧠 **Intelligence Recommendations:**
${calorieProgress < 80 ? '⚡ Neural networks suggest adding a balanced snack to optimize energy levels' : '✅ Excellent energy management detected!'}

${proteinProgress < 80 ? '💪 Protein synthesis could be enhanced with lean sources like quinoa, legumes, or plant-based proteins' : '🎉 Superior protein optimization achieved!'}`;
    }

    if (message.includes('meal') || message.includes('eat') || message.includes('food')) {
      const suggestions = [
        "🥗 **AI Meal Optimization**: Quinoa power bowl with roasted chickpeas, avocado, and tahini - scientifically balanced for sustained energy and muscle synthesis!",
        "🍳 **Bioactive Breakfast**: Spinach and mushroom omelet with nutritional yeast - perfect amino acid profile for cellular repair!",
        "🐟 **Omega Protocol**: Wild-caught salmon with sweet potato and microgreens - optimal omega-3 fatty acids for brain and heart health!",
        "🥙 **Smart Wrap Configuration**: Hummus, grilled tempeh, and rainbow vegetables in a whole grain wrap - complete protein with fiber optimization!",
      ];
      return suggestions[Math.floor(Math.random() * suggestions.length)];
    }

    if (message.includes('lose weight') || message.includes('weight loss')) {
      return `⚖️ **Weight Optimization Protocol**

🎯 **AI-Driven Strategy:**
• Moderate caloric deficit targeting 0.5-1kg per week
• Protein prioritization for lean mass preservation
• Fiber-rich foods for satiety optimization
• Hydration and circadian rhythm alignment

📈 **Current Status Analysis:**
Your intake of ${progress.calories} calories suggests you're ${calorieProgress < 100 ? 'on track for sustainable progress' : 'slightly above optimal range'}. 

🧬 **Metabolic Enhancement Tips:**
Maintain consistent meal timing and include resistance training for optimal body composition changes.`;
    }

    const defaultResponses = [
      "🤖 **AI Processing Complete** - I'm analyzing your query through my wellness algorithms. Could you specify which aspect of your health journey you'd like to optimize?",
      "✨ **Intelligent Response Ready** - Whether it's meal planning, macro optimization, or goal achievement, my neural networks are here to assist. What's your priority today?",
      "🧠 **Health Intelligence Activated** - I'm equipped with advanced nutritional algorithms and personalized insights. How can I help elevate your wellness game?",
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 gradient-primary rounded-3xl flex items-center justify-center neon-glow float-animation">
              <Bot className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center animate-pulse">
              <Zap className="h-3 w-3 text-white" />
            </div>
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
            AI Wellness Coach
          </h1>
          <p className="text-emerald-600 dark:text-emerald-400 font-semibold">Advanced intelligence • Personalized insights</p>
        </div>
      </div>

      {/* Chat Container with fixed height to prevent overlap */}
      <Card className="glass-card border-0 rounded-3xl flex flex-col" style={{ height: 'calc(100vh - 500px)' }}>
        <CardHeader className="flex-shrink-0 pb-4">
          <CardTitle className="flex items-center justify-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">Neural Network Active</span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 p-6 space-y-4 overflow-hidden">
          {/* Messages area with proper padding to prevent overlap */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-8">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-[85%] ${
                  message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className={
                      message.sender === 'user' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                        : 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white'
                    }>
                      {message.sender === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`rounded-2xl p-4 ${
                    message.sender === 'user'
                      ? 'gradient-primary text-white neon-glow'
                      : 'glass-card text-gray-900 dark:text-gray-100'
                  }`}>
                    <p className="text-sm whitespace-pre-line font-medium">{message.text}</p>
                    <p className={`text-xs mt-2 ${
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
                <div className="flex items-start space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white">
                      <Bot className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="glass-card rounded-2xl p-4">
                    <div className="flex space-x-2">
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
        </CardContent>
      </Card>

      {/* Spacer to ensure proper separation */}
      <div className="h-8"></div>

      {/* Fixed bottom input area with solid background and better spacing */}
      <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 w-full max-w-4xl px-6 z-50">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg rounded-3xl p-6 space-y-6 border-2 border-white/40 shadow-2xl">
          {/* Quick action buttons with clear separation */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="flex flex-wrap gap-3 justify-center">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.text}
                    onClick={() => {
                      setInputValue(action.text);
                      handleSendMessage();
                    }}
                    className="glass-button text-emerald-600 hover:text-emerald-700 text-sm font-medium micro-bounce px-4 py-2"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {action.text}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Input area */}
          <div className="flex space-x-3">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask your AI coach anything..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 glass-button border-0 rounded-2xl bg-white/50 dark:bg-gray-800/50 placeholder:text-gray-500 h-12"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="gradient-primary rounded-2xl w-12 h-12 p-0 neon-glow micro-bounce"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Coach;
