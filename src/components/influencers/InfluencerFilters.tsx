import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import type { InfluencerFilters } from './types';

interface InfluencerFiltersProps {
  value: InfluencerFilters;
  onChange: (filters: InfluencerFilters) => void;
}

export function InfluencerFilters({ value, onChange }: InfluencerFiltersProps) {
  const [localQuery, setLocalQuery] = useState(value.query);
  const debouncedQuery = useDebounce(localQuery, 250);

  // Update parent when debounced query changes
  useEffect(() => {
    if (debouncedQuery !== value.query) {
      onChange({ ...value, query: debouncedQuery });
    }
  }, [debouncedQuery, value, onChange]);

  const handleCategoryChange = (category: string) => {
    onChange({ ...value, category: category as InfluencerFilters['category'] });
  };

  const handleSortChange = (sort: string) => {
    onChange({ ...value, sort: sort as InfluencerFilters['sort'] });
  };

  const handleVerifiedToggle = () => {
    onChange({ ...value, verifiedOnly: !value.verifiedOnly });
  };

  return (
    <div className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/50">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or handle..."
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              className="pl-10 bg-card/50 border-border/50 focus:bg-card/80 transition-colors"
              aria-label="Search influencers"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Filter by:</span>
            </div>

            {/* Category Select */}
            <Select value={value.category} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-auto min-w-[120px] bg-card/50 border-border/50">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="fitness">Fitness</SelectItem>
                <SelectItem value="nutrition">Nutrition</SelectItem>
                <SelectItem value="mindfulness">Mindfulness</SelectItem>
                <SelectItem value="recovery">Recovery</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Select */}
            <Select value={value.sort} onValueChange={handleSortChange}>
              <SelectTrigger className="w-auto min-w-[140px] bg-card/50 border-border/50">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trending">Trending</SelectItem>
                <SelectItem value="followers">Most Followed</SelectItem>
                <SelectItem value="upcoming">Upcoming Challenges</SelectItem>
                <SelectItem value="new">New Creators</SelectItem>
              </SelectContent>
            </Select>

            {/* Verified Toggle */}
            <Button
              variant={value.verifiedOnly ? "default" : "outline"}
              size="sm"
              onClick={handleVerifiedToggle}
              className={cn(
                "flex items-center gap-2 transition-all",
                value.verifiedOnly
                  ? "bg-primary text-primary-foreground"
                  : "bg-card/50 border-border/50 hover:bg-card/80"
              )}
              aria-pressed={value.verifiedOnly}
              aria-label="Filter verified influencers only"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Verified Only</span>
              <span className="sm:hidden">Verified</span>
            </Button>

            {/* Active Filters Count */}
            {(value.query || value.category !== 'all' || value.sort !== 'trending' || value.verifiedOnly) && (
              <Badge variant="secondary" className="ml-auto">
                {[
                  value.query && 'search',
                  value.category !== 'all' && 'category',
                  value.sort !== 'trending' && 'sort',
                  value.verifiedOnly && 'verified'
                ].filter(Boolean).length} active
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}