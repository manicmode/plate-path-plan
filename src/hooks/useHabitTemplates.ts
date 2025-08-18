import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type HabitDomain = 'nutrition' | 'exercise' | 'recovery';
type HabitGoalType = 'count' | 'duration' | 'bool';

export interface HabitTemplate {
  id: string;
  slug: string;
  name: string;
  domain: HabitDomain;
  category: string | null;
  summary: string | null;
  goal_type: HabitGoalType;
  default_target: number | null;
  min_viable: string | null;
  time_windows: any[] | null;
  suggested_rules: any[] | null;
  cues_and_stacking: string | null;
  equipment: string | null;
  contraindications: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  estimated_minutes: number | null;
  coach_copy: {
    reminder_line?: string;
    encourage_line?: string;
    recovery_line?: string;
    celebration_line?: string;
  } | null;
  tags: string | null;
  sources: string | null;
  created_at: string;
  score?: number; // Added for search results
}

interface UseHabitTemplatesParams {
  domain?: HabitDomain;
  category?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

interface UseHabitTemplatesReturn {
  data: HabitTemplate[];
  loading: boolean;
  error: string | null;
  categories: string[];
}

export const useHabitTemplates = ({
  domain,
  category,
  q,
  limit = 50,
  offset = 0
}: UseHabitTemplatesParams = {}): UseHabitTemplatesReturn => {
  const [data, setData] = useState<HabitTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use RPC search when query length >= 2, else fallback to table query
        if (q && q.trim().length >= 2) {
          // Use RPC search function
          const { data: templates, error: queryError } = await supabase.rpc(
            'habit_template_search',
            {
              p_q: q.trim(),
              p_domain: domain ?? null,
              p_category: category ?? null,
              p_limit: limit,
              p_offset: offset
            }
          );

          if (queryError) {
            throw queryError;
          }

          setData(templates as HabitTemplate[] || []);

        } else {
          // Fallback to regular table query
          let query = supabase
            .from('habit_template')
            .select('*', { count: 'exact' })
            .order('name', { ascending: true })
            .range(offset, offset + limit - 1);

          // Apply filters
          if (domain) {
            query = query.eq('domain', domain);
          }

          if (category) {
            query = query.ilike('category', `%${category}%`);
          }

          const { data: templates, error: queryError, count: totalCount } = await query;

          if (queryError) {
            throw queryError;
          }

          setData(templates as HabitTemplate[] || []);
        }

        // Get categories from the view (domain-specific)
        let categoryQuery = supabase
          .from('habit_template_categories')
          .select('domain, category');
        
        if (domain) {
          categoryQuery = categoryQuery.eq('domain', domain);
        }

        const { data: categoryData } = await categoryQuery;

        const uniqueCategories = Array.from(
          new Set(categoryData?.map(t => t.category).filter(Boolean))
        ).sort() as string[];

        setCategories(uniqueCategories);

      } catch (err) {
        console.error('Error fetching habit templates:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [domain, category, q, limit, offset]);

  return { data, loading, error, categories };
};