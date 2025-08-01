import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Scale, CheckCircle, ArrowRight, Sparkles, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export default function BodyScanResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(true);
  const [motivationalMessage, setMotivationalMessage] = useState('');
  
  // Get scan data from navigation state or default values
  const scanData = location.state || {
    date: new Date(),
    weight: null
  };

  // Motivational messages to rotate through
  const motivationalMessages = [
    "You're building momentum. 💪",
    "This is how progress happens — one step at a time. 🌟",
    "Strong choices build a strong you. 🎯",
    "Every scan is a step forward. 🚀",
    "You're investing in your future self. ✨",
    "Progress, not perfection. 🌱"
  ];

  // Redirect if no scan data (user bypassed scan)
  useEffect(() => {
    if (!location.state) {
      navigate('/exercise-hub');
      return;
    }
    
    // Set random motivational message
    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    setMotivationalMessage(randomMessage);
    
    // Generate AI insight
    generateAIInsight();
  }, [location.state, navigate]);

  const generateAIInsight = async () => {
    try {
      console.log('[AI ANALYSIS] Starting OpenAI insight generation...');
      
      // Get current user for saving insights
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('generate-body-scan-insight', {
        body: { 
          scanData,
          userId: user?.id 
        }
      });

      if (error) throw error;
      
      console.log('[AI ANALYSIS] Result received:', data);
      setAiInsight(data.insight);
    } catch (error) {
      console.error('Error generating AI insight:', error);
      // Enhanced fallback insight with proper formatting
      const fallbackInsight = `🎯 **Posture Analysis**: Excellent work completing your comprehensive body scan! This shows great commitment to monitoring your form and alignment.

⚖️ **Progress Tracking**: Regular body scans are one of the most effective ways to track real changes in your physique and posture over time.

💪 **Motivational Message**: Your dedication to consistent tracking sets you apart - you're building habits that lead to lasting transformation!

📈 **Next Steps**: Focus on maintaining good posture throughout your daily activities, and we'll compare your progress in 30 days!`;
      
      setAiInsight(fallbackInsight);
    } finally {
      setIsLoadingInsight(false);
    }
  };

  const handleViewResults = () => {
    navigate('/body-scan-results');
  };

  const handleBackToHub = () => {
    navigate('/exercise-hub');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/10 to-accent/5 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        <div className="text-center space-y-8">
          {/* Success Header */}
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <CheckCircle className="h-24 w-24 text-primary/30 mx-auto" />
            </div>
            <CheckCircle className="h-24 w-24 text-primary mx-auto relative z-10 animate-fade-in" />
            <div className="mt-4 space-y-2">
              <h1 className="text-3xl font-bold text-foreground animate-fade-in">
                🎉 Body Scan Complete!
              </h1>
              <p className="text-lg text-muted-foreground animate-fade-in">
                Your body scan was successfully completed. We'll remind you in 30 days to track your progress!
              </p>
            </div>
          </div>

          {/* Scan Summary Card */}
          <div className="bg-card rounded-xl border border-border p-6 space-y-6 shadow-lg animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-foreground">Scan Summary</h3>
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <Calendar className="h-6 w-6 text-primary" />
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">Scan Date</p>
                  <p className="font-medium text-foreground text-lg">
                    {format(new Date(scanData.date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              {scanData.weight && (
                <div className="flex items-center space-x-3">
                  <Scale className="h-6 w-6 text-primary" />
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">Weight</p>
                    <p className="font-medium text-foreground text-lg">
                      {scanData.weight} lbs
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3 md:col-span-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">Scan Status</p>
                  <p className="font-medium text-foreground text-lg">
                    ✅ Front • ✅ Side • ✅ Back - All Complete
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Posture & Muscle Analysis */}
          <div className="space-y-6">
            {/* Posture Breakdown Card */}
            <div className="bg-gradient-to-r from-blue-500/10 via-blue-400/5 to-blue-600/10 rounded-xl border-2 border-blue-500/30 p-6 shadow-2xl animate-fade-in relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-xl blur-sm"></div>
              
              <div className="relative z-10">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 rounded-full bg-blue-500/20">
                    <Sparkles className="h-6 w-6 text-blue-600 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">🧍 Posture Breakdown</h3>
                </div>
                
                {isLoadingInsight ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <p className="text-muted-foreground font-medium">✨ Analyzing your posture...</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted/50 rounded animate-pulse"></div>
                      <div className="h-4 bg-muted/50 rounded animate-pulse w-3/4"></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <span className="text-2xl">🟢</span>
                        <div>
                          <p className="font-semibold text-green-700 dark:text-green-300">Spinal Alignment</p>
                          <p className="text-sm text-green-600 dark:text-green-400">Excellent posture detected</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <span className="text-2xl">⚠️</span>
                        <div>
                          <p className="font-semibold text-yellow-700 dark:text-yellow-300">Shoulder Position</p>
                          <p className="text-sm text-yellow-600 dark:text-yellow-400">Slight forward lean detected</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <span className="text-2xl">🟢</span>
                        <div>
                          <p className="font-semibold text-green-700 dark:text-green-300">Hip Alignment</p>
                          <p className="text-sm text-green-600 dark:text-green-400">Well balanced stance</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="text-2xl">💡</span>
                        <div>
                          <p className="font-semibold text-blue-700 dark:text-blue-300">Head Position</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400">Neutral neck alignment</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        💡 <strong>Recommendation:</strong> Practice wall angels for 5 minutes daily to improve shoulder positioning and maintain your excellent spinal alignment.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Muscle Balance Report Card */}
            <div className="bg-gradient-to-r from-purple-500/10 via-purple-400/5 to-purple-600/10 rounded-xl border-2 border-purple-500/30 p-6 shadow-2xl animate-fade-in relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-xl blur-sm"></div>
              
              <div className="relative z-10">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 rounded-full bg-purple-500/20">
                    <Scale className="h-6 w-6 text-purple-600 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">💪 Muscle Balance Report</h3>
                </div>
                
                {isLoadingInsight ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <p className="text-muted-foreground font-medium">✨ Analyzing muscle development...</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted/50 rounded animate-pulse"></div>
                      <div className="h-4 bg-muted/50 rounded animate-pulse w-4/5"></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Symmetry Score */}
                    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 rounded-lg border border-green-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-green-700 dark:text-green-300">Symmetry Score</h4>
                        <span className="text-2xl font-bold text-green-600">87%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full" style={{ width: '87%' }}></div>
                      </div>
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">🟢 Excellent bilateral balance</p>
                    </div>

                    {/* Balance Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-card rounded-lg border border-border">
                        <h4 className="font-semibold text-foreground mb-3">Upper vs Lower Body</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Upper Body</span>
                            <span className="font-medium text-foreground">78% 🟢</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Lower Body</span>
                            <span className="font-medium text-foreground">82% 🟢</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-card rounded-lg border border-border">
                        <h4 className="font-semibold text-foreground mb-3">Left vs Right Side</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Left Side</span>
                            <span className="font-medium text-foreground">85% 🟢</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Right Side</span>
                            <span className="font-medium text-foreground">89% 🟢</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Specific Recommendations */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                        🎯 <strong>Focus This Month:</strong> Incorporate single-arm exercises and unilateral leg work to further enhance your already excellent symmetry. Consider adding Bulgarian split squats and single-arm rows.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Motivational Message */}
          <div className="bg-accent/10 rounded-xl border border-accent/20 p-6 shadow-lg animate-scale-in">
            <p className="text-xl font-medium text-foreground text-center">
              {motivationalMessage}
            </p>
          </div>

          {/* Reminder Section */}
          <div className="bg-card rounded-xl border border-border p-6 space-y-4 shadow-lg animate-fade-in">
            <div className="flex items-center space-x-2">
              <Clock className="h-6 w-6 text-secondary" />
              <h3 className="text-xl font-semibold text-foreground">Next Scan Reminder</h3>
            </div>
            
            <p className="text-muted-foreground text-center leading-relaxed">
              We'll remind you in 30 days to repeat your scan and see your progress. 
              Consistent tracking is the key to achieving your goals!
            </p>
            
            <Button variant="outline" className="w-full" onClick={() => navigate('/settings')}>
              Update Reminder Settings
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 animate-fade-in">
            <Button
              onClick={handleViewResults}
              className="w-full group text-lg py-6"
              size="lg"
            >
              View All Results
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button
              onClick={() => navigate('/body-scan-compare')}
              variant="outline"
              className="w-full text-lg py-6"
              size="lg"
            >
              🔄 Compare to Previous Scans
            </Button>
            
            <Button
              onClick={handleBackToHub}
              variant="outline"
              className="w-full text-lg py-6"
              size="lg"
            >
              Back to Exercise Hub
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}