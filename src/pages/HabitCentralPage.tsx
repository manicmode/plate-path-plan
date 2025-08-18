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
import { Search, Clock, Target, Info, Plus, Award, X } from 'lucide-react';
import { useHabitTemplates, HabitTemplate } from '@/hooks/useHabitTemplates';
import { useCreateHabit } from '@/hooks/useCreateHabit';
import { useHabitRecommendations, HabitDifficulty } from '@/hooks/useHabitRecommendations';

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

export default function HabitCentralPage() {
  const [selectedDomain, setSelectedDomain] = useState<HabitDomain | undefined>('nutrition');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addedHabits, setAddedHabits] = useState<Set<string>>(new Set());
  
  // Recommendations state
  const [maxMinutes, setMaxMinutes] = useState<number>(20);
  const [maxDifficulty, setMaxDifficulty] = useState<HabitDifficulty>('medium');
  
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
          {template.coach_copy && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Info className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <h4 className="font-medium">Coach Copy</h4>
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
        <h1 className="text-3xl font-bold">Habit Central</h1>
        <p className="text-muted-foreground mt-2">
          Discover proven habit templates to build your perfect routine
        </p>
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