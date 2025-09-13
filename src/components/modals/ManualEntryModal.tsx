import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { MANUAL_PORTION_STEP } from '@/config/flags';
import ManualSearchResults from '@/components/manual/ManualSearchResults';
import { PortionPicker } from '@/components/manual/PortionPicker';
import { ManualInterstitialLoader } from '@/components/manual/ManualInterstitialLoader';

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
  const [hintIndex, setHintIndex] = useState(0);
  const [showExamples, setShowExamples] = useState(false);

  // Disable any periodic UI effects to avoid focus flicker


  // Listen for confirm:mounted event to hide loader
  useEffect(() => {
    const onConfirmMounted = () => {
      setShowInterstitial(false);
      onClose();
    };
    window.addEventListener('confirm:mounted', onConfirmMounted);
    return () => window.removeEventListener('confirm:mounted', onConfirmMounted);
  }, [onClose]);

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

  const handleExampleSelect = (example: string) => {
    setShowExamples(false);
    // Trigger search with the example - this needs to be connected to the search component
  };

  const examples = [
    "Chipotle bowl",
    "HEB tortillas", 
    "Costco hot dog",
    "Starbucks sandwich",
    "Ben & Jerry's",
    "Trader Joe's dumplings"
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="manual-entry-modal" onPointerDownOutside={(e) => e.preventDefault()}>
          <div className="manual-modal-container">
            {/* Header */}
            <div className="manual-header">
              <div>
                <DialogTitle className="manual-title">
                  Add Food Manually
                </DialogTitle>
                <DialogDescription className="manual-subtitle">
                  Search brand or restaurant items
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close modal"
                className="manual-close-btn"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="manual-divider" />

            {/* Content */}
            {selectedFood ? (
              <PortionPicker
                selectedFood={selectedFood}
                onCancel={handlePortionCancel}
                onContinue={handlePortionContinue}
              />
            ) : (
              <div className="manual-content">
                <ManualSearchResults onFoodSelect={handleFoodSelect} />
                
                {/* Static hint (no animations) */}
                <div className="manual-hint-container">
                  <p className="manual-hint">{ROTATING_HINTS[0]}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowExamples(!showExamples);
                    }}
                    className="manual-examples-btn"
                  >
                    Examples
                  </Button>
                </div>

                {/* Examples sheet */}
                {showExamples && (
                  <div className="manual-examples-sheet">
                    <div className="manual-examples-grid">
                      {examples.map((example, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleExampleSelect(example);
                          }}
                          className="manual-example-chip"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer tip */}
                <div className="manual-footer">
                  <p className="manual-footer-tip">
                    💡 Manual Entry is best for restaurant meals & branded items. Try brand names for best matches.
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Interstitial Loader */}
      <ManualInterstitialLoader isVisible={showInterstitial} />
    </>
  );
}