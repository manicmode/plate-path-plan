import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Moon, TestTube } from 'lucide-react';
import { DailyMoodModal } from './DailyMoodModal';
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
    <>
      <Card className="w-full max-w-md mx-auto">
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

      <DailyMoodModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  );
};