import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DialogTitle, DialogDescription } from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  X, Sparkles, Search, Loader2, Check, AlertCircle, 
  Zap, UtensilsCrossed, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { submitTextLookup } from '@/lib/food/textLookup';
import { CandidateList } from '@/components/food/CandidateList';
import { PortionUnitField } from '@/components/food/PortionUnitField';
import { FOOD_TEXT_DEBUG } from '@/lib/flags';
import { ThreeCirclesLoader } from '@/components/loaders/ThreeCirclesLoader';

interface ManualFoodEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onResults?: (items: any[]) => void;
}

type ModalState = 'idle' | 'searching' | 'candidates' | 'loading' | 'error';
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | '';

interface Candidate {
  id: string;
  name: string;
  isGeneric: boolean;
  portionHint?: string;
  defaultPortion?: { amount: number; unit: string };
  provider?: string;
  imageUrl?: string;
}

const SUGGESTION_PHRASES = [
  "grilled chicken salad",
  "hawaiian pizza slice", 
  "california roll",
  "chicken teriyaki bowl",
  "acai bowl with granola",
  "protein smoothie"
];

const MEAL_TYPE_CHIPS = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { value: 'lunch', label: 'Lunch', emoji: '☀️' },
  { value: 'dinner', label: 'Dinner', emoji: '🌙' },
  { value: 'snack', label: 'Snack', emoji: '🍿' }
];

