import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  placeholder?: string;
}

const COMMON_EMOJIS = [
  '🏃', '💪', '🧘', '🍎', '💤', '🌙', '☀️', '📚', '💧', '🎵',
  '🚴', '🏊', '🧠', '❤️', '🔥', '⭐', '🎯', '📱', '🌱', '🔔',
  '✨', '🚀', '💎', '🏆', '📈', '🎨', '✍️', '📝', '🤝', '🙏',
  '⚡', '🔬', '📖', '🎪', '🌈', '🎭', '🎸', '📷', '🛠️', '🧪'
];

export function EmojiPicker({ value, onChange, placeholder = "Pick an emoji" }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleEmojiSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            !value && "text-muted-foreground"
          )}
        >
          {value ? (
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-2">
                <span className="text-lg">{value}</span>
                <span>Emoji selected</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={handleClear}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="grid grid-cols-8 gap-2">
          {COMMON_EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-lg hover:bg-primary/10"
              onClick={() => handleEmojiSelect(emoji)}
            >
              {emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}