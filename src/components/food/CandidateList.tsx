import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  isGeneric: boolean;
  portionHint?: string;
  defaultPortion?: { amount: number; unit: string };
  provider?: string;
  imageUrl?: string;
  data?: any;
}

interface CandidateListProps {
  candidates: Candidate[];
  selectedCandidate: Candidate | null;
  onSelect: (candidate: Candidate) => void;
}

export const CandidateList: React.FC<CandidateListProps> = ({
  candidates,
  selectedCandidate,
  onSelect
}) => {
  return (
    <div className="space-y-3">
      <h4 className="text-sm text-slate-300 font-medium">Choose a match:</h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {candidates.map((candidate, index) => (
          <motion.button
            key={candidate.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              delay: index * 0.04,
              duration: 0.2,
              ease: "easeOut"
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(candidate)}
            className={`
              relative p-3 rounded-xl text-left transition-all
              focus:outline-none focus:ring-2 focus:ring-sky-400
              ${selectedCandidate?.id === candidate.id
                ? 'bg-sky-400/20 border-2 border-sky-400 ring-2 ring-sky-400/50'
                : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'
              }
            `}
          >
            {/* Selection indicator */}
            {selectedCandidate?.id === candidate.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-sky-400 rounded-full flex items-center justify-center"
              >
                <Check className="h-3 w-3 text-white" />
              </motion.div>
            )}

            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h5 className="font-medium text-white text-sm leading-tight line-clamp-2">
                  {candidate.name}
                </h5>
                
                <Badge 
                  variant={candidate.isGeneric ? "default" : "secondary"}
                  className={`
                    text-xs px-2 py-0.5 flex-shrink-0
                    ${candidate.isGeneric 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                    }
                  `}
                >
                  {candidate.isGeneric ? 'Generic' : 'Brand'}
                </Badge>
              </div>
              
              {candidate.portionHint && (
                <p className="text-xs text-slate-400">
                  {candidate.portionHint}
                </p>
              )}
              
              <p className="text-xs text-slate-500 capitalize">
                {candidate.data?.brand ? `Via ${candidate.data.brand}` : (candidate.isGeneric ? 'Via Generic' : 'Via Brand')}
              </p>
            </div>

            {/* Hover glow effect */}
            <motion.div
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-400/10 to-emerald-400/10 opacity-0 pointer-events-none"
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
          </motion.button>
        ))}
      </div>

      {/* Help text */}
      <p className="text-xs text-slate-400 text-center">
        Generic options use average nutrition data • Brand items are more specific
      </p>
    </div>
  );
};