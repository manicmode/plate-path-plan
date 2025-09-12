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
import { useManualFoodEnrichment } from '@/hooks/useManualFoodEnrichment';
import { enrichedFoodToLogItem } from '@/adapters/enrichedFoodToLogItem';
import { useManualFlowStatus } from '@/hooks/useManualFlowStatus';
import { enrichCandidate } from '@/utils/enrichCandidate';
import { ManualPortionDialog } from './ManualPortionDialog';

import { DataSourceChip } from '@/components/ui/data-source-chip';
import { sanitizeName } from '@/utils/helpers/sanitizeName';
import { sourceBadge } from '@/utils/helpers/sourceBadge';
import { labelFromFlags, type Candidate as SearchCandidate } from '@/lib/food/search/getFoodCandidates';

interface ManualFoodEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onResults?: (items: any[]) => void;
  onHandoffStart?: () => void;
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

const MEAL_TYPE_CHIPS = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { value: 'lunch', label: 'Lunch', emoji: '☀️' },
  { value: 'dinner', label: 'Dinner', emoji: '🌙' },
  { value: 'snack', label: 'Snack', emoji: '🍿' }
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
  onResults,
  onHandoffStart
}) => {
  // All hooks declared unconditionally at top
  const manualFlow = useManualFlowStatus();
  const [state, setState] = useState<ModalState>('idle');
  const [foodName, setFoodName] = useState('');
  const [candidates, setCandidates] = useState<LocalCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<LocalCandidate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [enriched, setEnriched] = useState<any>(null);
  const [handoff, setHandoff] = useState(false);
  
  // Track loading & suggestion availability for button guarding
  const isSearching = state === 'searching';
  const hasSuggestions = candidates.length > 0;
  const canAdd = !isSearching && selectedCandidate != null;
  const [portionAmount, setPortionAmount] = useState<number>(100);
  const [portionUnit, setPortionUnit] = useState('g');
  const [amountEaten, setAmountEaten] = useState([100]);
  const [mealType, setMealType] = useState<MealType>('');
  const [notes, setNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMoreCandidates, setShowMoreCandidates] = useState(false);
  const [recentItems, setRecentItems] = useState<string[]>([]);

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchGenRef = useRef<number>(0);
  const searchLockedRef = useRef<boolean>(false);
  const wasOpenRef = useRef(false);

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
      
      console.log('[MANUAL][SELECT]', { 
        name: manualFlow.selectedCandidate?.name,
        provider: manualFlow.selectedCandidate?.provider,
        isGeneric: manualFlow.selectedCandidate?.isGeneric,
        classId: manualFlow.selectedCandidate?.classId,
        canonicalKey: manualFlow.selectedCandidate?.canonicalKey,
      });
      
      try {
        setIsLoading(true);
        manualFlow.setState(s => ({ ...s, enrichmentReady: false, nutritionReady: false }));
        
        const enrichedData = await enrichCandidate(manualFlow.selectedCandidate);
        if (dead) return;
        
        console.log('[MANUAL][ENRICH][DONE]', {
          name: enrichedData?.name,
          hasIngredients: !!enrichedData?.ingredientsList?.length,
          ingredientsLen: enrichedData?.ingredientsList?.length ?? 0,
          textLen: enrichedData?.ingredientsText?.length ?? 0,
          basePer100: !!enrichedData?.basePer100,
          perGram: !!enrichedData?.perGram,
          servingGrams: enrichedData?.servingGrams,
          source: enrichedData?.source,
          confidence: enrichedData?.confidence,
        });
        
        setEnriched(enrichedData);
        manualFlow.setState(s => ({
          ...s,
          enrichmentReady: true,
          nutritionReady: true,
          portionDraft: enrichedData
        }));
        
        console.log('[DIALOG][OPEN]');
        setShowDialog(true);
        
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

  // Debounced search with abort controller
  const abortRef = useRef<AbortController | null>(null);
  const debouncedSearch = useCallback(async (query: string) => {
    // Abort previous search
    if (abortRef.current) {
      abortRef.current.abort();
    }
    
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

    const ctrl = new AbortController();
    abortRef.current = ctrl;
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
        if (currentGen !== searchGenRef.current || searchLockedRef.current || ctrl.signal.aborted) {
          return; // Ignore stale results
        }

        // Process fallback results only
        if (fallback) {
          // Log what arrives from textLookup
          console.log('[TRACE] UI receive', {
            hasItems: Array.isArray(fallback?.items),
            hasRankedAll: Array.isArray(fallback?.rankedAll),
            itemsCount: fallback?.items?.length,
            rankedAllCount: fallback?.rankedAll?.length,
            used: fallback?.used || 'unknown'
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
          logTelemetry('FALLBACK', { itemCount: count, used: fallback?.used });
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
        if (currentGen !== searchGenRef.current || searchLockedRef.current || ctrl.signal.aborted) {
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
      if (currentGen !== searchGenRef.current || searchLockedRef.current || ctrl.signal.aborted) {
        return; // Ignore stale errors
      }
      
      setState('error');
      logTelemetry('ERROR', { message: (error as Error).message });
      toast.error('Search failed. Please try again.');
    }
  }, [enrichWithFallback]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

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
      defaultPortion: { amount: item?.servingGrams || 100, unit: 'g' },
      provider: item?.provider || item?.kind,
      imageUrl: item?.imageUrl,
      data: { ...item, brand: item?.brand },
      // NEW: stable identity fields
      providerRef: item?.id || item?.providerRef,
      canonicalKey: item?.canonicalKey,
      brand: item?.brand || null,
      classId: item?.classId || null,
      flags: {
        generic: looksGeneric(item),
        brand: !!(item?.brand || item?.brands),
        restaurant: item?.kind === 'restaurant'
      }
    }));
  };

  // Reset on open/close without wiping input while open
  useEffect(() => {
    // On open (false -> true): reset flow once, do NOT clear input
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      manualFlow.reset();
      setSelectedCandidate(null);
      setCandidates([]);
      // IMPORTANT: do NOT call setFoodName('') here
    }

    // On close (true -> false): full cleanup including input
    if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      setFoodName('');
      setCandidates([]);
      setSelectedCandidate(null);
      setHandoff(false); // Clear handoff overlay on close
    }
  }, [isOpen]);

  // Handoff cleanup effect
  useEffect(() => {
    return () => setHandoff(false); // Cleanup on unmount
  }, []);

  // Disable handoff if modal closes unexpectedly
  useEffect(() => {
    if (!isOpen) {
      setHandoff(false);
    }
  }, [isOpen]);

  // Handle input changes with debouncing
  useEffect(() => {
    if (!manualFlow.selectedCandidate && foodName.length > 2) {
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
    }
  }, [foodName, manualFlow.selectedCandidate, debouncedSearch]);

  // Calculate whether to show portion dialog (conditional JSX, not early return)
  const showPortionDialog =
    !!manualFlow.selectedCandidate &&
    !!manualFlow.enrichmentReady &&
    !!manualFlow.nutritionReady &&
    !!manualFlow.portionDraft &&
    !manualFlow.uiCommitted;
    
  // Show loading state during enrichment to prevent white flash
  const showEnrichmentLoading = !!manualFlow.selectedCandidate && !showPortionDialog && isLoading;

  // Handle candidate selection - start enrichment and show portion dialog
  const handleCandidateSelect = useCallback(async (candidate: LocalCandidate) => {
    setSelectedCandidate(candidate);

    console.log('[MANUAL][SELECT]', {
      isGeneric: candidate.isGeneric,
      canonicalKey: candidate.canonicalKey,
      name: candidate.name,
      provider: candidate.provider,
      key: candidate.providerRef ?? candidate.canonicalKey,
    });

    // IMPORTANT: do not mutate the text input / query here
    // e.g., remove: setFoodName(candidate.name)

    manualFlow.setState(s => ({
      ...s,
      selectedCandidate: candidate,
      enrichmentReady: false,
      nutritionReady: false,
      portionDraft: null,
    }));

    setIsLoading(true);
    try {
      const enriched = await enrichCandidate(candidate); // existing util
      console.log('[ENRICH][DONE]', { 
        hasIngredients: !!enriched?.ingredientsList?.length,
        count: enriched?.ingredientsList?.length || 0
      });
      manualFlow.setState(s => ({
        ...s,
        enrichmentReady: true,
        nutritionReady: true,
        portionDraft: enriched,
      }));
    } catch (e) {
      console.error('[ENRICH][ERROR]', e);
      manualFlow.setState(s => ({
        ...s,
        selectedCandidate: null,
        enrichmentReady: false,
        nutritionReady: false,
        portionDraft: null,
      }));
      toast.error('Failed to load food details. Please try another option.');
    } finally {
      setIsLoading(false);
    }
  }, [manualFlow]);

  // Handle suggestion chip selection
  const handleSuggestionSelect = (suggestion: string) => {
    setFoodName(suggestion);
    inputRef.current?.focus();
  };

  // Handle form submission with proper guards
  const handleSubmit = async () => {
    if (isSearching || !selectedCandidate) {
      if (isSearching) {
        console.info('[MANUAL][GUARD]', { disabled: true, isSearching: true, reason: 'searching' });
        return;
      }
      if (!selectedCandidate) {
        console.info('[MANUAL][GUARD]', { disabled: true, isSearching: false, reason: 'no selection' });
        toast.error('Pick an item first.');
        return;
      }
    }

    console.info('[MANUAL][GUARD]', { disabled: false, isSearching: false, reason: 'ok' });

    // Route directly to confirmation for manual single-select (no review modal)
    if (selectedCandidate) {
      console.info('[CONFIRM][OPEN]', { source: 'manual', labelKind: labelFromFlags(selectedCandidate.flags) });
      
      // Calculate portion scaling
      const portionScale = amountEaten[0] / 100;

      // Prepare the data for confirmation
      const itemData = {
        ...selectedCandidate.data,
        __source: 'manual',
        selectionFlags: selectedCandidate.flags,
        selectionId: selectedCandidate.id,
        providerRef: selectedCandidate.providerRef,
        canonicalKey: selectedCandidate.canonicalKey,
        servingGrams: Math.round((selectedCandidate.data?.servingGrams || portionAmount) * portionScale),
        calories: Math.round((selectedCandidate.data?.calories || 0) * portionScale),
        protein_g: Math.round((selectedCandidate.data?.protein_g || 0) * portionScale * 10) / 10,
        carbs_g: Math.round((selectedCandidate.data?.carbs_g || 0) * portionScale * 10) / 10,
        fat_g: Math.round((selectedCandidate.data?.fat_g || 0) * portionScale * 10) / 10,
        fiber_g: Math.round((selectedCandidate.data?.fiber_g || 2) * portionScale * 10) / 10,
        sugar_g: Math.round((selectedCandidate.data?.sugar_g || 3) * portionScale * 10) / 10,
        mealType,
        notes: notes.trim() || undefined
      };
      
      if (onResults) {
        onResults([itemData]);
      }
      handleClose();
      return;
    }

    // Legacy fallback for when no candidate is selected (should not happen)
    searchLockedRef.current = true;
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchGenRef.current++;
    setState('loading');
    
    try {
      const portionScale = amountEaten[0] / 100;
      const portionOverrideGrams = portionAmount;

      logTelemetry('SUBMIT', {
        portion: portionAmount,
        unit: portionUnit,
        slider: amountEaten[0]
      });

      const { items } = await submitTextLookup(foodName.trim(), {
        source: 'manual',
        portionOverrideGrams
      });

      if (!items || items.length === 0) {
        setState('error');
        searchLockedRef.current = false;
        toast.error('No nutrition data found. Try a different name or spelling.');
        return;
      }

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

      confetti({
        particleCount: 12,
        spread: 45,
        origin: { y: 0.7 },
        colors: ['#10b981', '#34d399', '#6ee7b7']
      });

      toast.success(
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-500" />
          <span>Added <strong>{foodName}</strong> • {scaledItems[0].calories} cal</span>
        </div>
      );

      if (onResults) {
        const enrichedItem = enriched;
        console.log("[CONFIRM][ENRICHED]", {
          name: enrichedItem?.name,
          source: enrichedItem?.source,
          confidence: enrichedItem?.confidence,
          ingLen: enrichedItem?.ingredients?.length ?? 0,
          perServingG: enrichedItem?.perServing?.serving_grams,
        });
        
        onResults(scaledItems);
      }

      handleClose();

    } catch (error) {
      setState('error');
      searchLockedRef.current = false;
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
    
    manualFlow.reset();
    
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
      setShowMoreCandidates(false);
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
      
      {showPortionDialog && (
        <ManualPortionDialog
          candidate={manualFlow.selectedCandidate}
          enrichedData={manualFlow.portionDraft}
          onContinue={(finalData) => {
            manualFlow.setState(s => ({ ...s, uiCommitted: true }));
            onHandoffStart?.(); // Trigger parent handoff overlay
            
            
            console.log('[DIALOG][COMMIT]', { hasIngredients: !!finalData?.ingredientsList?.length });
            
            // Hand off to parent (keep as-is)
            onResults?.([finalData]);
            
            // CRITICAL: Close manual entry and reset for next open
            onClose?.();
            manualFlow.reset();
            
          }}
          onCancel={() => {
            manualFlow.reset();
            setSelectedCandidate(null);
          }}
        />
      )}
      
      {/* Show loading overlay during enrichment to prevent white flash */}
      <AnimatePresence>
        {showEnrichmentLoading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm grid place-items-center z-50">
            <ThreeCirclesLoader />
          </div>
        )}
      </AnimatePresence>
      
      {!showPortionDialog && !showEnrichmentLoading && (
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
                <div className="relative">
                  <CandidateList
                    candidates={candidates} // Show all candidates (6-8) without slicing
                    selectedCandidate={selectedCandidate}
                    onSelect={handleCandidateSelect}
                  />
                  {manualFlow.selectedCandidate && !manualFlow.enrichmentReady && (
                    <div className="absolute inset-0 bg-black/40 grid place-items-center rounded-lg">
                      <div className="bg-white/95 rounded-md px-3 py-2 text-sm">
                        Loading nutrition details…
                      </div>
                    </div>
                  )}
                </div>
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
                  disabled={!canAdd}
                  className="bg-gradient-to-r from-sky-400 to-emerald-400 hover:from-sky-500 hover:to-emerald-500 text-white font-medium px-6 focus:ring-2 focus:ring-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching…
                    </>
                  ) : (
                    <>
                       <Zap className="h-4 w-4 mr-2" />
                       Add Item
                     </>
                   )}
                 </Button>
               </motion.div>
             </div>
           </div>
         </motion.div>
       </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
};