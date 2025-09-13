import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useManualSearch } from '@/hooks/useManualSearch';
import { FEAT_MANUAL_CHEAP_ONLY, MANUAL_FX } from '@/config/flags';
import { logManualAction } from '@/lib/analytics/manualLog';
import { useToast } from '@/hooks/use-toast';
import { ManualSearchResultCard } from '@/components/manual/ManualSearchResultCard';
import '@/styles/animations.css';

interface ManualFoodEntryProps {
  onFoodSelect: (food: any) => void;
  onClose: () => void;
  enrichingId?: string | null;
}

export default function ManualFoodEntry({ onFoodSelect, onClose, enrichingId }: ManualFoodEntryProps) {
  const [query, setQuery] = useState('');
  const [clickedItems, setClickedItems] = useState<Set<string>>(new Set());
  const [showExamples, setShowExamples] = useState(false);
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
      console.log('[FX][SEARCH] list_stagger');
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

  // Handle food selection
  const handleFoodSelect = useCallback((food: any, event?: React.MouseEvent) => {
    event?.stopPropagation();
    
    const itemId = food.id || food.name;
    setClickedItems(prev => new Set([...prev, itemId]));
    
    // Show check icon briefly
    setTimeout(() => {
      setClickedItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }, 300);
    
    logManualAction('START', { selectedFood: food.name });
    onFoodSelect(food);
    setQuery('');
    reset();
  }, [onFoodSelect, reset]);

  // Handle key presses - prevent form submission
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      reset();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        handleFoodSelect(results[0]);
      }
    }
  }, [results, reset, onClose, handleFoodSelect]);

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

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fxEnabled = MANUAL_FX && !reducedMotion;

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search brand, restaurant, or food name"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          className={`w-full pl-10 pr-10 h-12 rounded-xl border-2 transition-all duration-150 ${
            fxEnabled
              ? 'focus:ring-2 focus:ring-primary/20 focus:-translate-y-0.5 focus:shadow-md focus:border-primary/30'
              : 'focus:border-primary'
          }`}
          autoFocus
          autoComplete="off"
        />
        
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              handleClear();
            }}
            className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 p-0 rounded-full hover:bg-muted"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Empty state with scrollable container */}
      {!query.trim() && (
        <div className="max-h-[70vh] overflow-y-auto pb-[env(safe-area-inset-bottom,16px)]">
          <div className="text-center py-12">
            <div className="space-y-3">
              <p className="text-muted-foreground font-medium">
                No matches yet
              </p>
              <p className="text-sm text-muted-foreground/70">
                Try brand or restaurant names
              </p>
              <div className="text-right mt-4">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowExamples(!showExamples);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground focus:ring-2 focus:ring-primary/20 rounded-xl"
                  aria-label="Show search examples"
                >
                  Examples
                </Button>
              </div>
              
              {/* Examples sheet */}
              <AnimatePresence>
                {showExamples && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="mt-4 p-3 bg-muted/30 rounded-xl border border-border/50"
                  >
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {[
                        'Chipotle bowl',
                        'HEB tortillas', 
                        'Costco hot dog',
                        'Starbucks sandwich',
                        'Ben & Jerry\'s',
                        'Trader Joe\'s dumplings'
                      ].map((example, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setQuery(example);
                            search(example);
                            setShowExamples(false);
                          }}
                          className="px-3 py-2 text-xs bg-background border border-border rounded-xl hover:bg-accent/50 focus:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors text-left"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {query.trim() && (
        <div className="space-y-4">
          {isSearching ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Searching for matches…
              </p>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`p-4 border rounded-xl ${
                  fxEnabled ? 'shimmer-effect' : ''
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-9 w-9 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : results && results.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </p>
              
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                <AnimatePresence mode="popLayout">
                  {results.map((food, index) => (
                    <ManualSearchResultCard
                      key={food.id || `${food.name}-${index}`}
                      food={food}
                      index={index}
                      isEnriching={enrichingId === (food.id || food.name)}
                      isClicked={clickedItems.has(food.id || food.name)}
                      onSelect={handleFoodSelect}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="space-y-2">
                <p className="text-muted-foreground font-medium">
                  No matches yet
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Try brand or restaurant names
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}