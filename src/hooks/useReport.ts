import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";

export type ReportType = 'weekly' | 'monthly' | 'yearly';

interface BaseReportData {
  id: string;
  user_id: string;
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

interface WeeklyReportData extends BaseReportData {
  week_start_date: string;
  week_end_date: string;
}

interface MonthlyReportData extends BaseReportData {
  month_start_date: string;
  month_end_date: string;
}

interface YearlyReportData extends BaseReportData {
  year_start_date: string;
  year_end_date: string;
}

export type ReportData = WeeklyReportData | MonthlyReportData | YearlyReportData;

export const useReport = (reportType: ReportType = 'weekly', reportId?: string) => {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchReport = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        if (reportType === 'weekly') {
          let query = supabase
            .from('weekly_reports')
            .select('*')
            .eq('user_id', user.id);

          if (reportId) {
            query = query.eq('id', reportId);
          } else {
            query = query.order('week_start_date', { ascending: false }).limit(1);
          }

          const { data, error: fetchError } = await query.maybeSingle();
          
          if (fetchError) {
            console.error(`Error fetching weekly report:`, fetchError);
            setError('Failed to load report data');
            return;
          }

          if (!data) {
            setError(`No weekly report found`);
            return;
          }

          setReport(data as ReportData);
        } else if (reportType === 'monthly') {
          let query = supabase
            .from('monthly_reports')
            .select('*')
            .eq('user_id', user.id);

          if (reportId) {
            query = query.eq('id', reportId);
          } else {
            query = query.order('month_start_date', { ascending: false }).limit(1);
          }

          const { data, error: fetchError } = await query.maybeSingle();
          
          if (fetchError) {
            console.error(`Error fetching monthly report:`, fetchError);
            setError('Failed to load report data');
            return;
          }

          if (!data) {
            setError(`No monthly report found`);
            return;
          }

          setReport(data as ReportData);
        } else if (reportType === 'yearly') {
          let query = supabase
            .from('yearly_reports')
            .select('*')
            .eq('user_id', user.id);

          if (reportId) {
            query = query.eq('id', reportId);
          } else {
            query = query.order('year_start_date', { ascending: false }).limit(1);
          }

          const { data, error: fetchError } = await query.maybeSingle();
          
          if (fetchError) {
            console.error(`Error fetching yearly report:`, fetchError);
            setError('Failed to load report data');
            return;
          }

          if (!data) {
            setError(`No yearly report found`);
            return;
          }

          setReport(data as ReportData);
        }
      } catch (err) {
        console.error(`Error in useReport (${reportType}):`, err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [user, reportType, reportId]);

  return { report, loading, error };
};