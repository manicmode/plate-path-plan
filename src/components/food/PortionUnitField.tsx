import React from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PortionUnitFieldProps {
  amount: number;
  unit: string;
  onAmountChange: (amount: number) => void;
  onUnitChange: (unit: string) => void;
  disabled?: boolean;
}

const UNIT_CHIPS = [
  { value: 'g', label: 'grams', symbol: 'g' },
  { value: 'oz', label: 'ounces', symbol: 'oz' },
  { value: 'ml', label: 'milliliters', symbol: 'ml' },
  { value: 'slice', label: 'slices', symbol: 'slice' },
  { value: 'cup', label: 'cups', symbol: 'cup' },
  { value: 'piece', label: 'pieces', symbol: 'pc' }
];

export const PortionUnitField: React.FC<PortionUnitFieldProps> = ({
  amount,
  unit,
  onAmountChange,
  onUnitChange,
  disabled = false
}) => {
  return (
    <div className="space-y-3">
      <Label className="text-sm text-slate-300">Portion Size</Label>
      
      {/* Amount Input */}
      <div className="flex items-center gap-3">
        <Input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmountChange(Number(e.target.value) || 0)}
          placeholder="100"
          disabled={disabled}
          className="w-24 bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:bg-white/10 focus:border-sky-400"
          min="1"
          max="9999"
        />
        <span className="text-slate-400 text-sm">
          {UNIT_CHIPS.find(u => u.value === unit)?.symbol || unit}
        </span>
      </div>

      {/* Unit Selection Chips */}
      <div className="space-y-2">
        <p className="text-xs text-slate-400">Quick units:</p>
        <div className="flex flex-wrap gap-2">
          {UNIT_CHIPS.map((unitOption, index) => (
            <motion.button
              key={unitOption.value}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => onUnitChange(unitOption.value)}
              disabled={disabled}
              className={`
                px-3 py-2 rounded-lg text-xs transition-all
                focus:outline-none focus:ring-2 focus:ring-sky-400
                disabled:opacity-50 disabled:cursor-not-allowed
                ${unit === unitOption.value
                  ? 'bg-sky-400 text-white shadow-lg'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10 hover:border-white/20'
                }
              `}
            >
              {unitOption.symbol}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Contextual Help */}
      <motion.p 
        key={unit}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs text-slate-400"
      >
        {unit === 'g' && 'Most accurate for nutrition calculations'}
        {unit === 'oz' && 'Will be converted to grams (1 oz = 28.3g)'}
        {unit === 'ml' && 'For liquids - treated as 1:1 with grams'}
        {unit === 'slice' && 'Contextual sizing based on food type'}
        {unit === 'cup' && 'Standard US cup measure (~240ml)'}
        {unit === 'piece' && 'Individual items or servings'}
      </motion.p>
    </div>
  );
};