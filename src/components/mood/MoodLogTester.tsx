import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Moon, TestTube, TrendingUp } from 'lucide-react';
import { DailyMoodModal } from './DailyMoodModal';
import { MoodWellnessTrendChart } from '@/components/analytics/MoodWellnessTrendChart';
import { MoodDataGenerator } from './MoodDataGenerator';
import { useNotification } from '@/contexts/NotificationContext';

export const MoodLogTester: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const { addNotification } = useNotification();

  const testMoodNotification = () => {
    addNotification({
      title: '🌙 Time for your daily check-in!',
      body: 'How are you feeling today? Log your mood and wellness.',
      type: 'mood_checkin',
      action: () => setShowModal(true),
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TestTube className="h-5 w-5 text-purple-600" />
              <span>Mood Logging Test</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => setShowModal(true)}
              className="w-full bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700"
            >
              <Moon className="h-4 w-4 mr-2" />
              Open Mood Log
            </Button>
            
            <Button
              onClick={testMoodNotification}
              variant="outline"
              className="w-full"
            >
              Test Mood Notification
            </Button>
          </CardContent>
        </Card>

        <MoodDataGenerator />
      </div>

      {/* Live Chart Preview */}
      <div className="w-full">
        <div className="mb-4 text-center">
          <div className="flex items-center justify-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <span>Live Chart Preview</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Log some mood data to see the chart in action!
          </p>
        </div>
        <MoodWellnessTrendChart />
      </div>

      <DailyMoodModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </div>
  );
};