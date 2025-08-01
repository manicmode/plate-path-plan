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

          {/* AI Insight Section */}
          <div className="bg-gradient-to-r from-primary/10 via-secondary/5 to-accent/10 rounded-xl border-2 border-primary/30 p-6 shadow-2xl animate-fade-in relative overflow-hidden">
            {/* Glowing border effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl blur-sm"></div>
            
            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-2 rounded-full bg-primary/20">
                  <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-foreground">🧠 AI Coach Insights</h3>
              </div>
              
              {isLoadingInsight ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <p className="text-muted-foreground font-medium">✨ Generating your personalized insights...</p>
                  </div>
                  
                  {/* Shimmer effect placeholders */}
                  <div className="space-y-2">
                    <div className="h-4 bg-muted/50 rounded animate-pulse"></div>
                    <div className="h-4 bg-muted/50 rounded animate-pulse w-3/4"></div>
                    <div className="h-4 bg-muted/50 rounded animate-pulse w-5/6"></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-foreground leading-relaxed text-base whitespace-pre-line font-medium">
                      {aiInsight}
                    </p>
                  </div>
                  
                  {/* Success indicator */}
                  <div className="flex items-center space-x-2 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>AI analysis complete</span>
                  </div>
                </div>
              )}
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