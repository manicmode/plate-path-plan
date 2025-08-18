import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Clock, Target, Info, Plus } from 'lucide-react';
import { useHabitTemplates, HabitTemplate } from '@/hooks/useHabitTemplates';

type HabitDomain = 'nutrition' | 'exercise' | 'recovery';

export default function HabitCentralPage() {
  const [selectedDomain, setSelectedDomain] = useState<HabitDomain | undefined>('nutrition');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: templates, loading, error, categories } = useHabitTemplates({
    domain: selectedDomain,
    category: selectedCategory || undefined,
    q: searchQuery || undefined,
  });

  const handleAddToMyHabits = (template: HabitTemplate) => {
    // TODO: Open habit creation flow with prefilled data
    console.log('Adding template to habits:', template);
  };

  const renderTemplateCard = (template: HabitTemplate) => (
    <Card key={template.id} className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            {template.summary && (
              <CardDescription className="mt-1 text-sm">
                {template.summary}
              </CardDescription>
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
        >
          <Plus className="h-4 w-4 mr-2" />
          Add to My Habits
        </Button>
      </CardContent>
    </Card>
  );

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
            <p>No templates yet</p>
            <p className="text-sm mt-2">Check back later for habit templates!</p>
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