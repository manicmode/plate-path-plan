import { useEffect } from "react";

export function useViewportUnitsFix() {
  useEffect(() => {
    const apply = () => {
      const vh = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
      document.documentElement.style.setProperty("--safe-bottom", getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-bottom)") || "0px");
      
      // Temporary telemetry
      console.log("[HS][layout]", {
        innerHeight: window.innerHeight,
        vv: window.visualViewport?.height,
        cssVh: getComputedStyle(document.documentElement).getPropertyValue("--vh"),
      });
    };
    
    apply();
    window.visualViewport?.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    window.addEventListener("resize", apply);
    
    return () => {
      window.visualViewport?.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);
}