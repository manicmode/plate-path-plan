import React from 'react';
import { HabitCard } from './HabitCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw } from 'lucide-react';
import { HabitTemplate } from '@/hooks/useHabitTemplatesV2';

interface HabitsListProps {
  templates: HabitTemplate[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  searchQuery?: string;
  selectedItems: Set<string>;
  onSelectionChange: (id: string, selected: boolean) => void;
  onDetailsClick: (template: HabitTemplate) => void;
  onStartHabit?: (template: HabitTemplate) => void;
  showAdminActions?: boolean;
  onLoadMore?: () => void;
  onRetry?: () => void;
}

export function HabitsList({
  templates,
  loading,
  error,
  hasMore,
  searchQuery,
  selectedItems,
  onSelectionChange,
  onDetailsClick,
  onStartHabit,
  showAdminActions = false,
  onLoadMore,
  onRetry
}: HabitsListProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-muted-foreground">Something went wrong</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (!loading && templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Search className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h3 className="text-lg font-medium text-muted-foreground">No habits found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or clearing some filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <HabitCard
            key={template.id}
            template={template}
            searchQuery={searchQuery}
            isSelected={selectedItems.has(template.id)}
            onSelectionChange={(selected) => onSelectionChange(template.id, selected)}
              onDetailsClick={() => onDetailsClick(template)}
              onStartHabit={onStartHabit}
              showAdminActions={showAdminActions}
              source="list"
            />
        ))}
        
        {/* Loading skeletons */}
        {loading && (
          <>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Load more button */}
      {hasMore && !loading && onLoadMore && (
        <div className="flex justify-center pt-6">
          <Button variant="outline" onClick={onLoadMore}>
            Load more habits
          </Button>
        </div>
      )}
    </div>
  );
}