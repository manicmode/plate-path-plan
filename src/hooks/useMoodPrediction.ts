import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface MoodPrediction {
  id: string;
  prediction_date: string;
  predicted_mood: number;
  predicted_energy: number;
  message: string;
  emoji: string;
  confidence: 'low' | 'medium' | 'high';
  factors: string[];
  created_at: string;
}

export const useMoodPrediction = () => {
  const { user } = useAuth();
  const [prediction, setPrediction] = useState<MoodPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Fetch today's or tomorrow's prediction
  const fetchPrediction = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const predictionDate = tomorrow.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('mood_predictions')
        .select('*')
        .eq('user_id', user.id)
        .eq('prediction_date', predictionDate)
        .maybeSingle();

      if (error) {
        console.error('Error fetching mood prediction:', error);
      } else {
        setPrediction(data as MoodPrediction);
      }
    } catch (error) {
      console.error('Error in fetchPrediction:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate a new prediction
  const generatePrediction = async (manualTrigger = false) => {
    if (!user?.id || generating) return;

    setGenerating(true);
    try {
      console.log('🔮 Requesting mood prediction generation...');
      
      const { data, error } = await supabase.functions.invoke('predict-mood', {
        body: {
          user_id: user.id,
          manual_trigger: manualTrigger
        }
      });

      if (error) {
        console.error('Error generating prediction:', error);
        throw error;
      }

      if (data?.success && data?.prediction) {
        console.log('✅ Prediction generated successfully');
        
        // Update local state
        setPrediction({
          id: 'generated',
          prediction_date: data.prediction.prediction_date,
          predicted_mood: data.prediction.predicted_mood,
          predicted_energy: data.prediction.predicted_energy,
          message: data.prediction.message,
          emoji: data.prediction.emoji,
          confidence: data.prediction.confidence as 'low' | 'medium' | 'high',
          factors: data.prediction.factors || [],
          created_at: new Date().toISOString()
        });

        return data.prediction;
      } else {
        throw new Error('Failed to generate prediction');
      }
    } catch (error) {
      console.error('Error generating mood prediction:', error);
      throw error;
    } finally {
      setGenerating(false);
    }
  };

  // Rate prediction accuracy
  const ratePrediction = async (predictionId: string, rating: number) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('mood_predictions')
        .update({ user_rating: rating })
        .eq('id', predictionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error rating prediction:', error);
        throw error;
      }

      console.log('✅ Prediction rated successfully');
    } catch (error) {
      console.error('Error in ratePrediction:', error);
      throw error;
    }
  };

  // Check if prediction should be auto-generated
  const shouldAutoGenerate = () => {
    if (!user?.id || prediction) return false;

    // Only generate if user has some recent activity
    const hasActivity = localStorage.getItem(`last_activity_${user.id}`);
    return hasActivity !== null;
  };

  // Auto-generate prediction if needed
  useEffect(() => {
    const autoGenerate = async () => {
      if (shouldAutoGenerate() && !loading && !generating) {
        try {
          await generatePrediction(false);
        } catch (error) {
          console.log('Auto-generation failed, will try manual generation later');
        }
      }
    };

    // Wait a bit after loading to allow user activity check
    const timer = setTimeout(autoGenerate, 2000);
    return () => clearTimeout(timer);
  }, [loading, user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchPrediction();
  }, [user?.id]);

  return {
    prediction,
    loading,
    generating,
    fetchPrediction,
    generatePrediction,
    ratePrediction,
    hasPrediction: !!prediction
  };
};