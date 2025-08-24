import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/auth';
import { supplementEducationTips, type SupplementTip } from '@/data/supplementEducationTips';
import { toast } from '@/hooks/use-toast';

// Configuration constants
const ROTATION_INTERVAL = 6000; // 6 seconds
const FADE_DURATION = 300; // 300ms
const STORAGE_KEY_PREFIX = 'supp.education.index';

interface SupplementEducationCardProps {
  className?: string;
}

export const SupplementEducationCard = ({ className = '' }: SupplementEducationCardProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeState, setFadeState] = useState<'fade-in' | 'fade-out'>('fade-in');
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(!document.hidden);

  // Storage key based on user ID or anonymous
  const storageKey = `${STORAGE_KEY_PREFIX}:${user?.id || 'anon'}`;

  // Load persisted index on mount
  useEffect(() => {
    try {
      const savedIndex = localStorage.getItem(storageKey);
      if (savedIndex && !isNaN(parseInt(savedIndex))) {
        const index = parseInt(savedIndex);
        if (index >= 0 && index < supplementEducationTips.length) {
          setCurrentIndex(index);
        }
      }
    } catch (error) {
      console.warn('Failed to load saved supplement tip index:', error);
    }
  }, [storageKey]);

  // Save current index to localStorage
  const saveCurrentIndex = useCallback((index: number) => {
    try {
      localStorage.setItem(storageKey, index.toString());
    } catch (error) {
      console.warn('Failed to save supplement tip index:', error);
    }
  }, [storageKey]);

  // Handle visibility change (pause when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Auto-rotation timer
  useEffect(() => {
    if (supplementEducationTips.length <= 1 || isPaused || !isVisible) {
      return;
    }

    const interval = setInterval(() => {
      setFadeState('fade-out');
      setTimeout(() => {
        setCurrentIndex((prev) => {
          const nextIndex = (prev + 1) % supplementEducationTips.length;
          saveCurrentIndex(nextIndex);
          return nextIndex;
        });
        setFadeState('fade-in');
      }, FADE_DURATION);
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [isPaused, isVisible, saveCurrentIndex]);

  // Navigation functions
  const goToTip = useCallback((index: number) => {
    if (index === currentIndex || index < 0 || index >= supplementEducationTips.length) {
      return;
    }

    setFadeState('fade-out');
    setTimeout(() => {
      setCurrentIndex(index);
      saveCurrentIndex(index);
      setFadeState('fade-in');
    }, FADE_DURATION);
  }, [currentIndex, saveCurrentIndex]);

  const goToPrevious = useCallback(() => {
    const prevIndex = currentIndex === 0 ? supplementEducationTips.length - 1 : currentIndex - 1;
    goToTip(prevIndex);
  }, [currentIndex, goToTip]);

  const goToNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % supplementEducationTips.length;
    goToTip(nextIndex);
  }, [currentIndex, goToTip]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext]);

  // Handle supplement purchase
  const handleBuyNow = useCallback((tip: SupplementTip) => {
    if (!tip.productSlug) {
      toast({
        title: "Coming Soon",
        description: "This supplement is not yet available in our catalog.",
      });
      return;
    }

    // Analytics (no-op for now)
    console.log('supplement_buy_clicked', { id: tip.id, slug: tip.productSlug });

    // For now, show a toast since we don't have a modal system in place
    toast({
      title: "Supplement Details",
      description: `${tip.title} details would open here. Product: ${tip.productSlug}`,
    });
  }, []);

  // Empty state
  if (supplementEducationTips.length === 0) {
    return (
      <Card className={`modern-action-card border-0 rounded-3xl shadow-xl ${className}`}>
        <CardContent className={`${isMobile ? 'p-6' : 'p-8'}`}>
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">More supplement insights coming soon.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentTip = supplementEducationTips[currentIndex];

  return (
    <Card 
      className={`modern-action-card ai-insights-card border-0 rounded-3xl animate-slide-up float-animation hover:scale-[1.02] transition-all duration-500 shadow-xl hover:shadow-2xl ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-labelledby="supp-edu-heading"
    >
      <CardContent className={`${isMobile ? 'p-6' : 'p-8'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between ${isMobile ? 'mb-4' : 'mb-6'}`}>
          <div className={`flex items-center ${isMobile ? 'space-x-3' : 'space-x-4'}`}>
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} gradient-primary rounded-full flex items-center justify-center shadow-lg ai-glow`}>
              <Lightbulb className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
            </div>
            <div>
              <h3 id="supp-edu-heading" className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>
                Supplement Education
              </h3>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
                Evidence-based insights
              </p>
            </div>
          </div>

          {/* Navigation arrows for keyboard users */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevious}
              className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
              aria-label="Previous supplement tip"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNext}
              className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
              aria-label="Next supplement tip"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center space-x-2 mb-6" role="tablist">
          {supplementEducationTips.map((_, index) => (
            <button
              key={index}
              role="tab"
              aria-selected={index === currentIndex}
              aria-controls={`tip-content-${index}`}
              className={`w-3 h-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                index === currentIndex 
                  ? 'bg-blue-500 scale-125' 
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
              onClick={() => {
                goToTip(index);
                console.log('supplement_tip_dot_clicked', { id: currentTip.id, toIndex: index });
              }}
              tabIndex={0}
            />
          ))}
        </div>

        {/* Content area */}
        <div className={`min-h-[120px] ${isMobile ? 'mb-6' : 'mb-8'}`}>
          <div 
            className={`transition-all duration-300 ${
              fadeState === 'fade-in' ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'
            }`}
            id={`tip-content-${currentIndex}`}
            role="tabpanel"
          >
            <div className="flex items-start space-x-4">
              <div className="text-3xl flex-shrink-0 mt-1">{currentTip.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-3">
                  <h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>
                    {currentTip.title}
                  </h4>
                  {currentTip.tag && (
                    <Badge variant="secondary" className="text-xs">
                      {currentTip.tag}
                    </Badge>
                  )}
                </div>
                <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-700 dark:text-gray-300 leading-relaxed`}>
                  {currentTip.blurb}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          onClick={() => handleBuyNow(currentTip)}
          disabled={!currentTip.productSlug}
          className={`w-full gradient-primary rounded-2xl ${isMobile ? 'h-12' : 'h-14'} neon-glow font-semibold`}
          aria-label={`Buy ${currentTip.title} supplement`}
        >
          <ShoppingCart className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} mr-2`} />
          Buy this supplement
        </Button>
      </CardContent>
    </Card>
  );
};