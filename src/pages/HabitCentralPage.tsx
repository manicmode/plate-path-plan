import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Clock, Target, Info, Plus, Award, X, Download, AlertTriangle } from 'lucide-react';
import { useHabitTemplates, HabitTemplate } from '@/hooks/useHabitTemplates';
import { useCreateHabit } from '@/hooks/useCreateHabit';
import { useHabitRecommendations, HabitDifficulty } from '@/hooks/useHabitRecommendations';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { CoachToneSelector } from '@/components/CoachToneSelector';
import { useCoachTone } from '@/hooks/useCoachTone';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useToast } from '@/hooks/use-toast';

// Custom hook for debouncing
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Text highlighting utility
const highlightText = (text: string, query: string) => {
  if (!query || query.trim().length < 2) return text;
  
  const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 px-0.5 rounded">{part}</mark> : part
  );
};

type HabitDomain = 'nutrition' | 'exercise' | 'recovery';

// CSV utility functions
function toCSV(rows: any[]) {
  if (!rows?.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map(h => esc(r[h])).join(','));
  return lines.join('\n');
}

async function downloadTemplatesCSV(supabase: any) {
  const { data, error } = await supabase
    .from('habit_template_export')
    .select('*');
  if (error) throw error;
  const csv = toCSV(data || []);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `habit_templates_${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function HabitCentralPage() {
  const { user } = useAuth();
  const { getCoachContent } = useCoachTone();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();
  const [selectedDomain, setSelectedDomain] = useState<HabitDomain | undefined>('nutrition');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addedHabits, setAddedHabits] = useState<Set<string>>(new Set());
  const [exportingCSV, setExportingCSV] = useState<boolean>(false);
  
  // Health check state
  const [healthIssues, setHealthIssues] = useState<number>(0);
  const [healthModalOpen, setHealthModalOpen] = useState<boolean>(false);
  const [healthData, setHealthData] = useState<any[]>([]);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);
  
  // Recommendations state
  const [maxMinutes, setMaxMinutes] = useState<number>(20);
  const [maxDifficulty, setMaxDifficulty] = useState<HabitDifficulty>('medium');
  
  // Trending habits state
  const [trendingHabits, setTrendingHabits] = useState<any[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  
  // Debounce search query (250ms)
  const debouncedSearchQuery = useDebounce(searchQuery, 250);
  
  // Use debounced query for API calls, but only if >= 2 chars
  const effectiveQuery = debouncedSearchQuery.trim().length >= 2 ? debouncedSearchQuery : undefined;

  const { data: templates, loading, error, categories } = useHabitTemplates({
    domain: selectedDomain,
    category: selectedCategory || undefined,
    q: effectiveQuery,
  });

  const { createHabit, loading: creating } = useCreateHabit();
  
  // Fetch recommendations
  const { data: recommendations, loading: recLoading, error: recError } = useHabitRecommendations({
    domain: selectedDomain,
    maxMinutes,
    maxDifficulty,
    limit: 12
  });

  // Fetch trending habits and health check on mount
  React.useEffect(() => {
    const fetchTrendingHabits = async () => {
      setTrendingLoading(true);
      try {
        const { data, error } = await supabase.rpc('habit_templates_trending_fn', { p_limit: 8 });
        if (error) {
          console.error('Error fetching trending habits:', error);
        } else {
          // Only include habits with actual adds in the last 14 days
          const filtered = (data || []).filter(habit => habit.adds_last_14d > 0);
          setTrendingHabits(filtered);
        }
      } catch (error) {
        console.error('Error fetching trending habits:', error);
      } finally {
        setTrendingLoading(false);
      }
    };

    const fetchHealthCheck = async () => {
      if (!isAdmin) return;
      
      try {
        const { count, error } = await supabase
          .from('habit_template_health')
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.error('Error fetching health check:', error);
        } else {
          setHealthIssues(count || 0);
        }
      } catch (error) {
        console.error('Error fetching health check:', error);
      }
    };

    fetchTrendingHabits();
    fetchHealthCheck();
  }, [isAdmin]);

  // 1B) Search Analytics Logging
  React.useEffect(() => {
    // Log search analytics after search results come back
    const logSearchEvent = async () => {
      try {
        if (effectiveQuery?.trim()?.length >= 2 && user?.id) {
          const topTemplate = templates?.[0];
          await supabase.from('habit_search_events').insert({
            user_id: user.id,
            q: effectiveQuery.trim(),
            domain: selectedDomain ?? null,
            category: selectedCategory || null,
            results: templates?.length ?? 0,
            top_slug: topTemplate?.slug ?? null,
          });
        }
      } catch {
        // ignore analytics failures - non-blocking
      }
    };

    // Only log when we have search results and are not in loading state
    if (!loading && effectiveQuery && templates) {
      logSearchEvent();
    }
  }, [effectiveQuery, selectedDomain, selectedCategory, templates, loading, user?.id]);

  const handleAddToMyHabits = async (template: HabitTemplate) => {
    if (addedHabits.has(template.id) || creating) {
      return; // Prevent double-clicking
    }

    try {
      setAddedHabits(prev => new Set(prev).add(template.id));
      
      await createHabit({
        name: template.name,
        domain: template.domain,
        goal_type: template.goal_type,
        target_value: template.goal_type !== 'bool' ? template.default_target || undefined : undefined,
        time_windows: template.time_windows,
        suggested_rules: template.suggested_rules,
        min_viable: template.min_viable,
        tags: template.tags,
        template_id: template.id, // Link to template for duplicate prevention
      });
    } catch (error) {
      // Remove from added set if there was an error
      setAddedHabits(prev => {
        const newSet = new Set(prev);
        newSet.delete(template.id);
        return newSet;
      });
      console.error('Failed to add habit:', error);
    }
  };

  const handleAddRecommendation = async (recommendation: any) => {
    if (addedHabits.has(recommendation.id) || creating) {
      return;
    }

    try {
      setAddedHabits(prev => new Set(prev).add(recommendation.id));
      
      await createHabit({
        name: recommendation.name,
        domain: recommendation.domain,
        goal_type: recommendation.goal_type,
        template_id: recommendation.id,
      });
    } catch (error) {
      setAddedHabits(prev => {
        const newSet = new Set(prev);
        newSet.delete(recommendation.id);
        return newSet;
      });
      console.error('Failed to add habit:', error);
    }
  };

  const handleExportCSV = async () => {
    if (exportingCSV) return;
    
    setExportingCSV(true);
    try {
      await downloadTemplatesCSV(supabase);
      toast({
        title: "Export successful",
        description: "Habit templates CSV has been downloaded.",
      });
    } catch (error) {
      console.error('CSV export error:', error);
      toast({
        title: "Failed to export CSV",
        description: "There was an error exporting the habit templates.",
        variant: "destructive"
      });
    } finally {
      setExportingCSV(false);
    }
  };

  const handleHealthModalOpen = async () => {
    if (!isAdmin || healthLoading) return;
    
    setHealthLoading(true);
    setHealthModalOpen(true);
    
    try {
      const { data, error } = await supabase
        .from('habit_template_health')
        .select(`
          slug,
          name,
          bad_bool_target,
          missing_target,
          bad_minutes
        `)
        .order('slug');
      
      if (error) {
        console.error('Error fetching health data:', error);
        toast({
          title: "Failed to load health data",
          description: "There was an error loading the health check data.",
          variant: "destructive"
        });
        setHealthData([]);
      } else {
        // Format issues string for each row
        const formattedData = (data || []).map(row => ({
          ...row,
          issues: [
            row.bad_bool_target ? 'bool has target' : '',
            row.missing_target ? 'missing target' : '',
            row.bad_minutes ? 'negative minutes' : ''
          ].filter(Boolean).join('; ')
        }));
        setHealthData(formattedData);
      }
    } catch (error) {
      console.error('Error fetching health data:', error);
      toast({
        title: "Failed to load health data",
        description: "There was an error loading the health check data.",
        variant: "destructive"
      });
      setHealthData([]);
    } finally {
      setHealthLoading(false);
    }
  };

  const renderTemplateCard = (template: HabitTemplate) => {
    const isAdded = addedHabits.has(template.id);
    
    return (
      <Card key={template.id} className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">
                  {highlightText(template.name, debouncedSearchQuery)}
                </CardTitle>
                {template.score && template.score >= 1.4 && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    Best match
                  </Badge>
                )}
                {template.created_at && new Date(template.created_at) >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                    New
                  </Badge>
                )}
              </div>
              {template.summary && (
                <CardDescription className="mt-1 text-sm">
                  {highlightText(template.summary, debouncedSearchQuery)}
                </CardDescription>
              )}
              {template.category && (
                <div className="mt-1">
                  <Badge variant="outline" className="text-xs">
                    {highlightText(template.category, debouncedSearchQuery)}
                  </Badge>
                </div>
              )}
            </div>
          {(template.coach_copy || template.coach_tones) && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Info className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <h4 className="font-medium">Coach Copy</h4>
                  {/* Show coach tones content if available, otherwise fallback to coach_copy */}
                  {template.coach_tones ? (
                    <>
                      {getCoachContent(template.coach_tones, 'reminder') && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Reminder:</p>
                          <p className="text-sm">{getCoachContent(template.coach_tones, 'reminder')}</p>
                        </div>
                      )}
                      {getCoachContent(template.coach_tones, 'encourage') && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Encouragement:</p>
                          <p className="text-sm">{getCoachContent(template.coach_tones, 'encourage')}</p>
                        </div>
                      )}
                      {getCoachContent(template.coach_tones, 'recovery') && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Recovery:</p>
                          <p className="text-sm">{getCoachContent(template.coach_tones, 'recovery')}</p>
                        </div>
                      )}
                      {getCoachContent(template.coach_tones, 'celebration') && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Celebration:</p>
                          <p className="text-sm">{getCoachContent(template.coach_tones, 'celebration')}</p>
                        </div>
                      )}
                    </>
                  ) : template.coach_copy ? (
                    <>
                      {template.coach_copy.reminder_line && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Reminder:</p>
                          <p className="text-sm">{template.coach_copy.reminder_line}</p>
                        </div>
                      )}
                      {template.coach_copy.encourage_line && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Encouragement:</p>
                          <p className="text-sm">{template.coach_copy.encourage_line}</p>
                        </div>
                      )}
                      {template.coach_copy.recovery_line && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Recovery:</p>
                          <p className="text-sm">{template.coach_copy.recovery_line}</p>
                        </div>
                      )}
                      {template.coach_copy.celebration_line && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Celebration:</p>
                          <p className="text-sm">{template.coach_copy.celebration_line}</p>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {template.min_viable && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>Min viable: {template.min_viable}</span>
          </div>
        )}
        
        {template.estimated_minutes && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{template.estimated_minutes} minutes</span>
          </div>
        )}
        
        {template.tags && (
          <div className="flex flex-wrap gap-1">
            {template.tags.split(',').map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag.trim()}
              </Badge>
            ))}
          </div>
        )}
        
        <Button 
          onClick={() => handleAddToMyHabits(template)}
          className="w-full"
          size="sm"
          disabled={creating || isAdded}
        >
          <Plus className="h-4 w-4 mr-2" />
          {isAdded ? 'Added!' : creating ? 'Adding...' : 'Add to My Habits'}
        </Button>
      </CardContent>
    </Card>
  );
};

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Habit Central</h1>
            <p className="text-muted-foreground mt-2">
              Discover proven habit templates to build your perfect routine
            </p>
          </div>
          <div className="flex items-center gap-3">
            <CoachToneSelector />
            {isAdmin && healthIssues > 0 && (
              <Dialog open={healthModalOpen} onOpenChange={setHealthModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={handleHealthModalOpen}
                    variant="outline"
                    size="sm"
                    data-testid="health-badge"
                    className="h-9 text-amber-600 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/20"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Health ⚠️
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]" data-testid="health-modal">
                  <DialogHeader>
                    <DialogTitle>Habit Template Health Check</DialogTitle>
                  </DialogHeader>
                  <div className="overflow-auto">
                    {healthLoading ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Slug</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Issues</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.from({ length: 4 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : healthData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No health issues found.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Slug</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Issues</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {healthData.map((row, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-sm">{row.slug}</TableCell>
                              <TableCell>{row.name}</TableCell>
                              <TableCell className="text-amber-600 dark:text-amber-400">{row.issues}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {isAdmin && (
              <Button
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                disabled={exportingCSV}
                data-testid="export-csv"
                className="h-9"
              >
                <Download className="h-4 w-4 mr-2" />
                {exportingCSV ? 'Exporting...' : 'Download CSV'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Suggested for You Ribbon */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Suggested for You</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span>Time:</span>
              <div className="w-24">
                <Slider
                  data-testid="recs-time"
                  value={[maxMinutes]}
                  onValueChange={(value) => setMaxMinutes(value[0])}
                  min={5}
                  max={45}
                  step={5}
                  className="w-full"
                />
              </div>
              <span className="text-muted-foreground">{maxMinutes}m</span>
            </div>
            <div className="flex rounded-md border">
              <button
                data-testid="recs-difficulty"
                onClick={() => setMaxDifficulty('easy')}
                className={`px-3 py-1 text-sm border-r ${maxDifficulty === 'easy' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                Easy
              </button>
              <button
                onClick={() => setMaxDifficulty('medium')}
                className={`px-3 py-1 text-sm border-r ${maxDifficulty === 'medium' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                Medium
              </button>
              <button
                onClick={() => setMaxDifficulty('hard')}
                className={`px-3 py-1 text-sm ${maxDifficulty === 'hard' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                Hard
              </button>
            </div>
          </div>
        </div>
        
        <div id="recs-ribbon" className="overflow-x-auto pb-4">
          {recLoading ? (
            <div className="flex gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-64">
                  <Card className="h-48">
                    <CardHeader>
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : recommendations && recommendations.length > 0 ? (
            <div className="flex gap-4">
              {recommendations.map((rec) => {
                const isAdded = addedHabits.has(rec.id);
                return (
                  <div key={rec.id} className="flex-shrink-0 w-64">
                    <Card className="h-48">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base leading-tight">{rec.name}</CardTitle>
                        {rec.summary && (
                          <CardDescription className="text-xs line-clamp-2">
                            {rec.summary}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex gap-1 flex-wrap">
                          {rec.reason && (
                            <Badge variant="outline" className="text-xs">
                              {rec.reason}
                            </Badge>
                          )}
                          {rec.category && (
                            <Badge variant="secondary" className="text-xs">
                              {rec.category}
                            </Badge>
                          )}
                        </div>
                        <Button 
                          onClick={() => handleAddRecommendation(rec)}
                          className="w-full"
                          size="sm"
                          disabled={creating || isAdded}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {isAdded ? 'Added!' : creating ? 'Adding...' : 'Add to My Habits'}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No suggestions match your filters — try more time or higher difficulty.</p>
            </div>
          )}
        </div>
      </div>

      {/* Trending Habits Section */}
      {trendingHabits.length > 0 && (
        <div data-testid="trending-section" className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Trending (14 days)</h2>
          <div className="overflow-x-auto pb-4">
            {trendingLoading ? (
              <div className="flex gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-64">
                    <Card className="h-48">
                      <CardHeader>
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-4">
                {trendingHabits.map((trending) => {
                  const isAdded = addedHabits.has(trending.id);
                  return (
                    <div key={trending.id} className="flex-shrink-0 w-64">
                      <Card className="h-48">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base leading-tight flex-1">{trending.name}</CardTitle>
                            <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 ml-2">
                              🔥 {trending.adds_last_14d} adds
                            </Badge>
                          </div>
                          {trending.category && (
                            <CardDescription className="text-xs">
                              {trending.category}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {trending.domain}
                            </Badge>
                          </div>
                          <Button 
                            onClick={() => handleAddToMyHabits({
                              id: trending.id,
                              name: trending.name,
                              domain: trending.domain,
                              goal_type: 'bool', // Default for trending
                              slug: trending.slug,
                              category: trending.category,
                            } as HabitTemplate)}
                            className="w-full"
                            size="sm"
                            disabled={creating || isAdded}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {isAdded ? 'Added!' : creating ? 'Adding...' : 'Add to My Habits'}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 space-y-4">
        {/* Domain Tabs */}
        <Tabs
          value={selectedDomain || 'all'}
          onValueChange={(value) => setSelectedDomain(value === 'all' ? undefined : value as HabitDomain)}
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
            <TabsTrigger value="exercise">Exercise</TabsTrigger>
            <TabsTrigger value="recovery">Recovery</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Category and Search */}
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search habits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-8"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    const input = document.querySelector('input[placeholder="Search habits..."]') as HTMLInputElement;
                    input?.focus();
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {searchQuery.length === 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Type 2+ letters to search
                </p>
              )}
            </div>
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-64 animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-full mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-8 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <p>Error loading habit templates: {error}</p>
          </div>
        </Card>
      ) : templates.length === 0 ? (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            {effectiveQuery ? (
              <>
                <p>No matches found</p>
                <p className="text-sm mt-2">Try broader terms or different categories</p>
              </>
            ) : (
              <>
                <p>No templates yet</p>
                <p className="text-sm mt-2">Check back later for habit templates!</p>
              </>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(renderTemplateCard)}
        </div>
      )}
    </div>
  );
}