
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Sparkles } from 'lucide-react';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

interface OnboardingReminderProps {
  onStartOnboarding: () => void;
}

export const OnboardingReminder = ({ onStartOnboarding }: OnboardingReminderProps) => {
  const { dismissReminder } = useOnboardingStatus();
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    dismissReminder();
  };

  if (!isVisible) return null;

  return (
    <Card className="mb-6 border-emerald-300 bg-gradient-to-r from-emerald-100 to-blue-100 dark:from-emerald-900/20 dark:to-blue-900/20 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Complete your profile for better suggestions
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get personalized recommendations from your AI Coach
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              onClick={onStartOnboarding}
              className="gradient-primary"
            >
              Complete Setup
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="p-1 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
