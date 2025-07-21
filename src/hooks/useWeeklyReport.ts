import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";

interface WeeklyReportData {
  id: string;
  user_id: string;
  week_start_date: string;
  week_end_date: string;
  title: string;
  summary_text: string | null;
  overall_score: number | null;
  report_data: {
    nutrition_score?: number;
    exercise_score?: number;
    wellness_score?: number;
    meal_quality_score?: number;
    avg_mood_score?: number;
    workouts_completed?: number;
    total_exercise_hours?: number;
    protein_log?: Array<{ day: string; protein: number; goal: number; calories: number }>;
    mood_log?: Array<{ day: string; mood: number; energy: number; stress: number; sleep: number }>;
    supplement_log?: Array<{ name: string; taken: number; scheduled: number; compliance: number }>;
    daily_steps?: Array<{ day: string; steps: number }>;
    nutrition_wins?: string[];
    flagged_ingredients?: Array<{ day: string; ingredient: string; reason: string }>;
    ai_insights?: string[];
    sleep_quality?: number;
    avg_sleep?: number;
  };
  created_at: string;
  updated_at: string;
}

export const useWeeklyReport = (reportId?: string) => {
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchReport = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Only fetch if reportId is provided
      if (!reportId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('weekly_reports')
          .select('*')
          .eq('user_id', user.id)
          .eq('id', reportId)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching weekly report:', fetchError);
          setError('Failed to load report data');
          return;
        }

        if (!data) {
          setError('Report not found');
          return;
        }

        setReport(data as WeeklyReportData);
      } catch (err) {
        console.error('Error in useWeeklyReport:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [user, reportId]);

  return { report, loading, error };
};