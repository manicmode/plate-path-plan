// Utilities for aligning a target element to the top of its scroll container (or window)
// Smooth but snappy, with safe-area and header offsets considered.

export function getScrollableAncestor(el: HTMLElement | null): HTMLElement | Window {
  if (!el) return window;
  let node: HTMLElement | null = el;
  const isScrollable = (elem: HTMLElement) => {
    const style = window.getComputedStyle(elem);
    const overflowY = style.overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return elem.scrollHeight > elem.clientHeight + 1; // tolerate 1px rounding
    }
    return false;
  };
  while (node && node.parentElement) {
    if (isScrollable(node)) return node;
    node = node.parentElement;
  }
  return window;
}

function readNumberCssVar(varName: string, fallback = 0): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export function scrollToAlignTop(targetEl: HTMLElement | null, opts?: { offsetTop?: number; reassertDelayMs?: number }) {
  if (!targetEl) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Offsets
  const safeAreaTop = Math.max(
    // Optional custom CSS variables you may define in your theme
    readNumberCssVar('--safe-area-top', 0),
    0
  );
  const headerH = readNumberCssVar('--app-header-height', 0);
  const extraOffset = opts?.offsetTop ?? 0;
  const offsetTop = safeAreaTop + headerH + extraOffset;

  const ancestor = getScrollableAncestor(targetEl);

  const computeTop = () => {
    const targetRect = targetEl.getBoundingClientRect();
    if (ancestor === window) {
      const top = window.scrollY + targetRect.top - offsetTop;
      return Math.max(top, 0);
    } else {
      const anc = ancestor as HTMLElement;
      const ancRect = anc.getBoundingClientRect();
      const delta = targetRect.top - ancRect.top;
      return Math.max(anc.scrollTop + delta - offsetTop, 0);
    }
  };

  const top = computeTop();

  const behavior: ScrollBehavior = prefersReduced ? 'auto' : 'smooth';
  if (ancestor === window) {
    window.scrollTo({ top, behavior });
  } else {
    (ancestor as HTMLElement).scrollTo({ top, behavior });
  }

  // Re-assert after keyboard/layout shifts
  const delay = opts?.reassertDelayMs ?? 120;
  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      const top2 = computeTop();
      if (ancestor === window) {
        window.scrollTo({ top: top2, behavior });
      } else {
        (ancestor as HTMLElement).scrollTo({ top: top2, behavior });
      }
    }, delay);
  });
}
