import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BodyScanResults {
  id: string;
  user_id: string;
  body_scan_id: string;
  chest_score: number;
  back_score: number;
  arms_score: number;
  core_score: number;
  legs_score: number;
  glutes_score: number;
  shoulders_score: number;
  created_at: string;
  updated_at: string;
}

export interface WeakMuscleGroups {
  groups: string[];
  scores: { [key: string]: number };
}

export function useBodyScanResults() {
  const [latestResults, setLatestResults] = useState<BodyScanResults | null>(null);
  const [weakMuscleGroups, setWeakMuscleGroups] = useState<WeakMuscleGroups | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLatestResults();
  }, []);

  const loadLatestResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('body_scan_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading body scan results:', error);
        return;
      }

      if (data) {
        setLatestResults(data);
        
        // Identify weak muscle groups (lowest 1-2 scores)
        const muscleScores = {
          'Chest': data.chest_score,
          'Back': data.back_score,
          'Arms': data.arms_score,
          'Core': data.core_score,
          'Legs': data.legs_score,
          'Glutes': data.glutes_score,
          'Shoulders': data.shoulders_score,
        };

        // Sort by score ascending and take the lowest 2
        const sortedGroups = Object.entries(muscleScores)
          .sort(([, a], [, b]) => a - b)
          .slice(0, 2);

        const weakGroups = sortedGroups.map(([group]) => group);
        const scores = Object.fromEntries(sortedGroups);

        setWeakMuscleGroups({
          groups: weakGroups,
          scores
        });
      }
    } catch (error) {
      console.error('Error loading body scan results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    latestResults,
    weakMuscleGroups,
    isLoading,
    refreshResults: loadLatestResults
  };
}