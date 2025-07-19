import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { ChallengeSelectionModal } from '@/components/challenge/ChallengeSelectionModal';
import { ChevronLeft, User, Trophy, TrendingUp, Calendar, Target } from 'lucide-react';

interface FriendProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  current_nutrition_streak: number;
  current_hydration_streak: number;
  current_supplement_streak: number;
}

interface FriendProfileViewProps {
  friendId: string;
  onClose: () => void;
}

export const FriendProfileView: React.FC<FriendProfileViewProps> = ({ friendId, onClose }) => {
  const { user } = useAuth();
  const [friendProfile, setFriendProfile] = useState<FriendProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  useEffect(() => {
    if (friendId) {
      fetchFriendProfile();
    }
  }, [friendId]);

  const fetchFriendProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          current_nutrition_streak,
          current_hydration_streak,
          current_supplement_streak
        `)
        .eq('user_id', friendId)
        .single();

      if (error) throw error;

      if (data) {
        const profile: FriendProfile = {
          ...data,
          display_name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Friend'
        };
        setFriendProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching friend profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="animate-pulse">
            <div className="h-16 w-16 bg-muted rounded-full"></div>
          </div>
          <div className="animate-pulse space-y-2">
            <div className="h-6 w-32 bg-muted rounded"></div>
            <div className="h-4 w-24 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!friendProfile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Friend profile not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onClose}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-2xl">
              {friendProfile.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{friendProfile.display_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">Friend</Badge>
              <Badge variant="outline" className="text-emerald-600">
                Active User
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Challenge Invite Section */}
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-orange-700 dark:text-orange-300 flex items-center justify-center gap-2">
                  <Target className="h-6 w-6" />
                  Ready for a Challenge?
                </h3>
                <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                  Challenge {friendProfile.display_name} to stay motivated together!
                </p>
              </div>
              
              <Button
                onClick={() => setShowChallengeModal(true)}
                size="lg"
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg"
              >
                🔥 Invite {friendProfile.first_name || 'them'} to a Challenge
              </Button>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChallengeModal(true)}
                  className="text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  💧 Water Challenge
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChallengeModal(true)}
                  className="text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  🥗 Nutrition Goals
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streaks and Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Current Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{friendProfile.current_nutrition_streak}</div>
                <div className="text-xs text-muted-foreground">Nutrition</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-cyan-600">{friendProfile.current_hydration_streak}</div>
                <div className="text-xs text-muted-foreground">Hydration</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{friendProfile.current_supplement_streak}</div>
                <div className="text-xs text-muted-foreground">Supplements</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">🔥</div>
                <div className="font-medium text-sm">Streak Master</div>
                <div className="text-xs text-muted-foreground">Consistent logging</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">💧</div>
                <div className="font-medium text-sm">Hydration Hero</div>
                <div className="text-xs text-muted-foreground">Daily water goals</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Challenge Selection Modal */}
      <ChallengeSelectionModal
        isOpen={showChallengeModal}
        onClose={() => setShowChallengeModal(false)}
        friendId={friendId}
        friendName={friendProfile.display_name}
      />
    </div>
  );
};