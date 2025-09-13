import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Plus, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useManualSearch } from '@/hooks/useManualSearch';
import { FEAT_MANUAL_CHEAP_ONLY, MANUAL_FX } from '@/config/flags';

interface ManualSearchResultsProps {
  onFoodSelect: (food: any) => void;
}

export default function ManualSearchResults({ onFoodSelect }: ManualSearchResultsProps) {
  const [query, setQuery] = useState('');
  const [clickedItems, setClickedItems] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const { search, isSearching, results, error, reset } = useManualSearch({
    allowNetwork: !FEAT_MANUAL_CHEAP_ONLY,
    debounceMs: 150,
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fxEnabled = MANUAL_FX && !reducedMotion;

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    search(value);
  }, [search]);

  const handleFoodSelect = useCallback((food: any) => {
    const itemId = food.id || food.name;
    setClickedItems(prev => new Set([...prev, itemId]));
    setTimeout(() => {
      setClickedItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }, 300);
    onFoodSelect(food);
  }, [onFoodSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        handleFoodSelect(results[0]);
      }
    }
  }, [results, handleFoodSelect]);

  const handleClear = useCallback(() => {
    setQuery('');
    reset();
  }, [reset]);

  return (
    <div className="manual-search-container">
      {/* Search Input */}
      <div className="manual-search-input-wrapper">
        <div className="manual-search-icon">
          <Search className="h-4 w-4" />
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search brand, restaurant, or food…"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="manual-search-input"
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
            className="manual-search-clear"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Results */}
      <div className="manual-results-container">
        {!query.trim() ? (
          <div className="manual-empty-state">
            <Search className="h-12 w-12 text-white/20 mb-4" />
            <h3 className="text-white/60 text-base font-medium mb-2">No matches yet</h3>
            <p className="text-white/45 text-sm">Try brand or restaurant names</p>
          </div>
        ) : isSearching ? (
          <div className="manual-loading-state">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="manual-skeleton-card">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="manual-skeleton-line manual-skeleton-line-wide" />
                    <div className="manual-skeleton-line manual-skeleton-line-narrow" />
                  </div>
                  <div className="manual-skeleton-button" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="manual-results-list">
            <AnimatePresence mode="popLayout">
              {results.map((food, index) => {
                const itemId = food.id || food.name;
                const isClicked = clickedItems.has(itemId);
                
                return (
                  <motion.div
                    key={itemId}
                    initial={fxEnabled ? { opacity: 0, y: 6 } : undefined}
                    animate={{ opacity: 1, y: 0 }}
                    exit={fxEnabled ? { opacity: 0, scale: 0.95 } : undefined}
                    transition={{ 
                      duration: fxEnabled ? 0.16 : 0, 
                      delay: fxEnabled ? index * 0.05 : 0,
                      ease: [0.22, 1, 0.36, 1] 
                    }}
                    className="manual-result-card"
                    onClick={() => handleFoodSelect(food)}
                  >
                    <div className="manual-result-content">
                      <div className="manual-result-info">
                        <h4 className="manual-result-name">{food.name}</h4>
                        <p className="manual-result-meta">
                          {food.brand && `${food.brand} • `}
                          {food.calories ? `${food.calories} cal` : '— cal'}
                        </p>
                      </div>
                      
                      <Button
                        type="button"
                        size="sm"
                        className="manual-result-button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFoodSelect(food);
                        }}
                      >
                        {isClicked ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="manual-empty-state">
            <Search className="h-12 w-12 text-white/20 mb-4" />
            <h3 className="text-white/60 text-base font-medium mb-2">No matches yet</h3>
            <p className="text-white/45 text-sm">Try brand or restaurant names</p>
          </div>
        )}
      </div>
    </div>
  );
}