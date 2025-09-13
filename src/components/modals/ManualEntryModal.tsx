import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AccessibleDialogContent from '@/components/a11y/AccessibleDialogContent';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Info, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MANUAL_PORTION_STEP, MANUAL_FX, MANUAL_INTERSTITIAL, MANUAL_HINTS } from '@/config/flags';
import ManualFoodEntry from '@/components/camera/ManualFoodEntry';
import { PortionPicker } from '@/components/manual/PortionPicker';
import { InterstitialLoader } from '@/components/ui/InterstitialLoader';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodSelected: (food: any) => void;
}

export function ManualEntryModal({ isOpen, onClose, onFoodSelected }: ManualEntryModalProps) {
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [showExamplesSheet, setShowExamplesSheet] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [isPortionLoading, setIsPortionLoading] = useState(false);
  const [isRouting, setIsRouting] = useState(false);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fxEnabled = MANUAL_FX && !reducedMotion;

  // Log UX helpers once when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('[FX][MODAL] open');
      if (MANUAL_HINTS) {
        console.log('[MANUAL][UX] hints=enabled');
      }
    }
  }, [isOpen]);

  const handleFoodSelect = async (candidate: any) => {
    try {
      console.log('[MANUAL][SELECT]', candidate);
      
      const candidateId = candidate.id || candidate.name;
      setEnrichingId(candidateId);

      // Show portion picker if flag is enabled
      if (MANUAL_PORTION_STEP) {
        console.log('[FX][PORTION] open', { source: 'manual', itemId: candidateId });
        setSelectedFood(candidate);
        setEnrichingId(null);
        return;
      }

      console.log('[ROUTE][CALL]', { source: 'manual', id: candidate?.id || candidate?.name });
      
      // Call parent with candidate for routing and enrichment
      onFoodSelected(candidate);
      onClose();
    } catch (error) {
      console.warn('[MANUAL][SELECT][ERROR]', error);
      
      // Create skeleton fallback
      const skeleton = {
        ...candidate,
        source: 'manual',
        enriched: false,
        hasIngredients: false,
        ingredientsList: [],
        ingredientsText: '',
        ingredientsUnavailable: true,
        enrichmentSource: 'manual'
      };

      onFoodSelected(skeleton);
      onClose();
    } finally {
      if (!MANUAL_PORTION_STEP) {
        setEnrichingId(null);
      }
    }
  };

  const handlePortionContinue = async (food: any, portion: any) => {
    setIsPortionLoading(true);
    
    const itemWithPortion = {
      ...food,
      portion,
      inputSource: 'manual'
    };

    // Show interstitial if enabled and wait for confirm:mounted
    if (MANUAL_INTERSTITIAL) {
      setIsRouting(true);
      setShowInterstitial(true);
      
      console.log('[INTERSTITIAL][SHOW]', { 
        source: 'manual', 
        itemId: food?.id || food?.name,
        serving: portion?.servings,
        sliderPct: portion?.percent
      });
      
      // Listen for confirm:mounted event
      const onConfirmMounted = () => {
        console.log('[INTERSTITIAL][HIDE]', { ready: true, elapsedMs: Date.now() - startTime });
        setShowInterstitial(false);
        setIsRouting(false);
        setSelectedFood(null);
        setIsPortionLoading(false);
        onClose();
      };
      
      const startTime = Date.now();
      window.addEventListener('confirm:mounted', onConfirmMounted, { once: true });
      
      // Auto-hide after 800ms as fallback
      setTimeout(() => {
        if (showInterstitial) {
          console.log('[INTERSTITIAL][TIMEOUT]');
          window.removeEventListener('confirm:mounted', onConfirmMounted);
          onConfirmMounted();
        }
      }, 800);
      
      // Call the routing function
      console.log('[ROUTE][CALL]', { source: 'manual', itemId: food?.id || food?.name });
      onFoodSelected(itemWithPortion);
    } else {
      console.log('[ROUTE][CALL]', { source: 'manual', itemId: food?.id || food?.name });
      onFoodSelected(itemWithPortion);
      setSelectedFood(null);
      setIsPortionLoading(false);
      onClose();
    }
  };

  const handlePortionCancel = () => {
    setSelectedFood(null);
    setIsPortionLoading(false);
  };

  const handleInterstitialComplete = () => {
    setShowInterstitial(false);
  };

  // Examples for the sheet
  const examples = [
    "Chipotle bowl", "HEB tortillas", "Costco hot dog", 
    "Starbucks sandwich", "Ben & Jerry's", "Trader Joe's dumplings"
  ];

  const handleExampleClick = (example: string) => {
    // This will be handled by the ManualFoodEntry component
    setShowExamplesSheet(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <AccessibleDialogContent
          className="max-w-[420px] z-[600]"
          title="Add Food Manually"
          description="Search brand or restaurant items"
        >
          <motion.div 
            role="document" 
            className="p-6 space-y-6"
            initial={fxEnabled ? { opacity: 0, scale: 0.98 } : undefined}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="space-y-2">
              <div>
                <DialogTitle className="text-xl font-semibold">Add Food Manually</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Search brand or restaurant items
                </DialogDescription>
              </div>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-border/20" />

            {/* Content */}
            <div className="space-y-4">
              {showInterstitial ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium">Preparing your item…</p>
                    <p className="text-xs text-muted-foreground">Fetching nutrition & ingredients</p>
                  </div>
                </div>
              ) : selectedFood ? (
                <PortionPicker
                  selectedFood={selectedFood}
                  onCancel={handlePortionCancel}
                  onContinue={handlePortionContinue}
                  isLoading={isPortionLoading}
                />
              ) : (
                <ManualFoodEntry
                  onFoodSelect={handleFoodSelect}
                  onClose={onClose}
                  enrichingId={enrichingId}
                  onShowExamples={() => setShowExamplesSheet(true)}
                />
              )}
            </div>
          </motion.div>
        </AccessibleDialogContent>
      </Dialog>

      {/* Examples Sheet */}
      <Sheet open={showExamplesSheet} onOpenChange={setShowExamplesSheet}>
        <SheetContent side="bottom" className="max-h-[40vh]">
          <SheetHeader>
            <SheetTitle>Search Examples</SheetTitle>
            <SheetDescription>
              Tap an example to search for it
            </SheetDescription>
          </SheetHeader>
          
          <div className="grid grid-cols-2 gap-2 mt-4">
            {examples.map((example) => (
              <Button
                key={example}
                variant="outline"
                className="h-auto py-3 text-sm"
                onClick={() => handleExampleClick(example)}
              >
                {example}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Interstitial Loader */}
      <InterstitialLoader 
        isVisible={showInterstitial && !isRouting}
        onComplete={handleInterstitialComplete}
        maxDuration={800}
      />
    </>
  );
}