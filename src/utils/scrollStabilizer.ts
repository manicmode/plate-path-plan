type Unsub = () => void;

function getScrollEl(): Element & { scrollTop: number; scrollLeft: number; scrollTo?: (opts: any) => void } {
  const el = document.getElementById("AppScrollRoot");
  return (el as any) || (document.scrollingElement || document.documentElement) as any;
}

export function withStabilizedViewport<T>(fn: () => T): T {
  const el = getScrollEl();

  const state = {
    x: window.scrollX,
    y: window.scrollY,
    top: el.scrollTop,
    left: el.scrollLeft,
    vvTop: typeof window.visualViewport !== "undefined" ? window.visualViewport.pageTop : 0,
    vvLeft: typeof window.visualViewport !== "undefined" ? window.visualViewport.pageLeft : 0,
    locked: true as boolean,
    raf1: 0 as number,
    raf2: 0 as number,
    unsubs: [] as Unsub[],
  };

  const restoreNow = () => {
    if ((el as any).scrollTo) {
      (el as any).scrollTo({ top: state.top, left: state.left, behavior: "instant" as ScrollBehavior });
    } else {
      el.scrollTop = state.top;
      el.scrollLeft = state.left;
    }
    window.scrollTo({ top: state.y, left: state.x });
  };

  const onResizeOrScroll = () => {
    if (!state.locked) return;
    restoreNow();
  };

  if (window.visualViewport) {
    const vv = window.visualViewport;
    vv.addEventListener("scroll", onResizeOrScroll, { passive: true });
    vv.addEventListener("resize", onResizeOrScroll, { passive: true });
    state.unsubs.push(() => {
      vv.removeEventListener("scroll", onResizeOrScroll);
      vv.removeEventListener("resize", onResizeOrScroll);
    });
  }

  const onDocScroll = () => onResizeOrScroll();
  window.addEventListener("scroll", onDocScroll, { passive: true });
  state.unsubs.push(() => window.removeEventListener("scroll", onDocScroll));

  const doc = document.documentElement as HTMLElement;
  const body = document.body as HTMLElement;
  const prevOverflow = doc.style.overflow;
  const prevBodyOverflow = body.style.overflow;
  const prevPR = body.style.paddingRight;

  const gap = Math.max(0, window.innerWidth - doc.clientWidth);
  body.style.paddingRight = gap ? `${gap}px` : body.style.paddingRight;

  doc.style.overflow = "hidden";
  body.style.overflow = "hidden";


  const result = fn();

  state.raf1 = requestAnimationFrame(() => {
    state.raf2 = requestAnimationFrame(() => {
      state.locked = false;
      doc.style.overflow = prevOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevPR;

      restoreNow();
      state.unsubs.forEach((u) => u());

    });
  });

  return result;
}
