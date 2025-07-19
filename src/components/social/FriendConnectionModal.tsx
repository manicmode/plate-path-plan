import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Flame, Target, Sparkles, TrendingUp } from 'lucide-react';

interface FriendConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendName: string;
  friendId: string;
}

const suggestedChallenges = [
  {
    id: 'hydration-hero',
    title: '💧 Hydration Hero',
    description: 'Drink 8 glasses of water daily for 7 days',
    duration: '7 days',
    difficulty: 'Beginner',
    participantCount: 234,
    trending: true,
  },
  {
    id: 'step-master',
    title: '🚶 Step Master',
    description: 'Walk 10,000 steps daily for 14 days',
    duration: '14 days', 
    difficulty: 'Beginner',
    participantCount: 189,
    trending: true,
  },
  {
    id: 'veggie-champion',
    title: '🥗 Veggie Champion',
    description: 'Eat 5 servings of vegetables daily for 21 days',
    duration: '21 days',
    difficulty: 'Intermediate',
    participantCount: 156,
    trending: false,
  },
];

export const FriendConnectionModal: React.FC<FriendConnectionModalProps> = ({
  isOpen,
  onClose,
  friendName,
  friendId
}) => {
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinChallenge = async (challengeId: string) => {
    setIsLoading(true);
    try {
      // Simulate joining challenge
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here you would integrate with your challenge joining logic
      console.log(`Joining challenge ${challengeId} with friend ${friendId}`);
      
      onClose();
    } catch (error) {
      console.error('Error joining challenge:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateChallenge = () => {
    // Here you would open the challenge creation modal
    console.log('Creating new challenge with friend', friendId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Users className="h-8 w-8 text-primary" />
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                You and {friendName} are now friends!
              </span>
              <Users className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-normal text-muted-foreground">
              Pick your next challenge together? 🎯
            </p>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Celebration Message */}
          <div className="text-center bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg p-4">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-lg font-semibold text-primary">
              Perfect accountability partners!
            </p>
            <p className="text-sm text-muted-foreground">
              Start a challenge together and keep each other motivated
            </p>
          </div>

          {/* Popular Challenges */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-semibold">Popular Challenges</h3>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
                Join the crowd
              </Badge>
            </div>

            <div className="grid gap-4">
              {suggestedChallenges.map((challenge) => (
                <Card 
                  key={challenge.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedChallenge === challenge.id 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/30'
                  }`}
                  onClick={() => setSelectedChallenge(challenge.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{challenge.title}</h4>
                          {challenge.trending && (
                            <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-xs">
                              <Flame className="h-3 w-3 mr-1" />
                              Trending
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {challenge.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            <span>{challenge.duration}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            <span>{challenge.difficulty}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{challenge.participantCount} participants</span>
                          </div>
                        </div>
                      </div>
                      
                      {selectedChallenge === challenge.id && (
                        <div className="ml-4">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => selectedChallenge && handleJoinChallenge(selectedChallenge)}
              disabled={!selectedChallenge || isLoading}
              className="flex-1 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white font-medium"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Joining Challenge...
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4 mr-2" />
                  Join Selected Challenge
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCreateChallenge}
              className="flex-1"
              disabled={isLoading}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Create Custom Challenge
            </Button>
          </div>

          {/* Later Option */}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-muted-foreground"
              disabled={isLoading}
            >
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};