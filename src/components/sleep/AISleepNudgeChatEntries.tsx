import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Moon, Star, ChevronRight } from 'lucide-react';
import { useSleepNudgeDisplay } from '@/hooks/useSleepNudgeDisplay';
import { useNavigate } from 'react-router-dom';

interface AISleepNudgeChatEntriesProps {
  maxEntries?: number;
  showOnlyRecent?: boolean;
}

export const AISleepNudgeChatEntries: React.FC<AISleepNudgeChatEntriesProps> = ({
  maxEntries = 5,
  showOnlyRecent = false
}) => {
  const { visibleNudges, handleDismissNudge, handleAcceptNudge } = useSleepNudgeDisplay({
    showOnlyRecent,
    maxEntries
  });
  const navigate = useNavigate();

  const handleStartSleepPrep = async (nudgeId: string) => {
    try {
      await handleAcceptNudge(nudgeId);
      navigate('/exercise-hub?tab=recovery&recovery-tab=sleep');
    } catch (error) {
      console.error('Error handling sleep nudge acceptance:', error);
    }
  };

  if (visibleNudges.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {visibleNudges.map((nudge) => (
        <Card key={nudge.id} className="glass-card border-violet-200/20 bg-gradient-to-r from-slate-900/40 via-blue-900/30 to-indigo-900/40">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="p-2 rounded-full bg-blue-800/30 backdrop-blur-sm">
                  <Moon className="h-4 w-4 text-blue-300" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center space-x-2">
                  <Star className="h-3 w-3 text-yellow-300" />
                  <p className="text-sm font-medium text-blue-100">Sleep Wellness Nudge</p>
                </div>
                
                <p className="text-sm text-blue-200/90 leading-relaxed">
                  {nudge.nudge_message}
                </p>
                
                <div className="flex items-center space-x-2 pt-1">
                  <Button
                    onClick={() => handleStartSleepPrep(nudge.id)}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full text-xs px-3"
                  >
                    <Moon className="h-3 w-3 mr-1" />
                    Start Wind-Down
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                  
                  <Button
                    onClick={() => handleDismissNudge(nudge.id)}
                    size="sm"
                    variant="ghost"
                    className="text-blue-300/70 hover:text-blue-200 hover:bg-blue-800/20 rounded-full text-xs px-3"
                  >
                    Maybe later
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};