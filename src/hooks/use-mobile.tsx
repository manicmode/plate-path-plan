import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // 🔒 iOS Safari Security: Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.log("📱 useIsMobile: Window not available, defaulting to false");
      setIsMobile(false);
      return;
    }

    try {
      console.log("📱 useIsMobile: Setting up media query listener...");
      const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
      
      const onChange = () => {
        try {
          const mobile = window.innerWidth < MOBILE_BREAKPOINT;
          console.log("📱 useIsMobile: Screen size changed, mobile:", mobile);
          setIsMobile(mobile);
        } catch (error) {
          console.error("📱 useIsMobile: Error in onChange:", error);
        }
      };
      
      mql.addEventListener("change", onChange);
      
      // Initial check
      const initialMobile = window.innerWidth < MOBILE_BREAKPOINT;
      console.log("📱 useIsMobile: Initial mobile detection:", initialMobile);
      setIsMobile(initialMobile);
      
      return () => {
        try {
          mql.removeEventListener("change", onChange);
          console.log("📱 useIsMobile: Cleanup completed");
        } catch (error) {
          console.error("📱 useIsMobile: Error in cleanup:", error);
        }
      };
    } catch (error) {
      console.error("📱 useIsMobile: Error setting up media query:", error);
      setIsMobile(false);
    }
  }, [])

  return !!isMobile
}
