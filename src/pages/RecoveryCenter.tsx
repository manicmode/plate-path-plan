import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, Wind, Zap, Heart, Moon, Sparkles, Flower2 } from "lucide-react";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { useIsMobile } from "@/hooks/use-mobile";

const RecoveryCenter = () => {
  useScrollToTop();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const recoveryOptions = [
    {
      id: 'guided-meditation',
      title: 'Guided Meditation',
      description: 'Calm your mind with peaceful meditation sessions',
      icon: Brain,
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      duration: '5-20 min'
    },
    {
      id: 'breathing-exercises',
      title: 'Breathing Exercises',
      description: 'Restore balance with focused breathing techniques',
      icon: Wind,
      gradient: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      duration: '3-10 min'
    },
    {
      id: 'stretching-routines',
      title: 'Stretching Routines',
      description: 'Gentle stretches to release muscle tension',
      icon: Zap,
      gradient: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-600 dark:text-green-400',
      duration: '10-30 min'
    },
    {
      id: 'yoga-flows',
      title: 'Yoga Flows',
      description: 'Harmonious movements for body and mind',
      icon: Flower2,
      gradient: 'from-orange-500/20 to-red-500/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      duration: '15-45 min'
    },
    {
      id: 'muscle-recovery',
      title: 'Muscle Recovery',
      description: 'Targeted recovery for post-workout relief',
      icon: Heart,
      gradient: 'from-red-500/20 to-pink-500/20',
      iconColor: 'text-red-600 dark:text-red-400',
      duration: '8-25 min'
    },
    {
      id: 'sleep-preparation',
      title: 'Sleep Preparation',
      description: 'Wind down routines for better rest',
      icon: Moon,
      gradient: 'from-indigo-500/20 to-purple-500/20',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      duration: '10-30 min'
    },
    {
      id: 'mindfulness-prompts',
      title: 'Mindfulness Prompts',
      description: 'Gentle reminders to stay present and centered',
      icon: Sparkles,
      gradient: 'from-yellow-500/20 to-orange-500/20',
      iconColor: 'text-yellow-600 dark:text-yellow-500',
      duration: '2-5 min'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 relative">
        <div className="flex items-center p-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-accent/50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
                Recovery Center
              </h1>
              <p className="text-sm text-muted-foreground">
                Restore your body and mind
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/recovery-analytics')}
            variant="outline"
            size="sm"
            className="absolute top-4 right-4 hover:bg-accent/50 transition-colors"
          >
            Analytics
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-8 mb-8 border border-border/50">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Welcome to Your Recovery Sanctuary
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Take a moment to restore, recharge, and reconnect with yourself. 
              Choose from our carefully curated collection of wellness practices.
            </p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />
        </div>

        {/* Recovery Options Grid */}
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
          {recoveryOptions.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <div
                key={option.id}
                onClick={() => {
                  if (option.id === 'guided-meditation') {
                    navigate('/guided-meditation');
                  } else if (option.id === 'breathing-exercises') {
                    navigate('/recovery/breathing');
                  } else if (option.id === 'stretching-routines') {
                    navigate('/recovery/stretching');
                  } else if (option.id === 'muscle-recovery') {
                    navigate('/recovery/muscle-recovery');
                  } else if (option.id === 'sleep-preparation') {
                    navigate('/recovery/sleep');
                  } else if (option.id === 'yoga-flows') {
                    navigate('/recovery/yoga');
                  }
                }}
                className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${option.gradient} p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 animate-fade-in cursor-pointer`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-background/50 backdrop-blur-sm border border-border/30 group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className={`h-6 w-6 ${option.iconColor}`} />
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-background/70 text-muted-foreground border border-border/30">
                      {option.duration}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {option.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {option.description}
                  </p>
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-br from-background/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            );
          })}
        </div>

        {/* Bottom Spacing */}
        <div className="h-20" />
      </div>
    </div>
  );
};

export default RecoveryCenter;