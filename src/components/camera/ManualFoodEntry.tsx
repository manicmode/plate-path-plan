import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, X, Plus, Utensils } from 'lucide-react';
import { useManualSearch } from '@/hooks/useManualSearch';
import { FEAT_MANUAL_CHEAP_ONLY } from '@/config/flags';
import { logManualAction } from '@/lib/analytics/manualLog';
import { useToast } from '@/hooks/use-toast';

interface ManualFoodEntryProps {
  onFoodSelect: (food: any) => void;
  onClose: () => void;
}

export default function ManualFoodEntry({ onFoodSelect, onClose }: ManualFoodEntryProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Use the manual search hook with proper configuration
  const { search, isSearching, results, error, reset, cleanup } = useManualSearch({
    allowNetwork: !FEAT_MANUAL_CHEAP_ONLY,
    debounceMs: 150,
  });

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
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Type food name (e.g., apple, chicken breast)..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          className="pl-9 pr-9"
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

      {/* Loading indicator */}
      {isSearching && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
        </div>
      )}

      {/* Results */}
      {!isSearching && query && (
        <div className="space-y-2">
          {results.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {results.map((food, index) => (
                  <FoodResultCard
                    key={`${food.id || food.name}-${index}`}
                    food={food}
                    onSelect={() => handleFoodSelect(food)}
                  />
                ))}
              </div>
            </>
          ) : query.trim() ? (
            <div className="py-8 text-center">
              <Utensils className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No foods found for "{query}"
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try different keywords or check spelling
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Instructions */}
      {!query && (
        <div className="py-8 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Start typing to search for foods
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Press Enter to select the first result, Escape to close
          </p>
        </div>
      )}
    </div>
  );
}

interface FoodResultCardProps {
  food: any;
  onSelect: () => void;
}

function FoodResultCard({ food, onSelect }: FoodResultCardProps) {
  const formatNutrition = (value: number | undefined, unit: string = 'g') => {
    if (value === undefined || value === null) return '0' + unit;
    return value.toFixed(unit === 'g' ? 1 : 0) + unit;
  };

  return (
    <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={onSelect}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate">{food.name}</h3>
              {food.isGeneric && (
                <Badge variant="secondary" className="text-xs">
                  Generic
                </Badge>
              )}
              {food.provider && food.provider !== 'generic' && (
                <Badge variant="outline" className="text-xs">
                  {food.provider}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{formatNutrition(food.calories, ' cal')}</span>
              <span>P: {formatNutrition(food.protein)}</span>
              <span>C: {formatNutrition(food.carbs)}</span>
              <span>F: {formatNutrition(food.fat)}</span>
            </div>
            
            {food.servingGrams && (
              <p className="text-xs text-muted-foreground mt-1">
                Per {food.servingGrams}g serving
              </p>
            )}
          </div>
          
          <Button variant="ghost" size="sm" className="ml-2 flex-shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}