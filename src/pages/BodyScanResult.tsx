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
      const { data, error } = await supabase.functions.invoke('generate-body-scan-insight', {
        body: { scanData }
      });

      if (error) throw error;
      
      setAiInsight(data.insight);
    } catch (error) {
      console.error('Error generating AI insight:', error);
      setAiInsight("Great job completing your body scan! This commitment to tracking your progress shows real dedication to your health journey. Keep up the excellent work!");
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
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl border border-primary/20 p-6 shadow-lg animate-fade-in">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">AI Insight</h3>
            </div>
            
            {isLoadingInsight ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Generating your personalized insight...</p>
              </div>
            ) : (
              <p className="text-foreground leading-relaxed text-lg">
                {aiInsight}
              </p>
            )}
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