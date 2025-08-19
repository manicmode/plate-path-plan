import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { HabitTemplate, HabitDomain } from '@/hooks/useHabitTemplatesV2';
import { HabitCard } from '@/components/habit-central/HabitCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useUserHabits } from '@/hooks/useUserHabits';
import { useAuth } from '@/contexts/auth';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface DomainCarouselProps {
  domain: HabitDomain;
  title: string;
  onStartHabit: (template: HabitTemplate) => void;
  onDetailsClick: (template: HabitTemplate) => void;
}

export function DomainCarousel({ domain, title, onStartHabit, onDetailsClick }: DomainCarouselProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<HabitTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  const { hasHabit, fetchUserHabits } = useUserHabits();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Fetch templates and user habits in parallel
        const [templatesResponse] = await Promise.all([
          supabase
            .from('habit_templates')
            .select('*')
            .eq('domain', domain)
            .order('difficulty', { ascending: true })
            .order('name', { ascending: true })
            .limit(24),
          user ? fetchUserHabits() : Promise.resolve()
        ]);

        if (templatesResponse.error) throw templatesResponse.error;

        setTemplates(templatesResponse.data as HabitTemplate[] || []);
      } catch (error) {
        console.error(`Error fetching ${domain} templates:`, error);
        toast({
          title: `Couldn't load ${domain}`,
          description: "Please retry.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [domain, user, fetchUserHabits]);

  useEffect(() => {
    const checkScrollability = () => {
      const container = scrollContainerRef.current;
      if (container) {
        setCanScrollLeft(container.scrollLeft > 0);
        setCanScrollRight(
          container.scrollLeft < container.scrollWidth - container.clientWidth
        );
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      checkScrollability();
      container.addEventListener('scroll', checkScrollability);
      
      // Keyboard navigation
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleScroll('left');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleScroll('right');
        }
      };
      
      container.addEventListener('keydown', handleKeyDown);
      return () => {
        container.removeEventListener('scroll', checkScrollability);
        container.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [templates]);

  const handleScroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (container) {
      const cardWidth = 320; // Approximate card width + gap
      const scrollAmount = direction === 'left' ? -cardWidth * 2 : cardWidth * 2;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleSelectionChange = () => {
    // No-op for now since this is display-only
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-80 space-y-3 flex-shrink-0">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <section className="space-y-4" role="region" aria-label={`${title} habits`}>
        <h2 className="text-xl font-semibold">{title}</h2>
        <Card className="p-6 text-center">
          <CardContent>
            <p className="text-muted-foreground">
              No {domain} habits yet — try another domain or search.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-4" role="region" aria-label={`${title} habits`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            aria-label={`Previous ${title.toLowerCase()} habits`}
            className="h-8 w-8 p-0 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            aria-label={`Next ${title.toLowerCase()} habits`}
            className="h-8 w-8 p-0 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide pb-2"
        style={{ scrollSnapType: 'x mandatory' }}
        tabIndex={0}
      >
        {templates.map((template, index) => (
          <motion.div
            key={template.id}
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: index * 0.05 }}
            className="w-80 flex-shrink-0 snap-center"
          >
            <div className="relative">
              <HabitCard
                template={template}
                isSelected={selectedItems.has(template.id)}
                onSelectionChange={handleSelectionChange}
                onDetailsClick={() => onDetailsClick(template)}
                onStartHabit={() => onStartHabit(template)}
                showAdminActions={false}
                isActive={hasHabit(template.slug)}
              />
              <div className="mt-2 text-center">
                <p className="text-xs text-muted-foreground">We'll remind & track for you</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}