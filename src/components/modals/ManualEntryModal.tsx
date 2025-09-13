import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AccessibleDialogContent from '@/components/a11y/AccessibleDialogContent';
import { Button } from '@/components/ui/button';
import { Info, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
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
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [isPortionLoading, setIsPortionLoading] = useState(false);

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

  const handlePortionContinue = (food: any, portion: any) => {
    setIsPortionLoading(true);
    
    const itemWithPortion = {
      ...food,
      portion,
      inputSource: 'manual'
    };

    // Show interstitial if enabled
    if (MANUAL_INTERSTITIAL) {
      setShowInterstitial(true);
      
      // Simulate processing time, then hide interstitial and route
      setTimeout(() => {
        console.log('[ROUTE][CALL]', { source: 'manual', itemId: food?.id || food?.name });
        onFoodSelected(itemWithPortion);
        setShowInterstitial(false);
        setSelectedFood(null);
        setIsPortionLoading(false);
        onClose();
      }, 600); // Short delay to show interstitial
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <AccessibleDialogContent
          className="sm:max-w-lg z-[600]"
          title="Manual Entry"
          description="Search for foods to add to your log"
        >
          <motion.div 
            role="document" 
            className="p-6"
            initial={fxEnabled ? { opacity: 0, scale: 0.97 } : undefined}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.12 }}
          >
            {/* Header */}
            <div className="space-y-4 mb-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">
                  Add Food Manually
                </DialogTitle>
                <DialogDescription className="text-base">
                  Search and select foods to add to your log.
                </DialogDescription>
              </DialogHeader>

              {/* Usage hints */}
              {MANUAL_HINTS && (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border">
                  <HelpCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">Best for restaurant meals, branded items, and supermarket foods</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowInfoSheet(!showInfoSheet)}
                      className="h-auto p-0 text-xs underline"
                    >
                      {showInfoSheet ? 'Hide examples' : 'Show examples'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Info sheet */}
              {showInfoSheet && (
                <motion.div 
                  className="space-y-3 p-4 bg-card border rounded-lg"
                  initial={fxEnabled ? { opacity: 0, height: 0 } : undefined}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={fxEnabled ? { opacity: 0, height: 0 } : undefined}
                  transition={{ duration: 0.2 }}
                >
                  <h4 className="font-medium">When to use Manual Entry</h4>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>
                      Manual Entry works best for restaurant meals, branded items, and supermarket foods. 
                      Try typing a brand (e.g., 'Costco', 'Tesco'), a restaurant (e.g., 'Chipotle', 'Subway'), 
                      or a specific product name.
                    </p>
                    <div className="space-y-1">
                      <p className="font-medium">Examples:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-xs">
                        <li>"Chipotle burrito bowl"</li>
                        <li>"McDonald's Big Mac"</li>
                        <li>"Costco rotisserie chicken"</li>
                        <li>"Ben & Jerry's ice cream"</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Content */}
            <div className="space-y-6">
              {selectedFood ? (
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
                />
              )}
            </div>

            {/* Footer tip - only show if not in portion step */}
            {!selectedFood && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  💡 Manual Entry works best for restaurant meals, brand & supermarket items
                </p>
              </div>
            )}
          </motion.div>
        </AccessibleDialogContent>
      </Dialog>

      {/* Interstitial Loader */}
      <InterstitialLoader 
        isVisible={showInterstitial}
        onComplete={handleInterstitialComplete}
        maxDuration={800}
      />
    </>
  );
}