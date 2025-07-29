import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, MessageCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Prediction {
  name: string;
  time: string;
  calories: number;
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
  const [showAllPredictions, setShowAllPredictions] = useState(false);

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
        predictionData.push({ name: 'Greek Yogurt', time: '8:30 AM', calories: 150 });
        predictionData.push({ name: 'Oatmeal Bowl', time: '9:00 AM', calories: 280 });
        predictionData.push({ name: 'Green Smoothie', time: '7:45 AM', calories: 220 });
        predictionData.push({ name: 'Avocado Toast', time: '8:15 AM', calories: 320 });
        predictionData.push({ name: 'Scrambled Eggs', time: '9:15 AM', calories: 180 });
        predictionData.push({ name: 'Protein Shake', time: '7:30 AM', calories: 240 });
      } else if (currentHour >= 11 && currentHour < 15) {
        predictionData.push({ name: 'Chicken Salad', time: '12:30 PM', calories: 350 });
        predictionData.push({ name: 'Quinoa Bowl', time: '1:00 PM', calories: 420 });
        predictionData.push({ name: 'Turkey Sandwich', time: '12:45 PM', calories: 380 });
        predictionData.push({ name: 'Vegetable Soup', time: '1:15 PM', calories: 180 });
        predictionData.push({ name: 'Salmon Wrap', time: '12:15 PM', calories: 450 });
        predictionData.push({ name: 'Buddha Bowl', time: '1:30 PM', calories: 390 });
      } else if (currentHour >= 15 && currentHour < 19) {
        predictionData.push({ name: 'Apple & Nuts', time: '3:30 PM', calories: 200 });
        predictionData.push({ name: 'Protein Bar', time: '4:00 PM', calories: 240 });
        predictionData.push({ name: 'Hummus & Veggies', time: '3:45 PM', calories: 150 });
        predictionData.push({ name: 'Greek Yogurt', time: '4:15 PM', calories: 150 });
        predictionData.push({ name: 'Mixed Berries', time: '3:15 PM', calories: 80 });
        predictionData.push({ name: 'Cheese & Crackers', time: '4:30 PM', calories: 220 });
      } else {
        predictionData.push({ name: 'Grilled Chicken', time: '7:00 PM', calories: 450 });
        predictionData.push({ name: 'Salmon Dinner', time: '7:30 PM', calories: 520 });
        predictionData.push({ name: 'Pasta Primavera', time: '6:45 PM', calories: 480 });
        predictionData.push({ name: 'Stir Fry Bowl', time: '7:15 PM', calories: 380 });
        predictionData.push({ name: 'Lean Beef', time: '8:00 PM', calories: 420 });
        predictionData.push({ name: 'Tofu Curry', time: '6:30 PM', calories: 350 });
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
        {/* AI Quick Predictions Section */}
        <div className={`${isMobile ? 'mb-8' : 'mb-10'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>AI Quick Predictions</h3>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>Smart suggestions</p>
          </div>
          
          <div className="space-y-3">
            {predictions.slice(0, showAllPredictions ? 6 : 3).map((prediction, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-900 dark:text-white`}>
                      {prediction.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {prediction.time} • {prediction.calories} cal
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleLogFood(prediction.name)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Tap to log
                </Button>
              </div>
            ))}
            
            {predictions.length > 3 && (
              <button
                onClick={() => setShowAllPredictions(!showAllPredictions)}
                className="flex items-center justify-center w-full p-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                {showAllPredictions ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show more
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Recent & Saved Logs Section */}
        <div className={`${isMobile ? 'mb-6' : 'mb-8'}`}>
          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white mb-4`}>Recent & Saved Logs</h3>
          
          {recentLogs.length > 0 ? (
            <div className="space-y-3">
              {recentLogs.map((log, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-900 dark:text-white`}>
                        {log.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Usually {new Date(log.created_at).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })} • Est. 200 cal
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleLogFood(log.name)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Tap to log
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
        </div>

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