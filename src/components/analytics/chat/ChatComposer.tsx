import React, { useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatComposerProps = {
  onSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
};

const EMOJIS = [
  "🔥","💪","😁","😂","👏","❤️","🚀","🌟","✨","🥇","🏆","🧘‍♀️","🧘‍♂️","💧","🍎","🥦","🏃‍♀️","🏃‍♂️","⏱️","📈","💤","🧊","🫡","🤝","🙌","😅","😎","😇","🤩","🤗","🤔","🤤","😴","🤸‍♀️","🤸‍♂️","🧗","🚴","🛌","🫶","🧡","💙","💚","💛","🩵","🩷","🤍","🤎"
  // add more freely; list can be long
];

export default function ChatComposer({ onSend, disabled, className }: ChatComposerProps) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const canSend = useMemo(() => value.trim().length > 0 && !disabled, [value, disabled]);

  const insertEmoji = (emoji: string) => {
    const ta = taRef.current;
    if (!ta) { setValue(v => v + emoji); return; }
    const start = ta.selectionStart ?? ta.value.length;
    const end   = ta.selectionEnd ?? ta.value.length;
    const next  = ta.value.slice(0, start) + emoji + ta.value.slice(end);
    setValue(next);
    // Move caret after emoji
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const handleSubmit = async () => {
    const text = value.trim();
    if (!text) return;
    await onSend(text);
    setValue("");
    // keep focus for quick chats
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn(
      "sticky bottom-0 z-40 w-full bg-gradient-to-t from-background/95 to-background/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-t",
      "pt-2 md:pt-3 pb-[env(safe-area-inset-bottom)]",
      className
    )}>
      {/* Emoji strip (contained & clipped) */}
      <div className="px-4 md:px-6">
        <div className="relative rounded-2xl border border-white/10 bg-muted/20 overflow-hidden">
          <div
            role="listbox"
            aria-label="Emoji picker"
            className="no-scrollbar overflow-x-auto flex gap-2 px-3 py-2 items-center"
            style={{
              touchAction: 'pan-x',
              overscrollBehaviorX: 'contain'
            }}
          >
            {EMOJIS.map((e, i) => (
              <button
                key={`${e}-${i}`}
                type="button"
                onClick={() => insertEmoji(e)}
                className="shrink-0 rounded-xl px-2 py-1 text-2xl hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                aria-label={`Insert ${e}`}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Subtle edge fades to hint scroll, while keeping content 'inside' */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background/90 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background/90 to-transparent" />
        </div>
      </div>

      {/* Input row */}
      <div className="flex items-end gap-2 px-4 md:px-6 pb-3">
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message…"
          rows={1}
          className={cn(
            "min-h-[44px] max-h-[160px] w-full resize-none",
            "rounded-2xl bg-muted/30 border border-border",
            "px-4 py-3 leading-5 focus:outline-none focus:ring-2 focus:ring-primary/60"
          )}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            "grid place-items-center rounded-full transition-all",
            "h-12 w-12 md:h-14 md:w-14",
            canSend
              ? "bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95"
              : "bg-muted/40 cursor-not-allowed"
          )}
        >
          <Send className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
