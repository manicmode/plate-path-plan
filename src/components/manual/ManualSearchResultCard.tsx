import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MANUAL_FX } from '@/config/flags';

interface ManualSearchResultCardProps {
  food: any;
  index: number;
  isEnriching: boolean;
  isClicked: boolean;
  onSelect: (food: any, event?: React.MouseEvent) => void;
}

export function ManualSearchResultCard({
  food,
  index,
  isEnriching,
  isClicked,
  onSelect
}: ManualSearchResultCardProps) {
  const itemId = food.id || food.name;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fxEnabled = MANUAL_FX && !reducedMotion;

  const motionProps = fxEnabled
    ? {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { 
          duration: 0.14, 
          delay: index * 0.02
        },
        whileHover: { y: -2, transition: { duration: 0.08 } },
        layout: true
      }
    : {};

  return (
    <motion.div
      className="group flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 cursor-pointer relative overflow-hidden hover:shadow-sm transition-all duration-150"
      onClick={() => onSelect(food)}
      {...motionProps}
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground truncate">{food.name}</h3>
        
        {food.brand && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {food.brand}
          </p>
        )}
        
        <div className="flex items-center gap-3 mt-1">
          {food.calories && (
            <span className="text-xs text-muted-foreground">
              {Math.round(food.calories)} cal
            </span>
          )}
          {food.servingUnit && (
            <span className="text-xs text-muted-foreground">
              per {food.servingUnit}
            </span>
          )}
        </div>
      </div>
      
      {/* Enrichment progress bar */}
      {isEnriching && fxEnabled && (
        <motion.div 
          className="absolute top-0 left-0 h-0.5 bg-primary/60 z-10 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: "75%" }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      )}
      
      {/* Action button */}
      <motion.div
        whileTap={fxEnabled ? { scale: 0.96 } : undefined}
        transition={{ duration: 0.08 }}
      >
        <Button
          size="sm"
          variant="ghost"
          disabled={isEnriching}
          className="ml-3 h-9 w-9 p-0 rounded-full group-hover:bg-primary/10"
          onClick={(e) => onSelect(food, e)}
          aria-label={`Add ${food.name}`}
        >
          <AnimatePresence mode="wait">
            {isEnriching ? (
              <motion.div key="loading">
                <Loader2 className="h-4 w-4 animate-spin" />
              </motion.div>
            ) : isClicked ? (
              <motion.div 
                key="check"
                initial={fxEnabled ? { scale: 0.8, opacity: 0 } : undefined}
                animate={{ scale: 1, opacity: 1 }}
                exit={fxEnabled ? { scale: 0.8, opacity: 0 } : undefined}
                transition={{ duration: 0.15 }}
              >
                <Check className="h-4 w-4 text-green-600" />
              </motion.div>
            ) : (
              <motion.div 
                key="plus"
                initial={fxEnabled ? { scale: 0.8, opacity: 0 } : undefined}
                animate={{ scale: 1, opacity: 1 }}
                exit={fxEnabled ? { scale: 0.8, opacity: 0 } : undefined}
                transition={{ duration: 0.15 }}
              >
                <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>
    </motion.div>
  );
}