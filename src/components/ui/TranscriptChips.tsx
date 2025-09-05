import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TranscriptChipsProps {
  words: string[];
  isEditable?: boolean;
  onEdit?: (index: number) => void;
  onRemove?: (index: number) => void;
  className?: string;
}

export const TranscriptChips: React.FC<TranscriptChipsProps> = ({
  words,
  isEditable = false,
  onEdit,
  onRemove,
  className = ""
}) => {
  if (words.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <AnimatePresence>
        {words.map((word, index) => (
          <motion.div
            key={`${word}-${index}`}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 25,
              delay: index * 0.05 
            }}
            className={`
              relative group inline-block px-3 py-1.5 rounded-xl 
              bg-gradient-to-r from-emerald-50 to-teal-50 
              dark:from-emerald-900/20 dark:to-teal-900/20
              border border-emerald-200/50 dark:border-emerald-700/50
              text-sm font-medium text-emerald-700 dark:text-emerald-300
              transition-all duration-200
              ${isEditable ? 'hover:scale-105 hover:shadow-md cursor-pointer' : ''}
              ${index === words.length - 1 ? 'ring-2 ring-emerald-400/30 ring-offset-1' : ''}
            `}
            onClick={() => isEditable && onEdit?.(index)}
          >
            <span className="select-none">{word}</span>
            
            {isEditable && (
              <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove?.(index);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {isEditable && (
              <Edit3 className="inline-block ml-1 h-3 w-3 opacity-60" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};