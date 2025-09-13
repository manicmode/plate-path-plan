import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Search, X, Plus, Utensils } from 'lucide-react';
import { useManualSearch } from '@/hooks/useManualSearch';
import { FEAT_MANUAL_CHEAP_ONLY } from '@/config/flags';
import { logManualAction } from '@/lib/analytics/manualLog';
import { useToast } from '@/hooks/use-toast';

interface ManualFoodEntryProps {
  onFoodSelect: (food: any) => void;
  onClose: () => void;
  enrichingId?: string | null;
}

export default function ManualFoodEntry({ onFoodSelect, onClose, enrichingId }: ManualFoodEntryProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Use the manual search hook with proper configuration
  const { search, isSearching, results, error, reset, cleanup } = useManualSearch({
    allowNetwork: !FEAT_MANUAL_CHEAP_ONLY,
    debounceMs: 150,
  });

  // Log pipeline results when they arrive
  useEffect(() => {
    if (results.length > 0) {
      console.log('[MANUAL][PIPE]', { 
        final: results.length, 
        vault: 0, // useManualSearch provides final merged results
        cheap: 0  // useManualSearch provides final merged results
      });
    }
  }, [results]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    return cleanup;
  }, [cleanup]);

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    search(value);
  }, [search]);

  // Handle key presses
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      reset();
      onClose();
    } else if (e.key === 'Enter' && results.length > 0) {
      handleFoodSelect(results[0]);
    }
  }, [results, reset, onClose]);

  // Handle food selection
  const handleFoodSelect = useCallback((food: any) => {
    logManualAction('START', { selectedFood: food.name });
    onFoodSelect(food);
    setQuery('');
    reset();
  }, [onFoodSelect, reset]);

  // Handle clear
  const handleClear = useCallback(() => {
    setQuery('');
    reset();
  }, [reset]);

  // Show error toast if needed
  useEffect(() => {
    if (error) {
      toast({
        title: 'Search Error',
        description: 'Unable to search for foods. Please try again.',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search for foods..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          className="w-full rounded-md"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Results */}
      {query.trim() && (
        <div className="max-h-96 overflow-y-auto space-y-2">
          {isSearching ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              ))}
            </div>
          ) : results && results.length > 0 ? (
            results.map((food, index) => {
              const isEnriching = enrichingId === (food.id || food.name);
              return (
                <div
                  key={food.id || `${food.name}-${index}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleFoodSelect(food)}
                >
                  <div className="flex-1">
                    <p className="font-medium">{food.name}</p>
                    {food.brand && (
                      <p className="text-sm text-muted-foreground">{food.brand}</p>
                    )}
                    {food.calories && (
                      <p className="text-xs text-muted-foreground">
                        {Math.round(food.calories)} cal
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isEnriching}
                    className="ml-2"
                  >
                    {isEnriching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              );
            })
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No foods found. Try a different search term.
            </p>
          )}
        </div>
      )}
    </div>
  );
}