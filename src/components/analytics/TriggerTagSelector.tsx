import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface TriggerTagSelectorProps {
  existingTags: string[];
  onTagsUpdate: (tags: string[]) => void;
  itemId: string;
  itemType: 'nutrition' | 'supplement' | 'hydration' | 'mood';
}

const PREDEFINED_TRIGGERS = [
  // Physical reactions
  { category: 'Physical', tags: ['Sugar Crash', 'Dairy Sensitivity', 'Bloating', 'Headache', 'Fatigue', 'Joint Pain'] },
  // Behavioral/lifestyle  
  { category: 'Behavioral', tags: ['Overeating', 'Mindful Eating', 'Too Much Caffeine', 'Missed Supplements', 'Late Night Eating'] },
  // Sleep related
  { category: 'Sleep', tags: ['Bad Sleep', 'Great Sleep', 'Sleep Deprivation', 'Restful Night'] },
  // Emotional/stress
  { category: 'Emotional', tags: ['Social Stress', 'Work Stress', 'Anxiety', 'Happy Mood', 'Irritable'] },
  // Hormonal (conditional based on profile)
  { category: 'Hormonal', tags: ['PMS', 'Hormonal Changes', 'Energy Boost', 'Low Energy'] }
];

export const TriggerTagSelector: React.FC<TriggerTagSelectorProps> = ({
  existingTags,
  onTagsUpdate,
  itemId,
  itemType
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(existingTags);
  const [saving, setSaving] = useState(false);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      let updatePromise;

      switch (itemType) {
        case 'nutrition':
          updatePromise = supabase
            .from('nutrition_logs')
            .update({ trigger_tags: selectedTags })
            .eq('id', itemId)
            .eq('user_id', user.id);
          break;
        case 'supplement':
          updatePromise = supabase
            .from('supplement_logs')
            .update({ trigger_tags: selectedTags })
            .eq('id', itemId)
            .eq('user_id', user.id);
          break;
        case 'hydration':
          updatePromise = supabase
            .from('hydration_logs')
            .update({ trigger_tags: selectedTags })
            .eq('id', itemId)
            .eq('user_id', user.id);
          break;
        case 'mood':
          updatePromise = supabase
            .from('mood_logs')
            .update({ trigger_tags: selectedTags })
            .eq('id', itemId)
            .eq('user_id', user.id);
          break;
        default:
          throw new Error('Invalid item type');
      }

      const { error } = await updatePromise;
      if (error) throw error;

      onTagsUpdate(selectedTags);
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving trigger tags:', error);
    } finally {
      setSaving(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = existingTags.filter(tag => tag !== tagToRemove);
    handleTagToggle(tagToRemove);
    onTagsUpdate(newTags);
  };

  return (
    <div className="space-y-2">
      {/* Display existing tags */}
      {existingTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {existingTags.map(tag => (
            <Badge 
              key={tag} 
              variant="secondary" 
              className="text-xs flex items-center gap-1"
            >
              {tag}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => removeTag(tag)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Add trigger button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-6 px-2"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Trigger Tag
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Trigger Tags</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {PREDEFINED_TRIGGERS.map(category => (
              <div key={category.category}>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  {category.category}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {category.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Tags'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};