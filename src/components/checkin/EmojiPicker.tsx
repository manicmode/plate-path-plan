import * as React from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ENERGY_EMOJIS } from '@/utils/energy';
import { cn } from '@/lib/utils';

interface EmojiPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (emoji: string) => void;
  onSelectItem?: (item: { emoji: string; value?: number }) => void;
  onAuto: () => void;
  currentEmoji: string;
  items?: Array<{ emoji: string; value: number } | string>;
  title?: string;
  hasAuto?: boolean;
  ariaLabel?: string;
  className?: string;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  open,
  onOpenChange,
  onSelect,
  onSelectItem,
  onAuto,
  currentEmoji,
  items,
  title,
  hasAuto = true,
  ariaLabel,
  className,
}) => {
  const normalized = React.useMemo(() => {
    if (items && items.length > 0) {
      return items.map((it) => (typeof it === 'string' ? { emoji: it, value: undefined } : it));
    }
    // Fallback: keep backwards compatibility with ENERGY_EMOJIS
    return ENERGY_EMOJIS.map((e) => ({ emoji: e, value: undefined }));
  }, [items]);

  const handleSelect = (item: { emoji: string; value?: number }) => {
    onSelectItem?.(item);
    onSelect?.(item.emoji);
    onOpenChange(false);
  };

  const handleAuto = () => {
    onAuto();
    onOpenChange(false);
  };

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
          <span className="text-xs text-muted-foreground">{title ?? 'Pick emoji'}</span>
          {hasAuto && (
            <button
              type="button"
              onClick={handleAuto}
              className="text-xs px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80"
              aria-label="Set to Auto"
            >
              Auto
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {normalized.map((it) => (
            <button
              key={it.emoji}
              type="button"
              className={cn(
                'h-9 w-9 rounded-md bg-muted/40 hover:bg-muted flex items-center justify-center text-2xl',
                currentEmoji === it.emoji && 'ring-2 ring-primary'
              )}
              onClick={() => handleSelect(it)}
              aria-label={`Choose ${it.emoji}`}
            >
              <span>{it.emoji}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
