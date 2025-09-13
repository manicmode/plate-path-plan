import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Search, X, Plus, Utensils, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useManualSearch } from '@/hooks/useManualSearch';
import { FEAT_MANUAL_CHEAP_ONLY, MANUAL_FX } from '@/config/flags';
import { logManualAction } from '@/lib/analytics/manualLog';
import { useToast } from '@/hooks/use-toast';
import '@/styles/animations.css';

interface ManualFoodEntryProps {
  onFoodSelect: (food: any) => void;
  onClose: () => void;
  enrichingId?: string | null;
}

export default function ManualFoodEntry({ onFoodSelect, onClose, enrichingId }: ManualFoodEntryProps) {
  const [query, setQuery] = useState('');
  const [clickedItems, setClickedItems] = useState<Set<string>>(new Set());
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
          placeholder="Search brand, restaurant, or food name…"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          className={`w-full rounded-md transition-all duration-75 ${
            MANUAL_FX && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'focus:ring-1 focus:ring-primary/20 focus:-translate-y-0.5 focus:shadow-sm'
              : ''
          }`}
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

      {/* Empty state */}
      {!query.trim() && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">
            Type a food name to search. Try brand or restaurant names for best matches.
          </p>
        </div>
      )}

      {/* Results */}
      {query.trim() && (
        <div className="max-h-96 overflow-y-auto space-y-2">
          {isSearching ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                Looking up items… brand and restaurant matches show first.
              </p>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`flex items-center justify-between p-3 border rounded-lg ${
                  MANUAL_FX && !window.matchMedia('(prefers-reduced-motion: reduce)').matches 
                    ? 'shimmer-effect' 
                    : ''
                }`}>
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              ))}
            </div>
          ) : results && results.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {results.map((food, index) => {
                const isEnriching = enrichingId === (food.id || food.name);
                const itemId = food.id || food.name;
                const isClicked = clickedItems.has(itemId);
                
                const motionProps = MANUAL_FX && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
                  ? {
                      initial: { opacity: 0, y: 6 },
                      animate: { opacity: 1, y: 0 },
                      exit: { opacity: 0, y: -6 },
                      transition: { 
                        duration: 0.14, 
                        delay: index * 0.02
                      },
                      whileHover: { y: -2, transition: { duration: 0.08 } },
                      layout: true
                    }
                  : {};

                return (
                  <motion.div
                    key={food.id || `${food.name}-${index}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer relative overflow-hidden hover:shadow-md transition-shadow duration-75"
                    onClick={() => handleFoodSelect(food)}
                    {...motionProps}
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
                    
                    {/* Enrichment progress bar */}
                    {isEnriching && MANUAL_FX && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && (
                      <motion.div 
                        className="absolute top-0 left-0 h-0.5 bg-primary z-10"
                        initial={{ width: "0%" }}
                        animate={{ width: "70%" }}
                        transition={{ duration: 1.2 }}
                        onAnimationComplete={() => {
                          // Log enrichment progress when it starts
                          if (isEnriching) {
                            console.log('[FX][ITEM] enrich_progress_start', { id: itemId });
                          }
                        }}
                      />
                    )}
                    
                    <motion.div
                      whileTap={MANUAL_FX && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? { scale: 0.96 } : undefined}
                      transition={{ duration: 0.08 }}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isEnriching}
                        className="ml-2"
                        onClick={(e) => handleFoodSelect(food, e)}
                      >
                        <AnimatePresence mode="wait">
                          {isEnriching ? (
                            <motion.div key="loading">
                              <Loader2 className="w-4 h-4 animate-spin" />
                            </motion.div>
                          ) : isClicked ? (
                            <motion.div 
                              key="check"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.8, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </motion.div>
                          ) : (
                            <motion.div 
                              key="plus"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.8, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                            >
                              <Plus className="w-4 h-4" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Button>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
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