import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNotification } from '@/contexts/NotificationContext';
import { supabase } from '@/integrations/supabase/client';
import { Send, Bot, User, Loader2, Brain, Save, Copy, Trash2, Heart, ChefHat, Zap, AlertCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { toast } from 'sonner';
import { RecipeStorage, type SavedRecipe } from '@/lib/recipeStorage';
import { CoachErrorRecovery } from '@/components/CoachErrorRecovery';
import { AINudgeChatEntries } from '@/components/meditation/AINudgeChatEntries';
import { BreathingNudgeBanner } from '@/components/breathing/BreathingNudgeBanner';
import { AIRecoveryChallengeChatEntries } from '@/components/recovery/AIRecoveryChallengeChatEntries';
import { MoodCheckinBanner } from '@/components/mood/MoodCheckinBanner';
import { DailyCheckinButton } from '@/components/mood/DailyCheckinButton';
import { useNudgeContentChecker } from '@/hooks/useNudgeContentChecker';
import { EmptyNudgeState } from '@/components/common/EmptyNudgeState';
import { LoadingNudgeState } from '@/components/common/LoadingNudgeState';
import { LevelProgressBar } from '@/components/level/LevelProgressBar';
import { SkillPanel } from '@/components/coach/SkillPanel';
import { Target, TrendingUp, ShoppingCart, AlertTriangle, BarChart3 } from 'lucide-react';
import { useCoachInteractions } from '@/hooks/useCoachInteractions';
import { CoachPraiseMessage } from '@/components/coach/CoachPraiseMessage';
import { MyPraiseModal } from '@/components/coach/MyPraiseModal';
import { AnimatePresence } from 'framer-motion';
import { scrollToAlignTop } from '@/utils/scroll';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isRecipe?: boolean;
}

