import * as React from 'react';
import { Slider } from '@/components/ui/slider';

type Props = {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  className?: string;
  ariaLabel?: string;
};

export default function ValueSlider({
  min = 1, max = 10, step = 1,
  value, onChange, className, ariaLabel = 'value'
}: Props) {
  const [local, setLocal] = React.useState(value);
  const [dragging, setDragging] = React.useState(false);

  React.useEffect(() => {
    if (!dragging) setLocal(value);
  }, [value, dragging]);

  const commit = ([v]: number[]) => {
    setDragging(false);
    onChange(v);
    // light haptic on mobile (safe no-op on web)
    try { (navigator as any).vibrate?.(10); } catch {}
  };

  // requestAnimationFrame-based smoothing during drag
  const frame = React.useRef<number | null>(null);
  const nextVal = React.useRef<number | null>(null);
  const setSmooth = React.useCallback((v: number) => {
    nextVal.current = v;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      if (nextVal.current != null) setLocal(nextVal.current);
      frame.current = null;
    });
  }, []);

  React.useEffect(() => () => {
    if (frame.current) cancelAnimationFrame(frame.current);
  }, []);

  return (
    <div className={`value-slider ${className ?? ''}`}>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[local]}
        onPointerDown={(e: any) => {
          try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch {}
        }}
        onValueChange={([v]) => { setSmooth(v); setDragging(true); }}
        onValueCommit={commit}
        aria-label={ariaLabel}
        className="mood-slider"
      />
      {/* Bubble */}
      <div
        className={`value-bubble ${dragging ? 'show' : ''}`}
        style={{
          left: `${((local - min) / (max - min)) * 100}%`
        }}
        aria-hidden
      >
        <span>{local}/{max}</span>
      </div>
    </div>
  );
}