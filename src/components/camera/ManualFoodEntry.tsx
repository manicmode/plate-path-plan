import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DialogTitle, DialogDescription } from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  X, Sparkles, Search, Loader2, Check, AlertCircle, 
  UtensilsCrossed
} from 'lucide-react';
import { toast } from 'sonner';
import { submitTextLookup } from '@/lib/food/textLookup';
import { CandidateList } from '@/components/food/CandidateList';
import { FOOD_TEXT_DEBUG } from '@/lib/flags';
import { ThreeCirclesLoader } from '@/components/loaders/ThreeCirclesLoader';
import { useManualFoodEnrichment } from '@/hooks/useManualFoodEnrichment';
import { enrichedFoodToLogItem } from '@/adapters/enrichedFoodToLogItem';
import { useManualFlowStatus } from '@/hooks/useManualFlowStatus';
import { enrichCandidate } from '@/utils/enrichCandidate';
import SmartPortionModal from './SmartPortionModal';
import { DataSourceChip } from '@/components/ui/data-source-chip';
import { sanitizeName } from '@/utils/helpers/sanitizeName';
import { sourceBadge } from '@/utils/helpers/sourceBadge';
import { labelFromFlags, type Candidate as SearchCandidate } from '@/lib/food/search/getFoodCandidates';

interface ManualFoodEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onResults?: (items: any[]) => void;
}

type ModalState = 'idle' | 'searching' | 'candidates' | 'loading' | 'error';
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | '';

interface LocalCandidate {
  id: string;
  name: string;
  isGeneric: boolean;
  portionHint?: string;
  defaultPortion?: { amount: number; unit: string };
  provider?: string;
  imageUrl?: string;
  data?: any; // Store original data for later use
  // NEW: stable identity fields
  providerRef?: string;
  canonicalKey?: string;
  brand?: string|null;
  classId?: string|null;
  flags?: { generic?: boolean; brand?: boolean; restaurant?: boolean };
}

const SUGGESTION_PHRASES = [
  "grilled chicken salad",
  "hawaiian pizza slice", 
  "california roll",
  "chicken teriyaki bowl",
  "acai bowl with granola",
  "protein smoothie"
];

// --- BEGIN local helpers (duplicate of search-side, kept local to avoid imports)
const _norm = (s?: string) =>
  (s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['a','an','the','and','or','with','of','in','on','to','style','classic','premium','original','fresh','organic',
  'grilled','baked','fried','roasted','boiled','steamed','sauteed','bbq','barbecue','smoked','raw','cooked']);
const coreNoun = (text?: string) => {
  const t = _norm(text).split(' ').filter(Boolean).filter(x => !STOP.has(x));
  return t.length ? t[t.length - 1] : _norm(text).split(' ').pop() || '';
};
const looksGeneric = (it: any): boolean => {
  const useTightLabeling = (import.meta.env.VITE_MANUAL_ENTRY_LABEL_TIGHT ?? '1') === '1';
  
  if (useTightLabeling) {
    // 1) explicit generic markers
    if (it?.isGeneric === true) return true;
    if (typeof it?.canonicalKey === 'string' && it.canonicalKey.startsWith('generic_')) return true;

    // 2) brand evidence overrides any generic signals
    const hasBrandEvidence = !!(it?.brand || it?.brands || (it?.code && String(it.code).length >= 8));
    if (hasBrandEvidence) return false;

    // 3) search-side kind/provider (only if no brand evidence)
    if (it?.kind === 'generic' || it?.provider === 'generic') return true;

    // 4) default: unknown = Brand (conservative)
    return false;
  } else {
    // Legacy behavior 
    if (it?.isGeneric === true) return true;
    if (it?.kind === 'generic' || it?.provider === 'generic') return true;
    if (it?.brands || it?.brand) return false;
    if (typeof it?.code === 'string' && it.code.length >= 8) return false;
    if (typeof it?.canonicalKey === 'string' && it.canonicalKey.startsWith('generic_')) return true;
    return false;
  }
};
const matchesQueryCore = (q: string, candidate: any): boolean => {
  const qCore = coreNoun(q);
  const nCore = coreNoun(candidate?.name);
  if (!qCore || !nCore) return false;
  if (qCore === nCore) return true;
  if (qCore.endsWith('s') && qCore.slice(0,-1) === nCore) return true;
  if (nCore.endsWith('s') && nCore.slice(0,-1) === qCore) return true;
  if (candidate?.classId && String(candidate.classId).includes(qCore)) return true;
  if (candidate?.canonicalKey && String(candidate.canonicalKey).includes(qCore)) return true;
  return false;
};