export const ManualFoodEntry: React.FC<ManualFoodEntryProps> = ({
  isOpen,
  onClose,
  onResults
}) => {
  // State
  const [state, setState] = useState<ModalState>('idle');
  const [foodName, setFoodName] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [portionAmount, setPortionAmount] = useState<number>(100);
  const [portionUnit, setPortionUnit] = useState('g');
  const [amountEaten, setAmountEaten] = useState([100]);
  const [mealType, setMealType] = useState<MealType>('');
  const [notes, setNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recentItems, setRecentItems] = useState<string[]>([]);

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchGenRef = useRef<number>(0);
  const searchLockedRef = useRef<boolean>(false);

  // Telemetry logging
  const logTelemetry = (event: string, data?: any) => {
    if (FOOD_TEXT_DEBUG) {
      console.log(`[MANUAL][${event.toUpperCase()}]`, data);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setCandidates([]);
      setState('idle');
      return;
    }

    // Check if search is locked
    if (searchLockedRef.current) {
      return;
    }

    const currentGen = ++searchGenRef.current;
    setState('searching');
    logTelemetry('SEARCH', { query });

    try {
      const { items } = await submitTextLookup(query, { source: 'manual' });
      
      // Check if this search result is still valid
      if (currentGen !== searchGenRef.current || searchLockedRef.current) {
        return; // Ignore stale results
      }
      
      // Transform to candidate format
      const candidateList: Candidate[] = (items || []).slice(0, 6).map((item: any, index: number) => ({
        id: `candidate-${index}`,
        name: item.name,
        isGeneric: item.provider === 'generic' || item.kind === 'generic',
        portionHint: item.servingText || `${item.servingGrams || 100}g default`,
        defaultPortion: {
          amount: item.servingGrams || 100,
          unit: 'g'
        },
        provider: item.provider,
        imageUrl: item.imageUrl,
        data: item // Store original data for later use
      }));

      // Sort Generic items first
      candidateList.sort((a, b) => {
        if (a.isGeneric && !b.isGeneric) return -1;
        if (!a.isGeneric && b.isGeneric) return 1;
        return 0;
      });

      setCandidates(candidateList);
      setState(candidateList.length > 0 ? 'candidates' : 'idle');
      logTelemetry('CANDIDATES', { count: candidateList.length });

    } catch (error) {
      // Check if this error is still relevant
      if (currentGen !== searchGenRef.current || searchLockedRef.current) {
        return; // Ignore stale errors
      }
      
      setState('error');
      logTelemetry('ERROR', { message: (error as Error).message });
      toast.error('Search failed. Please try again.');
    }
  }, []);

  // Handle input changes with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      debouncedSearch(foodName);
    }, 200);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [foodName, debouncedSearch]);

  // Handle candidate selection
  const handleCandidateSelect = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setFoodName(candidate.name);
    
    // Prefill portion with defaults
    if (candidate.defaultPortion) {
      setPortionAmount(candidate.defaultPortion.amount);
      setPortionUnit(candidate.defaultPortion.unit);
    }

    logTelemetry('SELECT', { 
      name: candidate.name, 
      generic: candidate.isGeneric 
    });
  };

  // Handle suggestion chip selection
  const handleSuggestionSelect = (suggestion: string) => {
    setFoodName(suggestion);
    inputRef.current?.focus();
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!foodName.trim()) {
      toast.error('Please enter a food name');
      return;
    }

    // Lock search to prevent race conditions
    searchLockedRef.current = true;
    
    // Cancel any pending search timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Invalidate any pending search results
    searchGenRef.current++;

    setState('loading');
    
    try {
      // Calculate portion scaling
      const portionScale = amountEaten[0] / 100;
      const portionOverrideGrams = portionAmount;

      logTelemetry('SUBMIT', {
        portion: portionAmount,
        unit: portionUnit,
        slider: amountEaten[0]
      });

      // Use existing text lookup with portion override
      const { items } = await submitTextLookup(foodName.trim(), {
        source: 'manual',
        portionOverrideGrams
      });

      if (!items || items.length === 0) {
        setState('error');
        searchLockedRef.current = false; // Unlock search on error
        toast.error('No nutrition data found. Try a different name or spelling.');
        return;
      }

      // Apply portion scaling
      const scaledItems = items.map((item: any) => ({
        ...item,
        servingGrams: Math.round((item.servingGrams || portionAmount) * portionScale),
        calories: Math.round(item.calories * portionScale),
        protein_g: Math.round(item.protein_g * portionScale * 10) / 10,
        carbs_g: Math.round(item.carbs_g * portionScale * 10) / 10,
        fat_g: Math.round(item.fat_g * portionScale * 10) / 10,
        fiber_g: Math.round((item.fiber_g || 2) * portionScale * 10) / 10,
        sugar_g: Math.round((item.sugar_g || 3) * portionScale * 10) / 10,
        source: 'manual',
        mealType,
        notes: notes.trim() || undefined
      }));

      // Success animation
      confetti({
        particleCount: 12,
        spread: 45,
        origin: { y: 0.7 },
        colors: ['#10b981', '#34d399', '#6ee7b7']
      });

      // Show success toast
      toast.success(
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-500" />
          <span>Added <strong>{foodName}</strong> • {scaledItems[0].calories} cal</span>
        </div>
      );

      // Pass results to parent
      if (onResults) {
        onResults(scaledItems);
      }

      // Close and reset
      handleClose();

    } catch (error) {
      setState('error');
      searchLockedRef.current = false; // Unlock search on error
      logTelemetry('ERROR', { message: (error as Error).message });
      toast.error('Failed to add food. Please try again.');
    }
  };

  // Handle modal close
  const handleClose = () => {
    onClose();
    
    // Reset search locks
    searchLockedRef.current = false;
    searchGenRef.current++;
    
    // Cancel pending search timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Reset state after close animation
    setTimeout(() => {
      setState('idle');
      setFoodName('');
      setCandidates([]);
      setSelectedCandidate(null);
      setPortionAmount(100);
      setPortionUnit('g');
      setAmountEaten([100]);
      setMealType('');
      setNotes('');
      setShowAdvanced(false);
    }, 200);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }

      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        if (foodName.trim() && state !== 'loading') {
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, foodName, state]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Accessibility live region message
  const ariaLiveMessage = {
    idle: '',
    searching: 'Searching for foods',
    candidates: `Found ${candidates.length} food options`,
    loading: 'Adding food item',
    error: 'Search failed'
  }[state];

  return (
    <>
      {/* Three Circles Loader - Full screen overlay during loading */}
      <AnimatePresence>
        {state === 'loading' && (
          <ThreeCirclesLoader />
        )}
      </AnimatePresence>

      <Dialog open={isOpen && state !== 'loading'} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent 
          showCloseButton={false}
          className="max-w-md mx-auto bg-slate-900/70 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl/20 p-0 overflow-hidden max-h-[90vh] overflow-y-auto"
        >
        <VisuallyHidden>
          <DialogTitle>Add Food Manually</DialogTitle>
        </VisuallyHidden>
        <VisuallyHidden>
          <DialogDescription>
            Search and add food items with custom portions
          </DialogDescription>
        </VisuallyHidden>

        {/* Accessibility announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {ariaLiveMessage}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.14, ease: "easeInOut" }}
          className="p-6 md:p-7"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            {/* Left: Icon in branded pill */}
            <div className="flex items-center gap-3">
              <motion.div 
                className="px-3 py-2 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 flex items-center gap-2"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <UtensilsCrossed className="h-4 w-4 text-white" />
                <Sparkles className="h-3 w-3 text-white" />
              </motion.div>
              <h3 className="text-lg font-semibold text-white">
                Add Food Manually
              </h3>
            </div>
            
            {/* Right: Close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full w-8 h-8 p-0 focus:ring-2 focus:ring-sky-400"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Main Input */}
          <div className="mb-6">
            <div className="relative">
              <Input
                ref={inputRef}
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="What did you eat?"
                className="text-lg h-14 pl-4 pr-12 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:bg-white/15 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/50 rounded-xl"
                disabled={state === 'loading'}
              />
              
              {/* Search icon or loading spinner */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {state === 'searching' ? (
                  <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                ) : (
                  <Search className="h-5 w-5 text-slate-400" />
                )}
              </div>
            </div>

            {/* Helper text */}
            <p className="text-xs text-slate-400 mt-2 text-center">
              Press Enter to search • Esc to close
            </p>
          </div>

          {/* Suggestions (Idle state) */}
          <AnimatePresence>
            {state === 'idle' && !foodName && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6"
              >
                <p className="text-sm text-slate-400 text-center mb-3">Try searching for:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTION_PHRASES.slice(0, 3).map((phrase, index) => (
                    <motion.button
                      key={phrase}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => handleSuggestionSelect(phrase)}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-sm text-slate-300 hover:text-white transition-all hover:-translate-y-0.5 focus:ring-2 focus:ring-sky-400"
                    >
                      "{phrase}"
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Candidates */}
          <AnimatePresence>
            {state === 'candidates' && candidates.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6"
              >
                <CandidateList
                  candidates={candidates}
                  selectedCandidate={selectedCandidate}
                  onSelect={handleCandidateSelect}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Portion and Advanced Options */}
          <AnimatePresence>
            {(selectedCandidate || showAdvanced) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 mb-6"
              >
                {/* Portion */}
                <PortionUnitField
                  amount={portionAmount}
                  unit={portionUnit}
                  onAmountChange={setPortionAmount}
                  onUnitChange={setPortionUnit}
                />

                {/* Amount Eaten Slider */}
                <div className="space-y-2">
                  <Label className="text-sm text-slate-300">Amount Eaten</Label>
                  <div className="px-3">
                    <Slider
                      value={amountEaten}
                      onValueChange={setAmountEaten}
                      max={100}
                      min={10}
                      step={5}
                      disabled={state === 'loading'}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>10%</span>
                      <span className="font-medium text-emerald-400">{amountEaten[0]}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    We'll scale nutrition to your portion
                  </p>
                </div>

                {/* Advanced Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full text-slate-400 hover:text-white"
                >
                  Advanced Options
                  {showAdvanced ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                </Button>

                {/* Advanced Fields */}
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pt-2 border-t border-white/10"
                    >
                      {/* Meal Type */}
                      <div>
                        <Label className="text-sm text-slate-300 mb-2 block">Meal Type</Label>
                        <div className="flex flex-wrap gap-2">
                          {MEAL_TYPE_CHIPS.map((meal) => (
                            <button
                              key={meal.value}
                              onClick={() => setMealType(mealType === meal.value ? '' : meal.value as MealType)}
                              className={`px-3 py-2 rounded-lg text-sm transition-all focus:ring-2 focus:ring-sky-400 ${
                                mealType === meal.value
                                  ? 'bg-sky-400 text-white'
                                  : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                              }`}
                            >
                              {meal.emoji} {meal.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <Label htmlFor="notes" className="text-sm text-slate-300 mb-2 block">Notes</Label>
                        <Textarea
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Optional notes about this food..."
                          className="bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:bg-white/10 focus:border-sky-400 resize-none h-16"
                          disabled={state === 'loading'}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error State */}
          <AnimatePresence>
            {state === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div>
                    <h4 className="text-red-400 font-medium mb-1">Search Failed</h4>
                    <p className="text-sm text-slate-300">
                      Try a different spelling or use "Manual Name Only" to proceed anyway
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={state === 'loading'}
              className="text-slate-400 hover:text-white hover:bg-white/10 focus:ring-2 focus:ring-slate-400"
            >
              Cancel
            </Button>
            
            <div className="flex items-center gap-2">
              {/* Manual Name Only for no results */}
              {state === 'error' && foodName.trim() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSubmit}
                  className="border-slate-600 text-slate-300 hover:text-white text-xs"
                >
                  Use Manual Name Only
                </Button>
              )}
              
              {/* Main Add Button */}
              <motion.div
                animate={foodName.trim() && state !== 'loading' ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 0.3, repeat: foodName.trim() ? Infinity : 0, repeatDelay: 2 }}
              >
                <Button
                  onClick={handleSubmit}
                  disabled={!foodName.trim() || state === 'loading'}
                  className="bg-gradient-to-r from-sky-400 to-emerald-400 hover:from-sky-500 hover:to-emerald-500 text-white font-medium px-6 focus:ring-2 focus:ring-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
    </>
  );
};