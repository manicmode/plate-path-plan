
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Plus, X, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';
import { useFriendTagging } from '@/hooks/useFriendTagging';

interface PrivateChallengeCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const challengePresets = [
  { type: 'hydration', emoji: '💧', name: 'Hydration Hero', metric: 'water_glasses', unit: 'glasses', defaultValue: 8 },
  { type: 'nutrition', emoji: '🥗', name: 'Veggie Champion', metric: 'veggie_servings', unit: 'servings', defaultValue: 5 },
  { type: 'nutrition', emoji: '🚫🍭', name: 'Sugar-Free Challenge', metric: 'days_no_sugar', unit: 'days', defaultValue: 1 },
  { type: 'exercise', emoji: '🚶', name: 'Step Master', metric: 'steps', unit: 'steps', defaultValue: 10000 },
  { type: 'nutrition', emoji: '🍎', name: 'Fruit Fiesta', metric: 'fruit_servings', unit: 'servings', defaultValue: 3 },
  { type: 'mindfulness', emoji: '🧘', name: 'Mindful Moments', metric: 'meditation_minutes', unit: 'minutes', defaultValue: 10 },
  { type: 'nutrition', emoji: '💪', name: 'Protein Power', metric: 'protein_grams', unit: 'grams', defaultValue: 100 },
  { type: 'exercise', emoji: '🏃', name: 'Workout Warrior', metric: 'workout_minutes', unit: 'minutes', defaultValue: 30 },
];

const durationOptions = [
  { days: 1, label: '1 Day' },
  { days: 3, label: '3 Days' },
  { days: 7, label: '1 Week' },
  { days: 14, label: '2 Weeks' },
  { days: 21, label: '3 Weeks' },
  { days: 30, label: '1 Month' }
];

export const PrivateChallengeCreationModal: React.FC<PrivateChallengeCreationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createPrivateChallenge } = usePrivateChallenges();
  const { friends } = useFriendTagging(false); // Use regular friends data
  const [selectedPreset, setSelectedPreset] = useState<typeof challengePresets[0] | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(7);
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePresetSelect = (preset: typeof challengePresets[0]) => {
    setSelectedPreset(preset);
    setTitle(preset.name);
    setDescription(`${preset.name} challenge: Achieve your ${preset.metric} goal daily!`);
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const validateUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  const handleCreate = async () => {
    if (!selectedPreset || !title.trim()) {
      setError('Please select a challenge type and enter a title');
      return;
    }

    // Validate selected friend IDs are proper UUIDs
    const invalidFriendIds = selectedFriends.filter(id => !validateUUID(id));
    if (invalidFriendIds.length > 0) {
      console.warn('Invalid friend IDs detected, proceeding without them:', invalidFriendIds);
      // Filter out invalid IDs instead of failing
      const validFriendIds = selectedFriends.filter(id => validateUUID(id));
      setSelectedFriends(validFriendIds);
    }

    setIsCreating(true);
    setError(null);
    
    try {
      const validInvitedIds = selectedFriends.filter(id => validateUUID(id));
      
      const success = await createPrivateChallenge({
        title: title.trim(),
        description: description.trim(),
        category: selectedPreset.type,
        challenge_type: 'habit',
        target_metric: selectedPreset.metric,
        target_value: selectedPreset.defaultValue,
        target_unit: selectedPreset.unit,
        duration_days: duration,
        start_date: startDate.toISOString().split('T')[0],
        max_participants: maxParticipants,
        invited_user_ids: validInvitedIds,
        badge_icon: selectedPreset.emoji,
      });

      if (success) {
        onClose();
        // Reset form
        setSelectedPreset(null);
        setTitle('');
        setDescription('');
        setDuration(7);
        setMaxParticipants(10);
        setStartDate(new Date());
        setSelectedFriends([]);
        setError(null);
      } else {
        setError('Failed to create challenge. Please try again.');
      }
    } catch (err) {
      console.error('Challenge creation error:', err);
      setError('An error occurred while creating the challenge.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create Private Challenge
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Challenge Type Selection */}
            <div className="space-y-3">
              <h3 className="font-semibold">Choose Challenge Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {challengePresets.map((preset) => (
                  <Button
                    key={preset.type + preset.name}
                    variant={selectedPreset?.name === preset.name ? "default" : "outline"}
                    onClick={() => handlePresetSelect(preset)}
                    className="h-auto p-3 flex flex-col items-center gap-2"
                  >
                    <span className="text-2xl">{preset.emoji}</span>
                    <span className="text-xs text-center">{preset.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {selectedPreset && (
              <>
                {/* Challenge Details */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Challenge Title</label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter challenge title"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your challenge goal"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Duration and Settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Duration</label>
                    <Select value={duration.toString()} onValueChange={(value) => setDuration(Number(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {durationOptions.map((option) => (
                          <SelectItem key={option.days} value={option.days.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Participants</label>
                    <Select value={maxParticipants.toString()} onValueChange={(value) => setMaxParticipants(Number(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 19 }, (_, i) => i + 2).map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} people
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => date && setStartDate(date)}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Friend Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Invite Friends</label>
                    <Badge variant="secondary">
                      {selectedFriends.length} selected
                    </Badge>
                  </div>
                  
                  {friends.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {friends.map((friend) => (
                        <div
                          key={friend.id}
                          onClick={() => toggleFriend(friend.id)}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors",
                            selectedFriends.includes(friend.id)
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-primary/50"
                          )}
                        >
                          <span className="text-lg">👤</span>
                          <span className="text-sm font-medium">{friend.name}</span>
                          {selectedFriends.includes(friend.id) && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              Invited
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No friends available to invite</p>
                      <p className="text-xs">You can still create the challenge and invite friends later</p>
                    </div>
                  )}
                </div>

                {/* Selected Friends Summary */}
                {selectedFriends.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Selected Invitees</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedFriends.map((friendId) => {
                        const friend = friends.find(f => f.id === friendId);
                        if (!friend) return null;
                        return (
                          <Badge key={friendId} variant="secondary" className="flex items-center gap-1">
                            <span>👤</span>
                            <span>{friend.name}</span>
                            <X 
                              className="w-3 h-3 cursor-pointer hover:text-destructive" 
                              onClick={() => toggleFriend(friendId)}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!selectedPreset || !title.trim() || isCreating}
            className="flex-1"
          >
            {isCreating ? 'Creating...' : 'Create Challenge'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
