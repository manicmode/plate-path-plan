import { useState, useEffect, useRef } from 'react';

export const useRotatingExamples = (examples: string[], intervalMs: number = 3000) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isHovered) return;
    
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % examples.length);
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [examples.length, intervalMs, isHovered]);

  const onMouseEnter = () => setIsHovered(true);
  const onMouseLeave = () => setIsHovered(false);

  return {
    currentExample: examples[currentIndex],
    currentIndex,
    onMouseEnter,
    onMouseLeave,
    allExamples: examples
  };
};