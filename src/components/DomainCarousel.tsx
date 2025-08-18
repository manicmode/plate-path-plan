import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { HabitTemplate, HabitDomain } from '@/hooks/useHabitTemplatesV2';
import { HabitCard } from '@/components/habit-central/HabitCard';
import { Skeleton } from '@/components/ui/skeleton';

interface DomainCarouselProps {
  domain: HabitDomain;
  title: string;
  onStartHabit: (template: HabitTemplate) => void;
  onDetailsClick: (template: HabitTemplate) => void;
}

export function DomainCarousel({ domain, title, onStartHabit, onDetailsClick }: DomainCarouselProps) {
  const [templates, setTemplates] = useState<HabitTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('habit_templates')
          .select('*')
          .eq('domain', domain)
          .order('difficulty', { ascending: true })
          .order('name', { ascending: true })
          .limit(24);

        if (error) throw error;

        setTemplates(data as HabitTemplate[] || []);
      } catch (error) {
        console.error(`Error fetching ${domain} templates:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [domain]);

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
      return () => container.removeEventListener('scroll', checkScrollability);
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
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="text-center py-8 text-muted-foreground">
          <p>No {domain} habits found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide pb-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {templates.map((template) => (
          <div 
            key={template.id} 
            className="w-80 flex-shrink-0 snap-center"
          >
            <HabitCard
              template={template}
              isSelected={selectedItems.has(template.id)}
              onSelectionChange={handleSelectionChange}
              onDetailsClick={() => onDetailsClick(template)}
              onStartHabit={() => onStartHabit(template)}
              showAdminActions={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}