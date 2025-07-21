import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface SmartSuggestion {
  tag: string;
  confidence: number;
  count: number;
  reason: string;
}

interface SmartTriggerSuggestionProps {
  suggestions: SmartSuggestion[];
  loading: boolean;
  itemId: string;
  itemType: 'nutrition' | 'supplement' | 'hydration' | 'mood';
  existingTags: string[];
  onTagsUpdate: (tags: string[]) => void;
}

export const SmartTriggerSuggestion: React.FC<SmartTriggerSuggestionProps> = ({
  suggestions,
  loading,
  itemId,
  itemType,
  existingTags,
  onTagsUpdate
}) => {
  const { user } = useAuth();
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState<string | null>(null);

  // Filter out suggestions that are already tagged or dismissed
  const availableSuggestions = suggestions.filter(
    suggestion => 
      !existingTags.includes(suggestion.tag) && 
      !dismissedSuggestions.includes(suggestion.tag)
  );

  const addSuggestedTag = async (tag: string) => {
    if (!user) return;

    setAddingTag(tag);
    try {
      const updatedTags = [...existingTags, tag];
      
      let updatePromise;
      switch (itemType) {
        case 'nutrition':
          updatePromise = supabase
            .from('nutrition_logs')
            .update({ trigger_tags: updatedTags })
            .eq('id', itemId)
            .eq('user_id', user.id);
          break;
        case 'supplement':
          updatePromise = supabase
            .from('supplement_logs')
            .update({ trigger_tags: updatedTags })
            .eq('id', itemId)
            .eq('user_id', user.id);
          break;
        case 'hydration':
          updatePromise = supabase
            .from('hydration_logs')
            .update({ trigger_tags: updatedTags })
            .eq('id', itemId)
            .eq('user_id', user.id);
          break;
        case 'mood':
          updatePromise = supabase
            .from('mood_logs')
            .update({ trigger_tags: updatedTags })
            .eq('id', itemId)
            .eq('user_id', user.id);
          break;
        default:
          throw new Error('Invalid item type');
      }

      const { error } = await updatePromise;
      if (error) throw error;

      onTagsUpdate(updatedTags);
      setDismissedSuggestions(prev => [...prev, tag]);
    } catch (error) {
      console.error('Error adding suggested tag:', error);
    } finally {
      setAddingTag(null);
    }
  };

  const dismissSuggestion = (tag: string) => {
    setDismissedSuggestions(prev => [...prev, tag]);
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
        <div className="animate-pulse">🔍 Analyzing patterns...</div>
      </div>
    );
  }

  if (availableSuggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {availableSuggestions.map((suggestion) => (
        <div key={suggestion.tag} className="flex items-center space-x-2 p-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 dark:from-blue-950/30 dark:to-indigo-950/30 dark:border-blue-800">
          <div className="flex items-center space-x-2 flex-1">
            <Lightbulb className="h-3 w-3 text-blue-500" />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium">
                  You've previously tagged similar items with
                </span>
                <Badge 
                  variant="secondary" 
                  className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {suggestion.tag}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {suggestion.reason} ({suggestion.confidence}% confidence)
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => addSuggestedTag(suggestion.tag)}
              disabled={addingTag === suggestion.tag}
              className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
              title="Add this tag"
            >
              {addingTag === suggestion.tag ? (
                <div className="h-3 w-3 animate-spin rounded-full border border-green-600 border-r-transparent" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dismissSuggestion(suggestion.tag)}
              className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              title="Dismiss suggestion"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};