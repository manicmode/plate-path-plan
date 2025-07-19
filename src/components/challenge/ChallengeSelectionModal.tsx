import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, TrendingUp, Plus, Target, Calendar, Trophy } from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  duration_days: number;
  category: string;
  difficulty_level: string;
  participant_count: number;
  badge_icon: string;
  is_trending: boolean;
}

interface ChallengeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendId: string;
  friendName: string;
}

export const ChallengeSelectionModal: React.FC<ChallengeSelectionModalProps> = ({
  isOpen,
  onClose,
  friendId,
  friendName
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customChallenge, setCustomChallenge] = useState({
    title: '',
    description: '',
    duration_days: 7,
    category: 'nutrition'
  });

  useEffect(() => {
    if (isOpen) {
      fetchTrendingChallenges();
    }
  }, [isOpen]);

  const fetchTrendingChallenges = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('public_challenges')
        .select('*')
        .eq('is_active', true)
        .order('participant_count', { ascending: false })
        .limit(5);

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      toast({
        title: "Error",
        description: "Failed to load challenges. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendChallengeInvite = async (challengeId: string, challengeTitle: string, isCustom = false) => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke('send-challenge-invite', {
        body: {
          inviter_id: user.id,
          invitee_id: friendId,
          challenge_id: challengeId,
          challenge_title: challengeTitle,
          is_custom: isCustom,
          custom_data: isCustom ? customChallenge : null
        }
      });

      if (error) throw error;

      toast({
        title: "Challenge Sent! 🚀",
        description: `${friendName} has been invited to ${challengeTitle}`,
        duration: 5000,
      });

      onClose();
    } catch (error) {
      console.error('Error sending challenge invite:', error);
      toast({
        title: "Error",
        description: "Failed to send challenge invite. Please try again.",
        variant: "destructive",
      });
    }
  };

  const createCustomChallenge = async () => {
    if (!customChallenge.title.trim() || !customChallenge.description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    await sendChallengeInvite(
      'custom-' + Date.now(),
      customChallenge.title,
      true
    );
  };

  const quickChallenges = [
    {
      id: 'quick-water-7',
      title: '7-Day Water Boost',
      description: 'Drink 8 glasses of water daily for 7 days',
      duration_days: 7,
      category: 'hydration',
      badge_icon: '💧'
    },
    {
      id: 'quick-steps-14',
      title: '14-Day Step Challenge',
      description: '10,000 steps daily for 2 weeks',
      duration_days: 14,
      category: 'fitness',
      badge_icon: '👟'
    },
    {
      id: 'quick-nutrition-30',
      title: '30-Day Clean Eating',
      description: 'Log healthy meals for 30 days',
      duration_days: 30,
      category: 'nutrition',
      badge_icon: '🥗'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Challenge {friendName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Challenge Options */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-500" />
              Quick Start Challenges
            </h3>
            <div className="grid gap-3">
              {quickChallenges.map((challenge) => (
                <Card key={challenge.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{challenge.badge_icon}</span>
                        <div>
                          <h4 className="font-medium">{challenge.title}</h4>
                          <p className="text-sm text-muted-foreground">{challenge.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {challenge.duration_days} days
                            </Badge>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {challenge.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => sendChallengeInvite(challenge.id, challenge.title)}
                        className="ml-4"
                      >
                        Invite
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Trending Challenges */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Trending Challenges
            </h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading trending challenges...</span>
              </div>
            ) : (
              <div className="grid gap-3">
                {challenges.map((challenge) => (
                  <Card key={challenge.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{challenge.badge_icon}</span>
                          <div>
                            <h4 className="font-medium">{challenge.title}</h4>
                            <p className="text-sm text-muted-foreground">{challenge.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {challenge.duration_days} days
                              </Badge>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {challenge.category}
                              </Badge>
                              {challenge.is_trending && (
                                <Badge variant="default" className="text-xs">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  Trending
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {challenge.participant_count}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => sendChallengeInvite(challenge.id, challenge.title)}
                          className="ml-4"
                        >
                          Invite
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Custom Challenge */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4 text-purple-500" />
                Create Custom Challenge
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomForm(!showCustomForm)}
              >
                {showCustomForm ? 'Cancel' : 'Create Custom'}
              </Button>
            </div>

            {showCustomForm && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Challenge Title</label>
                    <Input
                      placeholder="e.g., 21-Day Meditation Challenge"
                      value={customChallenge.title}
                      onChange={(e) => setCustomChallenge(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea
                      placeholder="Describe what this challenge involves..."
                      value={customChallenge.description}
                      onChange={(e) => setCustomChallenge(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Duration (days)</label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={customChallenge.duration_days}
                        onChange={(e) => setCustomChallenge(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 7 }))}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category</label>
                      <select
                        className="w-full px-3 py-2 border border-input bg-background rounded-md"
                        value={customChallenge.category}
                        onChange={(e) => setCustomChallenge(prev => ({ ...prev, category: e.target.value }))}
                      >
                        <option value="nutrition">Nutrition</option>
                        <option value="fitness">Fitness</option>
                        <option value="hydration">Hydration</option>
                        <option value="wellness">Wellness</option>
                        <option value="habits">Habits</option>
                      </select>
                    </div>
                  </div>

                  <Button onClick={createCustomChallenge} className="w-full">
                    Send Custom Challenge
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};