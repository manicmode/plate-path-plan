
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, Sparkles, Target, TrendingUp } from 'lucide-react';
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
    // Initial greeting
    const welcomeMessage: Message = {
      id: '1',
      text: `Hi ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm your personal nutrition coach. I'm here to help you achieve your health goals. How can I assist you today?`,
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
    
    // Analyze user's current progress
    const calorieTarget = user?.targetCalories || 2000;
    const proteinTarget = user?.targetProtein || 150;
    const calorieProgress = (progress.calories / calorieTarget) * 100;
    const proteinProgress = (progress.protein / proteinTarget) * 100;

    if (message.includes('progress') || message.includes('how am i doing')) {
      return `Great question! Let me analyze your today's progress:

📊 **Today's Status:**
• Calories: ${progress.calories}/${calorieTarget} (${calorieProgress.toFixed(0)}%)
• Protein: ${progress.protein}g/${proteinTarget}g (${proteinProgress.toFixed(0)}%)
• Carbs: ${progress.carbs}g
• Fat: ${progress.fat}g

${calorieProgress < 80 ? '🔥 You might want to add a healthy snack to reach your calorie goal!' : '✅ Great job hitting your calorie target!'}

${proteinProgress < 80 ? '💪 Consider adding some protein-rich foods like Greek yogurt, chicken, or beans.' : '🎉 Excellent protein intake today!'}`;
    }

    if (message.includes('meal') || message.includes('eat') || message.includes('food')) {
      const suggestions = [
        "🥗 How about a colorful salad with grilled chicken, quinoa, and avocado? It's packed with nutrients and will help you hit your protein goals!",
        "🍳 A veggie omelet with spinach, tomatoes, and cheese would be perfect - high in protein and vitamins!",
        "🐟 Grilled salmon with sweet potato and steamed broccoli is an excellent choice for balanced macros!",
        "🥙 A wrap with hummus, grilled chicken, and lots of fresh vegetables would be both satisfying and nutritious!",
      ];
      return suggestions[Math.floor(Math.random() * suggestions.length)];
    }

    if (message.includes('lose weight') || message.includes('weight loss')) {
      return `🎯 For healthy weight loss, focus on:

• Creating a moderate calorie deficit (aim for 1-2 lbs per week)
• Prioritizing protein to maintain muscle mass
• Including plenty of vegetables and fiber
• Staying hydrated and getting adequate sleep

Based on your current intake of ${progress.calories} calories, you're ${calorieProgress < 100 ? 'on track' : 'slightly over your target'}. Keep logging your meals consistently!`;
    }

    if (message.includes('muscle') || message.includes('gain') || message.includes('protein')) {
      return `💪 For muscle building, focus on:

• Getting enough protein: aim for ${user?.targetProtein || 150}g per day
• Include protein with every meal
• Great sources: chicken, fish, eggs, Greek yogurt, beans, quinoa
• Don't forget about post-workout nutrition!

Currently, you've had ${progress.protein}g of protein today. ${proteinProgress >= 80 ? 'Great job!' : 'Try to add more protein-rich foods to your remaining meals.'}`;
    }

    if (message.includes('water') || message.includes('hydration')) {
      return `💧 Hydration is crucial for your health! Aim for:

• At least 8 glasses (64oz) of water daily
• More if you're active or in hot weather
• Signs of good hydration: pale yellow urine, rarely feeling thirsty
• Try adding lemon, cucumber, or mint for flavor!

Pro tip: Start your day with a glass of water and keep a water bottle nearby!`;
    }

    // Default responses
    const defaultResponses = [
      "That's a great question! I'm here to help you with your nutrition journey. Could you tell me more about what specific area you'd like guidance on?",
      "I'd love to help! Whether it's meal planning, understanding your macros, or reaching your goals, I'm here for you. What's on your mind?",
      "Every question is a step toward better health! Feel free to ask me about nutrition, meal ideas, or how to interpret your progress data.",
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

    // Simulate typing delay
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
    { text: "How's my progress today?", icon: TrendingUp },
    { text: "What should I eat next?", icon: Target },
    { text: "Tips for muscle building", icon: Sparkles },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Nutrition Coach</h1>
        <p className="text-gray-600">Get personalized advice and support</p>
      </div>

      <Card className="h-[500px] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span>NutriCoach AI</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 p-4 space-y-4">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-[80%] ${
                  message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className={
                      message.sender === 'user' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-green-100 text-green-600'
                    }>
                      {message.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`rounded-lg p-3 ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm whitespace-pre-line">{message.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-green-100 text-green-600">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="flex-shrink-0 space-y-2">
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.text}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInputValue(action.text);
                      handleSendMessage();
                    }}
                    className="text-xs"
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {action.text}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Input */}
          <div className="flex-shrink-0 flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me anything about nutrition..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="gradient-primary"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Coach;
