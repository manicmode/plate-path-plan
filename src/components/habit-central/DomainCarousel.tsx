import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { HabitTemplate, CarouselHabitCard } from './CarouselHabitCard';
import { RailSkeleton } from './RailSkeleton';
import { FilterPills } from './FilterPills';

export type Domain = 'nutrition' | 'exercise' | 'recovery';

interface DomainCarouselProps {
  domain: Domain;
  title: string;
  subtitle: string;
  emoji: string;
  addedHabits: Set<string>;
  onInfo: (habit: HabitTemplate) => void;
  onAdd: (habit: HabitTemplate) => void;
}

// Sub-domain mapping based on keywords in slug/summary
const SUB_DOMAIN_MAPPINGS = {
  nutrition: {
    'All': (_habit: HabitTemplate) => true,
    'Hydration': (habit: HabitTemplate) => 
      habit.slug.includes('water') || habit.title.toLowerCase().includes('water') || habit.title.toLowerCase().includes('hydrat'),
    'Protein': (habit: HabitTemplate) => 
      habit.slug.includes('protein') || habit.title.toLowerCase().includes('protein'),
    'Fiber': (habit: HabitTemplate) => 
      habit.slug.includes('fiber') || habit.title.toLowerCase().includes('fiber') || habit.title.toLowerCase().includes('vegetable'),
    'Vitamins': (habit: HabitTemplate) => 
      habit.slug.includes('vitamin') || habit.title.toLowerCase().includes('vitamin') || habit.title.toLowerCase().includes('supplement')
  },
  exercise: {
    'All': (_habit: HabitTemplate) => true,
    'Steps': (habit: HabitTemplate) => 
      habit.slug.includes('walk') || habit.slug.includes('step') || habit.title.toLowerCase().includes('walk') || habit.title.toLowerCase().includes('step'),
    'Cardio': (habit: HabitTemplate) => 
      habit.slug.includes('cardio') || habit.slug.includes('run') || habit.title.toLowerCase().includes('cardio') || habit.title.toLowerCase().includes('run'),
    'Strength': (habit: HabitTemplate) => 
      habit.slug.includes('strength') || habit.slug.includes('weight') || habit.title.toLowerCase().includes('strength') || habit.title.toLowerCase().includes('muscle'),
    'Flexibility': (habit: HabitTemplate) => 
      habit.slug.includes('stretch') || habit.slug.includes('flex') || habit.title.toLowerCase().includes('stretch') || habit.title.toLowerCase().includes('yoga')
  },
  recovery: {
    'All': (_habit: HabitTemplate) => true,
    'Sleep': (habit: HabitTemplate) => 
      habit.slug.includes('sleep') || habit.title.toLowerCase().includes('sleep') || habit.title.toLowerCase().includes('rest'),
    'Breathwork': (habit: HabitTemplate) => 
      habit.slug.includes('breath') || habit.title.toLowerCase().includes('breath') || habit.title.toLowerCase().includes('breathing'),
    'Mindfulness': (habit: HabitTemplate) => 
      habit.slug.includes('meditat') || habit.slug.includes('mindful') || habit.title.toLowerCase().includes('meditat') || habit.title.toLowerCase().includes('mindful'),
    'Relaxation': (habit: HabitTemplate) => 
      habit.slug.includes('relax') || habit.slug.includes('calm') || habit.title.toLowerCase().includes('relax') || habit.title.toLowerCase().includes('calm')
  }
};

const DIFFICULTY_OPTIONS = ['All', 'Easy', 'Medium', 'Hard'];

export function DomainCarousel({ 
  domain, 
  title, 
  subtitle, 
  emoji, 
  addedHabits, 
  onInfo, 
  onAdd 
}: DomainCarouselProps) {
  const [habits, setHabits] = useState<HabitTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [subDomainFilter, setSubDomainFilter] = useState('All');

  const subDomainOptions = Object.keys(SUB_DOMAIN_MAPPINGS[domain]);

  // Load habits for this domain
  useEffect(() => {
    const loadHabits = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase.rpc('rpc_list_active_habits', {
          p_domain: domain
        });

        if (error) {
          throw error;
        }

        setHabits(data || []);
      } catch (err) {
        console.error(`Error loading ${domain} habits:`, err);
        setError(err instanceof Error ? err.message : 'Failed to load habits');
      } finally {
        setLoading(false);
      }
    };

    loadHabits();
  }, [domain]);

  // Filter habits based on selected filters
  const filteredHabits = useMemo(() => {
    return habits.filter(habit => {
      // Difficulty filter
      if (difficultyFilter !== 'All' && 
          habit.difficulty.toLowerCase() !== difficultyFilter.toLowerCase()) {
        return false;
      }

      // Sub-domain filter
      if (subDomainFilter !== 'All') {
        const filterFn = SUB_DOMAIN_MAPPINGS[domain][subDomainFilter as keyof typeof SUB_DOMAIN_MAPPINGS[typeof domain]];
        if (!filterFn?.(habit)) {
          return false;
        }
      }

      return true;
    });
  }, [habits, difficultyFilter, subDomainFilter, domain]);

  const handleRetry = () => {
    setError(null);
    // Trigger reload by changing loading state
    setLoading(true);
    setTimeout(() => setLoading(false), 100);
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{emoji}</span>
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium mb-2">Difficulty</h3>
          <FilterPills
            options={DIFFICULTY_OPTIONS}
            selected={difficultyFilter}
            onSelect={setDifficultyFilter}
            layoutId={`difficulty-${domain}`}
          />
        </div>
        
        <div>
          <h3 className="text-sm font-medium mb-2">Category</h3>
          <FilterPills
            options={subDomainOptions}
            selected={subDomainFilter}
            onSelect={setSubDomainFilter}
            layoutId={`subdomain-${domain}`}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <RailSkeleton />
      ) : error ? (
        <div className="flex items-center justify-center p-8 bg-muted/30 rounded-lg">
          <div className="text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <div>
              <p className="text-sm font-medium">Failed to load habits</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      ) : filteredHabits.length === 0 ? (
        <div className="flex items-center justify-center p-8 bg-muted/30 rounded-lg">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">No habits found</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your filters or check back later
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-px-4">
          <div className="flex gap-3 pb-2">
            {filteredHabits.map((habit, index) => (
              <CarouselHabitCard
                key={habit.id}
                habit={habit}
                isAdded={addedHabits.has(habit.slug)}
                onInfo={() => onInfo(habit)}
                onAdd={() => onAdd(habit)}
                index={index}
              />
            ))}
          </div>
        </div>
      )}

      {/* Results count */}
      {!loading && !error && (
        <p className="text-xs text-muted-foreground text-center">
          {filteredHabits.length} habit{filteredHabits.length !== 1 ? 's' : ''} • 
          {habits.length} total in {domain}
        </p>
      )}
    </section>
  );
}