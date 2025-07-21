import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface SmartSuggestion {
  tag: string;
  confidence: number;
  count: number;
  reason: string;
}

interface SuggestionContext {
  itemName: string;
  itemType: 'nutrition' | 'supplement' | 'hydration' | 'mood';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

export const useSmartTriggerSuggestions = (context: SuggestionContext) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && context.itemName) {
      analyzePatternsAndSuggest();
    }
  }, [user, context.itemName, context.itemType]);

  const getTimeOfDay = (dateString: string): string => {
    const hour = new Date(dateString).getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const findSimilarItems = async (itemName: string, itemType: string) => {
    if (!user) return [];

    // Get the last 90 days of data for pattern analysis
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const keywords = itemName.toLowerCase().split(' ').filter(word => word.length > 2);
    
    try {
      switch (itemType) {
        case 'nutrition': {
          const { data, error } = await supabase
            .from('nutrition_logs')
            .select('id, food_name, trigger_tags, created_at')
            .eq('user_id', user.id)
            .gte('created_at', cutoffDate.toISOString())
            .not('trigger_tags', 'is', null);

          if (error) throw error;

          return (data || []).filter(item => {
            const itemNameValue = item.food_name?.toLowerCase() || '';
            const hasTags = item.trigger_tags && item.trigger_tags.length > 0;
            return hasTags && keywords.some(keyword => itemNameValue.includes(keyword));
          });
        }
        
        case 'supplement': {
          const { data, error } = await supabase
            .from('supplement_logs')
            .select('id, name, trigger_tags, created_at')
            .eq('user_id', user.id)
            .gte('created_at', cutoffDate.toISOString())
            .not('trigger_tags', 'is', null);

          if (error) throw error;

          return (data || []).filter(item => {
            const itemNameValue = item.name?.toLowerCase() || '';
            const hasTags = item.trigger_tags && item.trigger_tags.length > 0;
            return hasTags && keywords.some(keyword => itemNameValue.includes(keyword));
          });
        }
        
        case 'hydration': {
          const { data, error } = await supabase
            .from('hydration_logs')
            .select('id, name, trigger_tags, created_at')
            .eq('user_id', user.id)
            .gte('created_at', cutoffDate.toISOString())
            .not('trigger_tags', 'is', null);

          if (error) throw error;

          return (data || []).filter(item => {
            const itemNameValue = item.name?.toLowerCase() || '';
            const hasTags = item.trigger_tags && item.trigger_tags.length > 0;
            return hasTags && keywords.some(keyword => itemNameValue.includes(keyword));
          });
        }
        
        case 'mood': {
          const { data, error } = await supabase
            .from('mood_logs')
            .select('id, journal_text, trigger_tags, created_at')
            .eq('user_id', user.id)
            .gte('created_at', cutoffDate.toISOString())
            .not('trigger_tags', 'is', null);

          if (error) throw error;

          return (data || []).filter(item => {
            const itemNameValue = item.journal_text?.toLowerCase() || '';
            const hasTags = item.trigger_tags && item.trigger_tags.length > 0;
            return hasTags && keywords.some(keyword => itemNameValue.includes(keyword));
          });
        }
        
        default:
          return [];
      }
    } catch (error) {
      console.error('Error fetching similar items:', error);
      return [];
    }
  };

  const analyzePatternsAndSuggest = async () => {
    setLoading(true);
    try {
      const similarItems = await findSimilarItems(context.itemName, context.itemType);

      if (similarItems.length === 0) {
        setSuggestions([]);
        return;
      }

      // Count tag frequencies
      const tagCounts: { [tag: string]: { count: number; times: string[] } } = {};
      
      similarItems.forEach(item => {
        const timeOfDay = getTimeOfDay(item.created_at);
        const tags = item.trigger_tags || [];
        
        tags.forEach((tag: string) => {
          if (!tagCounts[tag]) {
            tagCounts[tag] = { count: 0, times: [] };
          }
          tagCounts[tag].count++;
          if (!tagCounts[tag].times.includes(timeOfDay)) {
            tagCounts[tag].times.push(timeOfDay);
          }
        });
      });

      // Generate suggestions for tags that appear 3+ times
      const validSuggestions: SmartSuggestion[] = [];
      
      Object.entries(tagCounts).forEach(([tag, data]) => {
        if (data.count >= 3) {
          const confidence = Math.min(95, Math.round((data.count / similarItems.length) * 100));
          
          let reason = `Previously tagged ${data.count} similar items`;
          if (data.times.includes(context.timeOfDay)) {
            reason += ` during ${context.timeOfDay}`;
            // Boost confidence for time-of-day matches
            const boostedConfidence = Math.min(95, confidence + 10);
            validSuggestions.push({
              tag,
              confidence: boostedConfidence,
              count: data.count,
              reason
            });
          } else {
            validSuggestions.push({
              tag,
              confidence,
              count: data.count,
              reason
            });
          }
        }
      });

      // Sort by confidence and limit to top 2 suggestions
      validSuggestions.sort((a, b) => b.confidence - a.confidence);
      setSuggestions(validSuggestions.slice(0, 2));

    } catch (error) {
      console.error('Error analyzing patterns:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  return { suggestions, loading };
};