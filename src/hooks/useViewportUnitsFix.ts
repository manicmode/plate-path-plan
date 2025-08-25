import { useEffect } from "react";

export function useViewportUnitsFix() {
  useEffect(() => {
    const set = () => {
      const h = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
      document.documentElement.style.setProperty("--vh", `${h}px`);
    };
    set();
    window.addEventListener("resize", set);
    window.visualViewport?.addEventListener?.("resize", set);
    return () => {
      window.removeEventListener("resize", set);
      window.visualViewport?.removeEventListener?.("resize", set);
    };
  }, []);
}