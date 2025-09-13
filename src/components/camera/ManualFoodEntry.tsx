import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
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
import { submitTextLookup, type TextLookupOptions } from '@/lib/food/textLookup';
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

// P0: Manual Search Performance Imports
import { 
  FEAT_MANUAL_CHEAP_ONLY, 
  FEAT_MANUAL_HOLE_PUNCH, 
  FEAT_MANUAL_LRU_CACHE, 
  FEAT_MANUAL_KEEP_LAST 
} from '@/config/flags';
import * as manualSearchCache from '@/services/manualSearchCache';
import { logManualAction } from '@/lib/analytics/manualLog';

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
  // P0: Manual Search Performance - refs and state
  const searchRequestId = useRef(0);
  const candidatesRef = useRef<LocalCandidate[]>([]);
  const lastGoodResultsRef = useRef<LocalCandidate[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  
  useEffect(() => { candidatesRef.current = candidates; }, [candidates]);

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

  // P0: Clear cache on auth changes
  useEffect(() => {
    const clearCacheOnAuthChange = () => {
      manualSearchCache.clear();
    };
    
    // You might want to hook this into your auth context
    // For now, just clear on unmount to be safe
    return clearCacheOnAuthChange;
  }, []);

  // P0: Enhanced debounced search with all optimizations
  const debouncedSearch = useCallback(async (query: string) => {
    logManualAction('search_start', { query: query.slice(0, 20) });
    
    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
      logManualAction('search_abort', { reason: 'new_request' });
    }
    
    if (!query.trim()) { 
      setCandidates([]);
      setState('idle');
      setEnriched(null);
      return;
    }
    
    if (searchLockedRef.current) {
      logManualAction('search_skip', { reason: 'locked' });
      return;
    }

    // Create new request context
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const currentGen = ++searchGenRef.current;
    const requestId = ++searchRequestId.current;
    
    setState('searching');
    console.log('[MANUAL][START]', { requestId, query: query.slice(0, 30), source: 'manual' });
    logManualAction('search_request', { requestId, queryLength: query.length });

    // 1) Check cache first
    if (FEAT_MANUAL_LRU_CACHE) {
      const cached = manualSearchCache.get(query);
      if (cached && cached.candidates.length > 0) {
        if (currentGen === searchGenRef.current && !ctrl.signal.aborted) {
          const cachedCandidates = processCandidates(cached.candidates, query);
          setCandidates(cachedCandidates);
          setState(cachedCandidates.length > 0 ? 'candidates' : 'idle');
          lastGoodResultsRef.current = cachedCandidates;
          
          console.log('[MANUAL][DONE]', { 
            requestId, 
            timeMs: 0, 
            count: cachedCandidates.length, 
            source: 'cache' 
          });
        }
        return;
      }
    }

    try {
      // 2) Hard timeout budget for consistency
      const timeoutMs = 800;
      const searchPromise = performLocalSearch(query, requestId);
      
      const timeoutPromise = new Promise<LocalCandidate[]>((_, reject) => {
        setTimeout(() => reject(new Error('Search timeout')), timeoutMs);
      });
      
      const t0 = performance.now();
      let newCandidates: LocalCandidate[];
      
      try {
        newCandidates = await Promise.race([searchPromise, timeoutPromise]);
      } catch (timeoutError) {
        console.log('[MANUAL][TIMEOUT]', { requestId, timeoutMs });
        
        // Keep last good results if enabled
        if (FEAT_MANUAL_KEEP_LAST && lastGoodResultsRef.current.length > 0) {
          console.log('[KEEP_LAST] rendered');
          logManualAction('keep_last_used', { previousCount: lastGoodResultsRef.current.length });
          return; // Keep showing previous results
        }
        
        newCandidates = [];
      }
      
      const searchMs = Math.round(performance.now() - t0);

      // Check if request is still valid
      if (currentGen !== searchGenRef.current || ctrl.signal.aborted || searchLockedRef.current) {
        console.log('[MANUAL][ABORT]', { requestId, reason: 'stale_request' });
        return;
      }

      // 3) Update UI if we have results OR no previous results
      const current = candidatesRef.current;
      const shouldUpdate = newCandidates.length > 0 || current.length === 0;
      
      if (shouldUpdate) {
        setCandidates(newCandidates);
        setState(newCandidates.length > 0 ? 'candidates' : 'idle');
        
        if (newCandidates.length > 0) {
          lastGoodResultsRef.current = newCandidates;
          
          // Cache successful results
          if (FEAT_MANUAL_LRU_CACHE) {
            manualSearchCache.set(query, newCandidates, 'local');
          }
        }
        
        console.log('[MANUAL][DONE]', { 
          requestId, 
          timeMs: searchMs, 
          count: newCandidates.length, 
          source: 'local' 
        });
      } else {
        console.log('[MANUAL][DONE]', {
          requestId, 
          timeMs: searchMs,
          count: current.length, 
          action: 'preserved_existing', 
          source: 'local'
        });
      }
      
    } catch (e) {
      if (currentGen !== searchGenRef.current || ctrl.signal.aborted) return;
      
      console.error('[MANUAL][ERROR]', e);
      logManualAction('search_error', { error: String(e) });
      
      // Keep last good results on error if enabled
      if (FEAT_MANUAL_KEEP_LAST && lastGoodResultsRef.current.length > 0) {
        console.log('[KEEP_LAST] error fallback');
        return;
      }
      
      setState('error');
    }
  }, []);

  // P0: Local search function (bypasses network when FEAT_MANUAL_CHEAP_ONLY is true)
  const performLocalSearch = useCallback(async (query: string, requestId: number): Promise<LocalCandidate[]> => {
    const allowNetwork = !FEAT_MANUAL_CHEAP_ONLY;
    
    console.log('[MANUAL][SEARCH]', { 
      requestId, 
      query: query.slice(0, 30), 
      allowNetwork,
      cheapOnly: FEAT_MANUAL_CHEAP_ONLY 
    });
    
    if (!allowNetwork) {
      console.log('[MANUAL][CHEAP_ONLY] Skipping edge functions');
    }
    
    const fallback = await submitTextLookup(query, { 
      source: 'manual', 
      allowNetwork 
    });
    
    const items = fallback?.items || fallback?.rankedTop3 || fallback?.rankedAll || [];
    return processCandidates(items, query);
  }, []);

  // P0: "Hole punch" search for broader sources (user-initiated)
  const performHolePunchSearch = useCallback(async (query: string) => {
    if (!FEAT_MANUAL_HOLE_PUNCH) return;
    
    const requestId = ++searchRequestId.current;
    console.log('[MANUAL][HOLE_PUNCH]', { requestId, query: query.slice(0, 30) });
    logManualAction('hole_punch_start', { requestId });
    
    setState('searching');
    
    try {
      // Force network search with strict timeout
      const ctrl = new AbortController();
      const timeoutMs = 1800;
      
      setTimeout(() => ctrl.abort(), timeoutMs);
      
      const t0 = performance.now();
      const result = await submitTextLookup(query, { 
        source: 'manual', 
        allowNetwork: true // Force network
      });
      
      const searchMs = Math.round(performance.now() - t0);
      const items = result?.items || result?.rankedTop3 || result?.rankedAll || [];
      const newCandidates = processCandidates(items, query);
      
      setCandidates(newCandidates);
      setState(newCandidates.length > 0 ? 'candidates' : 'idle');
      lastGoodResultsRef.current = newCandidates;
      
      // Cache successful hole-punch results
      if (FEAT_MANUAL_LRU_CACHE && newCandidates.length > 0) {
        manualSearchCache.set(query, newCandidates, 'hole-punch');
      }
      
      console.log('[MANUAL][DONE]', { 
        requestId, 
        timeMs: searchMs, 
        count: newCandidates.length, 
        source: 'hole-punch' 
      });
      
    } catch (e) {
      console.error('[MANUAL][HOLE_PUNCH][ERROR]', e);
      setState('error');
    }
  }, []);

  // Updated: Handle "Enter again for broader search" 
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // If no results and hole punch enabled, offer broader search
      if (FEAT_MANUAL_HOLE_PUNCH && candidates.length === 0 && foodName.trim()) {
        performHolePunchSearch(foodName.trim());
      }
    }
  }, [candidates.length, foodName, performHolePunchSearch]);
      if (FEAT_MANUAL_HOLE_PUNCH && candidates.length === 0 && foodName.trim()) {
        performHolePunchSearch(foodName.trim());
      }
    }
  }, [candidates.length, foodName, performHolePunchSearch]);

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

    const normalize = (s: string) => s.toLowerCase().trim();

    // keep exact brand items distinct; only collapse true duplicates
    const makeKey = (x: any) => [
      normalize(x.name),
      x.providerRef ?? x.brand ?? 'GENERIC',   // brand or source
      x.kind === 'generic' || looksGeneric(x) ? 'g' : 'b',      // keep generic separate from brand
    ].join('|');

    const ordered = Array.from(
      new Map(src.slice(0, 32).map(i => [makeKey(i), i])).values()
    );

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

  // Handle input changes with debouncing (P0: reduced to 150ms)
  useEffect(() => {
    if (!manualFlow.selectedCandidate && foodName.length > 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        debouncedSearch(foodName);
      }, 150); // P0: Reduced from 300ms to 150ms

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
                onKeyPress={handleKeyPress}
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

            {/* Helper text with hole punch hint */}
            <p className="text-xs text-slate-400 mt-2 text-center">
              {FEAT_MANUAL_HOLE_PUNCH && candidates.length === 0 && foodName.trim() 
                ? 'Press Enter again to search broader sources' 
                : 'Press Enter to search • Esc to close'}
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