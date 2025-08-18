import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { HabitTemplate } from '@/hooks/useHabitTemplatesV2';

interface HeroHabitRotatorProps {
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

const getDomainEmoji = (domain: string) => {
  switch (domain) {
    case 'nutrition': return '🥗';
    case 'exercise': return '💪';
    case 'recovery': return '🧘';
    default: return '✨';
  }
};

export function HeroHabitRotator({ onStartHabit }: HeroHabitRotatorProps) {
  const [templates, setTemplates] = useState<HabitTemplate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('habit_templates')
          .select('slug, name, summary, domain, goal_type, default_target, difficulty, estimated_minutes')
          .order('difficulty', { ascending: true })
          .order('name', { ascending: true })
          .limit(12);

        if (error) throw error;

        // Randomize initial order
        const shuffled = (data || []).sort(() => Math.random() - 0.5);
        setTemplates(shuffled as HabitTemplate[]);
        setCurrentIndex(Math.floor(Math.random() * shuffled.length));
      } catch (error) {
        console.error('Error fetching hero templates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  // Auto-advance every 6 seconds (paused on hover)
  useEffect(() => {
    if (isHovered || templates.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % templates.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [isHovered, templates.length]);

  const handlePrevious = () => {
    setCurrentIndex(prev => (prev - 1 + templates.length) % templates.length);
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % templates.length);
  };

  if (loading) {
    return (
      <div className="w-full h-64 md:h-80 animate-pulse">
        <Card className="h-full">
          <CardContent className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="h-8 w-64 bg-muted rounded mx-auto" />
              <div className="h-4 w-96 bg-muted rounded mx-auto" />
              <div className="h-12 w-48 bg-muted rounded mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (templates.length === 0) return null;

  const currentTemplate = templates[currentIndex];

  return (
    <div 
      className="relative w-full h-64 md:h-80 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className="h-full overflow-hidden bg-gradient-to-br from-background to-muted/30">
        <CardContent className="h-full p-6 md:p-8 flex flex-col md:flex-row items-center justify-between">
          {/* Content */}
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <span className="text-4xl">{getDomainEmoji(currentTemplate.domain)}</span>
              <Badge className={getDomainColor(currentTemplate.domain)}>
                {currentTemplate.domain}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold line-clamp-2 animate-fade-in">
                {currentTemplate.name}
              </h2>
              {currentTemplate.summary && (
                <p className="text-lg text-muted-foreground line-clamp-2 animate-fade-in">
                  {currentTemplate.summary}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
              {currentTemplate.estimated_minutes && (
                <span>~{currentTemplate.estimated_minutes} min</span>
              )}
              {currentTemplate.difficulty && (
                <span className="capitalize">{currentTemplate.difficulty} level</span>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 md:mt-0 md:ml-8">
            <Button 
              size="lg" 
              onClick={() => onStartHabit(currentTemplate)}
              className="text-lg px-8 py-6 hover-scale animate-scale-in"
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Start this habit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Controls */}
      <div className="absolute inset-y-0 left-4 flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevious}
          className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="absolute inset-y-0 right-4 flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Dot Indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {templates.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-primary w-6' 
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}