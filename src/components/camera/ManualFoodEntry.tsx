import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useManualSearch } from '@/hooks/useManualSearch';
import { FEAT_MANUAL_CHEAP_ONLY, MANUAL_FX } from '@/config/flags';
import { logManualAction } from '@/lib/analytics/manualLog';
import { useToast } from '@/hooks/use-toast';
import { ManualSearchResultCard } from '@/components/manual/ManualSearchResultCard';
import { useTextRotator } from '@/hooks/useTextRotator';
import { cn } from '@/lib/utils';
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
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
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
    setIsTyping(true);
    search(value);
    
    // Clear typing state after 2s of no input
    const timeout = setTimeout(() => setIsTyping(false), 2000);
    return () => clearTimeout(timeout);
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

  // Rotating subtitles (synced with bottom tip)
  const subtitle = useTextRotator([
    "Search brand or restaurant items",
    "Also supports supermarket & generic foods",
  ], 3000);

  const subtitles = [
    "Search brand or restaurant items",
    "Also works for supermarket products", 
    "Try generic foods: '2 chicken legs', 'plain yogurt'",
    "Dishes too: 'egg fried rice', 'grilled salmon'"
  ];

  // Rotate subtitles every 3s, pause when typing
  useEffect(() => {
    if (isTyping) return;
    
    const interval = setInterval(() => {
      setSubtitleIndex(prev => (prev + 1) % subtitles.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isTyping, subtitles.length]);

  return (
    <div className="max-h-[min(90svh,720px)] min-h-[70svh] flex flex-col overflow-hidden space-y-6">
      {/* Header with rotating subtitle */}
      <div className="space-y-3 flex-shrink-0">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Add Food Manually</h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">{subtitle}</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative flex-shrink-0">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search brand, restaurant, supermarket, or generic foods…"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          onFocus={() => setIsTyping(true)}
          onBlur={() => setTimeout(() => setIsTyping(false), 1000)}
          className={`w-full pr-10 h-12 rounded-xl border-2 transition-all duration-150 ${
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

      {/* Scrollable content area */}
      <div className={cn("flex-1 overflow-y-auto", showExamples ? "pb-28" : "pb-24")}>
        {/* Empty state */}
        {!query.trim() && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="space-y-3">
                <p className="text-muted-foreground font-medium">
                  No matches yet
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Try brand or restaurant names
                </p>
              </div>
            </div>
            
            {/* Examples section with dedicated spacing */}
            <div className="space-y-3">
              <div className="text-center">
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
              
              {/* Examples sheet with scrollable grid */}
              <AnimatePresence>
                {showExamples && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="p-3 bg-muted/30 rounded-xl border border-border/50"
                  >
                    <div className="max-h-[40vh] overflow-y-auto">
                      <div className="grid grid-cols-2 gap-2">
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
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Rotating hint at bottom */}
              <div className="text-center pt-4">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={subtitleIndex}
                    initial={fxEnabled && !reducedMotion ? { opacity: 0, y: -10 } : undefined}
                    animate={{ opacity: 1, y: 0 }}
                    exit={fxEnabled && !reducedMotion ? { opacity: 0, y: 10 } : undefined}
                    transition={{ duration: fxEnabled ? 0.3 : 0 }}
                    className="text-xs text-muted-foreground/70"
                  >
                    {subtitles[subtitleIndex]}
                  </motion.p>
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
                
                <div className="space-y-2">
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
    </div>
  );
}