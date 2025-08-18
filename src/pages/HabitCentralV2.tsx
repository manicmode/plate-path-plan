import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiltersBar } from '@/components/habit-central/FiltersBar';
import { SearchBar } from '@/components/habit-central/SearchBar';
import { HabitsList } from '@/components/habit-central/HabitsList';
import { DetailsDrawer } from '@/components/habit-central/DetailsDrawer';
import { BulkActionsBar } from '@/components/habit-central/BulkActionsBar';
import { useHabitTemplatesV2, HabitTemplate, HabitTemplateFilters } from '@/hooks/useHabitTemplatesV2';

export default function HabitCentralV2() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State for filters, search, and pagination
  const [filters, setFilters] = useState<HabitTemplateFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [detailsTemplate, setDetailsTemplate] = useState<HabitTemplate | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Store all loaded templates for bulk operations
  const [allLoadedTemplates, setAllLoadedTemplates] = useState<HabitTemplate[]>([]);

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Habit Central</h1>
          <p className="text-muted-foreground mt-2">
            Browse and discover evidence-based habit templates
          </p>
        </div>

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

        {/* Bulk Actions */}
        <BulkActionsBar
          selectedItems={selectedItems}
          currentPageItems={templates}
          onSelectionChange={handleBulkSelectionChange}
          allItemsData={allLoadedTemplates}
        />

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
          onLoadMore={handleLoadMore}
          onRetry={handleRetry}
        />

        {/* Details Drawer */}
        <DetailsDrawer
          template={detailsTemplate}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      </div>
    </div>
  );
}