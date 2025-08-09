let _frozen = false;
let _prevY = 0;
let _prevX = 0;
let _prevBodyTop = "";
let _prevBodyLeft = "";
let _prevBodyPos = "";
let _prevScrollbarGutter = "";

export function withFrozenScroll<T>(fn: () => T): T {
  if (_frozen) return fn();

  _prevY = window.scrollY;
  _prevX = window.scrollX;
  if (import.meta.env.DEV) console.log("[Profile Edit] before", _prevX, _prevY);

  const b = document.body;
  _prevBodyPos = b.style.position;
  _prevBodyTop = b.style.top;
  _prevBodyLeft = (b.style as any).left ?? "";
  _prevScrollbarGutter = (document.documentElement.style as any).scrollbarGutter ?? "";

  // Prevent reflow-driven jumps by pinning the body
  b.style.position = "fixed";
  b.style.top = `-${_prevY}px`;
  (b.style as any).left = `-${_prevX}px`;

  // Avoid layout shift when vertical scrollbar disappears
  (document.documentElement.style as any).scrollbarGutter = "stable";

  _frozen = true;

  const result = fn();

  // Restore after layout & focus complete (2 RAFs is usually safest)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const b2 = document.body;
      b2.style.position = _prevBodyPos;
      b2.style.top = _prevBodyTop;
      (b2.style as any).left = _prevBodyLeft;
      (document.documentElement.style as any).scrollbarGutter = _prevScrollbarGutter;

      window.scrollTo({ top: _prevY, left: _prevX, behavior: "instant" as ScrollBehavior });
      _frozen = false;
      if (import.meta.env.DEV) console.log("[Profile Edit] after", window.scrollX, window.scrollY);
    });
  });

  return result;
}
