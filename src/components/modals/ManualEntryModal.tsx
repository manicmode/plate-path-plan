import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MANUAL_PORTION_STEP, MANUAL_FX } from '@/config/flags';
import ManualFoodEntry from '@/components/camera/ManualFoodEntry';
import { PortionPicker } from '@/components/manual/PortionPicker';
import { ManualInterstitialLoader } from '@/components/manual/ManualInterstitialLoader';
import { CloseButton } from '@/components/ui/close-button';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodSelected: (food: any) => void;
}

const ROTATING_HINTS = [
  "Try brand names: 'H-E-B tortillas', 'Tesco hot dog'",
  "Restaurant items: 'Chipotle bowl', 'Domino's salad'",
  "Use voice in 'Speak to log' for homemade meals"
];

export function ManualEntryModal({ isOpen, onClose, onFoodSelected }: ManualEntryModalProps) {
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [showInterstitial, setShowInterstitial] = useState(false);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fxEnabled = MANUAL_FX && !reducedMotion;


  // Listen for confirm:mounted event to hide loader and ensure overlay hides when confirmation opens
  useEffect(() => {
    const onConfirmMounted = () => {
      setShowInterstitial(false);
      onClose();
    };
    window.addEventListener('confirm:mounted', onConfirmMounted);
    return () => window.removeEventListener('confirm:mounted', onConfirmMounted);
  }, [onClose]);

  // Hide interstitial when any confirmation dialog opens
  useEffect(() => {
    const checkConfirmationOpen = () => {
      if ((window as any).__confirmOpen || document.querySelector('[data-state="open"][role="dialog"]')) {
        setShowInterstitial(false);
      }
    };
    
    const interval = setInterval(checkConfirmationOpen, 100);
    return () => clearInterval(interval);
  }, []);

  const handleFoodSelect = (food: any) => {
    if (MANUAL_PORTION_STEP) {
      setSelectedFood(food);
    } else {
      onFoodSelected(food);
      onClose();
    }
  };

  const handlePortionContinue = async (food: any, portion: any) => {
    const itemWithPortion = { ...food, portion };
    
    setShowInterstitial(true);
    
    // Route to confirm after small delay
    setTimeout(() => {
      onFoodSelected(itemWithPortion);
    }, 100);
  };

  const handlePortionCancel = () => {
    setSelectedFood(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
          {/* Single Close Button */}
          <CloseButton onClick={onClose} aria-label="Close" />
          
          {/* Header */}
          <div className="text-center pb-4">
            <DialogTitle className="text-xl font-semibold">
              Add Food Manually
            </DialogTitle>
          </div>

          {/* Content */}
          {selectedFood ? (
            <PortionPicker
              selectedFood={selectedFood}
              onCancel={handlePortionCancel}
              onContinue={handlePortionContinue}
            />
          ) : (
            <div className="px-1">
              <ManualFoodEntry 
                onFoodSelect={handleFoodSelect}
                onClose={onClose}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Interstitial Loader - Hide when confirmation is showing */}
      <ManualInterstitialLoader isVisible={showInterstitial} />
    </>
  );
}