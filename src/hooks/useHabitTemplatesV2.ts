import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type HabitDomain = 'nutrition' | 'exercise' | 'recovery' | 'lifestyle';
export type HabitGoalType = 'count' | 'duration' | 'bool';
export type HabitDifficulty = 'easy' | 'medium' | 'hard';

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
  difficulty: HabitDifficulty | null;
  estimated_minutes: number | null;
  coach_copy: {
    reminder_line?: string;
    encourage_line?: string;
    recovery_line?: string;
    celebration_line?: string;
  } | null;
  coach_tones: {
    [tone: string]: {
      reminder_line?: string;
      encourage_line?: string;
      recovery_line?: string;
      celebration_line?: string;
    };
  } | null;
  tags: string | null;
  sources: string | null;
  created_at: string;
}

export interface HabitTemplateFilters {
  domains?: HabitDomain[];
  category?: string;
  difficulty?: HabitDifficulty;
  goalType?: HabitGoalType;
  equipment?: string;
  tags?: string[];
  search?: string;
}

interface UseHabitTemplatesV2Params {
  filters?: HabitTemplateFilters;
  page?: number;
  pageSize?: number;
}

interface UseHabitTemplatesV2Return {
  data: HabitTemplate[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  categories: string[];
  equipmentOptions: string[];
  allTags: string[];
}

export const useHabitTemplatesV2 = ({
  filters = {},
  page = 1,
  pageSize = 20
}: UseHabitTemplatesV2Params = {}): UseHabitTemplatesV2Return => {
  const [data, setData] = useState<HabitTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [equipmentOptions, setEquipmentOptions] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  // Sanitize filter options
  const sanitizeOptions = (options: (string | null | undefined)[]): string[] => {
    return Array.from(new Set(
      options
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        .map(v => v.trim())
    )).sort();
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setData([]);
          setTotalCount(0);
          setCategories([]);
          setEquipmentOptions([]);
          setAllTags([]);
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        // Build query for templates
        let query = supabase
          .from('habit_templates')
          .select('*', { count: 'exact' });

        // Apply filters
        if (filters.domains && filters.domains.length > 0) {
          query = query.in('domain', filters.domains);
        }

        if (filters.category) {
          query = query.ilike('category', `%${filters.category}%`);
        }

        if (filters.difficulty) {
          query = query.eq('difficulty', filters.difficulty);
        }

        if (filters.goalType) {
          query = query.eq('goal_type', filters.goalType);
        }

        if (filters.equipment) {
          query = query.ilike('equipment', `%${filters.equipment}%`);
        }

        // Handle search across multiple fields
        if (filters.search && filters.search.trim().length >= 2) {
          const searchTerm = filters.search.trim();
          query = query.or(`name.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%,tags.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`);
        }

        // Handle tag filtering (OR across selected tags)
        if (filters.tags && filters.tags.length > 0) {
          const tagConditions = filters.tags.map(tag => `tags.ilike.%${tag}%`).join(',');
          query = query.or(tagConditions);
        }

        // Pagination
        const offset = (page - 1) * pageSize;
        query = query
          .order('name', { ascending: true })
          .range(offset, offset + pageSize - 1);

        const { data: templates, error: queryError, count } = await query;

        if (queryError) {
          throw queryError;
        }

        setData(templates as HabitTemplate[] || []);
        setTotalCount(count || 0);

      } catch (err) {
        console.error('Error fetching habit templates:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [filters, page, pageSize]);

  // Fetch filter options separately
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Get categories
        let categoryQuery = supabase
          .from('habit_templates')
          .select('category')
          .not('category', 'is', null);

        if (filters.domains && filters.domains.length > 0) {
          categoryQuery = categoryQuery.in('domain', filters.domains);
        }

        const { data: categoryData } = await categoryQuery;
        const uniqueCategories = sanitizeOptions(categoryData?.map(t => t.category) || []);
        setCategories(uniqueCategories);

        // Get equipment options
        const { data: equipmentData } = await supabase
          .from('habit_templates')
          .select('equipment')
          .not('equipment', 'is', null);

        const uniqueEquipment = sanitizeOptions(equipmentData?.map(t => t.equipment) || []);
        setEquipmentOptions(uniqueEquipment);

        // Get all tags
        const { data: tagsData } = await supabase
          .from('habit_templates')
          .select('tags')
          .not('tags', 'is', null);

        const allTagsList = tagsData?.flatMap(t => 
          t.tags ? t.tags.split(',').map(tag => tag.trim()) : []
        ) || [];
        const uniqueTags = sanitizeOptions(allTagsList);
        setAllTags(uniqueTags);

      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };

    fetchFilterOptions();
  }, [filters.domains]);

  const hasMore = useMemo(() => {
    return data.length > 0 && data.length < totalCount;
  }, [data.length, totalCount]);

  return {
    data,
    loading,
    error,
    totalCount,
    hasMore,
    categories,
    equipmentOptions,
    allTags
  };
};