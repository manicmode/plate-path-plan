import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Star, ChevronRight } from 'lucide-react';
import { useStretchingNudgeDisplay } from '@/hooks/useStretchingNudgeDisplay';
import { useNavigate } from 'react-router-dom';

interface AIStretchingNudgeChatEntriesProps {
  maxEntries?: number;
  showOnlyRecent?: boolean;
}

export const AIStretchingNudgeChatEntries: React.FC<AIStretchingNudgeChatEntriesProps> = ({
  maxEntries = 5,
  showOnlyRecent = false
}) => {
  const { visibleNudges, handleDismissNudge, handleAcceptNudge } = useStretchingNudgeDisplay({
    showOnlyRecent,
    maxEntries
  });
  const navigate = useNavigate();

  const handleStartStretching = async (nudgeId: string) => {
    try {
      await handleAcceptNudge(nudgeId);
      navigate('/exercise-hub?tab=recovery&recovery-tab=stretching');
    } catch (error) {
      console.error('Error handling stretching nudge acceptance:', error);
    }
  };

  if (visibleNudges.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {visibleNudges.map((nudge) => (
        <Card key={nudge.id} className="glass-card border-orange-200/20 bg-gradient-to-r from-orange-900/40 via-amber-900/30 to-yellow-900/40">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="p-2 rounded-full bg-orange-800/30 backdrop-blur-sm">
                  <Activity className="h-4 w-4 text-orange-300" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center space-x-2">
                  <Star className="h-3 w-3 text-yellow-300" />
                  <p className="text-sm font-medium text-orange-100">Flexibility Nudge</p>
                </div>
                
                <p className="text-sm text-orange-200/90 leading-relaxed">
                  {nudge.nudge_message}
                </p>
                
                <div className="flex items-center space-x-2 pt-1">
                  <Button
                    onClick={() => handleStartStretching(nudge.id)}
                    size="sm"
                    className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-full text-xs px-3"
                  >
                    <Activity className="h-3 w-3 mr-1" />
                    Start Stretching
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                  
                  <Button
                    onClick={() => handleDismissNudge(nudge.id)}
                    size="sm"
                    variant="ghost"
                    className="text-orange-300/70 hover:text-orange-200 hover:bg-orange-800/20 rounded-full text-xs px-3"
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