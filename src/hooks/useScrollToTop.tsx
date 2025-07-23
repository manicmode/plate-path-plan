
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export const useScrollToTop = () => {
  const location = useLocation();
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only scroll to top for specific routes that need it
    const shouldScroll = ['/home', '/analytics', '/coach', '/explore', '/exercise-hub'].includes(location.pathname);
    
    if (shouldScroll) {
      // Debounced scroll with longer delay to prevent conflicts
      timeoutRef.current = setTimeout(() => {
        try {
          window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
          });
        } catch (error) {
          console.warn('Scroll to top failed:', error);
        }
      }, 200);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname]);
};
