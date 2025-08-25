import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { loadRegistry, type Registry } from '@/lib/supplements/registry';
import { getLastIndex, setLastIndex } from '@/lib/supplements/storage';
import { type SupplementTip } from '@/types/supplements';

// Configuration constants
const ROTATION_INTERVAL = 6000; // 6 seconds
const FADE_DURATION = 300; // 300ms

interface SupplementEducationCardProps {
  className?: string;
}

export const SupplementEducationCardComponent = ({ className = '' }: SupplementEducationCardProps) => {
  // --- ALL HOOKS UNCONDITIONAL, ALWAYS AT TOP ---
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Core state - always initialized
  const [tips, setTips] = useState<SupplementTip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeState, setFadeState] = useState<'fade-in' | 'fade-out'>('fade-in');
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [registry, setRegistry] = useState<Registry | null>(null);

  // Safe localStorage functions - always defined
  const safeGet = useCallback((key: string) => { 
    try { 
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; 
    } catch { 
      return null; 
    } 
  }, []);
  
  const safeSet = useCallback((key: string, val: string) => { 
    try { 
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, val); 
    } catch {} 
  }, []);
  
  const safeGetLastIndex = useCallback((userId?: string) => {
    try {
      return getLastIndex(userId);
    } catch {
      return 0;
    }
  }, []);

  // Save current index to localStorage - always defined
  const saveCurrentIndex = useCallback((index: number) => {
    try {
      setLastIndex(index, user?.id);
    } catch {
      // Fail silently
    }
  }, [user?.id]);

  // Load registry and tips - unconditional effect, guard inside
  useEffect(() => {
    let alive = true;
    const loadData = async () => {
      try {
        const reg = await loadRegistry();
        if (!alive) return;
        
        setRegistry(reg);
        setTips(reg?.tips || []);
        
        // Load persisted index after we have tips
        if (reg?.tips && reg.tips.length > 0) {
          const savedIndex = safeGetLastIndex(user?.id);
          if (savedIndex >= 0 && savedIndex < reg.tips.length) {
            setCurrentIndex(savedIndex);
          }
        }
      } catch (error) {
        console.error('SupplementEducationCard registry error:', error);
        if (!alive) return;
        
        // Ensure we always have fallback tips - never empty
        const fallbackTips = [{
          id: 'inline-fallback-creatine',
          title: 'Creatine Monohydrate',
          blurb: 'Supports strength, power, and recovery.',
          productSlug: 'creatine-monohydrate',
          emoji: '💪',
          ctaEnabled: true,
        }];
        setTips(fallbackTips);
        setRegistry({ catalog: {}, tips: fallbackTips });
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      alive = false;
    };
  }, [user?.id, safeGetLastIndex]);

  // Document visibility detection - unconditional, guard inside
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    // Set initial state
    setIsVisible(!document.hidden);
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Auto-rotation timer - unconditional hook, guard inside
  useEffect(() => {
    if (isLoading || isPaused || !isVisible || tips.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setFadeState('fade-out');
      setTimeout(() => {
        setCurrentIndex((prev) => {
          const nextIndex = (prev + 1) % tips.length;
          saveCurrentIndex(nextIndex);
          return nextIndex;
        });
        setFadeState('fade-in');
      }, FADE_DURATION);
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [isPaused, isVisible, isLoading, tips.length, saveCurrentIndex]);

  // Navigation functions - always defined
  const goToTip = useCallback((index: number) => {
    if (index === currentIndex || index < 0 || index >= tips.length) {
      return;
    }

    setFadeState('fade-out');
    setTimeout(() => {
      setCurrentIndex(index);
      saveCurrentIndex(index);
      setFadeState('fade-in');
    }, FADE_DURATION);
  }, [currentIndex, tips.length, saveCurrentIndex]);

  const goToPrevious = useCallback(() => {
    if (tips.length === 0) return;
    const prevIndex = currentIndex === 0 ? tips.length - 1 : currentIndex - 1;
    goToTip(prevIndex);
  }, [currentIndex, tips.length, goToTip]);

  const goToNext = useCallback(() => {
    if (tips.length === 0) return;
    const nextIndex = (currentIndex + 1) % tips.length;
    goToTip(nextIndex);
  }, [currentIndex, tips.length, goToTip]);

  // Keyboard navigation - unconditional hook, guard inside
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
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

  // Handle supplement purchase - always defined
  const handleBuyNow = useCallback((tip: SupplementTip) => {
    // Analytics
    console.log('supplement_buy_clicked', { 
      id: tip.id, 
      slug: tip.productSlug, 
      sponsor: tip.sponsor?.name 
    });

    // CTA resolution - Partner link wins
    if (tip.sponsor?.url) {
      if (typeof window !== 'undefined') {
        window.open(tip.sponsor.url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    // Base tip → navigate to product page if ctaEnabled
    if ((tip as any).ctaEnabled && tip.productSlug) {
      navigate(`/supplements/${tip.productSlug}`);
      return;
    }
    
    // Fallback toast for disabled CTA
    toast({
      title: "Coming Soon",
      description: "This supplement is not yet available in our catalog.",
    });
  }, [navigate]);

  // Track tip view for analytics - unconditional hook, guard inside
  useEffect(() => {
    if (tips.length > 0 && !isLoading) {
      const currentTip = tips[currentIndex];
      if (currentTip) {
        console.log('supplement_tip_viewed', { 
          id: currentTip.id, 
          slug: currentTip.productSlug,
          position: currentIndex 
        });
      }
    }
  }, [tips, currentIndex, isLoading]);

  // --- RENDER: decide what to show AFTER all hooks ---
  const hasTips = !isLoading && tips.length > 0;
  
  // Safe current tip with clamped index
  const safeIndex = hasTips ? Math.min(Math.max(currentIndex, 0), Math.max(0, tips.length - 1)) : 0;
  const currentTip: SupplementTip & { ctaEnabled?: boolean } = hasTips ? tips[safeIndex] ?? {
    id: 'fallback-creatine',
    title: 'Creatine Monohydrate',
    blurb: 'Supports strength, power, and recovery.',
    productSlug: 'creatine-monohydrate',
    emoji: '💪',
    ctaEnabled: true,
  } : {
    id: 'loading',
    title: 'Loading...',
    blurb: 'Loading supplement insights...',
    productSlug: 'loading',
    emoji: '⏳',
    ctaEnabled: false,
  };

  return (
    <Card 
      className={`modern-action-card ai-insights-card border-0 rounded-3xl animate-slide-up float-animation hover:scale-[1.02] transition-all duration-500 shadow-xl hover:shadow-2xl ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-labelledby="supp-edu-heading"
      data-testid="supp-edu-card"
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

          {/* Navigation arrows - only show when we have multiple tips */}
          {hasTips && tips.length > 1 && (
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
          )}
        </div>

        {/* Dot indicators - only show when we have multiple tips */}
        {hasTips && tips.length > 1 && (
          <div className="flex justify-center space-x-2 mb-6" role="tablist">
            {tips.map((_, index) => (
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
                  console.log('supplement_tip_dot_clicked', { id: currentTip?.id, toIndex: index });
                }}
                tabIndex={0}
              />
            ))}
          </div>
        )}

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
                  {currentTip.sponsor?.disclosure && (
                    <Badge variant="outline" className="text-xs">
                      {currentTip.sponsor.disclosure}
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

        {/* CTA Button - always present */}
        <div className="space-y-3">
          <Button
            onClick={() => handleBuyNow(currentTip)}
            disabled={!hasTips || (!(currentTip as any).ctaEnabled && !currentTip.sponsor?.url)}
            className={`w-full gradient-primary rounded-2xl ${isMobile ? 'h-12' : 'h-14'} neon-glow font-semibold`}
            aria-label={`${currentTip.sponsor?.ctaText || 'Buy'} ${currentTip.title} supplement`}
            title={!hasTips ? "Loading..." : (!(currentTip as any).ctaEnabled && !currentTip.sponsor?.url ? "Product coming soon" : undefined)}
          >
            <ShoppingCart className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} mr-2`} />
            {hasTips ? (currentTip.sponsor?.ctaText || 'Buy this supplement') : 'Loading...'}
          </Button>
          
          {/* Disclaimer */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Not medical advice. Consult your healthcare provider before starting any supplement.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Export both named and default
export function SupplementEducationCard(props: SupplementEducationCardProps) {
  return SupplementEducationCardComponent(props);
}

export default SupplementEducationCard;