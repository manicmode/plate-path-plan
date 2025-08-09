import * as React from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ENERGY_EMOJIS } from '@/utils/energy';
import { cn } from '@/lib/utils';

interface EmojiPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (emoji: string) => void;
  onAuto: () => void;
  currentEmoji: string;
  ariaLabel?: string;
  className?: string;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  open,
  onOpenChange,
  onSelect,
  onAuto,
  currentEmoji,
  ariaLabel,
  className,
}) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={ariaLabel}
          className={cn('inline-flex items-center justify-center', className)}
        >
          <span className="text-4xl leading-none select-none">{currentEmoji}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Pick energy</span>
          <button
            type="button"
            onClick={() => { onAuto(); onOpenChange(false); }}
            className="text-xs px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80"
            aria-label="Set to Auto"
          >
            Auto
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {ENERGY_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className={cn(
                'h-9 w-9 rounded-md bg-muted/40 hover:bg-muted flex items-center justify-center text-2xl',
                currentEmoji === e && 'ring-2 ring-primary'
              )}
              onClick={() => { onSelect(e); onOpenChange(false); }}
              aria-label={`Choose ${e}`}
            >
              <span>{e}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
