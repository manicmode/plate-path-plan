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
  onShowExamples?: () => void;
}

export default function ManualFoodEntry({ onFoodSelect, onClose, enrichingId, onShowExamples }: ManualFoodEntryProps) {
  const [query, setQuery] = useState('');
  const [clickedItems, setClickedItems] = useState<Set<string>>(new Set());
  const [rotatingTipIndex, setRotatingTipIndex] = useState(0);
  const [hasFocused, setHasFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fxEnabled = MANUAL_FX && !reducedMotion;

  // Rotating tips
  const rotatingTips = [
    "Best for restaurant meals & branded items.",
    "Try names like \"Chipotle bowl\" or \"Costco hot dog\".",
    "Type brand first for better matches (e.g., \"HEB tortillas\")."
  ];

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

  // Rotate tips every 3.5s
  useEffect(() => {
    if (!query.trim()) {
      const interval = setInterval(() => {
        setRotatingTipIndex(prev => (prev + 1) % rotatingTips.length);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [query, rotatingTips.length]);

  // Handle input focus for glow effect
  const handleInputFocus = useCallback(() => {
    if (!hasFocused && fxEnabled) {
      setHasFocused(true);
    }
  }, [hasFocused, fxEnabled]);

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
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search brand, restaurant, or food…"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          onFocus={handleInputFocus}
          className={`w-full pl-10 pr-10 h-12 rounded-xl border-2 transition-all duration-150 ${
            fxEnabled && hasFocused
              ? 'focus:ring-2 focus:ring-primary/20 focus:shadow-md focus:border-primary/30 animate-pulse'
              : 'focus:border-primary'
          }`}
          autoFocus
        />
        
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 p-0 rounded-full hover:bg-muted z-10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Rotating hint below input */}
      {!query.trim() && (
        <div className="flex items-center justify-between text-xs">
          <AnimatePresence mode="wait">
            <motion.div
              key={rotatingTipIndex}
              initial={fxEnabled ? { opacity: 0, y: 5 } : undefined}
              animate={{ opacity: 1, y: 0 }}
              exit={fxEnabled ? { opacity: 0, y: -5 } : undefined}
              transition={{ duration: 0.2 }}
              className="text-muted-foreground/70 flex-1"
            >
              {rotatingTips[rotatingTipIndex]}
            </motion.div>
          </AnimatePresence>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowExamples}
            className="h-auto px-2 py-1 text-xs text-primary/70 hover:text-primary"
          >
            Examples
          </Button>
        </div>
      )}

      {/* Divider */}
      {query.trim() && <div className="w-full h-px bg-border/12" />}

      {/* Empty state */}
      {!query.trim() && (
        <div className="text-center py-8">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Type a food name to search
            </p>
            <p className="text-xs text-muted-foreground/60">
              Try brand or restaurant names for best matches
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {query.trim() && (
        <div className="space-y-3">
          {isSearching ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Searching for matches…
              </p>
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div 
                  key={i} 
                  className={`h-[84px] p-4 border rounded-xl ${
                    fxEnabled ? 'shimmer-effect' : ''
                  }`}
                  initial={fxEnabled ? { opacity: 0, y: 8 } : undefined}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex justify-between items-center h-full">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                </motion.div>
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
            <div className="text-center py-8">
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  No matches found
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Try brand or restaurant names for best results
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}