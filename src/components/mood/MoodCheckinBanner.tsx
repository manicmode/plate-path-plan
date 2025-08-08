import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Moon, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { DailyMoodModal } from './DailyMoodModal';

interface MoodCheckinBannerProps {
  onDismiss?: () => void;
}

export const MoodCheckinBanner: React.FC<MoodCheckinBannerProps> = ({ onDismiss }) => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const checkShouldShow = async () => {
      if (!user?.id) return;

      const now = new Date();
      const hour = now.getHours();
      
      // Only show after 7pm local
      if (hour < 19) {
        setShouldShow(false);
        return;
      }

      // Check if user already has a mood log for today
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('mood_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error) {
        console.error('Error checking mood log:', error);
        return;
      }

      // Show banner if no mood log for today
      if (!data) {
        setShouldShow(true);
      }
    };

    checkShouldShow();
  }, [user?.id]);

  const handleDismiss = () => {
    setShouldShow(false);
    onDismiss?.();
  };

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    // Hide banner after successful check-in
    setShouldShow(false);
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <>
      <Card className="mb-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Moon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Daily Check-In
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Log today's Mood, Energy, Wellness
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleOpenModal}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Check In
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DailyMoodModal isOpen={showModal} onClose={handleCloseModal} />
    </>
  );
};