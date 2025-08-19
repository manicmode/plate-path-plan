import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Sparkles, Plus, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { HabitTemplate } from '@/hooks/useHabitTemplatesV2';
import { QuickLogSheet } from '@/components/QuickLogSheet';
import { useAuth } from '@/contexts/auth';
import { useUserHabits } from '@/hooks/useUserHabits';
import { useHabitManagement } from '@/hooks/useHabitManagement';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';

interface Recommendation {
  slug: string;
  name: string;
  domain: string;
  reason: string;
  score?: number;
}

interface SuggestionsForYouProps {
  onStartHabit: (template: HabitTemplate) => void;
}

const getDomainColor = (domain: string) => {
  switch (domain) {
    case 'nutrition': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'exercise': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'recovery': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

export function SuggestionsForYou({ onStartHabit }: SuggestionsForYouProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [templates, setTemplates] = useState<Record<string, HabitTemplate>>({});
  const [loading, setLoading] = useState(true);
  const [personalized, setPersonalized] = useState(false);
  const [scrollIndex, setScrollIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<{ template: HabitTemplate; userHabit: any } | null>(null);
  
  const { hasHabit, getUserHabit, fetchUserHabits } = useUserHabits();
  const { logHabit } = useHabitManagement();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Build lightweight profile object from available user data
        const profile = {
          goals: (user as any)?.goals ?? [],
          constraints: (user as any)?.constraints ?? [],
          preferences: (user as any)?.preferences ?? [],
        };

        // Try v2 first with personalization
        let recommendations: Recommendation[] = [];
        let isPersonalized = false;
        
        const { data: v2, error: e2 } = await supabase
          .rpc('rpc_recommend_habits_v2', { p_profile: profile, p_per_domain: 3 });
        
        if (!e2 && v2?.length) {
          // v2 success - data already has proper format with reasons
          recommendations = v2;
          isPersonalized = true;
        } else {
          // Fallback to v1
          console.log('Falling back to v1 recommendations:', e2);
          const { data: v1 } = await supabase.rpc('rpc_recommend_habits');
          
          // Normalize v1 data to include generic reasons
          recommendations = (v1 || []).map((rec: any) => ({
            slug: rec.slug,
            name: rec.name,
            domain: rec.domain,
            reason: "Great starter pick in this domain."
          }));
        }

        // Fetch user habits in parallel
        await fetchUserHabits();

        if (recommendations.length > 0) {
          setRecommendations(recommendations);
          setPersonalized(isPersonalized);

          // Track analytics for successful load
          if (isPersonalized) {
            track('habit_recs_loaded', { 
              source: 'for_you', 
              personalized: true, 
              per_domain: 3,
              count: recommendations.length
            });
          }

          // Fetch full template data for these recommendations
          const slugs = recommendations.map((rec: Recommendation) => rec.slug);
          const { data: templateData, error: templatesError } = await supabase
            .from('habit_templates')
            .select('*')
            .in('slug', slugs);

          if (templatesError) throw templatesError;

          const templatesMap = (templateData || []).reduce((acc, template) => {
            acc[template.slug] = template as HabitTemplate;
            return acc;
          }, {} as Record<string, HabitTemplate>);

          setTemplates(templatesMap);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        toast({
          title: "Couldn't load suggestions",
          description: "Please retry.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [user, fetchUserHabits]);

  const handleRecommendationClick = async (recommendation: Recommendation) => {
    const template = templates[recommendation.slug];
    const userHabit = getUserHabit(recommendation.slug);
    
    if (template) {
      if (hasHabit(recommendation.slug)) {
        // Handle logging for active habit
        if (template.goal_type === 'bool') {
          const success = await logHabit(template.slug, true);
          if (success) {
            await fetchUserHabits();
          }
        } else {
          setSelectedTemplate({ template, userHabit });
          setQuickLogOpen(true);
        }
      } else {
        // Start new habit with analytics
        track('habit_started', { 
          slug: recommendation.slug, 
          source: 'for_you', 
          personalized,
          domain: recommendation.domain
        });
        onStartHabit(template);
      }
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('suggestions-scroll');
    if (container) {
      const cardWidth = 320; // Approximate card width + gap
      const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      
      if (direction === 'left') {
        setScrollIndex(Math.max(0, scrollIndex - 1));
      } else {
        setScrollIndex(Math.min(recommendations.length - 3, scrollIndex + 1));
      }
    }
  };

  // Don't render if no user or no recommendations
  if (!user || loading) {
    return loading ? (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-muted rounded animate-pulse" />
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-80 h-40 bg-muted rounded-lg animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    ) : null;
  }

  if (recommendations.length === 0) {
    return (
      <section 
        id="suggestions"
        data-section="suggestions"
        className="space-y-4"
        role="region"
        aria-label="Suggested habits for you"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">For you</h2>
        </div>
        <Card className="w-80">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No picks yet—try browsing below
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section 
      id="suggestions"
      data-section="suggestions"
      className="space-y-4"
      role="region"
      aria-label="Suggested habits for you"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">For you</h2>
        </div>
        
        {recommendations.length > 3 && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleScroll('left')}
              disabled={scrollIndex === 0}
              aria-label="Previous suggestions"
              className="h-8 w-8 p-0 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleScroll('right')}
              disabled={scrollIndex >= recommendations.length - 3}
              aria-label="Next suggestions"
              className="h-8 w-8 p-0 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div 
        id="suggestions-scroll"
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide pb-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {recommendations.slice(0, 6).map((recommendation, index) => {
          const isActive = hasHabit(recommendation.slug);
          const template = templates[recommendation.slug];
          
          return (
            <motion.div
              key={recommendation.slug}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: index * 0.1 }}
              className="w-80 flex-shrink-0 snap-center"
            >
              <Card className="h-full hover-scale transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2 flex-1">
                      {recommendation.name}
                    </CardTitle>
                    <Badge className={getDomainColor(recommendation.domain)}>
                      {recommendation.domain}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground italic line-clamp-2">
                    {recommendation.reason}
                  </p>
                  <Button 
                    onClick={() => handleRecommendationClick(recommendation)}
                    className="w-full"
                    size="sm"
                    variant={isActive ? "secondary" : "default"}
                  >
                    {isActive ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Log now
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Start this habit
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Log Sheet */}
      <QuickLogSheet
        open={quickLogOpen}
        onOpenChange={setQuickLogOpen}
        template={selectedTemplate?.template || null}
        userHabit={selectedTemplate?.userHabit || null}
        source="for_you"
        onSuccess={() => {
          setQuickLogOpen(false);
          setSelectedTemplate(null);
          fetchUserHabits();
        }}
      />
    </section>
  );
}