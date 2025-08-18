import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Clock, Target, Info, Plus, Award } from 'lucide-react';
import { useHabitTemplates, HabitTemplate } from '@/hooks/useHabitTemplates';
import { useCreateHabit } from '@/hooks/useCreateHabit';

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
                {template.score && template.score >= 1.2 && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    Best match
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
                className="pl-10"
              />
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