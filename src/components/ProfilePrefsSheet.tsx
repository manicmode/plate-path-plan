import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';
import { Target, Clock, Heart } from 'lucide-react';

interface ProfilePrefsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

interface UserProfile {
  goals: string[];
  constraints: string[];
  preferences: string[];
}

const GOALS = [
  { id: 'sleep', label: 'Better Sleep' },
  { id: 'fat-loss', label: 'Fat Loss' },
  { id: 'strength', label: 'Build Strength' },
  { id: 'focus', label: 'Mental Focus' },
  { id: 'energy', label: 'More Energy' }
];

const CONSTRAINTS = [
  { id: 'time-poor', label: 'Short on Time' },
  { id: 'no-equipment', label: 'No Equipment' },
  { id: 'joint-pain', label: 'Joint Pain/Mobility Issues' }
];

const PREFERENCES = [
  { id: 'morning', label: 'Morning Person' },
  { id: 'evening', label: 'Evening Person' },
  { id: 'outdoor', label: 'Prefer Outdoors' }
];

export function ProfilePrefsSheet({ open, onOpenChange, onSaved }: ProfilePrefsSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile>({
    goals: [],
    constraints: [],
    preferences: []
  });
  const [originalProfile, setOriginalProfile] = useState<UserProfile>({
    goals: [],
    constraints: [],
    preferences: []
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      track('profile_prefs_opened', { source: 'for_you' });
      loadProfile();
    }
  }, [open]);

  const loadProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profile')
        .select('goals, constraints, preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      const profileData = data ? {
        goals: Array.isArray(data.goals) ? data.goals as string[] : [],
        constraints: Array.isArray(data.constraints) ? data.constraints as string[] : [],
        preferences: Array.isArray(data.preferences) ? data.preferences as string[] : []
      } : { goals: [], constraints: [], preferences: [] };

      setProfile(profileData);
      setOriginalProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Couldn't load preferences",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (category: keyof UserProfile, value: string, checked: boolean) => {
    setProfile(prev => ({
      ...prev,
      [category]: checked 
        ? [...prev[category], value]
        : prev[category].filter(item => item !== value)
    }));
  };

  const isChanged = () => {
    return JSON.stringify(profile) !== JSON.stringify(originalProfile);
  };

  const handleSave = async () => {
    if (!user || !isChanged()) return;

    setSaving(true);
    try {
      const { error } = await supabase.rpc('rpc_upsert_user_profile', {
        p_goals: profile.goals,
        p_constraints: profile.constraints,
        p_preferences: profile.preferences
      });

      if (error) throw error;

      track('profile_prefs_saved', {
        goals: profile.goals,
        constraints: profile.constraints,
        preferences: profile.preferences
      });

      toast({
        title: "Saved",
        description: "Recommendations updated"
      });

      setOriginalProfile(profile);
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Couldn't save preferences",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const renderCheckboxGroup = (
    title: string,
    icon: React.ReactNode,
    items: { id: string; label: string }[],
    category: keyof UserProfile
  ) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-medium">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center space-x-2">
            <Checkbox
              id={`${category}-${item.id}`}
              checked={profile[category].includes(item.id)}
              onCheckedChange={(checked) => 
                handleCheckboxChange(category, item.id, checked as boolean)
              }
            />
            <Label 
              htmlFor={`${category}-${item.id}`}
              className="text-sm font-normal cursor-pointer"
            >
              {item.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Tune Recommendations</SheetTitle>
          <SheetDescription>
            Tell us about your goals and preferences to get better habit suggestions.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {renderCheckboxGroup("Goals", <Target className="h-4 w-4 text-primary" />, GOALS, 'goals')}
            
            <Separator />
            
            {renderCheckboxGroup("Constraints", <Clock className="h-4 w-4 text-orange-500" />, CONSTRAINTS, 'constraints')}
            
            <Separator />
            
            {renderCheckboxGroup("Preferences", <Heart className="h-4 w-4 text-red-500" />, PREFERENCES, 'preferences')}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSave}
                disabled={!isChanged() || saving}
                className="flex-1"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}