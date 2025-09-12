import React, { useState, useEffect } from 'react';
import { UtensilsCrossed } from 'lucide-react';

type ImageWithFallbackProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src?: string;
  candidateUrls?: string[];
  srcs?: string[];
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
};

export function ImageWithFallback({ 
  src, 
  candidateUrls = [], 
  srcs = [],
  alt, 
  className = "",
  fallbackIcon,
  ...rest 
}: ImageWithFallbackProps) {
  // Combine all possible sources, removing duplicates
  const allUrls = [src, ...candidateUrls, ...srcs].filter(Boolean) as string[];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Reset when URLs change
  useEffect(() => {
    setCurrentIndex(0);
    setHasError(false);
  }, [src, candidateUrls, srcs]);

  const handleError = () => {
    console.log('[IMG][FALLBACK]', { 
      failed: allUrls[currentIndex], 
      nextIndex: currentIndex + 1, 
      remaining: allUrls.length - currentIndex - 1 
    });
    
    if (currentIndex < allUrls.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setHasError(true);
    }
  };

  // If no URLs or all failed, show fallback
  if (allUrls.length === 0 || hasError) {
    return (
      <div className={`flex items-center justify-center bg-muted/50 ${className}`}>
        {fallbackIcon || <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />}
      </div>
    );
  }

  const currentUrl = allUrls[currentIndex];
  
  return (
    <img
      {...rest}
      src={currentUrl}
      alt={alt}
      className={className}
      onError={handleError}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      loading="lazy"
    />
  );
}

export default ImageWithFallback;