const Coach = () => {
  const { user } = useAuth();
  const { getTodaysProgress, currentDay } = useNutrition();
  const { recordCoachInteraction } = useNotification();
  const isMobile = useIsMobile();
  const { isLowMemory, storageAvailable, optimizeForMobile, shouldLazyLoad } = useMobileOptimization({
    enableLazyLoading: true,
    memoryThreshold: 0.7,
    storageQuotaCheck: true
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hello ${user?.name || 'there'} ✨ I'm your mindful nutrition guide. With gentle wisdom and scientific precision, I'm here to nurture your relationship with food and help you discover the path to optimal nourishment 🥦 

Take a breath... let's explore your nutrition journey together with care and intention. What aspect of your wellness would you like to focus on today?`,
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  // 🎮 Coach Gamification System
  const [showPraiseMessage, setShowPraiseMessage] = useState<string | null>(null);
  const { trackInteraction } = useCoachInteractions();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const chatCardRef = useRef<HTMLDivElement>(null);
  const [useMyData, setUseMyData] = useState(true);

  const progress = getTodaysProgress();

  // Check nudge content availability
  const nudgeContent = useNudgeContentChecker({ maxEntries: 3, showOnlyRecent: true });

  // Enhanced error handling for mobile
  const handleError = (error: Error, context: string) => {
    console.error(`Error in ${context}:`, error);
    setLoadingError(`${context}: ${error.message}`);
    
    if (isMobile && error.message.includes('storage')) {
      toast.error('Storage issue detected. Some features may be limited.');
    }
  };

  // Load saved recipes with error handling
  useEffect(() => {
    if (user && storageAvailable) {
      try {
        const recipes = RecipeStorage.loadRecipes(user.id);
        const optimizedRecipes = RecipeStorage.optimizeForMobile(recipes);
        setSavedRecipes(optimizedRecipes);
        
        if (recipes.length > optimizedRecipes.length) {
          console.log(`Optimized recipes for mobile: ${recipes.length} -> ${optimizedRecipes.length}`);
        }
      } catch (error) {
        handleError(error as Error, 'Loading saved recipes');
        setSavedRecipes([]);
      }
    }
  }, [user, storageAvailable]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Align chat to top on chip taps or programmatic requests
  useEffect(() => {
    const cb = () => scrollToAlignTop(chatCardRef.current, { reassertDelayMs: 140 });
    window.addEventListener('coach:scrollToChat', cb as any);
    return () => window.removeEventListener('coach:scrollToChat', cb as any);
  }, []);
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Scroll to chat window function for commands with improved alignment
  const scrollToTop = () => {
    if (chatCardRef.current) {
      scrollToAlignTop(chatCardRef.current, { reassertDelayMs: 140 });
    }
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  };

  // Topic filter function
  const isWellnessRelated = (message: string) => {
    const lowerMessage = message.toLowerCase();
    
    // Wellness, nutrition, and fitness keywords
    const wellnessKeywords = [
      // Nutrition
      'nutrition', 'calories', 'protein', 'carbs', 'carbohydrates', 'fat', 'macro', 'micro', 'vitamin', 'mineral',
      'diet', 'food', 'eat', 'eating', 'meal', 'recipe', 'cook', 'ingredient', 'supplement', 'fiber',
      'sugar', 'sodium', 'healthy', 'weight', 'lose', 'gain', 'portion', 'serving', 'snack',
      
      // Fitness
      'exercise', 'workout', 'fitness', 'training', 'muscle', 'strength', 'cardio', 'run', 'walk',
      'gym', 'sport', 'activity', 'movement', 'burn', 'calories', 'rep', 'set', 'squat', 'push',
      
      // Wellness
      'wellness', 'health', 'energy', 'tired', 'sleep', 'rest', 'hydration', 'water', 'stress',
      'inflammation', 'recovery', 'fatigue', 'mood', 'feel', 'body', 'digestion', 'immune',
      'balance', 'lifestyle', 'habit'
    ];

    // Common question patterns
    const questionPatterns = [
      'what should i eat', 'how much', 'why am i', 'how can i', 'help me',
      'i want to', 'i need to', 'should i', 'can you help', 'advice'
    ];

    // Check for wellness keywords
    const hasWellnessKeywords = wellnessKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );

    // Check for question patterns combined with context
    const hasRelevantQuestions = questionPatterns.some(pattern => 
      lowerMessage.includes(pattern)
    ) && (
      lowerMessage.includes('eat') || lowerMessage.includes('food') || 
      lowerMessage.includes('weight') || lowerMessage.includes('energy') ||
      lowerMessage.includes('exercise') || lowerMessage.includes('health')
    );

    return hasWellnessKeywords || hasRelevantQuestions;
  };

  const sendMessage = async (messageText?: string, isRecipeRequest = false) => {
    const messageToSend = messageText || input.trim();
    if (!messageToSend || isLoading) return;

    // Clear any previous errors
    setLoadingError(null);

    // Check if message is wellness-related (skip check for recipe requests)
    if (!isRecipeRequest && !isWellnessRelated(messageToSend)) {
      const offTopicMessage: Message = {
        id: Date.now().toString(),
        content: "🧘‍♂️ I'm your personal wellness coach, so I can only help with topics related to nutrition, fitness, and wellness. Try asking me something like how to eat better, stay fit, or feel more energized!",
        isUser: false,
        timestamp: new Date(),
      };
      
      const userMessage: Message = {
        id: (Date.now() - 1).toString(),
        content: messageToSend,
        isUser: true,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage, offTopicMessage]);
      setInput('');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageToSend,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // 🎮 Coach Gamification System - Track message interaction
    const trackResult = await trackInteraction('nutrition', 'message');
    if (trackResult?.should_praise && trackResult.praise_message) {
      setShowPraiseMessage(trackResult.praise_message);
      setTimeout(() => setShowPraiseMessage(null), 8000); // Auto-dismiss after 8 seconds
    }

    // Record coach interaction for notifications
    recordCoachInteraction();

try {
// Optionally fetch server-built context (best data snapshot)
let serverContext: any = null;
if (useMyData) {
  try {
    const ctxResp = await supabase.functions.invoke('coach-context', {} as any);
    if (!ctxResp.error) serverContext = ctxResp.data;
  } catch (_) {}
}

const contextData = {
  voiceProfile: "confident_gentle", // 🎙️ Voice metadata for Nutrition Coach
  coachType: 'nutrition',
  context: serverContext,
};

  const { data, error } = await supabase.functions.invoke('ai-coach-chat', {
    body: {
      coachType: 'nutrition',
      message: messageToSend,
      useContext: useMyData,
      userContext: contextData,
    },
  });

      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        isUser: false,
        timestamp: new Date(),
        isRecipe: isRecipeRequest,
      };

setMessages(prev => {
  const arr = [...prev];
  if (useMyData && !contextData.context) {
    arr.push({ id: (Date.now() + 0.5).toString(), content: 'Using general guidance; log more workouts/meals/recovery to personalize.', isUser: false, timestamp: new Date() } as any);
  }
  arr.push(aiMessage as any);
  return arr;
});
} catch (error: any) {
  handleError(error as Error, 'Sending message');
  const friendly = (error && typeof error.message === 'string') ? error.message : 'Using a generic answer; I’ll personalize once your data loads.';
  toast.error('Using a generic answer; I’ll personalize once your data loads.');
  const errorMessage: Message = {
    id: (Date.now() + 1).toString(),
    content: friendly,
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

  const handleQuickQuestion = async (question: string) => {
    // 🎮 Coach Gamification System - Track skill panel interaction
    const trackResult = await trackInteraction('nutrition', 'skill_panel');
    if (trackResult?.should_praise && trackResult.praise_message) {
      setShowPraiseMessage(trackResult.praise_message);
      setTimeout(() => setShowPraiseMessage(null), 8000);
    }
    
    scrollToTop();
    sendMessage(question);
  };

  const handleRecipeRequest = (prompt: string) => {
    scrollToTop();
    sendMessage(prompt, true);
  };

  const saveRecipe = (message: Message) => {
    if (!user || !storageAvailable) {
      toast.error('Cannot save recipe: Storage not available');
      return;
    }
    
    try {
      const lines = message.content.split('\n');
      let title = lines.find(line => line.includes('Recipe') || line.includes('Meal') || line.includes('Dish'));
      if (!title) {
        title = lines[0]?.substring(0, 50) + '...';
      }
      title = title.replace(/[#*]/g, '').trim();

      const savedRecipe = RecipeStorage.addRecipe(user.id, {
        title,
        content: message.content,
        timestamp: new Date(),
      });

      if (savedRecipe) {
        const updatedRecipes = RecipeStorage.loadRecipes(user.id);
        const optimizedRecipes = RecipeStorage.optimizeForMobile(updatedRecipes);
        setSavedRecipes(optimizedRecipes);
        toast.success('Recipe saved!');
      } else {
        throw new Error('Failed to save recipe');
      }
    } catch (error) {
      handleError(error as Error, 'Saving recipe');
      toast.error('Failed to save recipe');
    }
  };

  const deleteRecipe = (recipeId: string) => {
    if (!user) return;
    
    if (RecipeStorage.deleteRecipe(user.id, recipeId)) {
      const updatedRecipes = RecipeStorage.loadRecipes(user.id);
      setSavedRecipes(updatedRecipes);
      toast.success('Recipe deleted');
    } else {
      toast.error('Failed to delete recipe');
    }
  };

  const copyRecipe = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Recipe copied to clipboard!');
  };

  const toggleFavorite = (recipeId: string) => {
    if (!user) return;
    
    if (RecipeStorage.toggleFavorite(user.id, recipeId)) {
      const updatedRecipes = RecipeStorage.loadRecipes(user.id);
      setSavedRecipes(updatedRecipes);
    } else {
      toast.error('Failed to update favorite');
    }
  };

  const nutritionChips = [
    { id: 'nutr_week', label: "How’s my week?", message: "Am I on track for {{goal_primary}}? Analyze my last 7 days." },
    { id: 'nutr_protein_3d', label: "Protein plan (3 days)", message: "Give me a 3-day plan to hit {{protein_target_g}}g protein/day." },
    { id: 'nutr_snacking', label: "Fix my late-night snacking", message: "I snack at night; adjust calories & snack ideas for me." },
    { id: 'nutr_grocery', label: "Grocery list for my goals", message: "Build a 10-item grocery list for {{goal_primary}} this week." },
    { id: 'nutr_hydration_fiber', label: "Hydration + fiber tune-up", message: "Optimize water and fiber based on {{water_ml_7d}}ml & {{fiber_g_7d}}g averages." },
    { id: 'nutr_calorie_check', label: "Calorie target sanity check", message: "Given {{avg_cals_7d}} kcal avg, should I raise/lower my daily target?" },
  ];

  const recipePrompts = [
    { label: "🥗 Low Carb Recipe", prompt: "Give me a delicious low-carb recipe that's easy to make" },
    { label: "🥑 Keto Meal Plan", prompt: "Create a keto-friendly meal plan for today" },
    { label: "🌱 Vegan Recipe", prompt: "Share a nutritious vegan recipe with high protein" },
    { label: "🍗 High Protein Dish", prompt: "I need a high-protein recipe to hit my daily goals" },
    { label: "🧁 Healthy Dessert", prompt: "Give me a healthy dessert recipe that satisfies cravings" },
    { label: "🌾 Gluten-Free Snack", prompt: "Create a gluten-free snack recipe for between meals" },
    { label: "🐟 Pescatarian Dinner", prompt: "I want a pescatarian dinner recipe with fish" },
    { label: "🔥 Fat-Burning Meal", prompt: "Share a fat-burning meal recipe that boosts metabolism" },
    { label: "⏱️ 10-Minute Meals", prompt: "Give me a quick 10-minute meal recipe for busy days" },
    { label: "🌈 Anti-Inflammatory Dish", prompt: "Create an anti-inflammatory recipe with superfoods" },
  ];

  // Nutrition Skill Panel Categories
  const nutritionSkillCategories = [
    {
      title: "Smart Tracking Insights",
      icon: <Target className="h-4 w-4 text-blue-600" />,
      commands: [
        { label: "What nutrients am I consistently missing this week?", prompt: "What nutrients am I consistently missing this week? Analyze my food logs." },
        { label: "Show me my macro trends over the past month", prompt: "Show me my macro trends over the past month and what patterns you notice." },
        { label: "Which meals give me the best energy levels?", prompt: "Which meals give me the best energy levels based on my tracking?" },
        { label: "How accurate is my calorie tracking?", prompt: "How accurate is my calorie tracking? Any suggestions for improvement?" },
        { label: "What time of day do I eat the most calories?", prompt: "What time of day do I eat the most calories and is this optimal?" },
      ]
    },
    {
      title: "Optimize My Diet",
      icon: <TrendingUp className="h-4 w-4 text-green-600" />,
      commands: [
        { label: "Food swaps to reduce inflammation", prompt: "Which food swaps would reduce inflammation based on my logs?" },
        { label: "Boost my metabolism naturally", prompt: "How can I boost my metabolism naturally with better food choices?" },
        { label: "Improve my micronutrient profile", prompt: "How can I improve my micronutrient profile with strategic food choices?" },
        { label: "Balance my blood sugar better", prompt: "What changes can I make to balance my blood sugar better throughout the day?" },
        { label: "Increase protein absorption", prompt: "How can I increase protein absorption and utilization?" },
      ]
    },
    {
      title: "Meal Planning & Grocery Help",
      icon: <ShoppingCart className="h-4 w-4 text-orange-600" />,
      commands: [
        { label: "Shopping list for high-protein, low-carb meals", prompt: "Generate a shopping list for high-protein, low-carb meals this week" },
        { label: "Budget-friendly meal prep ideas", prompt: "Give me budget-friendly meal prep ideas for this week" },
        { label: "Quick breakfast options for busy mornings", prompt: "What are some quick breakfast options for busy mornings that hit my macros?" },
        { label: "Plan meals around my workout schedule", prompt: "Plan meals around my workout schedule for optimal performance and recovery" },
        { label: "Healthy snacks for between meals", prompt: "Suggest healthy snacks for between meals that support my goals" },
      ]
    },
    {
      title: "Health Risk Warnings",
      icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
      commands: [
        { label: "Have I eaten too many processed foods lately?", prompt: "Have I eaten too many processed foods lately? What's the impact?" },
        { label: "Am I getting enough fiber?", prompt: "Am I getting enough fiber in my diet? Show me the numbers." },
        { label: "Check my sodium intake", prompt: "Check my sodium intake - am I exceeding healthy limits?" },
        { label: "Are there any nutrient deficiencies?", prompt: "Are there any nutrient deficiencies I should be concerned about?" },
        { label: "Is my sugar intake too high?", prompt: "Is my sugar intake too high? Include hidden sugars in analysis." },
      ]
    },
    {
      title: "Goal Progress Questions",
      icon: <BarChart3 className="h-4 w-4 text-purple-600" />,
      commands: [
        { label: "How close am I to my monthly nutrition goals?", prompt: "How close am I to hitting my monthly nutrition goals?" },
        { label: "What's working best in my current plan?", prompt: "What's working best in my current nutrition plan?" },
        { label: "Where am I struggling the most?", prompt: "Where am I struggling the most with my nutrition goals?" },
        { label: "Adjust my targets based on progress", prompt: "Should I adjust my nutrition targets based on my progress?" },
        { label: "Celebrate my nutrition wins", prompt: "What nutrition wins should I celebrate this week?" },
      ]
    }
  ];

  return (
    <div className="max-w-md mx-auto w-full px-4">
      <div className={`space-y-6 animate-fade-in ${isMobile ? 'pb-24' : 'pb-32'}`}>
      {/* Error Recovery Component */}
      {loadingError && (
        <CoachErrorRecovery 
          userId={user?.id}
          error={new Error(loadingError)}
          onRecoveryComplete={() => {
            setLoadingError(null);
            window.location.reload();
          }}
        />
      )}

      {/* Mobile Performance Warning */}
      {isMobile && isLowMemory && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Low memory detected. Some features may be limited for better performance.
            </p>
          </div>
        </div>
      )}

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

      {/* Level & XP Progress Bar */}
      <div className="mb-6">
        <LevelProgressBar theme="nutrition" />
      </div>

{/* Chat Interface with enhanced mobile optimization */}
<Card ref={chatCardRef} className="glass-card border-0 rounded-3xl">
  <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
    <div className="flex items-center justify-between">
      <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
        <Brain className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600`} />
        <span>Chat with Your Coach</span>
      </CardTitle>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-xs">Use my data</span>
        <input type="checkbox" aria-label="Use my data" className="accent-current" checked={useMyData} onChange={(e)=>setUseMyData(e.target.checked)} />
      </div>
    </div>
          </CardHeader>
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
            {/* Messages Container with optimized height for mobile */}
          <div className={`${isMobile ? (isLowMemory ? 'h-[400px]' : 'h-[500px]') : 'h-[600px]'} flex flex-col`}>
            <ScrollArea className="flex-1 px-3 w-full" ref={scrollAreaRef}>
              <div className="space-y-4 py-2">
                {messages.map((message) => (
                  <div key={message.id}>
                    <div
                      className={`flex items-start space-x-3 w-full ${
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
                        className={`flex-1 p-3 rounded-2xl break-words ${
                          message.isUser
                            ? 'bg-emerald-600 text-white max-w-[80%] ml-auto'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white max-w-[85%]'
                        }`}
                        style={{ 
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word',
                          wordBreak: 'break-word'
                        }}
                      >
                        <p className={`${isMobile ? 'text-sm' : 'text-base'} leading-relaxed whitespace-pre-wrap`}>
                          {message.content}
                        </p>
                      </div>
                    </div>
                    
                    {/* Save Recipe Button for AI recipe responses */}
                    {message.isRecipe && !message.isUser && (
                      <div className="flex justify-end mt-2 mr-11">
                        <Button
                          onClick={() => saveRecipe(message)}
                          size="sm"
                          variant="outline"
                          className="text-xs"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save Recipe
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start space-x-3 w-full">
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
          </div>

          {/* Input Area */}
          <div className={`flex space-x-2 mt-4`}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1 rounded-2xl"
            />
            <Button
              onClick={() => sendMessage()}
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
          {!useMyData && (
            <div className="text-xs text-muted-foreground pl-1">Personalization off — generic guidance only.</div>
          )}
        </CardContent>
        </Card>

        {/* My Praise Button */}
        <div className="flex justify-center">
          <MyPraiseModal coachType="nutrition" />
        </div>

      {/* 🎮 Coach Gamification System - Praise Messages */}
      <AnimatePresence>
        {showPraiseMessage && (
          <CoachPraiseMessage 
            message={showPraiseMessage}
            coachType="nutrition"
            onDismiss={() => setShowPraiseMessage(null)}
          />
        )}
      </AnimatePresence>

      {/* Nutrition Skill Panel */}
      <SkillPanel
        title="🧠 Nutrition Expert Skills"
        icon={<Brain className="h-4 w-4 text-purple-600" />}
        categories={nutritionSkillCategories}
        onCommandClick={handleQuickQuestion}
        isLoading={isLoading}
        gradientColors="from-purple-50 to-emerald-50 dark:from-purple-900/20 dark:to-emerald-900/20"
      />

      {/* Quick Questions - Separate Card */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
          <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <Zap className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600`} />
            <span>⚡ Quick Start Questions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
          <div className="grid grid-cols-2 gap-3">
            {nutritionChips.map((chip) => (
              <Button
                key={chip.id}
                variant="outline"
                size="sm"
                onClick={() => { 
                  window.dispatchEvent(new Event('coach:scrollToChat'));
                  if (chatCardRef.current) scrollToAlignTop(chatCardRef.current);
                  console.log(JSON.stringify({ event: 'coach_chip_clicked', coachType: 'nutrition', chipId: chip.id, usingContext: useMyData }));
                  handleQuickQuestion(chip.message);
                }}
                className={`${isMobile ? 'text-xs px-3 py-3 h-auto' : 'text-sm px-4 py-4 h-auto'} text-center justify-center font-semibold bg-gradient-to-r from-purple-50 to-emerald-50 dark:from-purple-900/20 dark:to-emerald-900/20 border-purple-200 dark:border-purple-700 hover:from-purple-100 hover:to-emerald-100 dark:hover:from-purple-800/30 dark:hover:to-emerald-800/30 transition-all duration-200 hover:scale-105 whitespace-normal leading-tight`}
                disabled={isLoading}
              >
                {chip.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Personalized Recipes Section */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
          <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <ChefHat className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-emerald-600`} />
            <span>🍽️ Personalized Recipes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {recipePrompts.map((recipe, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleRecipeRequest(recipe.prompt)}
                className={`${isMobile ? 'text-xs px-3 py-3 h-auto' : 'text-sm px-4 py-4 h-auto'} text-center justify-center font-semibold bg-gradient-to-r from-emerald-50 to-orange-50 dark:from-emerald-900/20 dark:to-orange-900/20 border-emerald-200 dark:border-emerald-700 hover:from-emerald-100 hover:to-orange-100 dark:hover:from-emerald-800/30 dark:hover:to-orange-800/30 transition-all duration-200 hover:scale-105 whitespace-normal leading-tight`}
                disabled={isLoading}
              >
                {recipe.label}
              </Button>
            ))}
          </div>

          {/* Saved Recipes Section */}
          {savedRecipes.length > 0 && (
            <div>
              <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center`}>
                🗂️ Saved Recipes ({savedRecipes.length})
              </h3>
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {savedRecipes
                    .sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))
                    .map((recipe) => (
                    <div
                      key={recipe.id}
                      className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-900 dark:text-white mb-1 flex items-center`}>
                            {recipe.isFavorite && <Heart className="h-4 w-4 text-red-500 mr-1 fill-current" />}
                            {recipe.title}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {recipe.timestamp.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <Button
                            onClick={() => toggleFavorite(recipe.id)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <Heart className={`h-3 w-3 ${recipe.isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
                          </Button>
                          <Button
                            onClick={() => copyRecipe(recipe.content)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                          </Button>
                          <Button
                            onClick={() => deleteRecipe(recipe.id)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🧠 Coach Nudge Zone (Moved to Bottom) */}
      {nudgeContent.isLoading ? (
        <Card className="glass-card border-0 rounded-3xl">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <LoadingNudgeState />
          </CardContent>
        </Card>
      ) : nudgeContent.hasAnyContent ? (
        <>
          {/* Meditation Nudges Section - Mindful Nutrition Voice */}
          {nudgeContent.hasMeditationContent && (
            <Card className="glass-card border-0 rounded-3xl bg-gradient-to-r from-purple-50/50 to-emerald-50/50 dark:from-purple-900/10 dark:to-emerald-900/10">
              <CardHeader className={`${isMobile ? 'pb-2' : 'pb-3'}`}>
                <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-sm' : 'text-base'} text-purple-700 dark:text-purple-400`}>
                  <span>✨ Gentle Nutrition Wisdom</span>
                </CardTitle>
              </CardHeader>
              <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
                <AINudgeChatEntries maxEntries={3} showOnlyRecent={true} />
              </CardContent>
            </Card>
          )}

          {/* Recovery Challenge Coach Section - Mindful Recovery */}
          {nudgeContent.hasRecoveryContent && (
            <Card className="glass-card border-0 rounded-3xl bg-gradient-to-r from-purple-50/50 to-emerald-50/50 dark:from-purple-900/10 dark:to-emerald-900/10">
              <CardHeader className={`${isMobile ? 'pb-2' : 'pb-3'}`}>
                <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-sm' : 'text-base'} text-emerald-700 dark:text-emerald-400`}>
                  <span>🌱 Nourishing Recovery Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
                <div className="space-y-4">
                  {/* Daily Check-In Quick Action */}
                  <div className="flex justify-center">
                    <DailyCheckinButton size="sm" />
                  </div>
                  <AIRecoveryChallengeChatEntries maxEntries={3} showOnlyRecent={true} />
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Recovery Mood Banner */}
          <MoodCheckinBanner />
        </>
      ) : (
        <Card className="glass-card border-0 rounded-3xl">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className="text-center py-8">
              <ChefHat className="h-12 w-12 text-purple-400 mx-auto mb-3" />
              <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">
                Take a mindful moment... your personalized nutrition insights will appear here when ready ✨
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
};

export default Coach;
