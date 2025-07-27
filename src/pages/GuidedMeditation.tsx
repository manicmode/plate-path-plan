import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { useIsMobile } from "@/hooks/use-mobile";

const GuidedMeditation = () => {
  useScrollToTop();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  const meditationThemes = [
    {
      id: 'morning-boost',
      title: 'Morning Boost',
      emoji: '🌅',
      gradient: 'from-orange-300/30 to-yellow-300/30',
      iconColor: 'text-orange-500'
    },
    {
      id: 'sleep-wind-down',
      title: 'Sleep Wind-Down',
      emoji: '🌙',
      gradient: 'from-indigo-300/30 to-purple-300/30',
      iconColor: 'text-indigo-500'
    },
    {
      id: 'focus-clarity',
      title: 'Focus & Clarity',
      emoji: '🧠',
      gradient: 'from-blue-300/30 to-cyan-300/30',
      iconColor: 'text-blue-500'
    },
    {
      id: 'self-love',
      title: 'Self-Love',
      emoji: '💞',
      gradient: 'from-pink-300/30 to-rose-300/30',
      iconColor: 'text-pink-500'
    },
    {
      id: 'anxiety-relief',
      title: 'Anxiety Relief',
      emoji: '🌿',
      gradient: 'from-green-300/30 to-emerald-300/30',
      iconColor: 'text-green-500'
    },
    {
      id: 'gratitude',
      title: 'Gratitude',
      emoji: '🙏',
      gradient: 'from-amber-300/30 to-orange-300/30',
      iconColor: 'text-amber-500'
    },
    {
      id: 'deep-healing',
      title: 'Deep Healing',
      emoji: '🔮',
      gradient: 'from-purple-300/30 to-violet-300/30',
      iconColor: 'text-purple-500'
    },
    {
      id: 'manifestation',
      title: 'Manifestation',
      emoji: '🔥',
      gradient: 'from-red-300/30 to-pink-300/30',
      iconColor: 'text-red-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
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
                Guided Meditation
              </h1>
              <p className="text-sm text-muted-foreground">
                Find your breath. Reclaim your calm.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-8 mb-8 border border-border/50">
          <div className="relative z-10 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-background/50 backdrop-blur-sm rounded-full border border-border/30">
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Choose Your Journey
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select a meditation theme that resonates with your current needs. 
              Each session is designed to guide you toward inner peace and clarity.
            </p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />
        </div>

        {/* Theme Selector Grid */}
        <div className={`grid gap-4 mb-8 ${isMobile ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-4'}`}>
          {meditationThemes.map((theme, index) => (
            <div
              key={theme.id}
              onClick={() => setSelectedTheme(theme.id)}
              className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${theme.gradient} p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 animate-fade-in cursor-pointer ${
                selectedTheme === theme.id ? 'ring-2 ring-primary border-primary/50' : ''
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative z-10 text-center">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                  {theme.emoji}
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {theme.title}
                </h3>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-background/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>

        {/* Session Viewer Stub */}
        {selectedTheme && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 to-background/50 p-8 border border-border/50 animate-fade-in">
            <div className="relative z-10 text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-primary/20 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                    <div className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                  <div className="absolute inset-0 w-24 h-24 rounded-full bg-gradient-to-tr from-primary/20 to-transparent animate-pulse" />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Coming Soon
              </h3>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Personalized voice-guided meditation, calming visuals, and immersive sound 
                experiences tailored to your selected theme. Get ready for a transformative 
                journey to inner peace.
              </p>
              
              <div className="mt-6 flex justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  Voice Guidance
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                  Calming Visuals
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  Immersive Audio
                </span>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />
          </div>
        )}

        {/* Bottom Spacing */}
        <div className="h-20" />
      </div>
    </div>
  );
};

export default GuidedMeditation;