import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import type { HabitTemplate } from './CarouselHabitCard';
import { ThemedHabitCard } from './ThemedHabitCard';
import { RailSkeleton } from './RailSkeleton';
import { cn } from '@/lib/utils';

export type Domain = 'nutrition' | 'exercise' | 'recovery';

interface ThemedDomainSectionProps {
  domain: Domain;
  title: string;
  subtitle: string;
  emoji: string;
  addedHabits: Set<string>;
  onInfo: (habit: HabitTemplate) => void;
  onAdd: (habit: HabitTemplate) => void;
  hideHeader?: boolean;
}

// Dynamic sub-domain categories - these come from the database
const getSubDomainCategories = (habits: HabitTemplate[]) => {
  const categories = new Set(['All']);
  habits.forEach(habit => {
    if (habit.category && habit.category.trim()) {
      categories.add(habit.category);
    }
  });
  return Array.from(categories);
};

const DIFFICULTY_OPTIONS = ['All', 'Easy', 'Medium', 'Hard'];

const DOMAIN_THEMES = {
  nutrition: {
    gradient: 'from-emerald-500/20 via-green-500/10 to-lime-500/20',
    border: 'border-emerald-500/30',
    shadow: 'shadow-emerald-500/20',
    glow: 'shadow-emerald-500/30',
  },
  exercise: {
    gradient: 'from-orange-500/20 via-red-500/10 to-pink-500/20',
    border: 'border-orange-500/30',
    shadow: 'shadow-orange-500/20',
    glow: 'shadow-orange-500/30',
  },
  recovery: {
    gradient: 'from-purple-500/20 via-violet-500/10 to-indigo-500/20',
    border: 'border-purple-500/30',
    shadow: 'shadow-purple-500/20',
    glow: 'shadow-purple-500/30',
  }
};

export function ThemedDomainSection({ 
  domain, 
  title, 
  subtitle, 
  emoji, 
  addedHabits, 
  onInfo, 
  onAdd,
  hideHeader = false
}: ThemedDomainSectionProps) {
  const [habits, setHabits] = useState<HabitTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const theme = DOMAIN_THEMES[domain];

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

  // Get dynamic categories from loaded habits
  const categoryOptions = useMemo(() => getSubDomainCategories(habits), [habits]);

  // Filter habits based on selected filters
  const filteredHabits = useMemo(() => {
    return habits.filter(habit => {
      // Difficulty filter
      if (difficultyFilter !== 'All' && 
          habit.difficulty.toLowerCase() !== difficultyFilter.toLowerCase()) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'All' && habit.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [habits, difficultyFilter, categoryFilter]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setTimeout(() => setLoading(false), 100);
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Themed Domain Window */}
      <div className={cn(
        "relative rounded-3xl border-2 backdrop-blur-xl overflow-hidden",
        "bg-background/40 shadow-2xl",
        theme.border,
        theme.shadow
      )}>
        {/* Gradient background */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50",
          theme.gradient
        )} />
        
        {/* Animated glow */}
        <div className={cn(
          "absolute inset-0 rounded-3xl animate-pulse",
          theme.glow
        )} />
        
        {/* Content */}
        <div className="relative z-10 space-y-6 p-6">
          {/* Header (conditionally hidden) */}
          {!hideHeader && (
            <div className="text-center space-y-3">
              <motion.div 
                className="text-6xl"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  repeatType: "reverse",
                  ease: "easeInOut"
                }}
              >
                {emoji}
              </motion.div>
              <div>
                <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {title}
                </h2>
                <p className="text-lg text-muted-foreground">{subtitle}</p>
              </div>
            </div>
          )}

          {/* Horizontal Filters */}
          <div className="flex gap-4 max-w-lg mx-auto">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="h-10 bg-background/80 backdrop-blur-sm border-border/60 rounded-xl px-4 shadow-sm hover:shadow-md transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-xl border-border/60">
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10 bg-background/80 backdrop-blur-sm border-border/60 rounded-xl px-4 shadow-sm hover:shadow-md transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-xl border-border/60">
                  {categoryOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="relative">
              {/* Mobile-first carousel */}
              <div className="overflow-x-auto no-scrollbar snap-x snap-mandatory px-2">
                <div className="flex gap-4">
                  {filteredHabits.map((habit, index) => (
                    <ThemedHabitCard
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

              {/* Desktop scroll indicators with better styling */}
              <div className="hidden lg:flex absolute top-1/2 -translate-y-1/2 -left-6 -right-6 justify-between pointer-events-none">
                <div className="p-3 bg-background/90 backdrop-blur-sm rounded-full shadow-xl border-2 border-border/20">
                  <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="p-3 bg-background/90 backdrop-blur-sm rounded-full shadow-xl border-2 border-border/20">
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
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
        </div>
      </div>
    </motion.section>
  );
}