import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarIcon, 
  Users, 
  Target, 
  Clock, 
  Globe, 
  Lock, 
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Droplets,
  Apple,
  Utensils,
  Candy
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { createChallenge } from '@/lib/challenges';
import { useToast } from '@/hooks/use-toast';

interface ChallengeCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChallengeCreated?: () => void; // Callback to refresh challenges list
  defaultVisibility?: 'public' | 'private';
}

export const ChallengeCreationModal: React.FC<ChallengeCreationModalProps> = ({
  open,
  onOpenChange,
  onChallengeCreated,
  defaultVisibility = 'public'
}) => {
  if (import.meta.env.DEV) console.log("[hooks-order-ok] ChallengeCreationModal");
  
  const [step, setStep] = useState(1);
  const [challengeName, setChallengeName] = useState('');
  const [goalType, setGoalType] = useState<string>('');
  const [customGoal, setCustomGoal] = useState('');
  const [duration, setDuration] = useState<string>('7');
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [challengeType, setChallengeType] = useState<'public' | 'private'>(defaultVisibility);
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [isCreating, setIsCreating] = useState(false);
  
  const { toast } = useToast();

  // Reset form when modal opens or defaultVisibility changes
  useEffect(() => {
    if (open) {
      setChallengeType(defaultVisibility);
    }
  }, [open, defaultVisibility]);

  const goalOptions = [
    { 
      value: 'no-sugar', 
      label: '🍯 No Sugar Challenge', 
      description: 'Avoid added sugars and sweets',
      emoji: '🍯',
      icon: <Candy className="h-5 w-5" />
    },
    { 
      value: 'log-meals', 
      label: '📝 Log 3 Meals Daily', 
      description: 'Track breakfast, lunch & dinner',
      emoji: '📝',
      icon: <Utensils className="h-5 w-5" />
    },
    { 
      value: 'drink-water', 
      label: '💧 8 Glasses of Water', 
      description: 'Stay hydrated throughout the day',
      emoji: '💧',
      icon: <Droplets className="h-5 w-5" />
    },
    { 
      value: 'eat-veggies', 
      label: '🥬 Eat Veggies Daily', 
      description: 'Include vegetables in every meal',
      emoji: '🥬',
      icon: <Apple className="h-5 w-5" />
    },
    
    // Recovery & Mindfulness Goals
    { 
      value: 'daily-meditation', 
      label: '🧘‍♂️ Daily Meditation', 
      description: 'Meditate for 10 minutes daily',
      emoji: '🧘',
      icon: <Target className="h-5 w-5" />
    },
    { 
      value: 'breathing-practice', 
      label: '🫁 Breathing Practice', 
      description: 'Practice breathing exercises daily',
      emoji: '🫁',
      icon: <Target className="h-5 w-5" />
    },
    { 
      value: 'yoga-flow', 
      label: '🧘‍♀️ Daily Yoga', 
      description: 'Complete a yoga session daily',
      emoji: '🧘‍♀️',
      icon: <Target className="h-5 w-5" />
    },
    { 
      value: 'sleep-prep', 
      label: '🌙 Sleep Preparation', 
      description: 'Complete sleep prep routine',
      emoji: '🌙',
      icon: <Target className="h-5 w-5" />
    },
    { 
      value: 'thermotherapy', 
      label: '🔥❄️ Thermotherapy', 
      description: 'Hot & cold therapy sessions',
      emoji: '🔥',
      icon: <Target className="h-5 w-5" />
    },
    
    { 
      value: 'custom', 
      label: '✨ Custom Goal', 
      description: 'Create your own challenge',
      emoji: '🎯',
      icon: <Target className="h-5 w-5" />
    },
  ];

  const durationOptions = [
    { value: '1', label: '1 Day', description: 'Quick sprint challenge' },
    { value: '3', label: '3 Days', description: 'Weekend challenge' },
    { value: '7', label: '7 Days', description: 'Full week commitment' },
    { value: '14', label: '14 Days', description: 'Two week journey' },
    { value: 'custom', label: 'Custom', description: 'Pick your own dates' },
  ];

  const handleCreateChallenge = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    console.log('[CreateChallenge] clicked');

    if (!challengeName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a challenge name",
        variant: "destructive",
      });
      return;
    }

    if (!goalType) {
      toast({
        title: "Missing Information", 
        description: "Please select a goal type",
        variant: "destructive",
      });
      return;
    }

    if (goalType === 'custom' && !customGoal.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your custom goal",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const selectedGoal = goalOptions.find(option => option.value === goalType);
      const goalEmoji = selectedGoal?.emoji || '🎯';
      
      const title = goalType === 'custom' ? customGoal : `${goalEmoji} ${selectedGoal?.label}`;
      const desc = goalType === 'custom' 
        ? customGoal 
        : selectedGoal?.description || 'Join this challenge to build healthy habits';

      // Calculate duration in days
      let days = 7; // default
      if (duration === 'custom' && customEndDate) {
        const diffTime = customEndDate.getTime() - new Date().getTime();
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } else {
        days = parseInt(duration);
      }

      const payload = {
        title: title.trim(),
        description: desc?.trim() || null,
        visibility: challengeType === 'public' ? 'public' : 'private',
        durationDays: Number(days ?? 7),
        coverEmoji: goalEmoji || null,
      } as const;
      
      console.log('[CreateChallenge] payload', payload);

      const { data, error } = await createChallenge(payload);
      
      if (error) {
        console.error('[CreateChallenge] error', error);
        toast({
          title: "Error",
          description: typeof error === 'string' ? error : 'Failed to create challenge',
          variant: "destructive",
        });
        return;
      }

      if (!data?.id) {
        console.error('[CreateChallenge] no ID returned');
        toast({
          title: "Error", 
          description: 'Challenge creation failed - no ID returned',
          variant: "destructive",
        });
        return;
      }

      console.log('[CreateChallenge] success', data);
      toast({
        title: "Challenge Created! 🎉",
        description: `"${title}" is now live and ready for participants!`,
      });

      // Reset form
      setStep(1);
      setChallengeName('');
      setGoalType('');
      setCustomGoal('');
      setDuration('7');
      setCustomEndDate(undefined);
      setChallengeType(defaultVisibility);
      setMaxParticipants('10');

      // Close modal and trigger refresh
      onOpenChange(false);
      onChallengeCreated?.();
      window.dispatchEvent(new CustomEvent('challenges:refresh'));

    } catch (e: any) {
      console.error('[CreateChallenge] exception', e);
      toast({
        title: "Error",
        description: e?.message ?? 'Unexpected error',
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const isStepValid = () => {
    switch (step) {
      case 1: return challengeName.trim().length > 0;
      case 2: return goalType !== '' && (goalType !== 'custom' || customGoal.trim().length > 0);
      case 3: return duration !== '' && (duration !== 'custom' || customEndDate);
      case 4: return true;
      default: return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Target className="h-6 w-6 text-primary" />
            Create New Challenge
            <Badge variant="outline" className="ml-auto">
              Step {step} of 4
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map((stepNum) => (
            <div key={stepNum} className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                stepNum <= step 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {stepNum}
              </div>
              {stepNum < 4 && (
                <div className={cn(
                  "w-8 h-1 rounded transition-all",
                  stepNum < step ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Challenge Details</h3>
                  <p className="text-sm text-muted-foreground">Give your challenge a catchy name and description</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="challenge-name">Challenge Name *</Label>
                  <Input
                    id="challenge-name"
                    placeholder="e.g., Summer Hydration Challenge 💧"
                    value={challengeName}
                    onChange={(e) => setChallengeName(e.target.value)}
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Challenge Type</Label>
                  <RadioGroup 
                    value={challengeType} 
                    onValueChange={(value: 'public' | 'private') => setChallengeType(value)}
                  >
                    <Card className={cn(
                      "p-4 cursor-pointer transition-all",
                      challengeType === 'public' && "border-primary bg-primary/5"
                    )}>
                      <Label className="flex items-center space-x-3 cursor-pointer">
                        <RadioGroupItem value="public" />
                        <Globe className="h-5 w-5 text-blue-500" />
                        <div className="flex-1">
                          <div className="font-semibold">Public Challenge</div>
                          <div className="text-sm text-muted-foreground">Anyone can join and compete</div>
                        </div>
                      </Label>
                    </Card>

                    <Card className={cn(
                      "p-4 cursor-pointer transition-all",
                      challengeType === 'private' && "border-primary bg-primary/5"
                    )}>
                      <Label className="flex items-center space-x-3 cursor-pointer">
                        <RadioGroupItem value="private" />
                        <Lock className="h-5 w-5 text-purple-500" />
                        <div className="flex-1">
                          <div className="font-semibold">Private Challenge</div>
                          <div className="text-sm text-muted-foreground">Invite-only with friends</div>
                        </div>
                      </Label>
                    </Card>
                  </RadioGroup>
                </div>

                {challengeType === 'public' && (
                  <div className="space-y-2">
                    <Label htmlFor="max-participants">Maximum Participants</Label>
                    <Select value={maxParticipants} onValueChange={setMaxParticipants}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        <SelectItem value="5">5 people</SelectItem>
                        <SelectItem value="10">10 people</SelectItem>
                        <SelectItem value="20">20 people</SelectItem>
                        <SelectItem value="50">50 people</SelectItem>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Goal Selection */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Challenge Goal</h3>
                  <p className="text-sm text-muted-foreground">What will participants try to achieve?</p>
                </div>

                <div className="grid gap-3">
                  {goalOptions.map((option) => (
                    <Card 
                      key={option.value}
                      className={cn(
                        "p-4 cursor-pointer transition-all hover:shadow-md",
                        goalType === option.value && "border-primary bg-primary/5"
                      )}
                      onClick={() => setGoalType(option.value)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-primary">{option.icon}</div>
                        <div className="flex-1">
                          <div className="font-semibold">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        </div>
                        {goalType === option.value && (
                          <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {goalType === 'custom' && (
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="custom-goal">Custom Goal Description *</Label>
                    <Textarea
                      id="custom-goal"
                      placeholder="Describe what participants need to do daily..."
                      value={customGoal}
                      onChange={(e) => setCustomGoal(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Duration */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Challenge Duration</h3>
                  <p className="text-sm text-muted-foreground">How long will this challenge run?</p>
                </div>

                <div className="grid gap-3">
                  {durationOptions.map((option) => (
                    <Card 
                      key={option.value}
                      className={cn(
                        "p-4 cursor-pointer transition-all hover:shadow-md",
                        duration === option.value && "border-primary bg-primary/5"
                      )}
                      onClick={() => setDuration(option.value)}
                    >
                      <div className="flex items-center space-x-3">
                        <Clock className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <div className="font-semibold">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        </div>
                        {duration === option.value && (
                          <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {duration === 'custom' && (
                  <div className="space-y-2 mt-4">
                    <Label>End Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !customEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customEndDate ? format(customEndDate, "PPP") : "Pick an end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
                        <Calendar
                          mode="single"
                          selected={customEndDate}
                          onSelect={setCustomEndDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Summary */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Challenge Summary</h3>
                  <p className="text-sm text-muted-foreground">Review your challenge details before creating</p>
                </div>

                <Card className="p-4 bg-muted/30">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Challenge Name:</span>
                      <span>{challengeName}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-medium">Goal:</span>
                      <span>{goalOptions.find(g => g.value === goalType)?.label}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-medium">Duration:</span>
                      <span>
                        {duration === 'custom' 
                          ? `Until ${customEndDate ? format(customEndDate, "MMM d") : 'TBD'}`
                          : `${duration} day${duration !== '1' ? 's' : ''}`
                        }
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-medium">Type:</span>
                      <Badge variant={challengeType === 'public' ? 'default' : 'secondary'}>
                        {challengeType === 'public' ? '🌍 Public' : '🔒 Private'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={step === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            
            {step < 4 ? (
              <Button 
                onClick={nextStep} 
                disabled={!isStepValid()}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleCreateChallenge}
                disabled={isCreating}
                className="flex items-center gap-2"
                data-testid="create-challenge-button"
              >
                <Plus className="h-4 w-4" />
                 {isCreating ? 'Creating...' : 'Create Challenge'}
               </Button>
             )}
           </div>
         </div>

          {/* Debug Info - temporary */}
          <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
            Debug: challengeType: {challengeType}, computed vis: {challengeType === "private" ? "private" : "public"}, days: {duration === 'custom' && customEndDate ? Math.ceil((customEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : parseInt(duration) || 7}
            <br />
            Submitting: {isCreating ? "yes" : "no"}
          </div>
       </DialogContent>
     </Dialog>
   );
};