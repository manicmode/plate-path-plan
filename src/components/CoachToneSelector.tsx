import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Sparkles, Flame, Lightbulb, Brain, Heart, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';

interface CoachToneOption {
  key: string;
  label: string;
  emoji: string;
  icon: React.ElementType;
  description: string;
}

const defaultToneOptions: CoachToneOption[] = [
  { key: 'gentle', label: 'Gentle', emoji: '✨', icon: Sparkles, description: 'Soft encouragement and patience' },
  { key: 'hype', label: 'Hype', emoji: '🔥', icon: Flame, description: 'High energy motivation' },
  { key: 'educational', label: 'Educational', emoji: '💡', icon: Lightbulb, description: 'Informative and teaching-focused' },
  { key: 'wise', label: 'Wise', emoji: '🧠', icon: Brain, description: 'Thoughtful and insightful guidance' },
  { key: 'supportive', label: 'Supportive', emoji: '💝', icon: Heart, description: 'Caring and understanding' },
  { key: 'energetic', label: 'Energetic', emoji: '⚡', icon: Zap, description: 'Dynamic and enthusiastic' },
];

export function CoachToneSelector() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTone, setSelectedTone] = useState<string>('gentle');
  const [availableTones, setAvailableTones] = useState<CoachToneOption[]>(defaultToneOptions);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load user preference and available tones from templates
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;

      try {
        // Load user preference
        const { data: prefs } = await supabase
          .from('habit_user_preferences')
          .select('preferred_tone')
          .eq('user_id', user.id)
          .maybeSingle();

        if (prefs?.preferred_tone) {
          setSelectedTone(prefs.preferred_tone);
        }

        // Load available tones from habit templates
        const { data: templates } = await supabase
          .from('habit_template')
          .select('coach_tones')
          .not('coach_tones', 'is', null)
          .limit(50);

        if (templates?.length) {
          const allToneKeys = new Set<string>();
          templates.forEach(template => {
            if (template.coach_tones && typeof template.coach_tones === 'object') {
              Object.keys(template.coach_tones).forEach(key => allToneKeys.add(key));
            }
          });

          // Filter default options to only include tones that exist in templates
          const filteredTones = defaultToneOptions.filter(tone => 
            allToneKeys.has(tone.key)
          );

          // Add any new tones found in templates that aren't in our defaults
          allToneKeys.forEach(key => {
            if (!defaultToneOptions.find(tone => tone.key === key)) {
              filteredTones.push({
                key,
                label: key.charAt(0).toUpperCase() + key.slice(1),
                emoji: '🎯',
                icon: Brain,
                description: `${key} coaching style`
              });
            }
          });

          if (filteredTones.length > 0) {
            setAvailableTones(filteredTones);
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    loadPreferences();
  }, [user?.id]);

  const handleToneChange = async (toneKey: string) => {
    if (!user?.id || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('habit_user_preferences')
        .upsert(
          { user_id: user.id, preferred_tone: toneKey },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      setSelectedTone(toneKey);
      setIsOpen(false);
      
      toast({
        title: "Coach tone updated",
        description: `Your AI coach will now use a ${toneKey} tone for habit reminders.`,
      });
    } catch (error) {
      console.error('Error updating preference:', error);
      toast({
        title: "Error",
        description: "Failed to update coach tone preference.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedToneOption = availableTones.find(tone => tone.key === selectedTone) || availableTones[0];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="h-9 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30"
          disabled={loading}
        >
          <selectedToneOption.icon className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
          <span className="mr-1">{selectedToneOption.emoji}</span>
          <span className="text-sm">{selectedToneOption.label} Coach</span>
          <ChevronDown className="h-4 w-4 ml-2 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-72 p-0 bg-background/95 backdrop-blur-sm border-purple-200 dark:border-purple-800" align="start">
        <Card className="border-0 shadow-none">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="pb-2 border-b border-border">
                <h4 className="font-medium text-sm">Choose Your AI Coach Tone</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Customize how your habit reminders and nudges are delivered
                </p>
              </div>
              
              <div className="space-y-2">
                {availableTones.map((tone) => {
                  const Icon = tone.icon;
                  const isSelected = selectedTone === tone.key;
                  
                  return (
                    <button
                      key={tone.key}
                      onClick={() => handleToneChange(tone.key)}
                      disabled={loading}
                      className={`w-full p-3 rounded-lg border text-left transition-all hover:border-purple-300 dark:hover:border-purple-700 ${
                        isSelected 
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-600' 
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{tone.emoji}</span>
                          <Icon className={`h-4 w-4 ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium text-sm ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-foreground'}`}>
                              {tone.label}
                            </span>
                            {isSelected && (
                              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {tone.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}