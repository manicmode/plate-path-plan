import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dice6, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

export const MoodDataGenerator: React.FC = () => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const generateSampleMoodData = async () => {
    if (!user) {
      toast.error('You must be logged in to generate sample data');
      return;
    }

    setIsGenerating(true);
    try {
      const sampleData = [];
      const today = new Date();
      
      // Generate 14 days of sample data
      for (let i = 13; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Generate realistic mood patterns
        const baseMood = 5 + Math.sin(i / 3) * 2; // Natural variation
        const baseEnergy = 6 + Math.cos(i / 4) * 2;
        const baseWellness = 6 + Math.sin(i / 5) * 1.5;
        
        // Add some random variation
        const mood = Math.max(1, Math.min(10, Math.round(baseMood + (Math.random() - 0.5) * 2)));
        const energy = Math.max(1, Math.min(10, Math.round(baseEnergy + (Math.random() - 0.5) * 2)));
        const wellness = Math.max(1, Math.min(10, Math.round(baseWellness + (Math.random() - 0.5) * 2)));
        
        // Generate sample journal entries with patterns
        let journalText = '';
        let aiTags: string[] = [];
        
        if (mood < 5 && Math.random() > 0.5) {
          const negativeEntries = [
            'Had some dairy at lunch, feeling a bit off',
            'Ate too much sugar today, energy crashed',
            'Feeling bloated after eating gluten',
            'Headache all day, might be from stress',
            'Low energy, didn\'t sleep well'
          ];
          journalText = negativeEntries[Math.floor(Math.random() * negativeEntries.length)];
          
          if (journalText.includes('dairy')) aiTags.push('bloating');
          if (journalText.includes('sugar')) aiTags.push('fatigue');
          if (journalText.includes('gluten')) aiTags.push('bloating');
          if (journalText.includes('headache')) aiTags.push('headache');
          if (journalText.includes('stress')) aiTags.push('stress');
        } else if (mood > 7 && Math.random() > 0.7) {
          const positiveEntries = [
            'Great workout today, feeling energized!',
            'Had a lovely day with friends',
            'Very productive day at work',
            'Beautiful weather, went for a long walk',
            'Feeling grateful and content'
          ];
          journalText = positiveEntries[Math.floor(Math.random() * positiveEntries.length)];
          aiTags.push('positive_mood');
        }

        sampleData.push({
          user_id: user.id,
          date: date.toISOString().split('T')[0],
          mood,
          energy,
          wellness,
          journal_text: journalText || null,
          ai_detected_tags: aiTags.length > 0 ? aiTags : null,
        });
      }

      // Insert data using upsert to avoid conflicts
      const { error } = await supabase
        .from('mood_logs')
        .upsert(sampleData, { onConflict: 'user_id,date' });

      if (error) {
        console.error('Error generating sample data:', error);
        toast.error('Failed to generate sample data');
        return;
      }

      toast.success(`Generated ${sampleData.length} days of sample mood data! 📊`);
    } catch (error) {
      console.error('Error generating sample data:', error);
      toast.error('Failed to generate sample data');
    } finally {
      setIsGenerating(false);
    }
  };

  const clearAllMoodData = async () => {
    if (!user) {
      toast.error('You must be logged in to clear data');
      return;
    }

    setIsClearing(true);
    try {
      const { error } = await supabase
        .from('mood_logs')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing mood data:', error);
        toast.error('Failed to clear mood data');
        return;
      }

      toast.success('All mood data cleared successfully');
    } catch (error) {
      console.error('Error clearing mood data:', error);
      toast.error('Failed to clear mood data');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border-dashed border-2 border-gray-300 dark:border-gray-600">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-center">
          <Dice6 className="h-5 w-5 text-blue-600" />
          <span>Chart Data Generator</span>
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Generate sample data to test the mood chart
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={generateSampleMoodData}
          disabled={isGenerating}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          {isGenerating ? 'Generating...' : 'Generate 14 Days of Sample Data'}
        </Button>
        
        <Button
          onClick={clearAllMoodData}
          disabled={isClearing}
          variant="outline"
          className="w-full text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isClearing ? 'Clearing...' : 'Clear All Mood Data'}
        </Button>

        <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2 border-t">
          <p>• Sample data includes mood patterns</p>
          <p>• AI pattern detection examples</p>
          <p>• Realistic trend variations</p>
        </div>
      </CardContent>
    </Card>
  );
};