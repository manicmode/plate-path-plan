import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Zap, Users, Calendar, Target, X } from 'lucide-react';
import { useChallenge } from '@/contexts/ChallengeContext';
import { useToast } from '@/hooks/use-toast';

interface MicroChallengeCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const goalOptions = [
  { value: 'drink-water', label: 'Drink 3+ glasses of water', emoji: '💧' },
  { value: 'log-meals', label: 'Log at least 2 meals', emoji: '📝' },
  { value: 'eat-veggies', label: 'Eat 2 servings of veggies', emoji: '🥗' },
  { value: 'custom', label: 'Custom goal', emoji: '🎯' },
];

const durationOptions = [
  { value: 1, label: '1 Day', subtitle: 'Quick challenge' },
  { value: 3, label: '3 Days', subtitle: 'Weekend boost' },
  { value: 7, label: '1 Week', subtitle: 'Habit starter' },
];

const mockFriends = [
  { id: 'friend-1', name: 'Alex 🦄', avatar: '🦄' },
  { id: 'friend-2', name: 'Sam 🔥', avatar: '🔥' },
  { id: 'friend-3', name: 'Jordan 🚀', avatar: '🚀' },
  { id: 'friend-4', name: 'Casey 🌈', avatar: '🌈' },
  { id: 'friend-5', name: 'Health Guru 🥗', avatar: '🥗' },
];

export function MicroChallengeCreationModal({ open, onOpenChange }: MicroChallengeCreationModalProps) {
  const [step, setStep] = useState(1);
  const [goalType, setGoalType] = useState('');
  const [customGoal, setCustomGoal] = useState('');
  const [duration, setDuration] = useState<number>(1);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const { createChallenge } = useChallenge();
  const { toast } = useToast();

  const handleReset = () => {
    setStep(1);
    setGoalType('');
    setCustomGoal('');
    setDuration(1);
    setSelectedFriends([]);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreateChallenge = () => {
    const selectedGoal = goalOptions.find(g => g.value === goalType);
    const goalName = goalType === 'custom' ? customGoal : selectedGoal?.label;
    const goalEmoji = selectedGoal?.emoji || '🎯';
    
    const challengeName = `${goalEmoji} ${goalName}`;
    
    const newChallenge = {
      name: challengeName,
      type: 'micro' as const,
      creatorId: 'current-user-id',
      creatorName: 'You',
      goalType: goalType as any,
      customGoal: goalType === 'custom' ? customGoal : undefined,
      startDate: new Date(),
      endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
      participants: ['current-user-id', ...selectedFriends],
      participantDetails: {
        'current-user-id': { name: 'You', avatar: '👤' },
        ...mockFriends
          .filter(f => selectedFriends.includes(f.id))
          .reduce((acc, friend) => ({
            ...acc,
            [friend.id]: { name: friend.name, avatar: friend.avatar }
          }), {})
      },
      progress: {
        'current-user-id': 0,
        ...selectedFriends.reduce((acc, friendId) => ({ ...acc, [friendId]: 0 }), {})
      },
    };

    createChallenge(newChallenge);
    
    toast({
      title: "Micro-Challenge Created! ⚡",
      description: `"${challengeName}" is now live with ${selectedFriends.length + 1} participants!`,
    });

    handleClose();
  };

  const canProceed = () => {
    if (step === 1) return goalType !== '' && (goalType !== 'custom' || customGoal.trim() !== '');
    if (step === 2) return duration > 0;
    if (step === 3) return true; // Can create with 0 friends
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Zap className="h-6 w-6 text-yellow-500" />
            Create Micro-Challenge
            <Badge variant="secondary" className="ml-2">
              Step {step}/3
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Goal Type */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                Choose your micro-challenge goal
              </div>
              
              <div className="space-y-3">
                {goalOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      goalType === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    }`}
                    onClick={() => setGoalType(option.value)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{option.emoji}</span>
                      <span className="font-medium">{option.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {goalType === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="custom-goal">Custom Goal</Label>
                  <Input
                    id="custom-goal"
                    placeholder="e.g., Walk 5000 steps"
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Duration */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                How long should this challenge last?
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {durationOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      duration === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    }`}
                    onClick={() => setDuration(option.value)}
                  >
                    <div className="text-center">
                      <div className="font-semibold text-lg">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.subtitle}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Participants */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Invite friends (optional)
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {mockFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                      selectedFriends.includes(friend.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    }`}
                    onClick={() => toggleFriend(friend.id)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-sm">{friend.avatar}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{friend.name}</span>
                  </div>
                ))}
              </div>

              {selectedFriends.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Selected Friends:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedFriends.map((friendId) => {
                      const friend = mockFriends.find(f => f.id === friendId);
                      return (
                        <Badge
                          key={friendId}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {friend?.avatar} {friend?.name}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFriend(friendId);
                            }}
                          />
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
            >
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>
            
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleCreateChallenge}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                Create Challenge ⚡
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}