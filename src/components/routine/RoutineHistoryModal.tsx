import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Target, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { format } from 'date-fns';

interface RoutineHistory {
  id: string;
  date_completed: string;
  duration_minutes: number;
  completed_steps: string[];
  skipped_steps: string[];
  completion_score: number;
  ai_feedback: string | null;
}

interface RoutineHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  routineId: string;
  routineName: string;
}

export const RoutineHistoryModal: React.FC<RoutineHistoryModalProps> = ({
  isOpen,
  onClose,
  routineId,
  routineName
}) => {
  const [history, setHistory] = useState<RoutineHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user && routineId) {
      fetchHistory();
    }
  }, [isOpen, user, routineId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('routine_history')
        .select('*')
        .eq('user_id', user?.id)
        .eq('routine_id', routineId)
        .order('date_completed', { ascending: false });

      if (error) throw error;
      
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching routine history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {routineName} History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No workout history found for this routine.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Complete a workout to see your progress here!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((session) => (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {format(new Date(session.date_completed), 'MMM dd, yyyy')}
                          </Badge>
                          <Badge className={getScoreColor(session.completion_score || 0)}>
                            {session.completion_score || 0}% Complete
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {session.duration_minutes} minutes
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Target className="h-4 w-4" />
                            {session.completed_steps.length} steps completed
                          </div>
                        </div>

                        {session.ai_feedback && (
                          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 mt-3">
                            <div className="flex items-start gap-2">
                              <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                              <div className="text-sm text-blue-900 dark:text-blue-100">
                                <div className="font-medium text-blue-600 dark:text-blue-400 mb-1">
                                  AI Coach
                                </div>
                                {session.ai_feedback}
                              </div>
                            </div>
                          </div>
                        )}

                        {session.skipped_steps.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">
                              Skipped: {session.skipped_steps.join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};