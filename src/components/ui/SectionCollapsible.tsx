import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  startOpen?: boolean;
  storageKey?: string; // remember state across sessions
  children: React.ReactNode;
  className?: string;
};

export default function Collapsible({ title, startOpen = false, storageKey, children, className }: Props) {
  const [open, setOpen] = useState<boolean>(() => {
    if (!storageKey) return startOpen;
    try {
      const v = localStorage.getItem(storageKey);
      return v ? v === "1" : startOpen;
    } catch {
      return startOpen;
    }
  });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, open ? "1" : "0");
    } catch {}
  }, [open, storageKey]);

  // Height animation (respects reduced motion)
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      el.style.height = open ? "auto" : "0px";
      return;
    }
    const h = open ? `${el.scrollHeight}px` : "0px";
    el.style.height = h;
    const onEnd = () => {
      if (open) el.style.height = "auto";
    };
    el.addEventListener("transitionend", onEnd, { once: true });
    return () => el.removeEventListener("transitionend", onEnd);
  }, [open]);

  return (
    <section className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-xl px-4 py-3 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
        aria-expanded={open}
      >
        <span className="text-[15px] font-semibold">{title}</span>
        <span className={`transition-transform ${open ? "rotate-180" : "rotate-0"}`}>⌄</span>
      </button>

      <div
        ref={panelRef}
        className="overflow-hidden transition-[height] duration-300 ease-out will-change-[height]"
        style={{ height: open ? "auto" : 0 }}
      >
        <div className="px-4 pb-4 pt-1">{children}</div>
      </div>
    </section>
  );
}
