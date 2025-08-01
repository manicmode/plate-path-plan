import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Play, Heart, X, Clock, AlarmClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddReminderModal } from "@/components/recovery/AddReminderModal";
import { useNavigate } from 'react-router-dom';

interface MeditationSession {
  id: string;
  category: string;
  duration: number;
  title: string;
  description: string;
  audio_url: string;
  image_url?: string;
}

interface MeditationTheme {
  id: string;
  title: string;
  emoji: string;
  gradient: string;
  iconColor: string;
  description: string;
}

interface SessionPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: MeditationTheme | null;
  onStartSession: (session: MeditationSession) => void;
}

export const SessionPickerModal: React.FC<SessionPickerModalProps> = ({
  isOpen,
  onClose,
  theme,
  onStartSession
}) => {
  const navigate = useNavigate();
  const [selectedDuration, setSelectedDuration] = useState<number>(10);
  const [sessions, setSessions] = useState<MeditationSession[]>([]);
  const [favoriteSessionIds, setFavoriteSessionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedSessionForReminder, setSelectedSessionForReminder] = useState<MeditationSession | null>(null);
  const { toast } = useToast();

  const durations = [5, 10, 15, 20];

  // Fetch sessions when theme changes
  useEffect(() => {
    if (theme && isOpen) {
      fetchSessions();
    }
  }, [theme, isOpen]);

  // Set default duration when sessions load
  useEffect(() => {
    if (sessions.length > 0) {
      const availableDurations = [...new Set(sessions.map(s => s.duration))].sort((a, b) => a - b);
      if (availableDurations.length > 0 && !availableDurations.includes(selectedDuration)) {
        setSelectedDuration(availableDurations[0]);
      }
    }
  }, [sessions]);

  const fetchSessions = async () => {
    if (!theme) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meditation_sessions')
        .select('*')
        .eq('category', theme.id)
        .order('duration');

      if (error) {
        console.error('Error fetching sessions:', error);
        toast({
          title: "❌ Loading Failed",
          description: "Failed to load meditation sessions. Please try again.",
          duration: 3000,
        });
        return;
      }

      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "❌ Error",
        description: "An unexpected error occurred while loading sessions.",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (sessionId: string) => {
    setFavoriteSessionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
        toast({
          title: "💔 Removed from Favorites",
          description: "Session removed from your favorites",
          duration: 2000,
        });
      } else {
        newSet.add(sessionId);
        toast({
          title: "💖 Added to Favorites",
          description: "Session added to your favorites",
          duration: 2000,
        });
      }
      return newSet;
    });
  };

  const handleStartSession = (session: MeditationSession) => {
    onStartSession(session);
    navigate('/recovery-player', { state: { session } });
    onClose();
  };

  const handleReminderClick = (session: MeditationSession) => {
    setSelectedSessionForReminder(session);
    setShowReminderModal(true);
  };

  const handleReminderSave = () => {
    setShowReminderModal(false);
    setSelectedSessionForReminder(null);
    toast({
      title: "⏰ Reminder Set",
      description: "You'll be notified when it's time to meditate!",
      duration: 3000,
    });
  };

  const filteredSessions = sessions.filter(session => session.duration === selectedDuration);

  if (!theme) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="relative overflow-hidden">
            <div className={`bg-gradient-to-br ${theme.gradient} p-6 border-b border-border/20`}>
              <div className="flex items-center gap-4">
                <div className="text-5xl">{theme.emoji}</div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    {theme.title}
                  </h2>
                  <p className="text-muted-foreground">
                    {theme.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Duration Selector */}
          <div className="p-6 border-b border-border/20">
            <h3 className="text-lg font-semibold text-foreground mb-3">
              Choose Duration
            </h3>
            <div className="flex gap-2">
              {durations.map((duration) => {
                const hasSessionsForDuration = sessions.some(s => s.duration === duration);
                return (
                  <Button
                    key={duration}
                    variant={selectedDuration === duration ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDuration(duration)}
                    disabled={!hasSessionsForDuration}
                    className="gap-1"
                  >
                    <Clock className="h-3 w-3" />
                    {duration} min
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-auto p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Available Sessions ({selectedDuration} minutes)
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading sessions...</div>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h4 className="text-lg font-medium text-foreground mb-2">
                  No sessions available
                </h4>
                <p className="text-sm text-muted-foreground">
                  No {selectedDuration}-minute sessions found for this category.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/30 to-background/50 rounded-lg border border-border/50 hover:border-primary/30 transition-all duration-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-foreground">
                          {session.title}
                        </h4>
                        <Badge variant="secondary" className="text-xs">
                          {session.duration} min
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {session.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleReminderClick(session)}
                        className="h-9 w-9 text-muted-foreground hover:text-orange-500"
                        title="Set Reminder"
                      >
                        <AlarmClock className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavorite(session.id)}
                        className={`h-9 w-9 ${
                          favoriteSessionIds.has(session.id)
                            ? 'text-red-500 hover:text-red-600'
                            : 'text-muted-foreground hover:text-red-500'
                        }`}
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            favoriteSessionIds.has(session.id) ? 'fill-current' : ''
                          }`}
                        />
                      </Button>
                      <Button
                        onClick={() => handleStartSession(session)}
                        size="sm"
                        className="gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Start
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Reminder Modal */}
      {selectedSessionForReminder && (
        <AddReminderModal
          isOpen={showReminderModal}
          onClose={() => setShowReminderModal(false)}
          onSave={handleReminderSave}
          defaultTitle={selectedSessionForReminder.title}
          contentType="meditation"
          contentId={selectedSessionForReminder.id}
        />
      )}
    </Dialog>
  );
};