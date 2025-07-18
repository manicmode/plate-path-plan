
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNotification } from '@/contexts/NotificationContext';
import { supabase } from '@/integrations/supabase/client';
import { Send, Bot, User, Loader2, Brain, Save, Copy, Trash2, Heart, ChefHat, Zap, AlertCircle, HardDriveIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { toast } from 'sonner';
import { RecipeStorageManager, SavedRecipe } from '@/lib/recipeStorage';
import { CoachErrorRecovery } from '@/components/CoachErrorRecovery';
import { trackPageVisit } from '@/utils/pageTracking';

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
      content: `Hi ${user?.name || 'there'}! 👋 I'm your AI nutrition coach. I'm here to help you reach your health goals, answer questions about nutrition, and provide personalized guidance based on your progress. What would you like to talk about today?`,
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [storageManager, setStorageManager] = useState<RecipeStorageManager | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ count: 0, maxCount: 0, isNearLimit: false });
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const progress = getTodaysProgress();

  // Track page visit for ticker triggers
  useEffect(() => {
    trackPageVisit('Coach');
  }, []);

  // Initialize storage manager and perform health checks
  useEffect(() => {
    if (user && storageAvailable) {
      try {
        const manager = new RecipeStorageManager(user.id, isMobile);
        
        // Perform storage health check
        const isHealthy = manager.checkStorageHealth();
        
        if (!isHealthy) {
          console.warn('Storage health check failed, showing recovery');
          setShowRecovery(true);
          return;
        }
        
        setStorageManager(manager);
        
        // Load recipes safely
        const recipes = manager.getAllRecipes();
        setSavedRecipes(recipes);
        
        // Update storage info
        const info = manager.getStorageInfo();
        setStorageInfo(info);
        
        // Warn if near storage limit
        if (info.isNearLimit) {
          toast.warning(`Storage nearly full (${info.count}/${info.maxCount} recipes). Consider removing old recipes.`);
        }
        
      } catch (error) {
        console.error('Error initializing Coach:', error);
        handleError(error as Error, 'Initializing Coach');
        setShowRecovery(true);
      }
    }
  }, [user, storageAvailable, isMobile]);

  // Enhanced error handling for mobile
  const handleError = (error: Error, context: string) => {
    console.error(`Error in ${context}:`, error);
    setLoadingError(`${context}: ${error.message}`);
    
    if (isMobile && (error.message.includes('storage') || error.message.includes('quota'))) {
      toast.error('Storage issue detected. Some features may be limited.');
    }
  };

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Show recovery screen if needed
  if (showRecovery) {
    return (
      <CoachErrorRecovery 
        onRecoveryComplete={() => {
          setShowRecovery(false);
          window.location.reload(); // Refresh to reinitialize everything
        }}
      />
    );
  }

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
          message: messageToSend,
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

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      handleError(error as Error, 'Sending message');
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

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleRecipeRequest = (prompt: string) => {
    sendMessage(prompt, true);
  };

  const saveRecipe = (message: Message) => {
    if (!storageManager) {
      toast.error('Cannot save recipe: Storage not available');
      return;
    }
    
    try {
      // Check storage limits before saving
      const info = storageManager.getStorageInfo();
      if (info.count >= info.maxCount) {
        toast.error(`Cannot save recipe: Storage limit reached (${info.maxCount} recipes max)`);
        return;
      }
      
      const lines = message.content.split('\n');
      let title = lines.find(line => line.includes('Recipe') || line.includes('Meal') || line.includes('Dish'));
      if (!title) {
        title = lines[0]?.substring(0, 50) + '...';
      }
      title = title.replace(/[#*]/g, '').trim();

      const newRecipe: SavedRecipe = {
        id: Date.now().toString(),
        title,
        content: message.content,
        timestamp: new Date(),
      };

      const success = storageManager.addRecipe(newRecipe);
      
      if (success) {
        // Update local state
        const updatedRecipes = storageManager.getAllRecipes();
        setSavedRecipes(updatedRecipes);
        
        // Update storage info
        const updatedInfo = storageManager.getStorageInfo();
        setStorageInfo(updatedInfo);
        
        toast.success('Recipe saved!');
        
        // Warn if approaching limit
        if (updatedInfo.isNearLimit) {
          toast.warning(`Storage nearly full (${updatedInfo.count}/${updatedInfo.maxCount} recipes)`);
        }
      } else {
        toast.error('Failed to save recipe: Storage issue');
      }
    } catch (error) {
      handleError(error as Error, 'Saving recipe');
      toast.error('Failed to save recipe');
    }
  };

  const deleteRecipe = (recipeId: string) => {
    if (!storageManager) return;
    
    try {
      const success = storageManager.deleteRecipe(recipeId);
      if (success) {
        const updatedRecipes = storageManager.getAllRecipes();
        setSavedRecipes(updatedRecipes);
        
        const updatedInfo = storageManager.getStorageInfo();
        setStorageInfo(updatedInfo);
        
        toast.success('Recipe deleted');
      } else {
        toast.error('Failed to delete recipe');
      }
    } catch (error) {
      handleError(error as Error, 'Deleting recipe');
      toast.error('Failed to delete recipe');
    }
  };

  const copyRecipe = (content: string) => {
    try {
      navigator.clipboard.writeText(content);
      toast.success('Recipe copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy recipe:', error);
      toast.error('Failed to copy recipe');
    }
  };

  const toggleFavorite = (recipeId: string) => {
    if (!storageManager) return;
    
    try {
      const recipe = savedRecipes.find(r => r.id === recipeId);
      if (recipe) {
        const success = storageManager.updateRecipe(recipeId, { 
          isFavorite: !recipe.isFavorite 
        });
        
        if (success) {
          const updatedRecipes = storageManager.getAllRecipes();
          setSavedRecipes(updatedRecipes);
        }
      }
    } catch (error) {
      handleError(error as Error, 'Toggling favorite');
      toast.error('Failed to update recipe');
    }
  };

  const clearAllRecipes = () => {
    if (!storageManager) return;
    
    try {
      storageManager.clearAllRecipes();
      setSavedRecipes([]);
      setStorageInfo({ count: 0, maxCount: storageInfo.maxCount, isNearLimit: false });
      toast.success('All recipes cleared');
    } catch (error) {
      handleError(error as Error, 'Clearing recipes');
      toast.error('Failed to clear recipes');
    }
  };

  const quickQuestions = [
    "Analyze my progress",
    "Weekly focus tips",
    "Build daily routine",
    "Personalized advice",
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

  return (
    <div className={`space-y-6 animate-fade-in ${isMobile ? 'pb-24' : 'pb-32'}`}>
      {/* Loading Error Alert */}
      {loadingError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-destructive font-medium">Error</p>
            <p className="text-xs text-destructive/80">{loadingError}</p>
          </div>
          <Button
            onClick={() => setLoadingError(null)}
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive/80"
          >
            Dismiss
          </Button>
        </div>
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

      {/* Storage Info Alert */}
      {storageInfo.isNearLimit && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HardDriveIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <p className="text-xs text-orange-800 dark:text-orange-200">
                Recipe storage nearly full ({storageInfo.count}/{storageInfo.maxCount})
              </p>
            </div>
            <Button
              onClick={clearAllRecipes}
              variant="ghost"
              size="sm"
              className="text-orange-600 hover:text-orange-800 text-xs"
            >
              Clear All
            </Button>
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

      {/* Chat Interface with enhanced mobile optimization */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
          <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <Brain className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600`} />
            <span>Chat with Your Coach</span>
          </CardTitle>
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
                          disabled={storageInfo.count >= storageInfo.maxCount}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save Recipe
                          {storageInfo.count >= storageInfo.maxCount && ' (Full)'}
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
        </CardContent>
      </Card>

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
            {quickQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleQuickQuestion(question)}
                className={`${isMobile ? 'text-xs px-3 py-3 h-auto' : 'text-sm px-4 py-4 h-auto'} text-center justify-center font-semibold bg-gradient-to-r from-purple-50 to-emerald-50 dark:from-purple-900/20 dark:to-emerald-900/20 border-purple-200 dark:border-purple-700 hover:from-purple-100 hover:to-emerald-100 dark:hover:from-purple-800/30 dark:hover:to-emerald-800/30 transition-all duration-200 hover:scale-105 whitespace-normal leading-tight`}
                disabled={isLoading}
              >
                {question}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Personalized Recipes Section */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
          <CardTitle className={`flex items-center justify-between ${isMobile ? 'text-base' : 'text-lg'}`}>
            <div className="flex items-center space-x-2">
              <ChefHat className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-emerald-600`} />
              <span>🍽️ Personalized Recipes</span>
            </div>
            {storageInfo.count > 0 && (
              <span className="text-xs text-muted-foreground">
                {storageInfo.count}/{storageInfo.maxCount}
              </span>
            )}
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
              <div className="flex items-center justify-between mb-3">
                <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-700 dark:text-gray-300 flex items-center`}>
                  🗂️ Saved Recipes ({savedRecipes.length})
                </h3>
                {savedRecipes.length > 5 && (
                  <Button
                    onClick={clearAllRecipes}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
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
    </div>
  );
};

export default Coach;
