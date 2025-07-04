
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useScrollToTop = (enabled: boolean = true) => {
  const location = useLocation();

  useEffect(() => {
    if (enabled) {
      // Use setTimeout to ensure DOM is ready and avoid conflicts
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [location.pathname, enabled]);
};