// legacy helper for backwards compatibility
const sharesCore = (candidateName?: string, primaryName?: string) => {
  const core = coreNoun(primaryName);
  if (!core) return true; // be permissive if we can't infer
  const cand = _norm(candidateName);
  return cand.includes(core);
};
// --- END local helpers

export const ManualFoodEntry: React.FC<ManualFoodEntryProps> = ({
  isOpen,
  onClose,
  onResults
}) => {
  // All hooks declared unconditionally at top
  const manualFlow = useManualFlowStatus();
  const [state, setState] = useState<ModalState>('idle');
  const [foodName, setFoodName] = useState('');
  const [candidates, setCandidates] = useState<LocalCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<LocalCandidate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [enriched, setEnriched] = useState<any>(null);
  
  // Track loading & suggestion availability for button guarding  
  const isSearching = state === 'searching';
  
  // Remove unused state variables
  const [amountEaten] = useState([100]);
  const [mealType] = useState<MealType>('');
  const [notes] = useState('');
  const [showAdvanced] = useState(false);
  const [showMoreCandidates] = useState(false);
  const [recentItems, setRecentItems] = useState<string[]>([]);

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchGenRef = useRef<number>(0);
  const searchLockedRef = useRef<boolean>(false);

  // Hooks
  const { enrichWithFallback, loading: enriching, error: enrichError } = useManualFoodEnrichment();
  
  // Build sentinels and logging
  useEffect(() => {
    if (isOpen) {
      console.info('[BUILD]', {
        sha: 'manual-flow-fix-v1', 
        time: new Date().toISOString(), 
        mode: import.meta?.env?.MODE || 'development'
      });
      console.info('[CONFIRM_PATH]', {
        cardFile: 'src/components/FoodConfirmationCard.tsx',
        enrichmentFile: 'src/hooks/useManualFoodEnrichment.tsx',
        sentinel: 'hooks/enrich/v3/8f4a2b'
      });
    }
  }, [isOpen]);
  
  // Enrichment effect - runs when candidate is selected
  useEffect(() => {
    let dead = false;
    const run = async () => {
      if (!manualFlow.selectedCandidate || manualFlow.enrichmentReady) return;
      
      try {
        setIsLoading(true);
        manualFlow.setState(s => ({ ...s, enrichmentReady: false, nutritionReady: false }));
        
        const enrichedData = await enrichCandidate(manualFlow.selectedCandidate);
        if (dead) return;
        
        console.log('[FLOW][ENRICH]', { 
          enrichmentSource: enrichedData?.enrichmentSource,
          ingredientsCount: enrichedData?.ingredientsList?.length || 0
        });
        
        setEnriched(enrichedData);
        manualFlow.setState(s => ({
          ...s,
          enrichmentReady: true,
          nutritionReady: true,
          portionDraft: enrichedData
        }));
        
        console.log('[FLOW][PORTION_MODAL_OPEN]', { 
          presets: enrichedData?.servingGrams || 100,
          defaultServingG: enrichedData?.servingGrams || 100
        });
        
      } catch (error) {
        console.error('[ENRICH][ERROR]', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    run();
    return () => { dead = true; };
  }, [manualFlow.selectedCandidate, manualFlow.enrichmentReady]);

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
      setEnriched(null);
      return;
    }

    // Check if search is locked
    if (searchLockedRef.current) {
      return;
    }

    const currentGen = ++searchGenRef.current;
    setState('searching');
    
    // Flag: VITE_DISABLE_ENRICHMENT_ON_TYPE - avoid enrichment while typing
    const disableEnrichmentOnType = (import.meta.env.VITE_DISABLE_ENRICHMENT_ON_TYPE ?? '1') === '1';

    try {
      if (disableEnrichmentOnType) {
        // Use cheap-first suggestions only, no enrichment while typing
        console.log('[SUGGEST][CHEAP_FIRST] Using fast lookup without enrichment');
        const fallback = await submitTextLookup(query, { source: 'manual' });
        
        // Check if this search result is still valid
        if (currentGen !== searchGenRef.current || searchLockedRef.current) {
          return; // Ignore stale results
        }

        // Process fallback results only
        if (fallback) {
          // Log what arrives from textLookup
          console.log('[TRACE] UI receive', {
            hasItems: Array.isArray(fallback?.items),
            hasRankedAll: Array.isArray(fallback?.rankedAll),
            itemsCount: fallback?.items?.length,
            rankedAllCount: fallback?.rankedAll?.length
          });

          // Use full set in this precedence:
          const items: any[] =
            fallback?.rankedAll ||
            fallback?.results ||
            fallback?.items ||
            fallback?.rankedTop3 ||
            [];

          const count = Math.min(items.length, 8); // Limit to 5-8 suggestions
          console.log(`[SUGGEST][CHEAP_FIRST] count=${count}, sources=[fdc,off]`);
          logTelemetry('FALLBACK', { itemCount: count });
          setEnriched(null);

          // Process candidates from fallback (V3 returns full list now)
          const candidates = processCandidates(items, query);
          setCandidates(candidates);
          setState(candidates.length > 0 ? 'candidates' : 'idle');
          return;
        }
      } else {
        // Legacy enrichment path (when flag is off)
        const { enriched, fallback } = await enrichWithFallback(
          query,
          'auto',
          () => submitTextLookup(query, { source: 'manual' }),
          selectedCandidate
        );
        
        // Check if this search result is still valid
        if (currentGen !== searchGenRef.current || searchLockedRef.current) {
          return; // Ignore stale results
        }

        if (enriched) {
          // Use enriched data
          logTelemetry('ENRICHED', { source: enriched.source, confidence: enriched.confidence });
          setEnriched(enriched);
          
          // Convert to candidate format
          const enrichedCandidate: LocalCandidate = {
            id: 'enriched-primary',
            name: sanitizeName(enriched.name),
            isGeneric: enriched.source === 'ESTIMATED' || enriched.confidence < 0.7,
            portionHint: enriched.perServing ? `${enriched.perServing.serving_grams}g serving` : '100g',
            defaultPortion: { 
              amount: enriched.perServing?.serving_grams || 100, 
              unit: 'g' 
            },
            provider: enriched.source === 'GENERIC' ? 'generic' : sourceBadge(enriched.source).label.toLowerCase(),
            data: enrichedFoodToLogItem(enriched, 100),
            // NEW: stable identity fields
            flags: {
              generic: enriched.source === 'ESTIMATED' || enriched.confidence < 0.7,
              brand: false,
              restaurant: false
            }
          };

          setCandidates([enrichedCandidate]);
          setState('candidates');
          return;
        }

        // Fall back to existing lookup system
        if (fallback) {
          // Log what arrives from textLookup  
          console.log('[TRACE] UI receive', {
            hasItems: Array.isArray(fallback?.items),
            hasRankedAll: Array.isArray(fallback?.rankedAll),
            itemsCount: fallback?.items?.length,
            rankedAllCount: fallback?.rankedAll?.length
          });

          // Use full set in this precedence:
          const items: any[] =
            fallback?.rankedAll ||
            fallback?.results ||
            fallback?.items ||
            fallback?.rankedTop3 ||
            [];

          logTelemetry('FALLBACK', { itemCount: items.length });
          setEnriched(null);
          // Process candidates from fallback
          const candidates = processCandidates(items, query);
          setCandidates(candidates);
          setState(candidates.length > 0 ? 'candidates' : 'idle');
          return;
        }
      }

      // No results from either path
      setCandidates([]);
      setState('idle');
      setEnriched(null);
      
    } catch (error) {
      // Check if this error is still relevant
      if (currentGen !== searchGenRef.current || searchLockedRef.current) {
        return; // Ignore stale errors
      }
      
      setState('error');
      logTelemetry('ERROR', { message: (error as Error).message });
      toast.error('Search failed. Please try again.');
    }
  }, [enrichWithFallback]);

  // Add deduplication helpers
  const slug = (s: string) =>
    (s || '')
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .replace(/\s+/g, ' ');

  const gramsBucket = (n?: number) => {
    const g = Number.isFinite(n as number) ? Number(n) : 0;
    // bucket to nearest 10g to collapse trivial serving deltas
    return Math.round(g / 10) * 10;
  };

  // Extract candidate processing logic for reuse
  const processCandidates = (items: any[], query: string): LocalCandidate[] => {
    const src: any[] = Array.isArray(items) ? items : [];

    console.log('[CANDIDATES][PROCESS_START]', { sourceCount: src.length });

    // group by composite key to drop near-identical rows
    const buckets = new Map<string, any[]>();

    for (const it of src.slice(0, 32)) { // safety cap before dedup
      const key = `${slug(it.name)}|${slug(it.brand || 'unknown')}|${gramsBucket(it.grams ?? it.portionGrams ?? it.servingGrams)}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(it);
    }

    // choose "best" per bucket: prefer generic; else with real brand; else first
    const pickOne = (arr: any[]) => {
      const withGeneric = arr.find(a => a.kind === 'generic');
      if (withGeneric) return withGeneric;
      const withBrand = arr.find(a => !!a.brand);
      return withBrand || arr[0];
    };

    // flatten picks
    let picks = Array.from(buckets.values()).map(pickOne);

    // ensure at most one "generic" per normalized name, keep it first
    const byName = new Map<string, any[]>();
    for (const c of picks) {
      const nameKey = slug(c.name);
      if (!byName.has(nameKey)) byName.set(nameKey, []);
      byName.get(nameKey)!.push(c);
    }

    const ordered: any[] = [];
    for (const [nameKey, arr] of byName.entries()) {
      const generic = arr.find(a => a.kind === 'generic');
      if (generic) ordered.push(generic);             // keep one generic up top for that food
      // then distinct brands for that name, one per brand
      const seenBrands = new Set<string>();
      for (const a of arr) {
        if (a.kind === 'generic') continue;
        const bKey = slug(a.brand || 'unknown');
        if (seenBrands.has(bKey)) continue;
        seenBrands.add(bKey);
        ordered.push(a);
      }
    }

    // sort: keep current ordering stable but ensure generics appear first overall
    ordered.sort((a, b) => (a.kind === 'generic' ? -1 : 0) - (b.kind === 'generic' ? -1 : 0));

    // final UI cap
    const finalList = ordered.slice(0, 8);

    console.log('[DEDUP][COMPLETE]', { beforeDedup: src.length, afterDedup: finalList.length });
    console.log('[MANUAL][RENDER_LIST]', { ui_render_count: finalList.length, query });

    // Map to LocalCandidate format with stable identity
    return finalList.map((item, index) => ({
      id: `candidate-${index}`,
      name: sanitizeName(item.name),
      isGeneric: looksGeneric(item),
      portionHint: item?.servingText || `${item?.servingGrams || 100}g default`,
      defaultPortion: { 
        amount: item?.servingGrams || 100, 
        unit: 'g' 
      },
      provider: item?.provider || 'fdc',
      imageUrl: item?.imageUrl,
      data: {
        name: sanitizeName(item.name),
        servingGrams: item?.servingGrams || 100,
        calories: item?.calories || 0,
        protein_g: item?.protein || item?.protein_g || 0,
        carbs_g: item?.carbs || item?.carbs_g || 0,  
        fat_g: item?.fat || item?.fat_g || 0,
        fiber_g: item?.fiber || item?.fiber_g || 2,
        sugar_g: item?.sugar || item?.sugar_g || 3,
        sodium_mg: item?.sodium || item?.sodium_mg || 0,
        brand: item?.brand,
        code: item?.code
      },
      // NEW: stable identity fields
      providerRef: item?.provider,
      canonicalKey: item?.canonicalKey,
      brand: item?.brand || null,
      classId: item?.classId || null,
      flags: {
        generic: looksGeneric(item),
        brand: !!(item?.brand || item?.brands),
        restaurant: false
      }
    }));
  };

  // Search debouncing effect  
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (foodName.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        debouncedSearch(foodName);
      }, 300); // 300ms debounce
    } else {
      setCandidates([]);
      setState('idle');
      setEnriched(null);
      setSelectedCandidate(null);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    }
  }, [foodName, debouncedSearch]);

  // Handle candidate selection - start enrichment and show portion dialog
  const handleCandidateSelect = useCallback(async (candidate: LocalCandidate) => {
    setSelectedCandidate(candidate);
    setFoodName(candidate.name);
    
    const labelKind = labelFromFlags(candidate.flags);
    console.log('[FLOW][SELECT]', { 
      source: candidate.isGeneric ? 'generic' : 'brand',
      providerRef: candidate.providerRef,
      classId: candidate.classId,
      canonicalKey: candidate.canonicalKey,
      isGeneric: candidate.isGeneric,
      name: candidate.name, 
      provider: candidate.provider, 
      labelKind 
    });
    
    // Set candidate and trigger enrichment
    manualFlow.setState(s => ({ ...s, selectedCandidate: candidate }));
  }, [manualFlow]);

  // Handle suggestion chip selection
  const handleSuggestionSelect = (suggestion: string) => {
    setFoodName(suggestion);
    inputRef.current?.focus();
  };

  // Manual entry name-only fallback (for error state) - now goes through modal
  const handleManualEntry = async () => {
    if (!foodName.trim()) return;
    
    console.log('[FLOW][MANUAL_ENTRY_FALLBACK]', { name: foodName.trim() });
    
    // Create minimal candidate for modal
    const fallbackCandidate = {
      id: 'manual-fallback',
      name: foodName.trim(),
      classId: 'generic',
      providerRef: 'generic' as const,
      baseServingG: 100
    };
    
    // Trigger modal with minimal data
    manualFlow.setState(prev => ({
      ...prev,
      selectedCandidate: fallbackCandidate,
      enrichmentReady: true,
      portionDraft: {
        ingredientsList: [],
        nutrition: {},
        servingGrams: 100
      }
    }));
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
        // Enter to search if no candidate selected
        if (foodName.trim() && state !== 'loading' && !selectedCandidate) {
          // Trigger search by updating foodName (already handled by useEffect)
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

  // Calculate whether to show portion dialog (derived flag, no hooks)
  const showPortionModal = Boolean(
    manualFlow.selectedCandidate &&
    manualFlow.enrichmentReady &&
    !manualFlow.uiCommitted
  );

  // Accessibility live region message
  const ariaLiveMessage = {
    idle: '',
    searching: 'Searching for foods',
    candidates: `Found ${candidates.length} food options`,
    loading: 'Adding food item',
    error: 'Search failed'
  }[state];

  // ALWAYS return a single fragment — both branches are siblings
  return (
    <>
      {showPortionModal && (
        <SmartPortionModal
          item={{
            name: manualFlow.selectedCandidate?.name || '',
            classId: manualFlow.selectedCandidate?.classId || 'other',
            providerRef: manualFlow.selectedCandidate?.isGeneric ? 'generic' : 'brand',
            baseServingG: manualFlow.portionDraft?.servingGrams,
            servingSizeText: manualFlow.selectedCandidate?.portionHint
          }}
          enrichedData={{
            ingredientsList: manualFlow.portionDraft?.ingredientsList || [],
            nutrition: manualFlow.portionDraft || {},
            servingGrams: manualFlow.portionDraft?.servingGrams
          }}
          onContinue={(portionData) => {
            console.log('[FLOW][CONTINUE]', { 
              servingG: portionData.servingG,
              unit: portionData.unit,
              quantity: portionData.quantity,
              confidence: portionData.confidence
            });
            manualFlow.setState(prev => ({ ...prev, uiCommitted: true }));
            console.log('[FLOW][CONFIRM_OPEN]', { 
              ingredientsCount: manualFlow.portionDraft?.ingredientsList?.length || 0
            });
            onResults?.([{ ...manualFlow.portionDraft, ...portionData }]);
          }}
          onCancel={() => {
            manualFlow.reset();
            setSelectedCandidate(null);
          }}
        />
      )}

      {!showPortionModal && (
        <div data-mfe="main-ui" className="manual-food-entry">
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

                {/* Selection Status */}
                <AnimatePresence>
                  {selectedCandidate && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm text-emerald-400 font-medium">
                          Selected: {selectedCandidate.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {isLoading ? 'Preparing portion options...' : 'Opening portion dialog...'}
                      </p>
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
                        onClick={handleManualEntry}
                        className="border-slate-600 text-slate-300 hover:text-white text-xs"
                      >
                        Use Manual Name Only
                      </Button>
                    )}
                    
                    {/* Status Button - No longer directly adds items */}
                    <motion.div
                      animate={foodName.trim() && state !== 'loading' ? { scale: [1, 1.02, 1] } : {}}
                      transition={{ duration: 0.3, repeat: foodName.trim() ? Infinity : 0, repeatDelay: 2 }}
                    >
                      <Button
                        onClick={() => {/* Search only - selection triggers modal */}}
                        disabled={isSearching || !foodName.trim()}
                        className="bg-gradient-to-r from-sky-400 to-emerald-400 hover:from-sky-500 hover:to-emerald-500 text-white font-medium px-6 focus:ring-2 focus:ring-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Searching…
                          </>
                        ) : selectedCandidate ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Selected
                          </>
                        ) : (
                          <>
                             <Search className="h-4 w-4 mr-2" />
                             Search
                           </>
                         )}
                       </Button>
                     </motion.div>
                   </div>
                 </div>
               </motion.div>
             </DialogContent>
           </Dialog>
         </div>
       )}
     </>
   );
 };
