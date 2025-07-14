import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/auth';

interface OnboardingCompletionCardProps {
  onStartOnboarding: () => void;
}

export const OnboardingCompletionCard = ({ onStartOnboarding }: OnboardingCompletionCardProps) => {
  const { user } = useAuth();
  
  // Only show if user has not completed onboarding
  if (user?.onboardingCompleted) {
    return null;
  }

  return (
    <Card className="animate-slide-up glass-card border-0 rounded-3xl bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/10 dark:to-blue-900/10">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
          Complete Your Profile Setup
        </CardTitle>
        <CardDescription className="text-base">
          Unlock personalized nutrition insights and AI coaching by completing the onboarding process
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            🎯 Get personalized nutrition targets<br/>
            🤖 Access AI-powered meal recommendations<br/>
            📊 Track your progress with custom goals
          </div>
          
          <Button 
            onClick={onStartOnboarding}
            className="w-full gradient-primary group"
          >
            Complete Setup
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};