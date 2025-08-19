import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, Search } from 'lucide-react';
import { FiltersBar } from '@/components/habit-central/FiltersBar';
import { SearchBar } from '@/components/habit-central/SearchBar';
import { HabitsList } from '@/components/habit-central/HabitsList';
import { DetailsDrawer } from '@/components/habit-central/DetailsDrawer';
import { BulkActionsBar } from '@/components/habit-central/BulkActionsBar';
import { useHabitTemplatesV2, HabitTemplate, HabitTemplateFilters } from '@/hooks/useHabitTemplatesV2';
import { YourHabitsRail } from '@/components/YourHabitsRail';
import { StartHabitSheet } from '@/components/StartHabitSheet';
import { HeroHabitRotator } from '@/components/HeroHabitRotator';
import { SuggestionsForYou } from '@/components/SuggestionsForYou';
import { DomainCarousel } from '@/components/DomainCarousel';
import { HabitProgressPanel } from '@/components/HabitProgressPanel';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useHabitManagement } from '@/hooks/useHabitManagement';
import { useToast } from '@/hooks/use-toast';

export default function HabitCentralV2() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useIsAdmin();
  const { addHabit, logHabit, loading: habitManagementLoading } = useHabitManagement();
  const { toast } = useToast();
  const [userActiveHabits, setUserActiveHabits] = useState<string[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  
  // State for filters, search, and pagination
  const [filters, setFilters] = useState<HabitTemplateFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [detailsTemplate, setDetailsTemplate] = useState<HabitTemplate | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Store all loaded templates for bulk operations
  const [allLoadedTemplates, setAllLoadedTemplates] = useState<HabitTemplate[]>([]);
  
  // Start habit state
  const [startHabitTemplate, setStartHabitTemplate] = useState<HabitTemplate | null>(null);
  const [startHabitUserHabit, setStartHabitUserHabit] = useState<any>(null);
  const [startHabitOpen, setStartHabitOpen] = useState(false);
  const [habitsRailKey, setHabitsRailKey] = useState(0); // For refreshing rail
  
  // Browse all collapsible state
  const [browseAllOpen, setBrowseAllOpen] = useState(false);

  // Sync state with URL params on mount
  useEffect(() => {
    const urlFilters: HabitTemplateFilters = {};
    
    // Parse domains
    const domainsParam = searchParams.get('domains');
    if (domainsParam) {
      urlFilters.domains = domainsParam.split(',') as any[];
    }
    
    // Parse other filters
    const category = searchParams.get('category');
    if (category) urlFilters.category = category;
    
    const difficulty = searchParams.get('difficulty');
    if (difficulty) urlFilters.difficulty = difficulty as any;
    
    const goalType = searchParams.get('goalType');
    if (goalType) urlFilters.goalType = goalType as any;
    
    const equipment = searchParams.get('equipment');
    if (equipment) urlFilters.equipment = equipment;
    
    const tagsParam = searchParams.get('tags');
    if (tagsParam) {
      urlFilters.tags = tagsParam.split(',');
    }
    
    const search = searchParams.get('search');
    if (search) urlFilters.search = search;
    
    const page = searchParams.get('page');
    if (page) {
      setCurrentPage(parseInt(page, 10) || 1);
    }

    setFilters(urlFilters);
    setSearchQuery(search || '');
  }, []);

  // Update URL when state changes
  useEffect(() => {
    const newParams = new URLSearchParams();
    
    if (filters.domains && filters.domains.length > 0) {
      newParams.set('domains', filters.domains.join(','));
    }
    
    if (filters.category) newParams.set('category', filters.category);
    if (filters.difficulty) newParams.set('difficulty', filters.difficulty);
    if (filters.goalType) newParams.set('goalType', filters.goalType);
    if (filters.equipment) newParams.set('equipment', filters.equipment);
    
    if (filters.tags && filters.tags.length > 0) {
      newParams.set('tags', filters.tags.join(','));
    }
    
    if (searchQuery.trim()) {
      newParams.set('search', searchQuery.trim());
    }
    
    if (currentPage > 1) {
      newParams.set('page', currentPage.toString());
    }

    setSearchParams(newParams, { replace: true });
  }, [filters, searchQuery, currentPage, setSearchParams]);

  // Prepare filters for API call
  const apiFilters = useMemo(() => {
    const apiFilters: HabitTemplateFilters = { ...filters };
    if (searchQuery.trim()) {
      apiFilters.search = searchQuery.trim();
    }
    return apiFilters;
  }, [filters, searchQuery]);

  // Fetch data
  const { 
    data: templates, 
    loading, 
    error, 
    totalCount, 
    hasMore,
    categories,
    equipmentOptions,
    allTags
  } = useHabitTemplatesV2({
    filters: apiFilters,
    page: currentPage,
    pageSize: 20
  });

  // Update all loaded templates when new data comes in
  useEffect(() => {
    if (currentPage === 1) {
      setAllLoadedTemplates(templates);
    } else {
      setAllLoadedTemplates(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const newTemplates = templates.filter(t => !existingIds.has(t.id));
        return [...prev, ...newTemplates];
      });
    }
  }, [templates, currentPage]);

  // Handle filter changes (reset to page 1)
  const handleFiltersChange = (newFilters: HabitTemplateFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    setSelectedItems(new Set()); // Clear selection when filters change
  };

  // Handle search changes (reset to page 1)
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    setSelectedItems(new Set()); // Clear selection when search changes
  };

  // Handle load more
  const handleLoadMore = () => {
    if (hasMore && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Handle retry
  const handleRetry = () => {
    setCurrentPage(1);
    setSelectedItems(new Set());
  };

  // Handle selection changes
  const handleSelectionChange = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedItems);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkSelectionChange = (newSelected: Set<string>) => {
    setSelectedItems(newSelected);
  };

  // Handle details click
  const handleDetailsClick = (template: HabitTemplate) => {
    setDetailsTemplate(template);
    setDetailsOpen(true);
  };

  // Handle start habit
  const handleStartHabit = (template: HabitTemplate) => {
    setStartHabitTemplate(template);
    setStartHabitUserHabit(null); // Clear edit mode
    setStartHabitOpen(true);
  };

  const handleEditHabit = (template: HabitTemplate, userHabit: any) => {
    setStartHabitTemplate(template);
    setStartHabitUserHabit(userHabit);
    setStartHabitOpen(true);
  };

  // Handle habit started successfully
  const handleHabitStarted = () => {
    setHabitsRailKey(prev => prev + 1); // Refresh the rail
  };

  // Demo seed functionality (dev only)
  const handleSeedDemoHabits = async () => {
    if (!import.meta.env.DEV) return;
    
    setIsSeeding(true);
    try {
      const demoHabits = [
        { slug: 'morning-sunlight-5min', reminder: '08:00' },
        { slug: 'zone2-cardio-20', reminder: '12:30' },
        { slug: 'dark-chocolate-70-10g', reminder: '20:30' }
      ];

      // Start habits
      for (const habit of demoHabits) {
        await addHabit(
          habit.slug,
          { type: 'daily' },
          habit.reminder,
          null,
          null,
          null,
          'demo_seed'
        );
      }

      // Create backdated logs
      const today = new Date();
      for (const habit of demoHabits) {
        for (let i = 0; i < 5; i++) {
          const daysAgo = Math.floor(Math.random() * 10) + 1;
          await logHabit(
            habit.slug,
            true,
            null,
            null,
            null,
            'demo_seed',
            { backfill: true }
          );
        }
      }

      toast({
        title: "Seeded demo habits • Open Reports to see charts",
        duration: 4000
      });

      setHabitsRailKey(prev => prev + 1); // Refresh the rail
    } catch (error) {
      console.error('Error seeding demo habits:', error);
      toast({
        title: "Failed to seed demo habits",
        variant: "destructive"
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Habit Central</h1>
          <p className="text-lg text-muted-foreground">
            Build better habits with proven templates and smart tracking
          </p>
          
          {/* Demo Seed Button (dev only) */}
          {import.meta.env.DEV && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedDemoHabits}
                disabled={isSeeding || habitManagementLoading}
              >
                {isSeeding ? "Seeding..." : "Seed demo habits"}
              </Button>
            </div>
          )}
        </div>

        {/* Hero Rotator */}
        <HeroHabitRotator onStartHabit={handleStartHabit} />

        {/* AI Suggestions */}
        <SuggestionsForYou onStartHabit={handleStartHabit} />

        {/* Your Habits Rail */}
        <YourHabitsRail
          key={habitsRailKey}
          onHabitStarted={handleHabitStarted}
          onStartHabit={handleStartHabit}
        />

        {/* Domain Carousels */}
        <DomainCarousel
          domain="nutrition"
          title="Nutrition"
          onStartHabit={handleStartHabit}
          onDetailsClick={handleDetailsClick}
        />

        <DomainCarousel
          domain="exercise"
          title="Exercise"
          onStartHabit={handleStartHabit}
          onDetailsClick={handleDetailsClick}
        />

        <DomainCarousel
          domain="recovery"
          title="Recovery"
          onStartHabit={handleStartHabit}
          onDetailsClick={handleDetailsClick}
        />

        {/* Progress Panel */}
        <HabitProgressPanel />

        {/* Browse All (Collapsible) */}
        <Collapsible open={browseAllOpen} onOpenChange={setBrowseAllOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              <Search className="mr-2 h-4 w-4" />
              Browse all habit templates
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${browseAllOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6 pt-6">
            {/* Search */}
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              resultsCount={totalCount}
              loading={loading}
            />

            {/* Filters */}
            <FiltersBar
              filters={filters}
              onFiltersChange={handleFiltersChange}
              categories={categories}
              equipmentOptions={equipmentOptions}
              allTags={allTags}
            />

            {/* Bulk Actions - Show only for admins */}
            {isAdmin && (
              <BulkActionsBar
                selectedItems={selectedItems}
                currentPageItems={templates}
                onSelectionChange={handleBulkSelectionChange}
                allItemsData={allLoadedTemplates}
              />
            )}

            {/* Results */}
            <HabitsList
              templates={templates}
              loading={loading}
              error={error}
              hasMore={hasMore}
              searchQuery={searchQuery}
              selectedItems={selectedItems}
              onSelectionChange={handleSelectionChange}
              onDetailsClick={handleDetailsClick}
              onStartHabit={handleStartHabit}
              showAdminActions={isAdmin}
              onLoadMore={handleLoadMore}
              onRetry={handleRetry}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Details Drawer */}
        <DetailsDrawer
          template={detailsTemplate}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />

        {/* Start Habit Sheet */}
        <StartHabitSheet
          open={startHabitOpen}
          onOpenChange={setStartHabitOpen}
          template={startHabitTemplate}
          userHabit={startHabitUserHabit}
          onSuccess={handleHabitStarted}
        />
      </div>
    </div>
  );
}