import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, MessageCircle, Clock, Bookmark } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Prediction {
  name: string;
  time: string;
}

interface LogEntry {
  id: string;
  name: string;
  created_at: string;
  is_pinned?: boolean;
}

const HomeAIInsights = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [savedLogs, setSavedLogs] = useState<LogEntry[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    
    const fetchData = async () => {
      // Generate AI predictions based on current time
      const currentHour = new Date().getHours();
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });

      const predictionData = [];
      
      if (currentHour >= 6 && currentHour < 11) {
        predictionData.push({ name: '🥣 Oatmeal with Berries', time: '8:30 AM' });
        predictionData.push({ name: '🍳 Scrambled Eggs', time: '9:00 AM' });
        predictionData.push({ name: '☕ Coffee with Milk', time: '7:45 AM' });
      } else if (currentHour >= 11 && currentHour < 15) {
        predictionData.push({ name: '🥗 Chicken Salad', time: '12:30 PM' });
        predictionData.push({ name: '🍜 Vegetable Soup', time: '1:00 PM' });
        predictionData.push({ name: '🥪 Turkey Sandwich', time: '12:45 PM' });
      } else if (currentHour >= 15 && currentHour < 19) {
        predictionData.push({ name: '🍎 Apple with Peanut Butter', time: '3:30 PM' });
        predictionData.push({ name: '🥜 Mixed Nuts', time: '4:00 PM' });
        predictionData.push({ name: '🧀 Cheese and Crackers', time: '3:45 PM' });
      } else {
        predictionData.push({ name: '🍗 Grilled Chicken', time: '7:00 PM' });
        predictionData.push({ name: '🍝 Pasta with Sauce', time: '7:30 PM' });
        predictionData.push({ name: '🥘 Stir Fry Vegetables', time: '6:45 PM' });
      }
      
      setPredictions(predictionData);

      // For now, skip saved logs since we don't have pinning functionality yet
      setSavedLogs([]);

      // Fetch recent logs
      const { data: recentData } = await supabase
        .from('nutrition_logs')
        .select('id, food_name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const mappedRecentLogs = (recentData || []).map(log => ({
        id: log.id,
        name: log.food_name,
        created_at: log.created_at
      }));
      setRecentLogs(mappedRecentLogs);
    };

    fetchData();
  }, [user?.id]);

  const handleLogFood = (foodName: string) => {
    navigate('/camera', { state: { quickLog: foodName } });
  };

  return (
    <Card className={`modern-action-card ai-insights-card border-0 rounded-3xl animate-slide-up float-animation hover:scale-[1.02] transition-all duration-500 shadow-xl hover:shadow-2xl ${isMobile ? 'mx-2' : 'mx-4'}`}>
      <CardContent className={`${isMobile ? 'p-6' : 'p-8'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between ${isMobile ? 'mb-4' : 'mb-6'}`}>
          <div className={`flex items-center ${isMobile ? 'space-x-3' : 'space-x-4'}`}>
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} gradient-primary rounded-full flex items-center justify-center shadow-lg ai-glow`}>
              <Brain className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
            </div>
            <div>
              <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>AI Suggestions</h3>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>Smart food predictions</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="predictions" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="predictions" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">AI Quick Prediction</span>
              <span className="sm:hidden">🔮 AI</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">Saved Logs</span>
              <span className="sm:hidden">💾 Saved</span>
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Recent Logs</span>
              <span className="sm:hidden">🕓 Recent</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="predictions" className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">🔮</span>
              <h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>
                AI Quick Prediction
              </h4>
            </div>
            <div className="space-y-3">
              {predictions.map((prediction, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div>
                    <p className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-900 dark:text-white`}>
                      {prediction.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      usually at {prediction.time}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleLogFood(prediction.name)}
                    className="ml-4"
                  >
                    Log
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">💾</span>
              <h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>
                Saved Logs
              </h4>
            </div>
            {savedLogs.length > 0 ? (
              <div className="space-y-3">
                {savedLogs.map((log, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div>
                      <p className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-900 dark:text-white`}>
                        {log.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(log.created_at).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleLogFood(log.name)}
                      className="ml-4"
                    >
                      Log Again
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-500 dark:text-gray-400`}>
                  No saved logs yet. Pin your favorite meals for quick access!
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">🕓</span>
              <h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>
                Recent Logs
              </h4>
            </div>
            {recentLogs.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.map((log, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div>
                      <p className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-900 dark:text-white`}>
                        {log.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(log.created_at).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleLogFood(log.name)}
                      className="ml-4"
                    >
                      Log Again
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-500 dark:text-gray-400`}>
                  No recent logs yet. Start logging to see your history!
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Ask AI Coach Button */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
          <Button 
            className="w-full gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => navigate('/chat')}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Ask your AI coach
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default HomeAIInsights;