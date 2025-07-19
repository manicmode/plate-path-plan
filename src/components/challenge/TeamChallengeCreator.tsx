import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Target, Calendar, Trophy, Settings, Zap, Crown } from 'lucide-react';

interface TeamChallengeCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  initialFriends?: Array<{ id: string; name: string }>;
}

interface Friend {
  user_id: string;
  display_name: string;
  current_nutrition_streak: number;
  current_hydration_streak: number;
  rank_position?: number;
}

export const TeamChallengeCreator: React.FC<TeamChallengeCreatorProps> = ({
  isOpen,
  onClose,
  initialFriends = []
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>(
    initialFriends.map(f => f.id)
  );

  const [challengeData, setChallengeData] = useState({
    title: '',
    description: '',
    duration_days: 7,
    category: 'nutrition',
    target_metric: 'daily_goals',
    target_value: 7,
    target_unit: 'goals',
    is_team_challenge: true,
    team_size: 3,
    auto_team_enabled: false,
    team_ranking_basis: 'score'
  });

  const loadFriends = async () => {
    if (!user) return;

    try {
      const { data: friendsData } = await supabase
        .from('user_friends')
        .select('friend_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (friendsData && friendsData.length > 0) {
        const friendIds = friendsData.map(f => f.friend_id);
        
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select(`
            user_id,
            first_name,
            last_name,
            current_nutrition_streak,
            current_hydration_streak
          `)
          .in('user_id', friendIds);

        if (profiles) {
          const friendsList = profiles.map(profile => ({
            user_id: profile.user_id,
            display_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Friend',
            current_nutrition_streak: profile.current_nutrition_streak || 0,
            current_hydration_streak: profile.current_hydration_streak || 0
          }));

          setFriends(friendsList);
        }
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      loadFriends();
    }
  }, [isOpen, user]);

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const createTeamChallenge = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Create the private challenge
      const { data: challenge, error: challengeError } = await supabase
        .from('private_challenges')
        .insert({
          creator_id: user.id,
          title: challengeData.title,
          description: challengeData.description,
          duration_days: challengeData.duration_days,
          category: challengeData.category,
          challenge_type: 'habit',
          target_metric: challengeData.target_metric,
          target_value: challengeData.target_value,
          target_unit: challengeData.target_unit,
          status: 'pending',
          start_date: new Date().toISOString().split('T')[0],
          invited_user_ids: selectedFriends,
          max_participants: selectedFriends.length + 1,
          is_team_challenge: true,
          team_size: challengeData.team_size,
          auto_team_enabled: challengeData.auto_team_enabled,
          team_ranking_basis: challengeData.team_ranking_basis
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      // Create invitations for selected friends
      const invitations = selectedFriends.map(friendId => ({
        private_challenge_id: challenge.id,
        inviter_id: user.id,
        invitee_id: friendId,
        status: 'pending'
      }));

      if (invitations.length > 0) {
        const { error: inviteError } = await supabase
          .from('challenge_invitations')
          .insert(invitations);

        if (inviteError) throw inviteError;
      }

      // Create creator's participation
      const { error: participationError } = await supabase
        .from('private_challenge_participations')
        .insert({
          private_challenge_id: challenge.id,
          user_id: user.id,
          is_creator: true
        });

      if (participationError) throw participationError;

      toast({
        title: "Team Challenge Created! 🎯",
        description: `${challengeData.title} has been created. Invitations sent to ${selectedFriends.length} friends!`,
        duration: 5000,
      });

      onClose();
    } catch (error) {
      console.error('Error creating team challenge:', error);
      toast({
        title: "Error",
        description: "Failed to create team challenge. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Target className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h3 className="text-xl font-semibold mb-2">Challenge Details</h3>
        <p className="text-muted-foreground">Create an amazing team challenge</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Challenge Title</Label>
          <Input
            id="title"
            placeholder="e.g., Team Hydration Heroes"
            value={challengeData.title}
            onChange={(e) => setChallengeData(prev => ({ ...prev, title: e.target.value }))}
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe what this team challenge is about..."
            value={challengeData.description}
            onChange={(e) => setChallengeData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="duration">Duration (days)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="365"
              value={challengeData.duration_days}
              onChange={(e) => setChallengeData(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 7 }))}
            />
          </div>
          
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              className="w-full px-3 py-2 border border-input bg-background rounded-md"
              value={challengeData.category}
              onChange={(e) => setChallengeData(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="nutrition">Nutrition</option>
              <option value="fitness">Fitness</option>
              <option value="hydration">Hydration</option>
              <option value="wellness">Wellness</option>
              <option value="habits">Habits</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Settings className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h3 className="text-xl font-semibold mb-2">Team Settings</h3>
        <p className="text-muted-foreground">Configure how teams will work</p>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-team">Auto-Team Assignment</Label>
              <p className="text-sm text-muted-foreground">
                Automatically group participants by skill level
              </p>
            </div>
            <Switch
              id="auto-team"
              checked={challengeData.auto_team_enabled}
              onCheckedChange={(checked) => 
                setChallengeData(prev => ({ ...prev, auto_team_enabled: checked }))
              }
            />
          </div>
        </Card>

        {challengeData.auto_team_enabled && (
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
            <div className="space-y-4">
              <div>
                <Label htmlFor="team-size">Team Size</Label>
                <Input
                  id="team-size"
                  type="number"
                  min="2"
                  max="10"
                  value={challengeData.team_size}
                  onChange={(e) => setChallengeData(prev => ({ ...prev, team_size: parseInt(e.target.value) || 3 }))}
                />
              </div>

              <div>
                <Label htmlFor="ranking-basis">Team Assignment Basis</Label>
                <select
                  id="ranking-basis"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  value={challengeData.team_ranking_basis}
                  onChange={(e) => setChallengeData(prev => ({ ...prev, team_ranking_basis: e.target.value }))}
                >
                  <option value="score">Overall Score</option>
                  <option value="streak">Current Streaks</option>
                  <option value="mixed">Mixed Performance</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <Zap className="h-4 w-4" />
                <span>Teams will be balanced based on similar skill levels</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h3 className="text-xl font-semibold mb-2">Invite Friends</h3>
        <p className="text-muted-foreground">
          {challengeData.auto_team_enabled 
            ? "Select friends - they'll be auto-grouped into balanced teams"
            : "Choose your teammates"
          }
        </p>
      </div>

      {friends.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No friends found. Add some friends first!</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {friends.map((friend) => (
            <Card 
              key={friend.user_id}
              className={`cursor-pointer transition-all ${
                selectedFriends.includes(friend.user_id) 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => handleFriendToggle(friend.user_id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-full flex items-center justify-center">
                      <span className="font-semibold">
                        {friend.display_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium">{friend.display_name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          🥗 {friend.current_nutrition_streak}d
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          💧 {friend.current_hydration_streak}d
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {selectedFriends.includes(friend.user_id) && (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Trophy className="h-4 w-4" />
        <span>{selectedFriends.length} friends selected</span>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Create Team Challenge
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                  step >= stepNum 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 3 && <div className="w-8 h-0.5 bg-muted"></div>}
              </div>
            ))}
          </div>

          {/* Step Content */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => step > 1 ? setStep(step - 1) : onClose()}
              disabled={isLoading}
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>

            <Button
              onClick={() => {
                if (step < 3) {
                  setStep(step + 1);
                } else {
                  createTeamChallenge();
                }
              }}
              disabled={
                isLoading || 
                (step === 1 && (!challengeData.title.trim() || !challengeData.description.trim())) ||
                (step === 3 && selectedFriends.length === 0)
              }
            >
              {isLoading ? 'Creating...' : step === 3 ? 'Create Team Challenge' : 'Next'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};